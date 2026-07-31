"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useState } from "react";
import { useTranslations } from "next-intl";
import Link from "next/link";
import { useParams } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { findAgent } from "@/lib/agents";

const schema = z.object({
  firstName: z.string().min(1, "Required"),
  lastName: z.string().min(1, "Required"),
  policyType: z.enum(["commercial", "home", "auto", "flood", "boat"]),
  phone: z.string().min(7, "Enter a valid phone number"),
  email: z.string().email("Enter a valid email"),
  description: z.string().optional(),
  // Kept as two SEPARATE, independent opt-ins per Twilio A2P 10DLC rule
  // (Error 30913): marketing consent must never be bundled with
  // informational/transactional consent in a single checkbox.
  smsConsentInformational: z.boolean().optional().default(false),
  smsConsentMarketing: z.boolean().optional().default(false),
});

type FormValues = z.infer<typeof schema>;

export default function QuoteForm({
  preselectedAgentId,
}: {
  preselectedAgentId?: string;
}) {
  const t = useTranslations("quote");
  const params = useParams();
  const locale = (params?.locale as string) || "en";
  const [submitted, setSubmitted] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      smsConsentInformational: false,
      smsConsentMarketing: false,
    },
  });

  async function onSubmit(values: FormValues) {
    setSubmitError(null);

    // Resolve slug or uuid → real uuid (quote_requests.agent_id is uuid)
    const agent = findAgent(preselectedAgentId);
    const record: Record<string, unknown> = {
      first_name: values.firstName,
      last_name: values.lastName,
      policy_type: values.policyType,
      phone: values.phone,
      email: values.email,
      description: values.description ?? "",
      agent_id: agent?.id ?? null,
      status: "new",
      // Two separate, independently-tracked opt-ins — never combine these
      // into one column/consent value (Twilio A2P 10DLC Error 30913).
      sms_consent_informational: values.smsConsentInformational,
      sms_consent_marketing: values.smsConsentMarketing,
    };

    let { error } = await supabase.from("quote_requests").insert(record);

    // If the table doesn't have these columns yet, retry without them so the
    // request still lands (columns can be added via supabase/QUOTE_REQUESTS_RLS.sql).
    if (
      error &&
      (error.message?.includes("sms_consent") ||
        error.code === "PGRST204" ||
        error.message?.toLowerCase().includes("column"))
    ) {
      const {
        sms_consent_informational: _drop1,
        sms_consent_marketing: _drop2,
        ...withoutConsent
      } = record;
      const retry = await supabase.from("quote_requests").insert(withoutConsent);
      error = retry.error;
    }

    if (error) {
      console.error("quote_requests insert failed:", error);
      const detail =
        error.code === "42501" || /policy|rls|permission/i.test(error.message)
          ? " (database permission — run supabase/QUOTE_REQUESTS_RLS.sql in the Supabase SQL editor)"
          : error.message
            ? ` (${error.message})`
            : "";
      setSubmitError(
        `Something went wrong sending your request. Please call our office directly, or try again.${detail}`
      );
      return;
    }

    try {
      const { error: fnError } = await supabase.functions.invoke(
        "smart-processor",
        { body: { record } }
      );
      if (fnError) {
        console.error("smart-processor invoke failed:", fnError);
      }
    } catch (fnError) {
      console.error("smart-processor invoke threw:", fnError);
    }

    setSubmitted(true);
  }

  if (submitted) {
    return (
      <div className="rounded-xl2 bg-ice-100 p-10 text-center">
        <p className="font-display text-xl font-semibold text-ocean-900">
          {t("success")}
        </p>
      </div>
    );
  }

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      className="rounded-xl2 border border-ice-100 p-8 shadow-soft grid gap-6 sm:grid-cols-2"
      noValidate
    >
      <Field label={t("firstName")} error={errors.firstName?.message}>
        <input {...register("firstName")} className="input" />
      </Field>

      <Field label={t("lastName")} error={errors.lastName?.message}>
        <input {...register("lastName")} className="input" />
      </Field>

      <Field label={t("policyType")} error={errors.policyType?.message} full>
        <select {...register("policyType")} className="input" defaultValue="">
          <option value="" disabled>
            {t("policyTypeSelect")}
          </option>
          <option value="commercial">{t("policyOptions.commercial")}</option>
          <option value="home">{t("policyOptions.home")}</option>
          <option value="auto">{t("policyOptions.auto")}</option>
          <option value="flood">{t("policyOptions.flood")}</option>
          <option value="boat">{t("policyOptions.boat")}</option>
        </select>
      </Field>

      <Field label={t("phone")} error={errors.phone?.message}>
        <input {...register("phone")} type="tel" className="input" />
      </Field>

      <Field label={t("email")} error={errors.email?.message}>
        <input {...register("email")} type="email" className="input" />
      </Field>

      <Field label={t("description")} full>
        <textarea {...register("description")} rows={4} className="input" />
      </Field>

      {/* SMS opt-ins — must remain OPTIONAL and INDEPENDENT of each other.
          Consent to receive texts can never be a condition of getting a
          quote/service (A2P 10DLC / TCPA rule), and marketing consent must
          never be bundled with informational/transactional consent in a
          single checkbox (Twilio A2P 10DLC Error 30913).
          Do not add a .refine(v => v === true) back onto either field, and
          do not merge these two checkboxes back into one. */}
      <div className="sm:col-span-2 space-y-4">
        <label className="flex items-start gap-3 cursor-pointer">
          <input
            type="checkbox"
            {...register("smsConsentInformational")}
            className="mt-1 h-4 w-4 rounded border-slate-300 text-blancs-blue focus:ring-blancs-blue"
          />
          <span className="text-sm text-slate-700 leading-relaxed">
            {t("smsConsentInformationalLabel")}
          </span>
        </label>

        <label className="flex items-start gap-3 cursor-pointer">
          <input
            type="checkbox"
            {...register("smsConsentMarketing")}
            className="mt-1 h-4 w-4 rounded border-slate-300 text-blancs-blue focus:ring-blancs-blue"
          />
          <span className="text-sm text-slate-700 leading-relaxed">
            {t("smsConsentMarketingLabel")}
          </span>
        </label>

        <p className="text-xs text-slate-500 leading-relaxed">
          {t("smsDisclosure")}{" "}
          <Link
            href={`/${locale}/privacy`}
            className="text-blancs-blue underline"
            target="_blank"
          >
            {t("privacyLink")}
          </Link>{" "}
          {t("and")}{" "}
          <Link
            href={`/${locale}/terms`}
            className="text-blancs-blue underline"
            target="_blank"
          >
            {t("termsLink")}
          </Link>
          .
        </p>
      </div>

      {submitError && (
        <p className="sm:col-span-2 text-sm text-red-600">{submitError}</p>
      )}

      <button
        type="submit"
        disabled={isSubmitting}
        className="sm:col-span-2 rounded-full bg-blancs-blue px-8 py-4 text-base font-semibold text-white shadow-soft hover:bg-ocean-700 transition-colors disabled:opacity-60"
      >
        {t("submit")}
      </button>

      <style jsx global>{`
        .input {
          width: 100%;
          border: 1px solid #eaf2fc;
          background: #fff;
          border-radius: 0.75rem;
          padding: 0.9rem 1rem;
          font-size: 1rem;
          color: #0b2545;
        }
        .input:focus {
          border-color: #3e8eef;
        }
      `}</style>
    </form>
  );
}

function Field({
  label,
  error,
  full,
  children,
}: {
  label: string;
  error?: string;
  full?: boolean;
  children: React.ReactNode;
}) {
  return (
    <label className={`flex flex-col gap-2 ${full ? "sm:col-span-2" : ""}`}>
      <span className="text-sm font-medium text-ocean-900">{label}</span>
      {children}
      {error && <span className="text-sm text-red-600">{error}</span>}
    </label>
  );
}