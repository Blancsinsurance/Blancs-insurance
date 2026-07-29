"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { ArrowLeft, Paperclip, Send } from "lucide-react";
import { useAuth } from "@/components/AuthProvider";
import { supabase } from "@/lib/supabase";

type Message = {
  id: string;
  conversation_id: string;
  sender_type: "user" | "agent";
  body: string | null;
  attachment_url: string | null;
  created_at: string;
};

export default function AgentChatPage({
  params: { locale, conversationId },
}: {
  params: { locale: string; conversationId: string };
}) {
  const t = useTranslations("agentPortal");
  const chatT = useTranslations("chat");
  const router = useRouter();
  const { session, loading: authLoading, agent, isAgent } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [draft, setDraft] = useState("");
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

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
    // Confirm this conversation belongs to this agent
    if (agent) {
      const { data: convo } = await supabase
        .from("conversations")
        .select("id, agent_id")
        .eq("id", conversationId)
        .maybeSingle();
      if (convo && convo.agent_id !== agent.id) {
        router.push(`/${locale}/agent`);
        return;
      }
    }

    const { data } = await supabase
      .from("messages")
      .select("*")
      .eq("conversation_id", conversationId)
      .order("created_at", { ascending: true });
    setMessages(data ?? []);
  }, [conversationId, agent, locale, router]);

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
          setMessages((prev) => [...prev, payload.new as Message]);
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
    if (!draft.trim() || !session || !agent) return;
    const body = draft.trim();
    setDraft("");
    await supabase.from("messages").insert({
      conversation_id: conversationId,
      sender_type: "agent",
      sender_id: session.user.id,
      body,
    });
  }

  async function attachFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !session || !agent) return;
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
      sender_type: "agent",
      sender_id: session.user.id,
      attachment_url: publicUrl.publicUrl,
    });
  }

  if (authLoading || !session || !isAgent) return null;

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
        <h1 className="font-display text-xl font-semibold text-ocean-900">
          {t("chatTitle")}
        </h1>
      </div>

      <div className="flex-1 overflow-y-auto py-6 flex flex-col gap-3">
        {messages.map((m) => (
          <div
            key={m.id}
            className={`max-w-[75%] rounded-xl2 px-4 py-3 text-sm ${
              m.sender_type === "agent"
                ? "self-end bg-blancs-blue text-white"
                : "self-start bg-ice-100 text-ocean-900"
            }`}
          >
            {m.body && <p>{m.body}</p>}
            {m.attachment_url && (
              <a
                href={m.attachment_url}
                target="_blank"
                rel="noreferrer"
                className="underline text-sm"
              >
                📎 {chatT("attachment")}
              </a>
            )}
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

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
