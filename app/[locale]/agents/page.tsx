import { setRequestLocale } from "next-intl/server";
import AgentsGrid from "@/components/AgentsGrid";

export default function AgentsPage({
  params: { locale },
}: {
  params: { locale: string };
}) {
  setRequestLocale(locale);
  return (
    <div className="pt-10">
      <AgentsGrid locale={locale} />
    </div>
  );
}
