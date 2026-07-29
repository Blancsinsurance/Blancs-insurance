"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import { useAuth } from "./AuthProvider";
import { useUnread } from "./UnreadContext";
import { MessageCircle, LogOut, Inbox } from "lucide-react";

/**
 * Count badge sits absolutely on the icon so it never expands the
 * header row when unread goes 0 → N (avoids nav / CTA spacing jumps).
 */
function IconWithBadge({
  icon,
  count,
}: {
  icon: React.ReactNode;
  count: number;
}) {
  return (
    <span className="relative inline-flex h-4 w-4 shrink-0 items-center justify-center">
      {icon}
      {count > 0 && (
        <span
          className="absolute -right-2.5 -top-2.5 flex h-4 min-w-[1rem] items-center justify-center rounded-full bg-red-500 px-1 text-[9px] font-bold leading-none text-white ring-2 ring-white"
          aria-label={`${count} unread`}
        >
          {count > 99 ? "99+" : count}
        </span>
      )}
    </span>
  );
}

export default function HeaderAuthLink({ locale }: { locale: string }) {
  const { session, loading, signOut, isAgent } = useAuth();
  const { unreadCount } = useUnread();
  const t = useTranslations("nav");

  // Reserve a stable width while auth resolves so the header doesn't jump
  if (loading) return <div className="w-24 shrink-0" aria-hidden="true" />;

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
          className="flex items-center gap-1.5 text-sm font-semibold text-ocean-900 hover:text-blancs-blue whitespace-nowrap"
        >
          <IconWithBadge
            count={unreadCount}
            icon={<Inbox className="h-4 w-4" />}
          />
          <span className="hidden sm:inline">{t("agentInbox")}</span>
        </Link>
      ) : (
        <Link
          href={`/${locale}/messages`}
          className="flex items-center gap-1.5 text-sm font-semibold text-ocean-900 hover:text-blancs-blue whitespace-nowrap"
        >
          <IconWithBadge
            count={unreadCount}
            icon={<MessageCircle className="h-4 w-4" />}
          />
          <span className="hidden sm:inline">{t("messagesLink")}</span>
        </Link>
      )}
      <button
        onClick={() => signOut()}
        aria-label="Sign out"
        className="text-slate-600 hover:text-ocean-900 shrink-0"
      >
        <LogOut className="h-4 w-4" />
      </button>
    </div>
  );
}