import { useTranslations } from "next-intl";
import { setRequestLocale } from "next-intl/server";
import { OFFICE } from "@/lib/agents";

export default function TermsPage({
  params: { locale },
}: {
  params: { locale: string };
}) {
  setRequestLocale(locale);
  const t = useTranslations("terms");

  return (
    <section className="mx-auto max-w-3xl px-6 py-20">
      <h1 className="font-display text-3xl sm:text-4xl font-semibold text-ocean-900">
        {t("title")}
      </h1>
      <p className="mt-2 text-sm text-slate-500">{t("lastUpdated")}</p>

      <div className="mt-10 prose prose-slate max-w-none space-y-8 text-slate-700 leading-relaxed">
        <section>
          <h2 className="font-display text-xl font-semibold text-ocean-900">
            {t("agreementTitle")}
          </h2>
          <p className="mt-3">{t("agreementBody")}</p>
        </section>

        <section>
          <h2 className="font-display text-xl font-semibold text-ocean-900">
            {t("servicesTitle")}
          </h2>
          <p className="mt-3">{t("servicesBody")}</p>
        </section>

        <section>
          <h2 className="font-display text-xl font-semibold text-ocean-900">
            {t("messagingTitle")}
          </h2>
          <p className="mt-3">{t("messagingBody")}</p>
          <ul className="mt-3 list-disc pl-6 space-y-1">
            <li>{t("messagingItem1")}</li>
            <li>{t("messagingItem2")}</li>
            <li>{t("messagingItem3")}</li>
            <li>{t("messagingItem4")}</li>
          </ul>
          <p className="mt-3">{t("messagingRates")}</p>
        </section>

        <section>
          <h2 className="font-display text-xl font-semibold text-ocean-900">
            {t("optOutTitle")}
          </h2>
          <p className="mt-3">{t("optOutBody")}</p>
        </section>

        <section>
          <h2 className="font-display text-xl font-semibold text-ocean-900">
            {t("eligibilityTitle")}
          </h2>
          <p className="mt-3">{t("eligibilityBody")}</p>
        </section>

        <section>
          <h2 className="font-display text-xl font-semibold text-ocean-900">
            {t("disclaimerTitle")}
          </h2>
          <p className="mt-3">{t("disclaimerBody")}</p>
        </section>

        <section>
          <h2 className="font-display text-xl font-semibold text-ocean-900">
            {t("liabilityTitle")}
          </h2>
          <p className="mt-3">{t("liabilityBody")}</p>
        </section>

        <section>
          <h2 className="font-display text-xl font-semibold text-ocean-900">
            {t("changesTitle")}
          </h2>
          <p className="mt-3">{t("changesBody")}</p>
        </section>

        <section>
          <h2 className="font-display text-xl font-semibold text-ocean-900">
            {t("governingTitle")}
          </h2>
          <p className="mt-3">{t("governingBody")}</p>
        </section>

        <section>
          <h2 className="font-display text-xl font-semibold text-ocean-900">
            {t("contactTitle")}
          </h2>
          <p className="mt-3">
            {t("contactBody")}{" "}
            <a
              href={`mailto:${OFFICE.email}`}
              className="text-blancs-blue underline"
            >
              {OFFICE.email}
            </a>{" "}
            {t("orCall")} {OFFICE.phone}.
          </p>
        </section>
      </div>
    </section>
  );
}
