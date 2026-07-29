"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import { useAuth } from "./AuthProvider";
import { useUnread } from "./UnreadContext";
import { MessageCircle, LogOut, Inbox } from "lucide-react";

function UnreadPill({ count }: { count: number }) {
  if (count <= 0) return null;
  return (
    <span
      className="ml-1 inline-flex min-w-[1.25rem] items-center justify-center rounded-full bg-red-500 px-1.5 py-0.5 text-[10px] font-bold leading-none text-white"
      aria-label={`${count} unread`}
    >
      {count > 99 ? "99+" : count}
    </span>
  );
}

export default function HeaderAuthLink({ locale }: { locale: string }) {
  const { session, loading, signOut, isAgent } = useAuth();
  const { unreadCount } = useUnread();
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
          className="relative flex items-center gap-1.5 text-sm font-semibold text-ocean-900 hover:text-blancs-blue"
        >
          <span className="relative">
            <Inbox className="h-4 w-4" />
            {unreadCount > 0 && (
              <span className="absolute -right-1.5 -top-1.5 h-2.5 w-2.5 rounded-full bg-red-500 ring-2 ring-white" />
            )}
          </span>
          <span className="hidden sm:inline">{t("agentInbox")}</span>
          <UnreadPill count={unreadCount} />
        </Link>
      ) : (
        <Link
          href={`/${locale}/messages`}
          className="relative flex items-center gap-1.5 text-sm font-semibold text-ocean-900 hover:text-blancs-blue"
        >
          <span className="relative">
            <MessageCircle className="h-4 w-4" />
            {unreadCount > 0 && (
              <span className="absolute -right-1.5 -top-1.5 h-2.5 w-2.5 rounded-full bg-red-500 ring-2 ring-white" />
            )}
          </span>
          <span className="hidden sm:inline">{t("messagesLink")}</span>
          <UnreadPill count={unreadCount} />
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
