import Link from "next/link";
import { useTranslations } from "next-intl";
import LanguageSwitcher from "./LanguageSwitcher";
import HeaderAuthLink from "./HeaderAuthLink";
import { OFFICE } from "@/lib/agents";

export default function Header({ locale }: { locale: string }) {
  const t = useTranslations("nav");

  return (
    <header className="sticky top-0 z-40 bg-white/90 backdrop-blur border-b border-ice-100">
      <div className="mx-auto max-w-6xl px-6 h-20 flex items-center justify-between">
        <Link
          href={`/${locale}`}
          className="font-display text-xl font-semibold text-ocean-900"
        >
          Blancs <span className="text-blancs-blue">Insurance</span>
        </Link>

        <nav className="hidden md:flex items-center gap-8 text-[15px] font-medium text-ocean-900">
          <Link href={`/${locale}/services`} className="hover:text-blancs-blue">
            {t("services")}
          </Link>
          <Link href={`/${locale}/agents`} className="hover:text-blancs-blue">
            {t("agents")}
          </Link>
          <Link href={`/${locale}/contact`} className="hover:text-blancs-blue">
            {t("contact")}
          </Link>
        </nav>

        <div className="flex items-center gap-3 sm:gap-4">
          <LanguageSwitcher locale={locale} />
          <HeaderAuthLink locale={locale} />
          <a
            href={`tel:${OFFICE.phone.replace(/[^0-9+]/g, "")}`}
            className="hidden sm:inline-flex items-center rounded-full bg-blancs-blue px-5 py-2.5 text-sm font-semibold text-white shadow-soft hover:bg-ocean-700 transition-colors"
          >
            {t("cta")}
          </a>
        </div>
      </div>
    </header>
  );
}
