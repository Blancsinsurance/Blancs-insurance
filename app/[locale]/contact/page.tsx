import QuoteForm from "@/components/QuoteForm";
import { useTranslations } from "next-intl";
import { setRequestLocale } from "next-intl/server";

export default function ContactPage({
  params: { locale },
  searchParams,
}: {
  params: { locale: string };
  searchParams: { agent?: string };
}) {
  setRequestLocale(locale);
  const t = useTranslations("quote");

  return (
    <section className="mx-auto max-w-3xl px-6 py-20">
      <div className="text-center mb-12">
        <h1 className="font-display text-3xl sm:text-4xl font-semibold text-ocean-900">
          {t("title")}
        </h1>
        <p className="mt-4 text-lg text-slate-600">{t("subtitle")}</p>
      </div>
      <QuoteForm preselectedAgentId={searchParams.agent} />
    </section>
  );
}
