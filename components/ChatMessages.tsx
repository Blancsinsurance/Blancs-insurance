"use client";

import { Fragment } from "react";
import { useLocale, useTranslations } from "next-intl";
import { formatClock, formatDayHeader, isSameDay } from "@/lib/time";

export type ChatMessage = {
  id: string;
  conversation_id: string;
  sender_type: "user" | "agent";
  body: string | null;
  attachment_url: string | null;
  created_at: string;
};

/** Message bubbles with day separators and a time on every message. */
export default function ChatMessages({
  messages,
  mySide,
}: {
  messages: ChatMessage[];
  mySide: "user" | "agent";
}) {
  const t = useTranslations("chat");
  const tt = useTranslations("time");
  const locale = useLocale();
  const timeT = (key: string) => tt(key.replace(/^time\./, ""));

  return (
    <>
      {messages.map((m, i) => {
        const mine = m.sender_type === mySide;
        const prev = i > 0 ? messages[i - 1] : null;
        const showDay = !prev || !isSameDay(prev.created_at, m.created_at);
        return (
          <Fragment key={m.id}>
            {showDay && (
              <p className="my-2 self-center text-xs font-semibold text-slate-600">
                {formatDayHeader(m.created_at, locale, timeT)}
              </p>
            )}
            <div
              className={`max-w-[75%] rounded-xl2 px-4 py-3 text-sm ${
                mine
                  ? "self-end bg-blancs-blue text-white"
                  : "self-start bg-ice-100 text-ocean-900"
              }`}
            >
              {m.body && <p className="whitespace-pre-wrap break-words">{m.body}</p>}
              {m.attachment_url && (
                <a
                  href={m.attachment_url}
                  target="_blank"
                  rel="noreferrer"
                  className="underline text-sm"
                >
                  📎 {t("attachment")}
                </a>
              )}
              <p
                className={`mt-1 text-right text-[11px] ${
                  mine ? "text-white/80" : "text-slate-600"
                }`}
                title={new Date(m.created_at).toLocaleString(locale)}
              >
                {formatClock(m.created_at, locale)}
              </p>
            </div>
          </Fragment>
        );
      })}
    </>
  );
}
