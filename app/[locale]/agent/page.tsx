"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useAuth } from "@/components/AuthProvider";
import { useUnread } from "@/components/UnreadContext";
import InboxList from "@/components/InboxList";

export default function AgentInboxPage({
  params: { locale },
}: {
  params: { locale: string };
}) {
  const t = useTranslations("agentPortal");
  const router = useRouter();
  const { session, loading: authLoading, agent, isAgent } = useAuth();
  const { inbox, inboxLoading, inboxError, refresh } = useUnread();

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
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authLoading, session, isAgent, locale]);

  if (authLoading || !session || !isAgent) return null;

  const rows = inbox.filter((r) => r.my_role === "agent");

  return (
    <section className="mx-auto max-w-2xl px-6 py-16">
      <h1 className="font-display text-3xl font-semibold text-ocean-900">
        {t("title")}
      </h1>
      <p className="mt-2 text-slate-600">
        {t("subtitle", { name: agent?.name ?? "" })}
      </p>

      <div className="mt-10">
        {inboxLoading && rows.length === 0 && (
          <p className="text-slate-600">{t("loading")}</p>
        )}

        {inboxError && (
          <div className="mb-6 rounded-xl2 border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            Could not load conversations ({inboxError}). If this persists, run
            MESSAGING_UPGRADE.sql in Supabase.
          </div>
        )}

        {!inboxLoading && !inboxError && rows.length === 0 && (
          <div className="rounded-xl2 bg-ice-100 p-8 text-center">
            <p className="font-semibold text-ocean-900">{t("emptyTitle")}</p>
            <p className="mt-2 text-slate-600">{t("emptyBody")}</p>
          </div>
        )}

        {rows.length > 0 && (
          <InboxList
            rows={rows}
            hrefFor={(r) => `/${locale}/agent/messages/${r.id}`}
          />
        )}
      </div>
    </section>
  );
}
