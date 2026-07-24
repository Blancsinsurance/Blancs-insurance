import { setRequestLocale } from "next-intl/server";
import RequestService from "@/components/RequestService";

export default function RequestServicePage({
  params: { locale },
}: {
  params: { locale: string };
}) {
  setRequestLocale(locale);
  return <RequestService locale={locale} />;
}