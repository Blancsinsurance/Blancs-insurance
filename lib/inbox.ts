import { supabase } from "@/lib/supabase";
import { findAgent, findAgentByEmail } from "@/lib/agents";

/**
 * One row of the inbox, as returned by the `inbox_conversations()` RPC
 * (see supabase/MESSAGING_UPGRADE.sql in the web repo). The same RPC is
 * used by the website, so web and app always show the same conversations,
 * the same order and the same unread state.
 */
export type InboxRow = {
  id: string;
  my_role: "agent" | "user";
  user_id: string;
  agent_id: string;
  status: string;
  created_at: string;
  last_activity_at: string;
  last_message_body: string | null;
  last_message_sender: "agent" | "user" | null;
  last_message_has_attachment: boolean;
  unread_count: number;
  customer_phone: string | null;
  customer_email: string | null;
  contact_name: string | null;
  contact_notes: string | null;
};

export async function fetchInbox(): Promise<{
  rows: InboxRow[];
  error: string | null;
}> {
  const { data, error } = await supabase.rpc("inbox_conversations");
  if (error) {
    console.error("[inbox] inbox_conversations failed:", error);
    return { rows: [], error: error.message };
  }
  return { rows: (data as InboxRow[]) ?? [], error: null };
}

export async function markConversationRead(conversationId: string) {
  const { error } = await supabase.rpc("mark_conversation_read", {
    p_conversation_id: conversationId,
  });
  if (error) console.error("[inbox] mark_conversation_read failed:", error);
}

/** Agent saves a name / notes for the customer on the other end. */
export async function saveContactDetails(
  agentId: string,
  userId: string,
  displayName: string,
  notes: string
): Promise<{ error: string | null }> {
  const { error } = await supabase.from("agent_contacts").upsert(
    {
      agent_id: agentId,
      user_id: userId,
      display_name: displayName.trim() || null,
      notes: notes.trim() || null,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "agent_id,user_id" }
  );
  if (error) {
    console.error("[inbox] save contact failed:", error);
    return { error: error.message };
  }
  return { error: null };
}

/** Pretty-print a US E.164 number: +12395551234 -> (239) 555-1234 */
export function formatPhone(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const digits = raw.replace(/\D/g, "");
  const ten = digits.length === 11 && digits.startsWith("1") ? digits.slice(1) : digits;
  if (ten.length === 10) {
    return `(${ten.slice(0, 3)}) ${ten.slice(3, 6)}-${ten.slice(6)}`;
  }
  return raw;
}

/** Name shown for the other person in a conversation. */
export function otherPartyName(row: InboxRow, fallback: string): string {
  if (row.my_role === "agent") {
    return (
      row.contact_name ||
      formatPhone(row.customer_phone) ||
      row.customer_email ||
      fallback
    );
  }
  return findAgent(row.agent_id)?.name ?? fallback;
}

/** Secondary line under a saved contact name (their phone/email). */
export function otherPartyDetail(row: InboxRow): string | null {
  if (row.my_role !== "agent" || !row.contact_name) return null;
  return formatPhone(row.customer_phone) || row.customer_email || null;
}

export function initials(label: string): string {
  const trimmed = label.trim();
  if (!trimmed) return "?";
  // Phone numbers have no useful initials.
  if (/^[\s()+\-\d]+$/.test(trimmed)) return "#";
  const parts = trimmed.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return trimmed.slice(0, 2).toUpperCase();
}

/**
 * Agent id for the signed-in user, or null for customers. Prefers the live
 * `agents` table row (that is what conversations.agent_id points at) and
 * falls back to the bundled list.
 */
export async function resolveMyAgentId(
  email: string | null | undefined
): Promise<string | null> {
  if (!email) return null;
  const { data } = await supabase
    .from("agents")
    .select("id")
    .ilike("email", email.trim())
    .maybeSingle();
  if (data?.id) return data.id as string;
  return findAgentByEmail(email)?.id ?? null;
}
