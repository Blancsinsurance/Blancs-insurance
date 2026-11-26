-- ============================================================
-- Messaging upgrade (web + mobile app)
-- Run the WHOLE script once in Supabase -> SQL Editor -> New query -> Run.
-- Safe to re-run: every step is "create or replace" / "if not exists".
--
-- What it does
--   1. Re-applies the agent RLS policies (same as AGENT_PORTAL_RLS.sql),
--      so agents can read/reply to their conversations from web AND app.
--   2. conversation_reads  : who has read what (drives the blue unread dots,
--                            shared between web and app, per signed-in user).
--   3. agent_contacts      : names/notes an agent saves for a customer.
--   4. inbox_conversations(): one call that returns the inbox, newest first,
--                            with last message, unread count and contact name.
--   5. mark_conversation_read(): clears the unread dot for the caller.
--   6. Makes sure Realtime is on for messages (live updates + in-app alerts).
--   7. Diagnostic queries at the bottom (read-only).
-- ============================================================


-- ------------------------------------------------------------
-- 1) Agent identity + agent RLS (identical to AGENT_PORTAL_RLS.sql)
-- ------------------------------------------------------------
create or replace function public.current_agent_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select id
  from public.agents
  where lower(trim(email)) = lower(trim(coalesce(auth.jwt() ->> 'email', '')))
  limit 1;
$$;

grant execute on function public.current_agent_id() to authenticated, anon;

drop policy if exists "agents_select_own_conversations" on public.conversations;
create policy "agents_select_own_conversations"
  on public.conversations for select to authenticated
  using (agent_id = public.current_agent_id());

drop policy if exists "agents_update_own_conversations" on public.conversations;
create policy "agents_update_own_conversations"
  on public.conversations for update to authenticated
  using (agent_id = public.current_agent_id());

drop policy if exists "agents_select_messages" on public.messages;
create policy "agents_select_messages"
  on public.messages for select to authenticated
  using (
    conversation_id in (
      select id from public.conversations
      where agent_id = public.current_agent_id()
    )
  );

drop policy if exists "agents_insert_messages" on public.messages;
create policy "agents_insert_messages"
  on public.messages for insert to authenticated
  with check (
    sender_type = 'agent'
    and conversation_id in (
      select id from public.conversations
      where agent_id = public.current_agent_id()
    )
  );

drop policy if exists "agents_select_customer_users" on public.users;
create policy "agents_select_customer_users"
  on public.users for select to authenticated
  using (
    id in (
      select user_id from public.conversations
      where agent_id = public.current_agent_id()
    )
  );

alter table public.agents enable row level security;
drop policy if exists "authenticated_read_agents" on public.agents;
create policy "authenticated_read_agents"
  on public.agents for select to authenticated
  using (true);


-- ------------------------------------------------------------
-- 2) Read receipts (one row per conversation per signed-in person)
-- ------------------------------------------------------------
create table if not exists public.conversation_reads (
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  reader_id       uuid not null references auth.users(id) on delete cascade,
  last_read_at    timestamptz not null default now(),
  primary key (conversation_id, reader_id)
);

alter table public.conversation_reads enable row level security;
grant select, insert, update, delete on public.conversation_reads to authenticated;

drop policy if exists "reads_own_rows" on public.conversation_reads;
create policy "reads_own_rows"
  on public.conversation_reads for all to authenticated
  using (reader_id = auth.uid())
  with check (reader_id = auth.uid());

-- Backfill so the first run doesn't light up years of history:
--  * customers: everything up to now counts as read
--  * agents: only conversations where the agent already replied last
--    count as read. Conversations where the customer spoke last stay
--    UNREAD, so agents can see who is still waiting on them.
insert into public.conversation_reads (conversation_id, reader_id, last_read_at)
select c.id, c.user_id, now()
from public.conversations c
where c.user_id is not null
  and exists (select 1 from auth.users au where au.id = c.user_id)
on conflict do nothing;

insert into public.conversation_reads (conversation_id, reader_id, last_read_at)
select c.id, au.id, now()
from public.conversations c
join public.agents a on a.id = c.agent_id
join auth.users au on lower(trim(au.email)) = lower(trim(a.email))
where (
  select m.sender_type::text
  from public.messages m
  where m.conversation_id = c.id
  order by m.created_at desc
  limit 1
) = 'agent'
on conflict do nothing;


-- ------------------------------------------------------------
-- 3) Agent-editable contact details for a customer
-- ------------------------------------------------------------
create table if not exists public.agent_contacts (
  agent_id     uuid not null references public.agents(id) on delete cascade,
  user_id      uuid not null,
  display_name text,
  notes        text,
  updated_at   timestamptz not null default now(),
  primary key (agent_id, user_id)
);

alter table public.agent_contacts enable row level security;
grant select, insert, update, delete on public.agent_contacts to authenticated;

drop policy if exists "agents_manage_own_contacts" on public.agent_contacts;
create policy "agents_manage_own_contacts"
  on public.agent_contacts for all to authenticated
  using (agent_id = public.current_agent_id())
  with check (agent_id = public.current_agent_id());


-- ------------------------------------------------------------
-- 4) Inbox: every conversation the caller is part of, newest activity first
-- ------------------------------------------------------------
drop function if exists public.inbox_conversations();
create or replace function public.inbox_conversations()
returns table (
  id                  uuid,
  my_role             text,        -- 'agent' or 'user'
  user_id             uuid,
  agent_id            uuid,
  status              text,
  created_at          timestamptz,
  last_activity_at    timestamptz,
  last_message_body   text,
  last_message_sender text,
  last_message_has_attachment boolean,
  unread_count        integer,
  customer_phone      text,
  customer_email      text,
  contact_name        text,
  contact_notes       text
)
language sql
stable
security definer
set search_path = public
as $$
  with me as (
    select auth.uid() as uid, public.current_agent_id() as aid
  ),
  mine as (
    select
      c.*,
      (me.aid is not null and c.agent_id = me.aid) as as_agent,
      me.uid
    from public.conversations c
    cross join me
    where (me.aid is not null and c.agent_id = me.aid)
       or (me.uid is not null and c.user_id = me.uid)
  )
  select
    c.id,
    case when c.as_agent then 'agent' else 'user' end,
    c.user_id,
    c.agent_id,
    c.status::text,
    c.created_at,
    coalesce(lm.created_at, c.created_at),
    lm.body,
    lm.sender_type::text,
    coalesce(lm.attachment_url is not null, false),
    (
      select count(*)::int
      from public.messages m
      where m.conversation_id = c.id
        and m.sender_type::text = case when c.as_agent then 'user' else 'agent' end
        and m.created_at > coalesce(
          (select r.last_read_at from public.conversation_reads r
            where r.conversation_id = c.id and r.reader_id = c.uid),
          '-infinity'::timestamptz)
    ),
    case when c.as_agent then u.phone::text end,
    case when c.as_agent then u.email::text end,
    case when c.as_agent then nullif(trim(ac.display_name), '') end,
    case when c.as_agent then ac.notes end
  from mine c
  left join lateral (
    select m.body, m.sender_type, m.attachment_url, m.created_at
    from public.messages m
    where m.conversation_id = c.id
    order by m.created_at desc
    limit 1
  ) lm on true
  left join public.users u on u.id = c.user_id
  left join public.agent_contacts ac
    on ac.agent_id = c.agent_id and ac.user_id = c.user_id
  order by coalesce(lm.created_at, c.created_at) desc;
$$;

revoke all on function public.inbox_conversations() from public, anon;
grant execute on function public.inbox_conversations() to authenticated;


-- ------------------------------------------------------------
-- 5) Mark a conversation read for the caller (agent or customer)
-- ------------------------------------------------------------
create or replace function public.mark_conversation_read(p_conversation_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    return;
  end if;

  if exists (
    select 1 from public.conversations c
    where c.id = p_conversation_id
      and (c.user_id = auth.uid() or c.agent_id = public.current_agent_id())
  ) then
    insert into public.conversation_reads (conversation_id, reader_id, last_read_at)
    values (p_conversation_id, auth.uid(), now())
    on conflict (conversation_id, reader_id)
    do update set last_read_at = excluded.last_read_at;
  end if;
end;
$$;

revoke all on function public.mark_conversation_read(uuid) from public, anon;
grant execute on function public.mark_conversation_read(uuid) to authenticated;


-- ------------------------------------------------------------
-- 6) Realtime on messages (live chat + in-app new-message alerts)
-- ------------------------------------------------------------
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'messages'
  ) then
    alter publication supabase_realtime add table public.messages;
  end if;
end $$;


-- ============================================================
-- 7) DIAGNOSTICS (read-only). Run each one separately after the above.
-- ============================================================

-- A) Every agent row and whether a login with that exact email exists.
--    auth_login_email must NOT be empty for any agent. If it is, the agent's
--    email in the agents table doesn't match the email they log in with,
--    and they will see no conversations anywhere. Fix with e.g.:
--    update public.agents set email = 'Odessa@blancsins.com' where id = '...';
-- select a.id, a.full_name, a.email as agents_table_email,
--        au.email as auth_login_email, au.last_sign_in_at
-- from public.agents a
-- left join auth.users au on lower(trim(au.email)) = lower(trim(a.email))
-- order by a.full_name;

-- B) Conversations pointing at an agent_id that doesn't exist in agents.
--    Should return 0 rows.
-- select c.id, c.agent_id, c.created_at
-- from public.conversations c
-- left join public.agents a on a.id = c.agent_id
-- where a.id is null;

-- C) Messages per agent and how many are still unread by that agent.
-- select a.full_name,
--        count(m.*) filter (where m.sender_type::text = 'user') as customer_msgs,
--        count(m.*) filter (where m.sender_type::text = 'agent') as agent_replies
-- from public.agents a
-- left join public.conversations c on c.agent_id = a.id
-- left join public.messages m on m.conversation_id = c.id
-- group by a.full_name order by a.full_name;
