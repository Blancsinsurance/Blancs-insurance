-- Agent portal RLS policies
-- Run this once in Supabase SQL Editor.
-- Allows signed-in agents (email matches agents.email) to read/write
-- conversations and messages assigned to them.

-- Helper: resolve agent id for the current auth user by email
create or replace function public.current_agent_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select id
  from public.agents
  where lower(email) = lower(coalesce(auth.jwt() ->> 'email', ''))
  limit 1;
$$;

-- Conversations: agents can see rows where they are the assigned agent
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

-- Messages: agents can read messages in their conversations
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

-- Messages: agents can insert replies as sender_type = agent
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

-- Optional: allow agents to upload to chat-attachments (if storage RLS is strict)
-- Adjust bucket policies in Dashboard → Storage if uploads fail.
