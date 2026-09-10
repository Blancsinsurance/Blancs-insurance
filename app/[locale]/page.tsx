import { setRequestLocale } from "next-intl/server";
import Hero from "@/components/Hero";
import ServicesGrid from "@/components/ServicesGrid";
import AgentsGrid from "@/components/AgentsGrid";
import AppDownload from "@/components/AppDownload";

export default function HomePage({
  params: { locale },
}: {
  params: { locale: string };
}) {
  setRequestLocale(locale);
  return (
    <>
      <Hero locale={locale} />
      <ServicesGrid />
      <AgentsGrid locale={locale} />
      <AppDownload />
    </>
  );
}
