import { setRequestLocale } from "next-intl/server";
import ServicesGrid from "@/components/ServicesGrid";

export default function ServicesPage({
  params: { locale },
}: {
  params: { locale: string };
}) {
  setRequestLocale(locale);
  return (
    <div className="pt-10">
      <ServicesGrid />
    </div>
  );
}
