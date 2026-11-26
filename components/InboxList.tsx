"use client";

import Link from "next/link";
import { useLocale, useTranslations } from "next-intl";
import { Paperclip } from "lucide-react";
import {
  initials,
  otherPartyDetail,
  otherPartyName,
  type InboxRow,
} from "@/lib/inbox";
import { formatListTime } from "@/lib/time";

/**
 * Shared conversation list for the agent inbox and the customer
 * "Messages" page: newest activity first, last-message preview,
 * a clear timestamp and a blue unread dot.
 */
export default function InboxList({
  rows,
  hrefFor,
}: {
  rows: InboxRow[];
  hrefFor: (row: InboxRow) => string;
}) {
  const t = useTranslations("inbox");
  const tt = useTranslations("time");
  const locale = useLocale();
  const timeT = (key: string) => tt(key.replace(/^time\./, ""));

  function preview(row: InboxRow) {
    if (!row.last_message_sender) return t("noMessagesYet");
    const mine = row.last_message_sender === row.my_role;
    const text =
      row.last_message_body?.trim() ||
      (row.last_message_has_attachment ? t("attachment") : "");
    return mine ? `${t("you")}: ${text}` : text;
  }

  return (
    <ul className="flex flex-col divide-y divide-ice-100 rounded-xl2 border border-ice-100 bg-white">
      {rows.map((row) => {
        const name = otherPartyName(row, t("agent"));
        const detail = otherPartyDetail(row);
        const unread = row.unread_count > 0;
        return (
          <li key={row.id}>
            <Link
              href={hrefFor(row)}
              className={`flex items-center gap-4 px-5 py-4 transition-colors first:rounded-t-xl2 last:rounded-b-xl2 hover:bg-ice-100/60 ${
                unread ? "bg-ice-100/40" : ""
              }`}
            >
              <div
                className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-full text-sm font-semibold text-white ${
                  row.my_role === "agent" ? "bg-ocean-900" : "bg-blancs-blue"
                }`}
              >
                {initials(name)}
              </div>

              <div className="min-w-0 flex-1">
                <div className="flex items-baseline justify-between gap-3">
                  <p
                    className={`truncate text-ocean-900 ${
                      unread ? "font-bold" : "font-semibold"
                    }`}
                  >
                    {name}
                  </p>
                  <span
                    className={`shrink-0 text-xs ${
                      unread ? "font-semibold text-blancs-blue" : "text-slate-600"
                    }`}
                    title={new Date(row.last_activity_at).toLocaleString(locale)}
                  >
                    {formatListTime(row.last_activity_at, locale, timeT)}
                  </span>
                </div>
                {detail && (
                  <p className="truncate text-xs text-slate-600">{detail}</p>
                )}
                <div className="mt-0.5 flex items-center gap-2">
                  {row.last_message_has_attachment && !row.last_message_body && (
                    <Paperclip className="h-3.5 w-3.5 shrink-0 text-slate-600" />
                  )}
                  <p
                    className={`flex-1 truncate text-sm ${
                      unread ? "font-medium text-ocean-900" : "text-slate-600"
                    }`}
                  >
                    {preview(row)}
                  </p>
                  {unread && (
                    <span
                      className="flex h-5 min-w-[1.25rem] shrink-0 items-center justify-center rounded-full bg-blancs-blue px-1.5 text-[11px] font-bold text-white"
                      aria-label={t("unreadCount", { count: row.unread_count })}
                    >
                      {row.unread_count > 99 ? "99+" : row.unread_count}
                    </span>
                  )}
                </div>
              </div>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
