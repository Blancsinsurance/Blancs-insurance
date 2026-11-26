"use client";

import { useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useAuth } from "@/components/AuthProvider";
import { useUnread } from "@/components/UnreadContext";
import InboxList from "@/components/InboxList";

export default function MessagesPage({
  params: { locale },
}: {
  params: { locale: string };
}) {
  const t = useTranslations("conversations");
  const router = useRouter();
  const { session, loading: authLoading, isAgent } = useAuth();
  const { inbox, inboxLoading, refresh } = useUnread();

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
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authLoading, session, isAgent]);

  if (authLoading || !session) return null;

  const rows = inbox.filter((r) => r.my_role === "user");

  return (
    <section className="mx-auto max-w-2xl px-6 py-16">
      <h1 className="font-display text-3xl font-semibold text-ocean-900">
        {t("title")}
      </h1>
      <p className="mt-2 text-slate-600">{t("subtitle")}</p>

      <div className="mt-10">
        {inboxLoading && rows.length === 0 && (
          <p className="text-slate-600">{t("loading")}</p>
        )}

        {!inboxLoading && rows.length === 0 && (
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

        {rows.length > 0 && (
          <InboxList
            rows={rows}
            hrefFor={(r) => `/${locale}/messages/${r.id}`}
          />
        )}
      </div>
    </section>
  );
}
