# Agent message notifications

When a **customer** inserts a row into `public.messages` with `sender_type = 'user'`,
Supabase fires a **Database Webhook** that calls the `notify-agent` Edge Function.
The function looks up the conversation’s agent and emails them via [Resend](https://resend.com).

This works for the website **and** any mobile app that writes to the same `messages` table.

---

## 1. Create a Resend account (email)

1. Sign up at https://resend.com
2. Add and verify your domain (or use their onboarding domain for testing)
3. Create an API key → copy it

## 2. Deploy the Edge Function

From the repo root (or install Supabase CLI once):

```bash
npm i -g supabase
supabase login
supabase link --project-ref zojyeyvgnrroqrzdjewf
```

Set secrets:

```bash
supabase secrets set RESEND_API_KEY=re_xxxxxxxx
supabase secrets set NOTIFY_FROM_EMAIL="Blanc's Insurance <Agency@blancsins.com>"
```

`SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` are usually injected automatically;
if not, set them too from Project Settings → API.

Deploy:

```bash
supabase functions deploy notify-agent --no-verify-jwt
```

(`--no-verify-jwt` is required so the Database Webhook can call the function
without a user JWT. The function uses the **service role** for DB reads.)

## 3. Database Webhook (Dashboard)

Supabase Dashboard → **Database** → **Webhooks** → **Create a new hook**

| Field | Value |
|-------|--------|
| Name | `notify-agent-on-message` |
| Table | `messages` |
| Events | **Insert** only |
| Type | Supabase Edge Function |
| Edge Function | `notify-agent` |
| HTTP method | POST |
| Timeout | 5000 ms |

Optional filter (if the UI supports it): only when `sender_type = 'user'`.
The function already skips non-user inserts, so a plain Insert hook is fine.

Save.

## 4. RLS / agents table

The function uses the **service role**, so it bypasses RLS. It expects:

- `conversations.agent_id` → `agents.id`
- `agents.email` populated (your Table Editor already has emails)

Confirm column names match. If your agents table uses `full_name` (as in the
dashboard screenshot), the function already selects `full_name`. If the column
is only `name`, change the select in `notify-agent/index.ts`.

## 5. Test

1. Sign in on the site as a customer
2. Message Jimmy (or any agent)
3. Supabase → Edge Functions → `notify-agent` → Logs  
   should show a successful run
4. Agent inbox should receive the email

Manual test (optional):

```bash
curl -X POST "https://zojyeyvgnrroqrzdjewf.supabase.co/functions/v1/notify-agent" \
  -H "Content-Type: application/json" \
  -d '{
    "type": "INSERT",
    "table": "messages",
    "record": {
      "id": "00000000-0000-0000-0000-000000000001",
      "conversation_id": "<real-conversation-uuid>",
      "sender_type": "user",
      "sender_id": null,
      "body": "Test notification",
      "attachment_url": null,
      "created_at": "2026-07-29T15:00:00Z"
    },
    "old_record": null
  }'
```

## 6. Later: SMS / push

- **SMS**: in the same function, after the email block, call Twilio with `agent.phone`.
- **Push**: store device tokens (mobile app) in e.g. `agent_devices`, then call FCM/APNs from this function.

Email is enough to start; mobile push can plug into the same webhook later.
