"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { X } from "lucide-react";
import { useAuth } from "./AuthProvider";
import { supabase } from "@/lib/supabase";
import { applyTabTitle } from "@/lib/unread";
import {
  fetchInbox,
  markConversationRead as markReadRpc,
  otherPartyName,
  resolveMyAgentId,
  type InboxRow,
} from "@/lib/inbox";

/**
 * Unread state now lives in Supabase (conversation_reads + the
 * inbox_conversations() RPC), so the website and the mobile app share the
 * same unread dots, the same order and the same conversations.
 */
type UnreadContextValue = {
  unreadCount: number;
  unreadByConversation: Record<string, number>;
  inbox: InboxRow[];
  inboxLoading: boolean;
  inboxError: string | null;
  /** Live agents-table id for the signed-in agent (null for customers). */
  myAgentId: string | null;
  markConversationRead: (conversationId: string) => void;
  refresh: () => Promise<InboxRow[]>;
};

const UnreadContext = createContext<UnreadContextValue>({
  unreadCount: 0,
  unreadByConversation: {},
  inbox: [],
  inboxLoading: true,
  inboxError: null,
  myAgentId: null,
  markConversationRead: () => {},
  refresh: async () => [],
});

type MessageRow = {
  id: string;
  conversation_id: string;
  sender_type: "user" | "agent";
  created_at: string;
  body: string | null;
  attachment_url: string | null;
};

type Toast = { conversationId: string; title: string; body: string; href: string };

function conversationIdFromPath(pathname: string | null): string | null {
  if (!pathname) return null;
  // /en/messages/<uuid> or /en/agent/messages/<uuid>
  const m = pathname.match(/\/(?:messages|agent\/messages)\/([0-9a-f-]{36})/i);
  return m?.[1] ?? null;
}

export function UnreadProvider({ children }: { children: React.ReactNode }) {
  const { session, loading: authLoading } = useAuth();
  const pathname = usePathname();
  const locale = useLocale();
  const t = useTranslations("inbox");
  const [inbox, setInbox] = useState<InboxRow[]>([]);
  const [inboxLoading, setInboxLoading] = useState(true);
  const [inboxError, setInboxError] = useState<string | null>(null);
  const [myAgentId, setMyAgentId] = useState<string | null>(null);
  const [toast, setToast] = useState<Toast | null>(null);
  const activeConvoRef = useRef<string | null>(null);
  const notifiedIdsRef = useRef<Set<string>>(new Set());

  const userId = session?.user?.id ?? null;
  const email = session?.user?.email ?? null;

  useEffect(() => {
    let cancelled = false;
    setMyAgentId(null);
    if (!email) return;
    resolveMyAgentId(email).then((id) => {
      if (!cancelled) setMyAgentId(id);
    });
    return () => {
      cancelled = true;
    };
  }, [email]);

  const refresh = useCallback(async () => {
    if (!userId) {
      setInbox([]);
      setInboxLoading(false);
      return [];
    }
    const { rows, error } = await fetchInbox();
    const active = activeConvoRef.current;
    const adjusted = active
      ? rows.map((r) => (r.id === active ? { ...r, unread_count: 0 } : r))
      : rows;
    setInbox(adjusted);
    setInboxError(error);
    setInboxLoading(false);
    return adjusted;
  }, [userId]);

  // Keep active conversation in sync with route; opening one marks it read.
  useEffect(() => {
    const prev = activeConvoRef.current;
    const next = conversationIdFromPath(pathname);
    activeConvoRef.current = next;
    if (!userId) return;
    if (prev && prev !== next) markReadRpc(prev);
    if (next) {
      setInbox((rows) =>
        rows.map((r) => (r.id === next ? { ...r, unread_count: 0 } : r))
      );
      setToast((tst) => (tst?.conversationId === next ? null : tst));
      markReadRpc(next);
    }
  }, [pathname, userId]);

  // Initial load + when auth changes
  useEffect(() => {
    if (authLoading) return;
    if (!session) {
      setInbox([]);
      applyTabTitle(0);
      return;
    }
    setInboxLoading(true);
    refresh();
  }, [authLoading, session, refresh]);

  // Refresh when the tab regains focus (covers sleeping laptops etc.)
  useEffect(() => {
    if (!userId) return;
    const onVisible = () => {
      if (document.visibilityState === "visible") refresh();
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
  }, [userId, refresh]);

  // Realtime: new messages (RLS limits the stream to my conversations)
  useEffect(() => {
    if (!session || !userId) return;

    const channel = supabase
      .channel(`unread-global:${userId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "messages" },
        async (payload) => {
          const m = payload.new as MessageRow;
          if (notifiedIdsRef.current.has(m.id)) return;
          notifiedIdsRef.current.add(m.id);

          const rows = await refresh();
          const row = rows.find((r) => r.id === m.conversation_id);
          if (!row) return;
          const fromOther = m.sender_type !== row.my_role;
          if (!fromOther) return;

          if (activeConvoRef.current === m.conversation_id) {
            markReadRpc(m.conversation_id);
            return;
          }

          const title = otherPartyName(row, t("agent"));
          const preview =
            m.body?.trim()?.slice(0, 120) ||
            (m.attachment_url ? t("attachment") : t("newMessage"));
          const href =
            row.my_role === "agent"
              ? `/${locale}/agent/messages/${m.conversation_id}`
              : `/${locale}/messages/${m.conversation_id}`;

          setToast({ conversationId: m.conversation_id, title, body: preview, href });

          // Browser notification when the tab is in the background
          if (
            typeof Notification !== "undefined" &&
            Notification.permission === "granted" &&
            document.visibilityState === "hidden"
          ) {
            try {
              new Notification(title, { body: preview, tag: m.conversation_id });
            } catch {
              /* ignore */
            }
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [session, userId, refresh, locale, t]);

  // Auto-hide toast
  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(null), 6000);
    return () => clearTimeout(timer);
  }, [toast]);

  const unreadByConversation = useMemo(() => {
    const map: Record<string, number> = {};
    for (const r of inbox) if (r.unread_count > 0) map[r.id] = r.unread_count;
    return map;
  }, [inbox]);

  const unreadCount = useMemo(
    () => inbox.reduce((a, r) => a + (r.unread_count || 0), 0),
    [inbox]
  );

  useEffect(() => {
    applyTabTitle(unreadCount);
    return () => applyTabTitle(0);
  }, [unreadCount]);

  const markConversationRead = useCallback((conversationId: string) => {
    setInbox((rows) =>
      rows.map((r) => (r.id === conversationId ? { ...r, unread_count: 0 } : r))
    );
    markReadRpc(conversationId);
  }, []);

  const value = useMemo(
    () => ({
      unreadCount,
      unreadByConversation,
      inbox,
      inboxLoading,
      inboxError,
      myAgentId,
      markConversationRead,
      refresh,
    }),
    [
      unreadCount,
      unreadByConversation,
      inbox,
      inboxLoading,
      inboxError,
      myAgentId,
      markConversationRead,
      refresh,
    ]
  );

  return (
    <UnreadContext.Provider value={value}>
      {children}
      {toast && (
        <div
          role="status"
          aria-live="polite"
          className="fixed bottom-5 right-5 z-50 w-[calc(100%-2.5rem)] max-w-sm"
        >
          <div className="flex items-start gap-3 rounded-xl2 border border-ice-100 bg-white p-4 shadow-soft">
            <span className="mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full bg-blancs-blue" />
            <Link
              href={toast.href}
              onClick={() => setToast(null)}
              className="min-w-0 flex-1"
            >
              <p className="truncate text-sm font-semibold text-ocean-900">
                {toast.title}
              </p>
              <p className="mt-0.5 line-clamp-2 text-sm text-slate-600">
                {toast.body}
              </p>
            </Link>
            <button
              onClick={() => setToast(null)}
              aria-label={t("dismiss")}
              className="rounded-full p-1 text-slate-600 hover:bg-ice-100"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}
    </UnreadContext.Provider>
  );
}

export function useUnread() {
  return useContext(UnreadContext);
}
