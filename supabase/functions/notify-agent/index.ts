// Supabase Edge Function: notify-agent
// Triggered by Database Webhook on public.messages INSERT
// Emails the assigned agent when a customer (sender_type = "user") sends a message.
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

    // Only notify on new customer messages
    if (payload.type !== "INSERT" || row.sender_type !== "user") {
      return json({ skipped: true, reason: "not a user message insert" });
    }

    if (!SUPABASE_URL || !SERVICE_ROLE) {
      console.error("Missing SUPABASE_URL or service role key");
      return json({ error: "server misconfigured" }, 500);
    }

    const supabase = createClient(SUPABASE_URL, SERVICE_ROLE);

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

    // optional: customer label
    let customerLabel = "A customer";
    const { data: user } = await supabase
      .from("users")
      .select("phone, email")
      .eq("id", convo.user_id)
      .maybeSingle();
    if (user?.phone) customerLabel = user.phone;
    else if (user?.email) customerLabel = user.email;

    const preview =
      row.body?.trim()?.slice(0, 280) ||
      (row.attachment_url ? "[Attachment]" : "(empty message)");

    if (!RESEND_API_KEY) {
      console.warn("RESEND_API_KEY not set — logging only");
      console.log({
        to: agent.email,
        agent: agent.full_name,
        preview,
        conversation_id: row.conversation_id,
      });
      return json({ ok: true, emailed: false, logged: true });
    }

    const subject = `New message from ${customerLabel}`;
    const html = `
      <p>Hi ${agent.full_name?.split(" ")[0] ?? "there"},</p>
      <p><strong>${customerLabel}</strong> sent you a message:</p>
      <blockquote style="border-left:3px solid #1E5AA8;padding-left:12px;color:#333;">
        ${escapeHtml(preview)}
      </blockquote>
      <p>
        <a href="https://blancs-insurance.vercel.app/en/messages/${row.conversation_id}"
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
      return json({ error: "email failed", detail: errText }, 502);
    }

    const resendBody = await resendRes.json();
    return json({ ok: true, emailed: true, id: resendBody.id });
  } catch (e) {
    console.error("notify-agent error", e);
    return json({ error: String(e) }, 500);
  }
});

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
