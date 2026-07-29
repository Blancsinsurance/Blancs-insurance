"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useAuth } from "@/components/AuthProvider";
import { supabase } from "@/lib/supabase";

type ConversationRow = {
  id: string;
  user_id: string;
  agent_id: string;
  status: string;
  created_at: string;
  metadata?: Record<string, unknown> | null;
};

export default function AgentInboxPage({
  params: { locale },
}: {
  params: { locale: string };
}) {
  const t = useTranslations("agentPortal");
  const router = useRouter();
  const { session, loading: authLoading, agent, isAgent } = useAuth();
  const [conversations, setConversations] = useState<ConversationRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (authLoading) return;
    if (!session) {
      router.push(`/${locale}/sign-in?returnTo=/${locale}/agent`);
      return;
    }
    if (!isAgent || !agent) {
      router.push(`/${locale}/messages`);
      return;
    }
    load(agent.id);
  }, [authLoading, session, isAgent, agent, locale, router]);

  async function load(agentId: string) {
    setLoading(true);
    const { data } = await supabase
      .from("conversations")
      .select("id, user_id, agent_id, status, created_at, metadata")
      .eq("agent_id", agentId)
      .order("created_at", { ascending: false });
    setConversations(data ?? []);
    setLoading(false);
  }

  if (authLoading || !session || !isAgent) return null;

  return (
    <section className="mx-auto max-w-2xl px-6 py-16">
      <h1 className="font-display text-3xl font-semibold text-ocean-900">
        {t("title")}
      </h1>
      <p className="mt-2 text-slate-600">
        {t("subtitle", { name: agent?.name ?? "" })}
      </p>

      <div className="mt-10">
        {loading && <p className="text-slate-600">{t("loading")}</p>}

        {!loading && conversations.length === 0 && (
          <div className="rounded-xl2 bg-ice-100 p-8 text-center">
            <p className="font-semibold text-ocean-900">{t("emptyTitle")}</p>
            <p className="mt-2 text-slate-600">{t("emptyBody")}</p>
          </div>
        )}

        <ul className="flex flex-col gap-3">
          {conversations.map((c) => (
            <li key={c.id}>
              <Link
                href={`/${locale}/agent/messages/${c.id}`}
                className="flex items-center gap-4 rounded-xl2 border border-ice-100 p-5 hover:shadow-soft transition-shadow"
              >
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-ocean-900 font-semibold text-white text-sm">
                  {c.user_id.slice(0, 2).toUpperCase()}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-ocean-900 truncate">
                    {t("customer")} · {c.user_id.slice(0, 8)}…
                  </p>
                  <p className="text-sm text-slate-600">
                    {c.status === "open" ? t("active") : t("closed")} ·{" "}
                    {new Date(c.created_at).toLocaleString()}
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
