"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { ArrowLeft, Paperclip, Send, UserPen } from "lucide-react";
import { useAuth } from "@/components/AuthProvider";
import { useUnread } from "@/components/UnreadContext";
import ChatMessages, { type ChatMessage } from "@/components/ChatMessages";
import { supabase } from "@/lib/supabase";
import { formatPhone, saveContactDetails } from "@/lib/inbox";

type ConversationInfo = { id: string; user_id: string; agent_id: string };

export default function AgentChatPage({
  params: { locale, conversationId },
}: {
  params: { locale: string; conversationId: string };
}) {
  const t = useTranslations("agentPortal");
  const chatT = useTranslations("chat");
  const inboxT = useTranslations("inbox");
  const router = useRouter();
  const { session, loading: authLoading, isAgent } = useAuth();
  const { inbox, myAgentId, refresh, markConversationRead } = useUnread();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [convo, setConvo] = useState<ConversationInfo | null>(null);
  const [draft, setDraft] = useState("");
  const [uploading, setUploading] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const [editName, setEditName] = useState("");
  const [editNotes, setEditNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  const row = inbox.find((r) => r.id === conversationId);

  useEffect(() => {
    if (authLoading) return;
    if (!session) {
      router.push(
        `/${locale}/sign-in?returnTo=/${locale}/agent/messages/${conversationId}`
      );
      return;
    }
    if (!isAgent) {
      router.push(`/${locale}/messages`);
    }
  }, [authLoading, session, isAgent, locale, conversationId, router]);

  const loadMessages = useCallback(async () => {
    // RLS only returns this conversation if it's assigned to the signed-in
    // agent, so no extra id comparison is needed (the old check compared
    // against the bundled agent list and could bounce agents back to the
    // inbox when it differed from the live agents table).
    const { data: c } = await supabase
      .from("conversations")
      .select("id, user_id, agent_id")
      .eq("id", conversationId)
      .maybeSingle();
    if (!c) {
      router.push(`/${locale}/agent`);
      return;
    }
    setConvo(c as ConversationInfo);

    const { data, error } = await supabase
      .from("messages")
      .select("*")
      .eq("conversation_id", conversationId)
      .order("created_at", { ascending: true });
    if (error) console.error("messages", error);
    setMessages(data ?? []);
    markConversationRead(conversationId);
  }, [conversationId, locale, router, markConversationRead]);

  useEffect(() => {
    if (!session || !isAgent) return;
    loadMessages();

    const channel = supabase
      .channel(`agent-messages:${conversationId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
          filter: `conversation_id=eq.${conversationId}`,
        },
        (payload) => {
          const m = payload.new as ChatMessage;
          setMessages((prev) =>
            prev.some((p) => p.id === m.id) ? prev : [...prev, m]
          );
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [session, isAgent, conversationId, loadMessages]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function sendMessage() {
    if (!draft.trim() || !session) return;
    const body = draft.trim();
    setDraft("");
    setSendError(null);
    const { error } = await supabase.from("messages").insert({
      conversation_id: conversationId,
      sender_type: "agent",
      sender_id: session.user.id,
      body,
    });
    if (error) {
      console.error("send", error);
      setSendError(error.message);
      setDraft(body);
    }
  }

  async function attachFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !session) return;
    setUploading(true);
    setSendError(null);

    const path = `${conversationId}/${Date.now()}-${file.name}`;
    const { data: uploaded, error } = await supabase.storage
      .from("chat-attachments")
      .upload(path, file);

    setUploading(false);
    if (error || !uploaded) {
      setSendError(error?.message ?? "Upload failed");
      return;
    }

    const { data: publicUrl } = supabase.storage
      .from("chat-attachments")
      .getPublicUrl(uploaded.path);

    const { error: insertError } = await supabase.from("messages").insert({
      conversation_id: conversationId,
      sender_type: "agent",
      sender_id: session.user.id,
      attachment_url: publicUrl.publicUrl,
    });
    if (insertError) setSendError(insertError.message);
  }

  function openEditor() {
    setEditName(row?.contact_name ?? "");
    setEditNotes(row?.contact_notes ?? "");
    setEditing(true);
  }

  async function saveContact() {
    const agentId = myAgentId ?? convo?.agent_id;
    if (!convo || !agentId) return;
    setSaving(true);
    const { error } = await saveContactDetails(
      agentId,
      convo.user_id,
      editName,
      editNotes
    );
    setSaving(false);
    if (error) {
      setSendError(error);
      return;
    }
    setEditing(false);
    refresh();
  }

  if (authLoading || !session || !isAgent) return null;

  const phone = formatPhone(row?.customer_phone);
  const title =
    row?.contact_name || phone || row?.customer_email || t("chatTitle");
  const subtitle = row?.contact_name ? phone || row?.customer_email : null;

  return (
    <section className="mx-auto max-w-2xl px-6 py-10 flex flex-col h-[calc(100vh-80px)]">
      <div className="flex items-center gap-3 pb-4 border-b border-ice-100">
        <Link
          href={`/${locale}/agent`}
          className="rounded-full p-2 text-ocean-900 hover:bg-ice-100"
          aria-label="Back to inbox"
        >
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div className="min-w-0 flex-1">
          <h1 className="truncate font-display text-xl font-semibold text-ocean-900">
            {title}
          </h1>
          {subtitle && (
            <p className="truncate text-sm text-slate-600">{subtitle}</p>
          )}
        </div>
        <button
          onClick={openEditor}
          className="flex shrink-0 items-center gap-1.5 rounded-full border border-ice-100 px-3 py-1.5 text-sm font-semibold text-blancs-blue hover:bg-ice-100"
        >
          <UserPen className="h-4 w-4" />
          {row?.contact_name ? inboxT("edit") : inboxT("addName")}
        </button>
      </div>

      {editing ? (
        <div className="mt-4 rounded-xl2 border border-ice-100 bg-ice-100/50 p-4">
          <p className="font-semibold text-ocean-900">{inboxT("editContact")}</p>
          <label className="mt-3 block text-sm font-medium text-ocean-900">
            {inboxT("nameLabel")}
            <input
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              placeholder={inboxT("namePlaceholder")}
              maxLength={80}
              className="mt-1 w-full rounded-xl2 border border-ice-100 bg-white px-4 py-2.5 text-sm font-normal"
            />
          </label>
          <label className="mt-3 block text-sm font-medium text-ocean-900">
            {inboxT("notesLabel")}
            <textarea
              value={editNotes}
              onChange={(e) => setEditNotes(e.target.value)}
              placeholder={inboxT("notesPlaceholder")}
              maxLength={500}
              rows={3}
              className="mt-1 w-full resize-none rounded-xl2 border border-ice-100 bg-white px-4 py-2.5 text-sm font-normal"
            />
          </label>
          <div className="mt-3 flex justify-end gap-2">
            <button
              onClick={() => setEditing(false)}
              className="rounded-full px-4 py-2 text-sm font-semibold text-ocean-900 hover:bg-ice-100"
            >
              {inboxT("cancel")}
            </button>
            <button
              onClick={saveContact}
              disabled={saving}
              className="rounded-full bg-blancs-blue px-5 py-2 text-sm font-semibold text-white hover:bg-ocean-700 disabled:opacity-60"
            >
              {inboxT("save")}
            </button>
          </div>
        </div>
      ) : (
        row?.contact_notes && (
          <p className="mt-3 rounded-xl2 bg-ice-100/60 px-4 py-2 text-sm text-slate-600">
            {row.contact_notes}
          </p>
        )
      )}

      <div className="flex-1 overflow-y-auto py-6 flex flex-col gap-3">
        <ChatMessages messages={messages} mySide="agent" />
        <div ref={bottomRef} />
      </div>

      {sendError && (
        <p className="mb-2 text-sm text-red-700">
          {chatT("notSent")} ({sendError})
        </p>
      )}

      <div className="flex items-end gap-3 border-t border-ice-100 pt-4">
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*,application/pdf"
          onChange={attachFile}
          className="hidden"
        />
        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
          aria-label="Attach a file"
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-ice-100 text-blancs-blue hover:bg-ice-100"
        >
          <Paperclip className="h-5 w-5" />
        </button>
        <textarea
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              sendMessage();
            }
          }}
          rows={1}
          placeholder={chatT("placeholder")}
          className="flex-1 resize-none rounded-xl2 bg-ice-100 px-4 py-3 text-sm"
        />
        <button
          onClick={sendMessage}
          aria-label="Send message"
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-blancs-blue text-white hover:bg-ocean-700"
        >
          <Send className="h-5 w-5" />
        </button>
      </div>
    </section>
  );
}
