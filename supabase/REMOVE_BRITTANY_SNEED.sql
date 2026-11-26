-- ============================================================
-- Remove Brittany Sneed (terminated) from the database.
-- Supabase -> SQL Editor -> New query -> paste -> Run.
-- Her open customer chats move to Jimmy Saint Hillaire so no customer is
-- left messaging an empty inbox. To send them to someone else, change
-- new_agent below to that agent's id from lib/agents.ts.
-- ============================================================

-- Preview first (optional): her chats and customers who starred her
-- select id, user_id, created_at from public.conversations where agent_id = '2c4e8f6c-b349-4787-b8a6-aec5e6cf2736';
-- select id from public.users where preferred_agent_id = '2c4e8f6c-b349-4787-b8a6-aec5e6cf2736';

do $$
declare
  old_agent uuid := '2c4e8f6c-b349-4787-b8a6-aec5e6cf2736';  -- Brittany Sneed
  new_agent uuid := 'd72dc62e-250d-4a0a-aa90-73be64414aa7';  -- Jimmy Saint Hillaire
  r record;
  keep_id uuid;
begin
  -- 1) Customers who had her as preferred agent: clear it
  update public.users set preferred_agent_id = null where preferred_agent_id = old_agent;

  -- 2) Move her conversations. If the customer already has a chat with the
  --    new agent, merge the messages into that chat instead of duplicating it.
  for r in select id, user_id from public.conversations where agent_id = old_agent loop
    select id into keep_id from public.conversations
      where agent_id = new_agent and user_id = r.user_id limit 1;
    if keep_id is null then
      update public.conversations set agent_id = new_agent where id = r.id;
    else
      update public.messages set conversation_id = keep_id where conversation_id = r.id;
      delete from public.conversation_reads where conversation_id = r.id;
      delete from public.conversations where id = r.id;
    end if;
  end loop;

  -- 3) Remove her agent record (her saved contact notes go with it).
  --    After this she can no longer open any agent inbox, even if she still signs in.
  delete from public.agents where id = old_agent;
end $$;

-- 4) Then, in Supabase -> Authentication -> Users, find brittany@blancsins.com
--    and delete that user (or ban it) so the login is gone completely.

-- Check: both should return 0 rows
-- select * from public.agents where id = '2c4e8f6c-b349-4787-b8a6-aec5e6cf2736' or email ilike 'brittany%';
-- select * from public.conversations where agent_id = '2c4e8f6c-b349-4787-b8a6-aec5e6cf2736';
