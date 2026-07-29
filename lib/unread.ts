/**
 * Client-side last-read tracking for unread message badges.
 * Stored per signed-in user in localStorage (no schema change required).
 */

const STORAGE_PREFIX = "blancs_last_read_";

export type LastReadMap = Record<string, string>; // conversationId -> ISO timestamp

function storageKey(userId: string) {
  return `${STORAGE_PREFIX}${userId}`;
}

export function getLastReadMap(userId: string): LastReadMap {
  if (typeof window === "undefined") return {};
  try {
    const raw = localStorage.getItem(storageKey(userId));
    if (!raw) return {};
    const parsed = JSON.parse(raw) as LastReadMap;
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

export function setConversationLastRead(
  userId: string,
  conversationId: string,
  when: Date = new Date()
) {
  if (typeof window === "undefined") return;
  const map = getLastReadMap(userId);
  map[conversationId] = when.toISOString();
  localStorage.setItem(storageKey(userId), JSON.stringify(map));
  // Notify other tabs / listeners
  window.dispatchEvent(
    new CustomEvent("blancs-last-read", {
      detail: { userId, conversationId, at: map[conversationId] },
    })
  );
}

export function isMessageUnread(
  messageCreatedAt: string,
  conversationId: string,
  lastReadMap: LastReadMap
): boolean {
  const last = lastReadMap[conversationId];
  if (!last) return true; // never opened → treat as unread until opened
  return new Date(messageCreatedAt).getTime() > new Date(last).getTime();
}

export const DEFAULT_TITLE = "Blanc's Insurance — Real People, Real Coverage";

export function applyTabTitle(unreadCount: number, baseTitle = DEFAULT_TITLE) {
  if (typeof document === "undefined") return;
  if (unreadCount > 0) {
    const n = unreadCount > 99 ? "99+" : String(unreadCount);
    document.title = `(${n}) ${baseTitle}`;
  } else {
    document.title = baseTitle;
  }
}
