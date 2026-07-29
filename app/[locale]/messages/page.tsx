"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useAuth } from "@/components/AuthProvider";
import { useUnread } from "@/components/UnreadContext";
import { supabase } from "@/lib/supabase";
import { findAgent } from "@/lib/agents";

type ConversationRow = {
  id: string;
  agent_id: string;
  status: string;
  created_at: string;
};

export default function MessagesPage({
  params: { locale },
}: {
  params: { locale: string };
}) {
  const t = useTranslations("conversations");
  const router = useRouter();
  const { session, loading: authLoading, isAgent } = useAuth();
  const { unreadByConversation } = useUnread();
  const [conversations, setConversations] = useState<ConversationRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (authLoading) return;
    if (!session) {
      router.push(`/${locale}/sign-in?returnTo=/${locale}/messages`);
      return;
    }
    if (isAgent) {
      router.push(`/${locale}/agent`);
      return;
    }
    load();
  }, [authLoading, session, isAgent]);

  async function load() {
    setLoading(true);
    const { data } = await supabase
      .from("conversations")
      .select("id, agent_id, status, created_at")
      .order("created_at", { ascending: false });
    setConversations(data ?? []);
    setLoading(false);
  }

  const agentName = (agentId: string) =>
    findAgent(agentId)?.name ?? "Agent";

  if (authLoading || !session) return null;

  return (
    <section className="mx-auto max-w-2xl px-6 py-16">
      <h1 className="font-display text-3xl font-semibold text-ocean-900">
        {t("title")}
      </h1>
      <p className="mt-2 text-slate-600">{t("subtitle")}</p>

      <div className="mt-10">
        {loading && <p className="text-slate-600">{t("loading")}</p>}

        {!loading && conversations.length === 0 && (
          <div className="rounded-xl2 bg-ice-100 p-8 text-center">
            <p className="font-semibold text-ocean-900">{t("emptyTitle")}</p>
            <p className="mt-2 text-slate-600">
              {t("emptyBody")}{" "}
              <Link
                href={`/${locale}/agents`}
                className="text-blancs-blue underline"
              >
                {t("emptyLink")}
              </Link>
              .
            </p>
          </div>
        )}

        <ul className="flex flex-col gap-3">
          {conversations.map((c) => {
            const unread = unreadByConversation[c.id] ?? 0;
            return (
              <li key={c.id}>
                <Link
                  href={`/${locale}/messages/${c.id}`}
                  className={`flex items-center gap-4 rounded-xl2 border p-5 hover:shadow-soft transition-shadow ${
                    unread > 0
                      ? "border-blancs-blue/40 bg-ice-100/60"
                      : "border-ice-100"
                  }`}
                >
                  <div className="relative flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-blancs-blue font-semibold text-white">
                    {agentName(c.agent_id)
                      .split(" ")
                      .map((n) => n[0])
                      .join("")}
                    {unread > 0 && (
                      <span className="absolute -right-0.5 -top-0.5 flex h-5 min-w-[1.25rem] items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white ring-2 ring-white">
                        {unread > 99 ? "99+" : unread}
                      </span>
                    )}
                  </div>
                  <div>
                    <p
                      className={`text-ocean-900 ${
                        unread > 0 ? "font-bold" : "font-semibold"
                      }`}
                    >
                      {agentName(c.agent_id)}
                    </p>
                    <p className="text-sm text-slate-600">
                      {c.status === "open" ? t("active") : t("closed")}
                    </p>
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
}
