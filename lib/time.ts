type T = (key: string, vars?: Record<string, string | number>) => string;

function intlLocale(locale: string) {
  // Haitian Creole has patchy Intl support on devices; French formats match.
  return locale === "ht" ? "fr" : locale;
}

function startOfDay(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
}

function daysAgo(d: Date) {
  return Math.round((startOfDay(new Date()) - startOfDay(d)) / 86400000);
}

export function formatClock(iso: string, locale: string) {
  return new Date(iso).toLocaleTimeString(intlLocale(locale), {
    hour: "numeric",
    minute: "2-digit",
  });
}

/** Inbox list: "3:42 PM", "Yesterday", "Tue", "Nov 3", "Nov 3, 2025" */
export function formatListTime(iso: string, locale: string, t: T) {
  const d = new Date(iso);
  const diff = daysAgo(d);
  const loc = intlLocale(locale);
  if (diff <= 0) return formatClock(iso, locale);
  if (diff === 1) return t("time.yesterday");
  if (diff < 7) return d.toLocaleDateString(loc, { weekday: "short" });
  if (d.getFullYear() === new Date().getFullYear()) {
    return d.toLocaleDateString(loc, { month: "short", day: "numeric" });
  }
  return d.toLocaleDateString(loc, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

/** Chat day separator: "Today", "Yesterday", "Monday, November 3" */
export function formatDayHeader(iso: string, locale: string, t: T) {
  const d = new Date(iso);
  const diff = daysAgo(d);
  const loc = intlLocale(locale);
  if (diff <= 0) return t("time.today");
  if (diff === 1) return t("time.yesterday");
  const sameYear = d.getFullYear() === new Date().getFullYear();
  return d.toLocaleDateString(loc, {
    weekday: "long",
    month: "long",
    day: "numeric",
    ...(sameYear ? {} : { year: "numeric" }),
  });
}

export function isSameDay(a: string, b: string) {
  return startOfDay(new Date(a)) === startOfDay(new Date(b));
}
