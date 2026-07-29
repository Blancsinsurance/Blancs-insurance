"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useAuth } from "@/components/AuthProvider";
import { supabase } from "@/lib/supabase";
import { findAgentByEmail } from "@/lib/agents";

type ConversationRow = {
  id: string;
  user_id: string;
  agent_id: string;
  status: string;
  created_at: string;
  metadata?: Record<string, unknown> | null;
};

type UserLabel = {
  id: string;
  phone: string | null;
  email: string | null;
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
  const [labels, setLabels] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [resolvedAgentId, setResolvedAgentId] = useState<string | null>(null);

  useEffect(() => {
    if (authLoading) return;
    if (!session) {
      router.push(`/${locale}/sign-in?returnTo=/${locale}/agent`);
      return;
    }
    if (!isAgent) {
      router.push(`/${locale}/messages`);
      return;
    }
    resolveAndLoad();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authLoading, session, isAgent, locale]);

  async function resolveAndLoad() {
    setLoading(true);
    setError(null);

    const email = session?.user?.email;
    let agentId = agent?.id ?? findAgentByEmail(email)?.id ?? null;

    // Prefer live DB row so id always matches conversations.agent_id
    if (email) {
      const { data: dbAgent, error: agentErr } = await supabase
        .from("agents")
        .select("id, email, full_name, name")
        .ilike("email", email.trim())
        .maybeSingle();

      if (agentErr) {
        console.error("agents lookup", agentErr);
      }
      if (dbAgent?.id) {
        agentId = dbAgent.id;
      }
    }

    if (!agentId) {
      setError(
        "Could not resolve your agent profile. Sign in with the exact email on your agent record."
      );
      setLoading(false);
      return;
    }

    setResolvedAgentId(agentId);

    const { data, error: convoErr } = await supabase
      .from("conversations")
      .select("id, user_id, agent_id, status, created_at, metadata")
      .eq("agent_id", agentId)
      .order("created_at", { ascending: false });

    if (convoErr) {
      console.error("conversations", convoErr);
      setError(
        `Could not load conversations (${convoErr.message}). If this persists, run AGENT_PORTAL_RLS.sql in Supabase.`
      );
      setConversations([]);
      setLoading(false);
      return;
    }

    const rows = data ?? [];
    setConversations(rows);

    // Customer labels from users table
    const userIds = [...new Set(rows.map((r) => r.user_id).filter(Boolean))];
    if (userIds.length > 0) {
      const { data: users } = await supabase
        .from("users")
        .select("id, phone, email")
        .in("id", userIds);

      const map: Record<string, string> = {};
      (users as UserLabel[] | null)?.forEach((u) => {
        map[u.id] = u.phone || u.email || u.id.slice(0, 8) + "…";
      });
      // fallback for missing rows
      userIds.forEach((id) => {
        if (!map[id]) map[id] = id.slice(0, 8) + "…";
      });
      setLabels(map);
    }

    setLoading(false);
  }

  function customerLabel(userId: string) {
    return labels[userId] || userId.slice(0, 8) + "…";
  }

  function initials(label: string) {
    const parts = label.replace(/[^a-zA-Z0-9@+]/g, " ").trim().split(/\s+/);
    if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
    return label.slice(0, 2).toUpperCase();
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

        {error && (
          <div className="rounded-xl2 border border-red-200 bg-red-50 p-4 text-sm text-red-700 mb-6">
            {error}
          </div>
        )}

        {!loading && !error && conversations.length === 0 && (
          <div className="rounded-xl2 bg-ice-100 p-8 text-center">
            <p className="font-semibold text-ocean-900">{t("emptyTitle")}</p>
            <p className="mt-2 text-slate-600">{t("emptyBody")}</p>
            {resolvedAgentId && (
              <p className="mt-4 text-xs text-slate-400 font-mono">
                agent_id: {resolvedAgentId}
              </p>
            )}
          </div>
        )}

        <ul className="flex flex-col gap-3">
          {conversations.map((c) => {
            const label = customerLabel(c.user_id);
            return (
              <li key={c.id}>
                <Link
                  href={`/${locale}/agent/messages/${c.id}`}
                  className="flex items-center gap-4 rounded-xl2 border border-ice-100 p-5 hover:shadow-soft transition-shadow"
                >
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-ocean-900 font-semibold text-white text-sm">
                    {initials(label)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-ocean-900 truncate">
                      {label}
                    </p>
                    <p className="text-sm text-slate-600">
                      {c.status === "open" ? t("active") : t("closed")} ·{" "}
                      {new Date(c.created_at).toLocaleString()}
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
