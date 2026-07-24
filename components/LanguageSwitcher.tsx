"use client";

import { usePathname, useRouter } from "next/navigation";
import { locales, localeLabels, type Locale } from "@/i18n";

export default function LanguageSwitcher({ locale }: { locale: string }) {
  const router = useRouter();
  const pathname = usePathname();

  function switchTo(next: Locale) {
    const segments = pathname.split("/");
    segments[1] = next; // first segment after leading slash is the locale
    router.push(segments.join("/"));
  }

  return (
    <div className="flex items-center gap-1 rounded-full bg-ice-100 p-1">
      {locales.map((l) => (
        <button
          key={l}
          onClick={() => switchTo(l)}
          aria-current={l === locale}
          className={`px-3 py-1.5 text-sm font-medium rounded-full transition-colors ${
            l === locale
              ? "bg-blancs-blue text-white"
              : "text-ocean-900 hover:bg-white"
          }`}
        >
          {localeLabels[l]}
        </button>
      ))}
    </div>
  );
}
