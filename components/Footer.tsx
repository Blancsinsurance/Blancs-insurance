import { useTranslations } from "next-intl";
import { OFFICE } from "@/lib/agents";

export default function Footer() {
  const t = useTranslations("footer");

  return (
    <footer className="bg-ocean-900 text-white">
      <div className="mx-auto max-w-6xl px-6 py-14 grid gap-10 sm:grid-cols-3">
        <div>
          <p className="font-display text-lg font-semibold">
            Blancs Insurance
          </p>
          <p className="mt-3 text-sm text-white/70">{t("officeLine")}</p>
          <p className="mt-1 font-mono text-sm">{OFFICE.phone}</p>
          <p className="mt-1 font-mono text-sm">{OFFICE.email}</p>
        </div>

        <div>
          <p className="text-sm font-semibold text-white/90">{t("hours")}</p>
          <p className="mt-3 text-sm text-white/70">{t("hoursValue")}</p>
          <p className="mt-1 text-sm text-white/70">{t("closed")}</p>
        </div>

        <div className="sm:text-right text-sm text-white/50">
          © {new Date().getFullYear()} Blancs Insurance. {t("rights")}
        </div>
      </div>
    </footer>
  );
}
