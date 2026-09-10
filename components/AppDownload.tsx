import { useTranslations } from "next-intl";

const APP_STORE_URL =
  "https://apps.apple.com/us/app/blancs-insurance/id6797543448";
const GOOGLE_PLAY_URL =
  "https://play.google.com/store/apps/details?id=com.blancsinsurance.app";

export default function AppDownload() {
  const t = useTranslations("appDownload");

  return (
    <section className="bg-ocean-900">
      <div className="mx-auto max-w-6xl px-6 py-16 sm:py-20 flex flex-col lg:flex-row items-center justify-between gap-10">
        <div className="text-center lg:text-left max-w-xl">
          <p className="inline-block rounded-full bg-white/10 px-4 py-1.5 text-sm font-medium text-white/90">
            {t("eyebrow")}
          </p>
          <h2 className="mt-5 font-display text-3xl sm:text-4xl font-semibold text-white text-balance">
            {t("title")}
          </h2>
          <p className="mt-4 text-lg text-white/70">{t("subtitle")}</p>
        </div>

        <div className="flex flex-col sm:flex-row items-center gap-4 shrink-0">
          <a
            href={APP_STORE_URL}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={t("appStoreAria")}
            className="inline-flex items-center gap-3 rounded-xl2 bg-white px-6 py-3.5 shadow-soft hover:bg-ice-100 transition-colors"
          >
            <svg
              viewBox="0 0 24 24"
              className="h-8 w-8 text-ocean-900"
              fill="currentColor"
              aria-hidden="true"
            >
              <path d="M16.365 1.43c0 1.14-.463 2.083-1.223 2.803-.83.79-2.13 1.4-3.18 1.32-.14-1.09.47-2.24 1.19-2.95.79-.79 2.15-1.37 3.14-1.17.02.16.07.32.07 0zM20.5 17.34c-.5 1.16-1.11 2.31-2 3.36-.9 1.07-1.85 2.13-3.2 2.15-1.32.02-1.75-.78-3.26-.78-1.51 0-1.99.76-3.24.8-1.3.05-2.3-1.16-3.21-2.22-1.86-2.17-3.29-6.13-1.38-8.82.95-1.34 2.64-2.19 4.49-2.22 1.28-.02 2.48.86 3.26.86.77 0 2.24-1.06 3.78-.9.64.03 2.45.26 3.62 1.94-.09.06-2.16 1.26-2.14 3.76.03 2.99 2.62 3.99 2.65 4.03z" />
            </svg>
            <span className="flex flex-col items-start leading-tight">
              <span className="text-[11px] text-slate-600">
                {t("downloadOn")}
              </span>
              <span className="text-lg font-semibold text-ocean-900 -mt-0.5">
                App Store
              </span>
            </span>
          </a>

          <a
            href={GOOGLE_PLAY_URL}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={t("googlePlayAria")}
            className="inline-flex items-center gap-3 rounded-xl2 bg-white px-6 py-3.5 shadow-soft hover:bg-ice-100 transition-colors"
          >
            <svg viewBox="0 0 24 24" className="h-8 w-8" aria-hidden="true">
              <path
                d="M3.6 2.4c-.4.4-.6.9-.6 1.6v16c0 .7.2 1.2.6 1.6l.1.1L13 12.1v-.2L3.7 2.3l-.1.1z"
                fill="#00D9FF"
              />
              <path
                d="M16.1 15.2 13 12.1v-.2l3.1-3.1 6.5 3.7c.6.4.9.9.9 1.5s-.3 1.1-.9 1.5l-6.5 3.7z"
                fill="#FFCA28"
              />
              <path
                d="M16.1 15.2 13 12l-9.4 9.6c.35.36.95.4 1.6.05l10.9-6.45z"
                fill="#FF3D3D"
              />
              <path
                d="M16.1 8.8 5.2 2.35c-.65-.35-1.25-.3-1.6.05L13 12l3.1-3.2z"
                fill="#00E676"
              />
            </svg>
            <span className="flex flex-col items-start leading-tight">
              <span className="text-[11px] text-slate-600">
                {t("getItOn")}
              </span>
              <span className="text-lg font-semibold text-ocean-900 -mt-0.5">
                Google Play
              </span>
            </span>
          </a>
        </div>
      </div>
    </section>
  );
}
