"use client";

import { useTranslations } from "next-intl";
import { AGENTS } from "@/lib/agents";
import { Phone, Mail, MessageCircle } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useAuth } from "./AuthProvider";
import { supabase } from "@/lib/supabase";

export default function AgentsGrid({ locale }: { locale: string }) {
  const t = useTranslations("agents");
  const router = useRouter();
  const { session } = useAuth();
  const [startingId, setStartingId] = useState<string | null>(null);

  async function startConversation(agentId: string) {
    if (!session) {
      router.push(`/${locale}/sign-in?returnTo=/${locale}/agents`);
      return;
    }

    setStartingId(agentId);

    // Ensure public.users has this auth user (FK for conversations.user_id)
    const { error: userError } = await supabase.from("users").upsert(
      {
        id: session.user.id,
        phone: session.user.phone ?? null,
        email: session.user.email ?? null,
        preferred_language: locale,
      },
      { onConflict: "id" }
    );
    if (userError) {
      console.error("upsert users:", userError);
      setStartingId(null);
      return;
    }

    // 1. Existing thread? (agentId is real uuid)
    const { data: existing, error: selectError } = await supabase
      .from("conversations")
      .select("id")
      .eq("user_id", session.user.id)
      .eq("agent_id", agentId)
      .maybeSingle();

    if (selectError) {
      console.error("select conversations:", selectError);
    }

    let conversationId = existing?.id;

    // 2. Create if missing; handle unique conflict
    if (!conversationId) {
      const { data: created, error: insertError } = await supabase
        .from("conversations")
        .insert({ user_id: session.user.id, agent_id: agentId })
        .select("id")
        .single();

      if (insertError) {
        if (
          insertError.code === "23505" ||
          insertError.code === "409" ||
          insertError.message?.toLowerCase().includes("duplicate") ||
          insertError.message?.toLowerCase().includes("unique")
        ) {
          const { data: again } = await supabase
            .from("conversations")
            .select("id")
            .eq("user_id", session.user.id)
            .eq("agent_id", agentId)
            .maybeSingle();
          conversationId = again?.id;
        } else {
          console.error("insert conversations:", insertError);
        }
      } else {
        conversationId = created?.id;
      }
    }

    setStartingId(null);
    if (conversationId) {
      router.push(`/${locale}/messages/${conversationId}`);
    }
  }

  return (
    <section className="mx-auto max-w-6xl px-6 py-20">
      <div className="text-center max-w-2xl mx-auto">
        <h2 className="font-display text-3xl sm:text-4xl font-semibold text-ocean-900">
          {t("title")}
        </h2>
        <p className="mt-4 text-lg text-slate-600">{t("subtitle")}</p>
      </div>

      <div className="mt-14 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {AGENTS.map((agent) => (
          <div
            key={agent.id}
            className="rounded-xl2 border border-ice-100 p-8 flex flex-col items-center text-center shadow-soft"
          >
            <div className="h-20 w-20 rounded-full bg-blancs-blue text-white flex items-center justify-center font-display text-2xl font-semibold">
              {agent.name
                .split(" ")
                .map((n) => n[0])
                .join("")}
            </div>

            <h3 className="mt-5 font-display text-lg font-semibold text-ocean-900">
              {agent.name}
            </h3>
            <p className="mt-1 text-sm text-slate-600">
              {t("languages")}: {agent.languages.join(" / ")}
            </p>
            <p className="mt-2 font-mono text-sm text-blancs-blue">
              {agent.phone}
            </p>

            <div className="mt-6 w-full flex flex-col gap-3">
              <a
                href={`tel:${agent.phone.replace(/[^0-9+]/g, "")}`}
                className="flex items-center justify-center gap-2 rounded-full bg-blancs-blue px-5 py-3 text-sm font-semibold text-white hover:bg-ocean-700 transition-colors"
              >
                <Phone className="h-4 w-4" /> {t("call")}
              </a>
              <button
                onClick={() => startConversation(agent.id)}
                disabled={startingId === agent.id}
                className="flex items-center justify-center gap-2 rounded-full border border-blancs-blue px-5 py-3 text-sm font-semibold text-blancs-blue hover:bg-ice-100 transition-colors disabled:opacity-60"
              >
                <MessageCircle className="h-4 w-4" />
                {startingId === agent.id ? "…" : t("message")}
              </button>
              <a
                href={`mailto:${agent.email}`}
                className="flex items-center justify-center gap-2 text-sm font-medium text-ocean-900 hover:text-blancs-blue"
              >
                <Mail className="h-4 w-4" /> {t("email")}
              </a>
              <Link
                href={`/${locale}/contact?agent=${agent.slug}`}
                className="text-sm font-medium text-ocean-900 underline decoration-sky-500 underline-offset-4 hover:text-blancs-blue mt-1"
              >
                {t("quote")}
              </Link>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}