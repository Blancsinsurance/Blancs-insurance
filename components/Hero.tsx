import { useTranslations } from "next-intl";
import Link from "next/link";
import WaveSeal from "./WaveSeal";
import Seal from "./Seal";

export default function Hero({ locale }: { locale: string }) {
  const t = useTranslations("hero");
  const trust = useTranslations("trust");

  return (
    <section className="bg-gradient-to-b from-ice-100 to-white">
      <div className="mx-auto max-w-5xl px-6 pt-20 pb-16 text-center">
        <p className="inline-block rounded-full bg-white px-4 py-1.5 text-sm font-medium text-blancs-blue shadow-soft">
          {t("eyebrow")}
        </p>

        <h1 className="mt-6 font-display text-4xl sm:text-5xl md:text-6xl font-semibold leading-[1.08] text-ocean-900 text-balance">
          {t("title")}
        </h1>

        <p className="mt-6 max-w-2xl mx-auto text-lg text-slate-600">
          {t("subtitle")}
        </p>

        <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
          <Link
            href={`/${locale}/agents`}
            className="w-full sm:w-auto text-center rounded-full bg-blancs-blue px-8 py-4 text-base font-semibold text-white shadow-soft hover:bg-ocean-700 transition-colors"
          >
            {t("primaryCta")}
          </Link>
          <Link
            href={`/${locale}/contact`}
            className="w-full sm:w-auto text-center rounded-full border-2 border-blancs-blue px-8 py-4 text-base font-semibold text-blancs-blue hover:bg-ice-100 transition-colors"
          >
            {t("secondaryCta")}
          </Link>
          <Link
            href={`/${locale}/request-service`}
            className="w-full sm:w-auto text-center rounded-full border-2 border-blancs-blue px-8 py-4 text-base font-semibold text-blancs-blue hover:bg-ice-100 transition-colors"
          >
            {t("tertiaryCta")}
          </Link>
        </div>

        <div className="mt-14 flex flex-col sm:flex-row items-center justify-center gap-6 sm:gap-10">
          <Seal label={trust("line1")} />
          <Seal label={trust("line2")} />
          <Seal label={trust("line3")} />
        </div>
      </div>
      <WaveSeal />
    </section>
  );
}
