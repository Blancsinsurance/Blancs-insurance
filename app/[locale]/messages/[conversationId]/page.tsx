"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Paperclip, Send } from "lucide-react";
import { useAuth } from "@/components/AuthProvider";
import { supabase } from "@/lib/supabase";
import { findAgent } from "@/lib/agents";
import { useUnread } from "@/components/UnreadContext";
import ChatMessages from "@/components/ChatMessages";

type Message = {
  id: string;
  conversation_id: string;
  sender_type: "user" | "agent";
  body: string | null;
  attachment_url: string | null;
  created_at: string;
};

export default function ChatPage({
  params: { locale, conversationId },
}: {
  params: { locale: string; conversationId: string };
}) {
  const t = useTranslations("chat");
  const router = useRouter();
  const { session, loading: authLoading } = useAuth();
  const { markConversationRead } = useUnread();
  const [sendError, setSendError] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [agentId, setAgentId] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (authLoading) return;
    if (!session) {
      router.push(
        `/${locale}/sign-in?returnTo=/${locale}/messages/${conversationId}`
      );
    }
  }, [authLoading, session]);

  const loadMessages = useCallback(async () => {
    const { data: convo } = await supabase
      .from("conversations")
      .select("agent_id")
      .eq("id", conversationId)
      .maybeSingle();
    setAgentId(convo?.agent_id ?? null);

    const { data } = await supabase
      .from("messages")
      .select("*")
      .eq("conversation_id", conversationId)
      .order("created_at", { ascending: true });
    setMessages(data ?? []);
    markConversationRead(conversationId);
  }, [conversationId, markConversationRead]);

  useEffect(() => {
    if (!session) return;
    loadMessages();

    const channel = supabase
      .channel(`messages:${conversationId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
          filter: `conversation_id=eq.${conversationId}`,
        },
        (payload) => {
          const m = payload.new as Message;
          setMessages((prev) =>
            prev.some((p) => p.id === m.id) ? prev : [...prev, m]
          );
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [session, conversationId, loadMessages]);

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
      sender_type: "user",
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

    const path = `${conversationId}/${Date.now()}-${file.name}`;
    const { data: uploaded, error } = await supabase.storage
      .from("chat-attachments")
      .upload(path, file);

    setUploading(false);
    if (error || !uploaded) return;

    const { data: publicUrl } = supabase.storage
      .from("chat-attachments")
      .getPublicUrl(uploaded.path);

    await supabase.from("messages").insert({
      conversation_id: conversationId,
      sender_type: "user",
      sender_id: session.user.id,
      attachment_url: publicUrl.publicUrl,
    });
  }

  const agentName = findAgent(agentId)?.name ?? "Agent";

  if (authLoading || !session) return null;

  return (
    <section className="mx-auto max-w-2xl px-6 py-10 flex flex-col h-[calc(100vh-80px)]">
      <h1 className="font-display text-xl font-semibold text-ocean-900 pb-4 border-b border-ice-100">
        {agentName}
      </h1>

      <div className="flex-1 overflow-y-auto py-6 flex flex-col gap-3">
        <ChatMessages messages={messages} mySide="user" />
        <div ref={bottomRef} />
      </div>

      {sendError && (
        <p className="mb-2 text-sm text-red-700">
          {t("notSent")} ({sendError})
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
          placeholder={t("placeholder")}
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
