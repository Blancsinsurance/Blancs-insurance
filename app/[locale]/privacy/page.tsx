import { useTranslations } from "next-intl";
import { setRequestLocale } from "next-intl/server";
import { OFFICE } from "@/lib/agents";

export default function PrivacyPage({
  params: { locale },
}: {
  params: { locale: string };
}) {
  setRequestLocale(locale);
  const t = useTranslations("privacy");

  return (
    <section className="mx-auto max-w-3xl px-6 py-20">
      <h1 className="font-display text-3xl sm:text-4xl font-semibold text-ocean-900">
        {t("title")}
      </h1>
      <p className="mt-2 text-sm text-slate-500">{t("lastUpdated")}</p>

      <div className="mt-10 prose prose-slate max-w-none space-y-8 text-slate-700 leading-relaxed">
        <section>
          <h2 className="font-display text-xl font-semibold text-ocean-900">
            {t("introTitle")}
          </h2>
          <p className="mt-3">{t("introBody")}</p>
        </section>

        <section>
          <h2 className="font-display text-xl font-semibold text-ocean-900">
            {t("collectTitle")}
          </h2>
          <p className="mt-3">{t("collectBody")}</p>
          <ul className="mt-3 list-disc pl-6 space-y-1">
            <li>{t("collectItem1")}</li>
            <li>{t("collectItem2")}</li>
            <li>{t("collectItem3")}</li>
            <li>{t("collectItem4")}</li>
          </ul>
        </section>

        <section>
          <h2 className="font-display text-xl font-semibold text-ocean-900">
            {t("useTitle")}
          </h2>
          <p className="mt-3">{t("useBody")}</p>
          <ul className="mt-3 list-disc pl-6 space-y-1">
            <li>{t("useItem1")}</li>
            <li>{t("useItem2")}</li>
            <li>{t("useItem3")}</li>
            <li>{t("useItem4")}</li>
          </ul>
        </section>

        <section>
          <h2 className="font-display text-xl font-semibold text-ocean-900">
            {t("smsTitle")}
          </h2>
          <p className="mt-3 font-medium text-ocean-900">{t("smsBody")}</p>
          <p className="mt-3">{t("smsDetail")}</p>
        </section>

        <section>
          <h2 className="font-display text-xl font-semibold text-ocean-900">
            {t("shareTitle")}
          </h2>
          <p className="mt-3">{t("shareBody")}</p>
        </section>

        <section>
          <h2 className="font-display text-xl font-semibold text-ocean-900">
            {t("retainTitle")}
          </h2>
          <p className="mt-3">{t("retainBody")}</p>
        </section>

        <section>
          <h2 className="font-display text-xl font-semibold text-ocean-900">
            {t("rightsTitle")}
          </h2>
          <p className="mt-3">{t("rightsBody")}</p>
        </section>

        <section>
          <h2 className="font-display text-xl font-semibold text-ocean-900">
            {t("securityTitle")}
          </h2>
          <p className="mt-3">{t("securityBody")}</p>
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
