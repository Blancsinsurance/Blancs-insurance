"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { useAuth } from "./AuthProvider";
import { supabase } from "@/lib/supabase";
import { AGENTS } from "@/lib/agents";
import { MessageCircle } from "lucide-react";

const SERVICE_OPTIONS = [
  { id: "policyNumber", labelKey: "policyNumber" },
  { id: "makePayment", labelKey: "makePayment" },
  { id: "addVehicle", labelKey: "addVehicle" },
  { id: "addDriver", labelKey: "addDriver" },
  { id: "adjustCoverage", labelKey: "adjustCoverage" },
  { id: "appAssistance", labelKey: "appAssistance" },
  { id: "discounts", labelKey: "discounts" },
] as const;

export default function RequestService({ locale }: { locale: string }) {
  const t = useTranslations("requestService");
  const router = useRouter();
  const { session } = useAuth();
  const [selectedService, setSelectedService] = useState<string | null>(null);
  const [starting, setStarting] = useState(false);

  const startServiceChat = async (serviceType: string) => {
    if (!session) {
      router.push(`/${locale}/sign-in?returnTo=/${locale}/request-service`);
      return;
    }

    setStarting(true);

    // Prefer Jimmy first for service requests
    const jimmyId = "jimmy-saint-hillaire";

    // Create or get conversation with Jimmy + service context
    let { data: existing } = await supabase
      .from("conversations")
      .select("id")
      .eq("user_id", session.user.id)
      .eq("agent_id", jimmyId)
      .maybeSingle();

    let conversationId = existing?.id;

    if (!conversationId) {
      const { data: created } = await supabase
        .from("conversations")
        .insert({
          user_id: session.user.id,
          agent_id: jimmyId,
          metadata: { serviceRequest: serviceType }, // for agent context
        })
        .select("id")
        .single();
      conversationId = created?.id;
    } else {
      // Update metadata on existing thread
      await supabase
        .from("conversations")
        .update({ metadata: { serviceRequest: serviceType } })
        .eq("id", conversationId);
    }

    setStarting(false);
    if (conversationId) {
      router.push(`/${locale}/messages/${conversationId}`);
    }
  };

  return (
    <section className="mx-auto max-w-4xl px-6 py-20">
      <div className="text-center mb-12">
        <h1 className="font-display text-4xl font-semibold text-ocean-900">
          {t("title")}
        </h1>
        <p className="mt-4 text-xl text-slate-600 max-w-md mx-auto">
          {t("subtitle")}
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {SERVICE_OPTIONS.map((option) => (
          <button
            key={option.id}
            onClick={() => startServiceChat(option.id)}
            disabled={starting}
            className="group flex items-center justify-between rounded-2xl border border-ice-100 p-8 text-left hover:border-blancs-blue hover:shadow-soft transition-all disabled:opacity-70"
          >
            <div>
              <p className="font-medium text-lg text-ocean-900 group-hover:text-blancs-blue">
                {t(`options.${option.labelKey}`)}
              </p>
            </div>
            <MessageCircle className="h-6 w-6 text-blancs-blue opacity-70 group-hover:opacity-100" />
          </button>
        ))}
      </div>

      <p className="mt-12 text-center text-sm text-slate-500">
        All service requests are handled by real agents — usually Jimmy or your preferred agent.
      </p>
    </section>
  );
}