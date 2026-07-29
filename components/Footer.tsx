"use client";

import { useTranslations } from "next-intl";
import Link from "next/link";
import { useParams } from "next/navigation";
import { OFFICE } from "@/lib/agents";

export default function Footer() {
  const t = useTranslations("footer");
  const params = useParams();
  const locale = (params?.locale as string) || "en";

  return (
    <footer className="bg-ocean-900 text-white">
      <div className="mx-auto max-w-6xl px-6 py-14 grid gap-10 sm:grid-cols-3">
        <div>
          <p className="font-display text-lg font-semibold">Blanc's Insurance</p>
          <p className="mt-3 text-sm text-white/70">{t("officeLine")}</p>
          <p className="mt-1 font-mono text-sm">{OFFICE.phone}</p>
          <p className="mt-1 font-mono text-sm">{OFFICE.email}</p>
        </div>

        <div>
          <p className="text-sm font-semibold text-white/90">{t("hours")}</p>
          <p className="mt-3 text-sm text-white/70">{t("hoursValue")}</p>
          <p className="mt-1 text-sm text-white/70">{t("closed")}</p>
        </div>

        <div className="sm:text-right text-sm text-white/50 space-y-2">
          <div className="flex flex-col sm:items-end gap-1">
            <Link
              href={`/${locale}/privacy`}
              className="text-white/70 hover:text-white underline-offset-2 hover:underline"
            >
              {t("privacy")}
            </Link>
            <Link
              href={`/${locale}/terms`}
              className="text-white/70 hover:text-white underline-offset-2 hover:underline"
            >
              {t("terms")}
            </Link>
          </div>
          <p className="mt-4">
            © {new Date().getFullYear()} Blanc's Insurance. {t("rights")}
          </p>
        </div>
      </div>
    </footer>
  );
}
