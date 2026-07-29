"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useAuth } from "@/components/AuthProvider";
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
          {conversations.map((c) => (
            <li key={c.id}>
              <Link
                href={`/${locale}/messages/${c.id}`}
                className="flex items-center gap-4 rounded-xl2 border border-ice-100 p-5 hover:shadow-soft transition-shadow"
              >
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-blancs-blue font-semibold text-white">
                  {agentName(c.agent_id)
                    .split(" ")
                    .map((n) => n[0])
                    .join("")}
                </div>
                <div>
                  <p className="font-semibold text-ocean-900">
                    {agentName(c.agent_id)}
                  </p>
                  <p className="text-sm text-slate-600">
                    {c.status === "open" ? t("active") : t("closed")}
                  </p>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
