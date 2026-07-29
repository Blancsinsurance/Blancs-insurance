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
import { usePathname } from "next/navigation";
import { useAuth } from "./AuthProvider";
import { supabase } from "@/lib/supabase";
import {
  applyTabTitle,
  getLastReadMap,
  isMessageUnread,
  setConversationLastRead,
  type LastReadMap,
} from "@/lib/unread";

type UnreadContextValue = {
  unreadCount: number;
  unreadByConversation: Record<string, number>;
  markConversationRead: (conversationId: string) => void;
  refresh: () => Promise<void>;
};

const UnreadContext = createContext<UnreadContextValue>({
  unreadCount: 0,
  unreadByConversation: {},
  markConversationRead: () => {},
  refresh: async () => {},
});

type MessageRow = {
  id: string;
  conversation_id: string;
  sender_type: "user" | "agent";
  created_at: string;
  body: string | null;
};

function conversationIdFromPath(pathname: string | null): string | null {
  if (!pathname) return null;
  // /en/messages/<uuid> or /en/agent/messages/<uuid>
  const m = pathname.match(
    /\/(?:messages|agent\/messages)\/([0-9a-f-]{36})/i
  );
  return m?.[1] ?? null;
}

export function UnreadProvider({ children }: { children: React.ReactNode }) {
  const { session, isAgent, agent, loading: authLoading } = useAuth();
  const pathname = usePathname();
  const [unreadByConversation, setUnreadByConversation] = useState<
    Record<string, number>
  >({});
  const lastReadRef = useRef<LastReadMap>({});
  const activeConvoRef = useRef<string | null>(null);
  const notifiedIdsRef = useRef<Set<string>>(new Set());

  const userId = session?.user?.id ?? null;

  // Keep active conversation in sync with route
  useEffect(() => {
    activeConvoRef.current = conversationIdFromPath(pathname);
    if (userId && activeConvoRef.current) {
      setConversationLastRead(userId, activeConvoRef.current);
      setUnreadByConversation((prev) => {
        if (!activeConvoRef.current || !prev[activeConvoRef.current]) return prev;
        const next = { ...prev };
        delete next[activeConvoRef.current];
        return next;
      });
    }
  }, [pathname, userId]);

  const recomputeFromMessages = useCallback(
    (messages: MessageRow[], lastRead: LastReadMap) => {
      const counts: Record<string, number> = {};
      for (const m of messages) {
        // Only count messages from the *other* party
        const fromOther = isAgent
          ? m.sender_type === "user"
          : m.sender_type === "agent";
        if (!fromOther) continue;
        if (activeConvoRef.current === m.conversation_id) continue;
        if (!isMessageUnread(m.created_at, m.conversation_id, lastRead)) continue;
        counts[m.conversation_id] = (counts[m.conversation_id] ?? 0) + 1;
      }
      setUnreadByConversation(counts);
    },
    [isAgent]
  );

  const refresh = useCallback(async () => {
    if (!userId || authLoading) return;

    let lastRead = getLastReadMap(userId);

    // Conversations this user can see
    let convoQuery = supabase.from("conversations").select("id");
    if (isAgent && agent?.id) {
      // Prefer DB agent id resolution is already handled on agent page;
      // filter by static agent id as best effort (RLS still applies).
      convoQuery = convoQuery.eq("agent_id", agent.id);
    } else {
      convoQuery = convoQuery.eq("user_id", userId);
    }

    const { data: convos } = await convoQuery;
    const convoIds = (convos ?? []).map((c) => c.id as string);
    if (convoIds.length === 0) {
      setUnreadByConversation({});
      return;
    }

    // First visit for this browser: seed last-read to now so only *new*
    // messages after this point count as unread (avoids flooding the badge
    // with entire history on upgrade).
    const isFirstVisit = Object.keys(lastRead).length === 0;
    if (isFirstVisit) {
      const now = new Date().toISOString();
      for (const id of convoIds) {
        lastRead[id] = now;
      }
      try {
        localStorage.setItem(
          `blancs_last_read_${userId}`,
          JSON.stringify(lastRead)
        );
      } catch {
        /* ignore */
      }
    }

    lastReadRef.current = lastRead;

    // Recent messages from the other party (cap for performance)
    const otherType = isAgent ? "user" : "agent";
    const { data: messages } = await supabase
      .from("messages")
      .select("id, conversation_id, sender_type, created_at, body")
      .in("conversation_id", convoIds)
      .eq("sender_type", otherType)
      .order("created_at", { ascending: false })
      .limit(200);

    recomputeFromMessages((messages as MessageRow[]) ?? [], lastReadRef.current);
  }, [userId, authLoading, isAgent, agent?.id, recomputeFromMessages]);

  // Initial load + when auth changes
  useEffect(() => {
    if (authLoading || !session) {
      setUnreadByConversation({});
      applyTabTitle(0);
      return;
    }
    refresh();
  }, [authLoading, session, refresh]);

  // Cross-tab last-read updates
  useEffect(() => {
    if (!userId) return;
    const onStorage = (e: StorageEvent) => {
      if (e.key === `blancs_last_read_${userId}`) refresh();
    };
    const onCustom = () => {
      lastReadRef.current = getLastReadMap(userId);
      refresh();
    };
    window.addEventListener("storage", onStorage);
    window.addEventListener("blancs-last-read", onCustom);
    return () => {
      window.removeEventListener("storage", onStorage);
      window.removeEventListener("blancs-last-read", onCustom);
    };
  }, [userId, refresh]);

  // Realtime: new messages
  useEffect(() => {
    if (!session || !userId) return;

    const channel = supabase
      .channel(`unread-global:${userId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
        },
        (payload) => {
          const m = payload.new as MessageRow;
          const fromOther = isAgent
            ? m.sender_type === "user"
            : m.sender_type === "agent";
          if (!fromOther) return;

          // If user is viewing this conversation, mark read and skip badge
          if (activeConvoRef.current === m.conversation_id) {
            setConversationLastRead(userId, m.conversation_id);
            return;
          }

          // May not belong to this user — refresh is safest (RLS filters)
          // Optimistic bump; full refresh corrects if not ours
          setUnreadByConversation((prev) => ({
            ...prev,
            [m.conversation_id]: (prev[m.conversation_id] ?? 0) + 1,
          }));

          // Browser notification (if permitted) — once per message id
          if (
            typeof Notification !== "undefined" &&
            Notification.permission === "granted" &&
            document.visibilityState === "hidden" &&
            !notifiedIdsRef.current.has(m.id)
          ) {
            notifiedIdsRef.current.add(m.id);
            const preview =
              m.body?.trim()?.slice(0, 80) || "New message";
            try {
              new Notification("Blanc's Insurance", {
                body: preview,
                tag: m.conversation_id,
              });
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
  }, [session, userId, isAgent]);

  // Tab title
  const unreadCount = useMemo(
    () =>
      Object.values(unreadByConversation).reduce((a, b) => a + b, 0),
    [unreadByConversation]
  );

  useEffect(() => {
    applyTabTitle(unreadCount);
    return () => applyTabTitle(0);
  }, [unreadCount]);

  const markConversationRead = useCallback(
    (conversationId: string) => {
      if (!userId) return;
      setConversationLastRead(userId, conversationId);
      setUnreadByConversation((prev) => {
        if (!prev[conversationId]) return prev;
        const next = { ...prev };
        delete next[conversationId];
        return next;
      });
    },
    [userId]
  );

  const value = useMemo(
    () => ({
      unreadCount,
      unreadByConversation,
      markConversationRead,
      refresh,
    }),
    [unreadCount, unreadByConversation, markConversationRead, refresh]
  );

  return (
    <UnreadContext.Provider value={value}>{children}</UnreadContext.Provider>
  );
}

export function useUnread() {
  return useContext(UnreadContext);
}
