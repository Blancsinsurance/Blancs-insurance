"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import { useAuth } from "./AuthProvider";
import { MessageCircle, LogOut, Inbox } from "lucide-react";

export default function HeaderAuthLink({ locale }: { locale: string }) {
  const { session, loading, signOut, isAgent } = useAuth();
  const t = useTranslations("nav");

  if (loading) return <div className="w-24" aria-hidden="true" />;

  if (!session) {
    return (
      <Link
        href={`/${locale}/sign-in`}
        className="text-sm font-semibold text-ocean-900 hover:text-blancs-blue whitespace-nowrap"
      >
        {t("signIn")}
      </Link>
    );
  }

  return (
    <div className="flex items-center gap-4">
      {isAgent ? (
        <Link
          href={`/${locale}/agent`}
          className="flex items-center gap-1.5 text-sm font-semibold text-ocean-900 hover:text-blancs-blue"
        >
          <Inbox className="h-4 w-4" />
          <span className="hidden sm:inline">{t("agentInbox")}</span>
        </Link>
      ) : (
        <Link
          href={`/${locale}/messages`}
          className="flex items-center gap-1.5 text-sm font-semibold text-ocean-900 hover:text-blancs-blue"
        >
          <MessageCircle className="h-4 w-4" />
          <span className="hidden sm:inline">{t("messagesLink")}</span>
        </Link>
      )}
      <button
        onClick={() => signOut()}
        aria-label="Sign out"
        className="text-slate-600 hover:text-ocean-900"
      >
        <LogOut className="h-4 w-4" />
      </button>
    </div>
  );
}
