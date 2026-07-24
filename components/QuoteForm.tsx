"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useState } from "react";
import { useTranslations } from "next-intl";
import { supabase } from "@/lib/supabase";

const schema = z.object({
  firstName: z.string().min(1, "Required"),
  lastName: z.string().min(1, "Required"),
  policyType: z.enum(["commercial", "home", "auto", "flood", "boat"]),
  phone: z.string().min(7, "Enter a valid phone number"),
  email: z.string().email("Enter a valid email"),
  description: z.string().optional(),
});

type FormValues = z.infer<typeof schema>;

export default function QuoteForm({ preselectedAgentId }: { preselectedAgentId?: string }) {
  const t = useTranslations("quote");
  const [submitted, setSubmitted] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ resolver: zodResolver(schema) });

  async function onSubmit(values: FormValues) {
    // Insert directly into Supabase; an Edge Function trigger (see
    // docs/schema.sql) emails/pushes the assigned or preselected agent.
    // No pricing logic runs here — a human always replies.
    const { error } = await supabase.from("quote_requests").insert({
      first_name: values.firstName,
      last_name: values.lastName,
      policy_type: values.policyType,
      phone: values.phone,
      email: values.email,
      description: values.description ?? "",
      agent_id: preselectedAgentId ?? null,
      status: "new",
    });

    if (!error) {
      setSubmitted(true);
    } else {
      setSubmitError(
        "Something went wrong sending your request. Please call our office directly, or try again."
      );
    }
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
