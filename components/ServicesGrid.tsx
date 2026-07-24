import { useTranslations } from "next-intl";

const KEYS = ["business", "home", "auto", "flood", "boat"] as const;

export default function ServicesGrid() {
  const t = useTranslations("services");

  return (
    <section className="mx-auto max-w-6xl px-6 py-20">
      <div className="text-center max-w-2xl mx-auto">
        <h2 className="font-display text-3xl sm:text-4xl font-semibold text-ocean-900">
          {t("title")}
        </h2>
        <p className="mt-4 text-lg text-slate-600">{t("subtitle")}</p>
      </div>

      <div className="mt-14 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {KEYS.map((key) => (
          <div
            key={key}
            className="rounded-xl2 bg-ice-100 p-8 hover:bg-white hover:shadow-soft transition-all"
          >
            <h3 className="font-display text-xl font-semibold text-ocean-900">
              {t(key)}
            </h3>
            <p className="mt-3 text-slate-600 leading-relaxed">
              {t(`${key}Desc`)}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}
