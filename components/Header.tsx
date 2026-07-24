"use client";

import { useState } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { Menu, X } from "lucide-react";
import LanguageSwitcher from "./LanguageSwitcher";
import HeaderAuthLink from "./HeaderAuthLink";

export default function Header({ locale }: { locale: string }) {
  const t = useTranslations("nav");
  const [menuOpen, setMenuOpen] = useState(false);

  const navLinks = [
    { href: `/${locale}/services`, label: t("services") },
    { href: `/${locale}/request-service`, label: t("requestService") },
    { href: `/${locale}/agents`, label: t("agents") },
    { href: `/${locale}/contact`, label: t("contact") },
  ];

  return (
    <header className="sticky top-0 z-40 bg-white/90 backdrop-blur border-b border-ice-100">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 h-20 flex items-center justify-between gap-3">
        <Link
          href={`/${locale}`}
          onClick={() => setMenuOpen(false)}
          className="font-display text-lg sm:text-xl font-semibold text-ocean-900 whitespace-nowrap"
        >
          Blancs <span className="text-blancs-blue">Insurance</span>
        </Link>

        {/* Desktop nav — only shows once there's room for everything at once */}
        <nav className="hidden lg:flex items-center gap-8 text-[15px] font-medium text-ocean-900">
          {navLinks.map((link) => (
            <Link key={link.href} href={link.href} className="hover:text-blancs-blue">
              {link.label}
            </Link>
          ))}
        </nav>

        <div className="hidden lg:flex items-center gap-4">
          <LanguageSwitcher locale={locale} />
          <HeaderAuthLink locale={locale} />
          <Link
            href={`/${locale}/contact`}
            className="inline-flex items-center rounded-full bg-blancs-blue px-5 py-2.5 text-sm font-semibold text-white shadow-soft hover:bg-ocean-700 transition-colors"
          >
            {t("cta")}
          </Link>
        </div>

        {/* Mobile / tablet: just logo, CTA, and a menu toggle — never overflows */}
        <div className="flex items-center gap-2 lg:hidden">
          <Link
            href={`/${locale}/contact`}
            className="inline-flex items-center rounded-full bg-blancs-blue px-4 py-2 text-sm font-semibold text-white shadow-soft hover:bg-ocean-700 transition-colors whitespace-nowrap"
          >
            {t("cta")}
          </Link>
          <button
            onClick={() => setMenuOpen((open) => !open)}
            aria-label={menuOpen ? "Close menu" : "Open menu"}
            aria-expanded={menuOpen}
            className="rounded-full p-2 text-ocean-900 hover:bg-ice-100 transition-colors"
          >
            {menuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
        </div>
      </div>

      {/* Mobile / tablet dropdown panel */}
      {menuOpen && (
        <div className="lg:hidden border-t border-ice-100 bg-white px-4 sm:px-6 py-5 flex flex-col gap-5">
          <nav className="flex flex-col gap-4 text-[15px] font-medium text-ocean-900">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setMenuOpen(false)}
                className="hover:text-blancs-blue"
              >
                {link.label}
              </Link>
            ))}
          </nav>
          <div className="flex items-center justify-between gap-4 pt-4 border-t border-ice-100">
            <LanguageSwitcher locale={locale} />
            <HeaderAuthLink locale={locale} />
          </div>
        </div>
      )}
    </header>
  );
}
