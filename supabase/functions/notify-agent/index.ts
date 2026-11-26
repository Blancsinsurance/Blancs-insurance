// Supabase Edge Function: notify-agent
// Triggered by Database Webhook on public.messages INSERT
//  - Customer message (sender_type = "user"): emails the assigned agent AND
//    sends a push notification to the agent's phone (Blanc's app).
//  - Agent reply (sender_type = "agent"): sends a push notification to the
//    customer's phone, if they have the app with notifications on.
//
// Secrets required (Dashboard → Edge Functions → Secrets):
//   RESEND_API_KEY          – https://resend.com API key
//   NOTIFY_FROM_EMAIL       – e.g. "Blanc's Insurance <Agency@blancsins.com>"
//   SUPABASE_URL            – auto-available, or set explicitly
//   SUPABASE_SERVICE_ROLE_KEY – service role (bypass RLS for lookups)

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY") ?? "";
const FROM_EMAIL =
  Deno.env.get("NOTIFY_FROM_EMAIL") ??
  "Blanc's Insurance <Agency@blancsins.com>";
const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SERVICE_ROLE =
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ??
  Deno.env.get("SERVICE_ROLE_KEY") ??
  "";

type WebhookPayload = {
  type: "INSERT" | "UPDATE" | "DELETE";
  table: string;
  record: {
    id: string;
    conversation_id: string;
    sender_type: "user" | "agent";
    sender_id: string | null;
    body: string | null;
    attachment_url: string | null;
    created_at: string;
  };
  old_record: null | Record<string, unknown>;
};

Deno.serve(async (req) => {
  try {
    if (req.method !== "POST") {
      return new Response("Method not allowed", { status: 405 });
    }

    const payload = (await req.json()) as WebhookPayload;
    const row = payload.record;

    if (payload.type !== "INSERT" || payload.table !== "messages") {
      return json({ skipped: true, reason: "not a message insert" });
    }

    if (!SUPABASE_URL || !SERVICE_ROLE) {
      console.error("Missing SUPABASE_URL or service role key");
      return json({ error: "server misconfigured" }, 500);
    }

    const supabase = createClient(SUPABASE_URL, SERVICE_ROLE);

    // Agent replied -> push the customer, then stop.
    if (row.sender_type === "agent") {
      return json(await pushCustomer(supabase, row));
    }
    if (row.sender_type !== "user") {
      return json({ skipped: true, reason: "unknown sender_type" });
    }

    // conversation → agent_id
    const { data: convo, error: convoErr } = await supabase
      .from("conversations")
      .select("id, agent_id, user_id")
      .eq("id", row.conversation_id)
      .maybeSingle();

    if (convoErr || !convo?.agent_id) {
      console.error("conversation lookup failed", convoErr);
      return json({ error: "conversation not found" }, 404);
    }

    // agent contact info
    const { data: agent, error: agentErr } = await supabase
      .from("agents")
      .select("id, full_name, email, phone")
      .eq("id", convo.agent_id)
      .maybeSingle();

    if (agentErr || !agent?.email) {
      console.error("agent lookup failed", agentErr);
      return json({ error: "agent email not found" }, 404);
    }

    // Customer label: the name the agent saved, else phone, else email.
    let customerLabel = "A customer";
    const { data: user } = await supabase
      .from("users")
      .select("phone, email")
      .eq("id", convo.user_id)
      .maybeSingle();
    if (user?.phone) customerLabel = user.phone;
    else if (user?.email) customerLabel = user.email;
    const { data: savedContact } = await supabase
      .from("agent_contacts")
      .select("display_name")
      .eq("agent_id", convo.agent_id)
      .eq("user_id", convo.user_id)
      .maybeSingle();
    if (savedContact?.display_name?.trim()) {
      customerLabel = savedContact.display_name.trim();
    }

    const preview =
      row.body?.trim()?.slice(0, 280) ||
      (row.attachment_url ? "[Attachment]" : "(empty message)");

    // Push to the agent's phone (any device signed in with the agent email).
    const pushResult = await pushToEmail(supabase, agent.email, {
      title: customerLabel,
      body: preview.slice(0, 160),
      conversationId: row.conversation_id,
    });

    if (!RESEND_API_KEY) {
      console.warn("RESEND_API_KEY not set — logging only");
      console.log({
        to: agent.email,
        agent: agent.full_name,
        preview,
        conversation_id: row.conversation_id,
      });
      return json({ ok: true, emailed: false, logged: true, push: pushResult });
    }

    const subject = `New message from ${customerLabel}`;
    const html = `
      <p>Hi ${agent.full_name?.split(" ")[0] ?? "there"},</p>
      <p><strong>${customerLabel}</strong> sent you a message:</p>
      <blockquote style="border-left:3px solid #1E5AA8;padding-left:12px;color:#333;">
        ${escapeHtml(preview)}
      </blockquote>
      <p>
        <a href="https://blancs-insurance.vercel.app/en/agent/messages/${row.conversation_id}"
           style="display:inline-block;background:#1E5AA8;color:#fff;padding:10px 18px;border-radius:999px;text-decoration:none;">
          Open conversation
        </a>
      </p>
      <p style="color:#666;font-size:12px;">Blanc's Insurance messaging</p>
    `;

    const resendRes = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: FROM_EMAIL,
        to: [agent.email],
        subject,
        html,
      }),
    });

    if (!resendRes.ok) {
      const errText = await resendRes.text();
      console.error("Resend error", resendRes.status, errText);
      return json({ error: "email failed", detail: errText, push: pushResult }, 502);
    }

    const resendBody = await resendRes.json();
    return json({ ok: true, emailed: true, id: resendBody.id, push: pushResult });
  } catch (e) {
    console.error("notify-agent error", e);
    return json({ error: String(e) }, 500);
  }
});

// ---------- Expo push helpers ----------

type Push = { title: string; body: string; conversationId: string };

// deno-lint-ignore no-explicit-any
type Client = any;

async function sendExpoPush(tokens: string[], push: Push) {
  const valid = [...new Set(tokens)].filter((t) =>
    /^Expo(nent)?PushToken\[.+\]$/.test(t)
  );
  if (valid.length === 0) return { sent: 0 };
  const res = await fetch("https://exp.host/--/api/v2/push/send", {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify(
      valid.map((to) => ({
        to,
        title: push.title,
        body: push.body,
        sound: "default",
        channelId: "default",
        data: { type: "message", conversationId: push.conversationId },
      }))
    ),
  });
  if (!res.ok) {
    const detail = await res.text();
    console.error("Expo push error", res.status, detail);
    return { sent: 0, error: detail };
  }
  return { sent: valid.length };
}

async function pushToEmail(supabase: Client, email: string, push: Push) {
  try {
    const { data } = await supabase
      .from("users")
      .select("expo_push_token, notifications_enabled")
      .ilike("email", email.trim());
    const tokens = (data ?? [])
      .filter((u: { notifications_enabled: boolean | null }) => u.notifications_enabled !== false)
      .map((u: { expo_push_token: string | null }) => u.expo_push_token)
      .filter(Boolean) as string[];
    return await sendExpoPush(tokens, push);
  } catch (e) {
    console.error("pushToEmail failed", e);
    return { sent: 0, error: String(e) };
  }
}

async function pushCustomer(supabase: Client, row: WebhookPayload["record"]) {
  try {
    const { data: convo } = await supabase
      .from("conversations")
      .select("user_id, agent_id")
      .eq("id", row.conversation_id)
      .maybeSingle();
    if (!convo?.user_id) return { skipped: true, reason: "no customer" };

    const { data: user } = await supabase
      .from("users")
      .select("expo_push_token, notifications_enabled")
      .eq("id", convo.user_id)
      .maybeSingle();
    if (!user?.expo_push_token || user.notifications_enabled === false) {
      return { skipped: true, reason: "customer has no push token" };
    }

    const { data: agent } = await supabase
      .from("agents")
      .select("full_name")
      .eq("id", convo.agent_id)
      .maybeSingle();

    const preview =
      row.body?.trim()?.slice(0, 160) ||
      (row.attachment_url ? "Sent you a photo" : "New message");
    const push = await sendExpoPush([user.expo_push_token], {
      title: agent?.full_name ?? "Blanc's Insurance",
      body: preview,
      conversationId: row.conversation_id,
    });
    return { ok: true, push };
  } catch (e) {
    console.error("pushCustomer failed", e);
    return { error: String(e) };
  }
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function escapeHtml(s: string) {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
