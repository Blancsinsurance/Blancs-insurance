"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { supabase } from "@/lib/supabase";

type Step = "phone" | "otp";

// Supabase phone auth requires E.164 (+1XXXXXXXXXX). Most users will just
// type digits (or a formatted US number), so assume US/+1 unless they've
// already typed a leading +.
function toE164(raw: string): string {
  const trimmed = raw.trim();
  if (trimmed.startsWith("+")) {
    return "+" + trimmed.slice(1).replace(/\D/g, "");
  }
  const digits = trimmed.replace(/\D/g, "");
  if (digits.length === 11 && digits.startsWith("1")) {
    return "+" + digits;
  }
  return "+1" + digits;
}

export default function SignInPage({
  params: { locale },
}: {
  params: { locale: string };
}) {
  return (
    <Suspense fallback={null}>
      <SignInForm locale={locale} />
    </Suspense>
  );
}

function SignInForm({ locale }: { locale: string }) {
  const t = useTranslations("auth");
  const router = useRouter();
  const searchParams = useSearchParams();
  const returnTo = searchParams.get("returnTo") ?? `/${locale}/messages`;

  const [step, setStep] = useState<Step>("phone");
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function sendOtp() {
    setSending(true);
    setError(null);

    console.log("🔄 Attempting OTP to:", toE164(phone));

    const { error: supabaseError } = await supabase.auth.signInWithOtp({
      phone: toE164(phone),
    });

    setSending(false);

    if (supabaseError) {
      console.error("❌ Supabase Error:", supabaseError);
      setError(supabaseError.message + (supabaseError.status ? ` (${supabaseError.status})` : ""));
      return;
    }

    console.log("✅ OTP sent successfully");
    setStep("otp");
  }

  async function verifyOtp() {
    setSending(true);
    setError(null);

    const { error: verifyError, data } = await supabase.auth.verifyOtp({
      phone: toE164(phone),
      token: otp,
      type: "sms",
    });

    setSending(false);

    if (verifyError) {
      console.error("❌ Verify Error:", verifyError);
      setError(verifyError.message);
      return;
    }

    if (data.user) {
      await supabase
        .from("users")
        .upsert({ 
          id: data.user.id, 
          phone: toE164(phone), 
          preferred_language: locale 
        });
    }

    console.log("✅ Sign in successful");
    router.push(returnTo);
  }

  return (
    <section className="mx-auto max-w-md px-6 py-20">
      <h1 className="font-display text-3xl font-semibold text-ocean-900 text-center">
        {t("title")}
      </h1>
      <p className="mt-3 text-center text-slate-600">{t("subtitle")}</p>

      <div className="mt-10 rounded-xl2 border border-ice-100 p-8 shadow-soft">
        {step === "phone" && (
          <>
            <label className="flex flex-col gap-2">
              <span className="text-sm font-medium text-ocean-900">
                {t("phoneLabel")}
              </span>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="(239) 555-0100"
                className="rounded-xl border border-ice-100 px-4 py-3 text-base"
                autoFocus
              />
            </label>

            {error && <p className="mt-3 text-sm text-red-600">{error}</p>}

            <button
              onClick={sendOtp}
              disabled={sending || phone.replace(/\D/g, "").length < 10}
              className="mt-6 w-full rounded-full bg-blancs-blue px-6 py-3.5 text-base font-semibold text-white shadow-soft hover:bg-ocean-700 transition-colors disabled:opacity-60"
            >
              {sending ? t("sendingCode") : t("sendCode")}
            </button>
          </>
        )}

        {step === "otp" && (
          <>
            <label className="flex flex-col gap-2">
              <span className="text-sm font-medium text-ocean-900">
                {t("otpLabelPrefix")} {toE164(phone)}
              </span>
              <input
                type="text"
                inputMode="numeric"
                value={otp}
                onChange={(e) => setOtp(e.target.value)}
                placeholder="123456"
                className="rounded-xl border border-ice-100 px-4 py-3 text-base tracking-widest"
                autoFocus
              />
            </label>

            {error && <p className="mt-3 text-sm text-red-600">{error}</p>}

            <button
              onClick={verifyOtp}
              disabled={sending || otp.length < 4}
              className="mt-6 w-full rounded-full bg-blancs-blue px-6 py-3.5 text-base font-semibold text-white shadow-soft hover:bg-ocean-700 transition-colors disabled:opacity-60"
            >
              {sending ? t("verifying") : t("verify")}
            </button>
          </>
        )}
      </div>
    </section>
  );
}