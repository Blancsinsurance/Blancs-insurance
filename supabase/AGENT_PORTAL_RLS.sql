-- ============================================================
-- Agent portal RLS — run entire script in Supabase SQL Editor
-- ============================================================

-- 1) Helper: agent id for the signed-in user (by email)
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

-- 2) Conversations — agents can SELECT / UPDATE their assigned threads
drop policy if exists "agents_select_own_conversations" on public.conversations;
create policy "agents_select_own_conversations"
  on public.conversations
  for select
  to authenticated
  using (agent_id = public.current_agent_id());

drop policy if exists "agents_update_own_conversations" on public.conversations;
create policy "agents_update_own_conversations"
  on public.conversations
  for update
  to authenticated
  using (agent_id = public.current_agent_id());

-- 3) Messages — agents can read + insert in their threads
drop policy if exists "agents_select_messages" on public.messages;
create policy "agents_select_messages"
  on public.messages
  for select
  to authenticated
  using (
    conversation_id in (
      select id from public.conversations
      where agent_id = public.current_agent_id()
    )
  );

drop policy if exists "agents_insert_messages" on public.messages;
create policy "agents_insert_messages"
  on public.messages
  for insert
  to authenticated
  with check (
    sender_type = 'agent'
    and conversation_id in (
      select id from public.conversations
      where agent_id = public.current_agent_id()
    )
  );

-- 4) Users — agents can read contact info for customers in their threads
-- (needed so the inbox can show phone/email instead of raw uuid)
drop policy if exists "agents_select_customer_users" on public.users;
create policy "agents_select_customer_users"
  on public.users
  for select
  to authenticated
  using (
    id in (
      select user_id from public.conversations
      where agent_id = public.current_agent_id()
    )
  );

-- 5) Agents table — any authenticated user can read agent directory
-- (safe; emails/phones are already public on the website)
alter table public.agents enable row level security;
drop policy if exists "authenticated_read_agents" on public.agents;
create policy "authenticated_read_agents"
  on public.agents
  for select
  to authenticated
  using (true);

-- 6) Quick diagnostic (optional — run after signing in as agent in SQL won't work;
--    instead check in Table Editor that conversations.agent_id matches agents.id
--    for Jimmy: should be the same uuid as in lib/agents.ts)
