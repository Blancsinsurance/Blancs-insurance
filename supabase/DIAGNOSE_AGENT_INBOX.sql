-- Run these one at a time to debug empty agent inbox

-- A) Jimmy's row in agents table
select id, email, full_name, name from public.agents
where lower(email) like '%agency%' or lower(email) like '%jimmy%'
   or lower(coalesce(full_name, name, '')) like '%jimmy%';

-- B) Conversations assigned to Jimmy (replace UUID if different)
select id, user_id, agent_id, status, created_at
from public.conversations
order by created_at desc
limit 20;

-- C) Do agent_ids in conversations exist in agents?
select c.id as conversation_id, c.agent_id, a.email, coalesce(a.full_name, a.name) as agent_name
from public.conversations c
left join public.agents a on a.id = c.agent_id
order by c.created_at desc
limit 20;
