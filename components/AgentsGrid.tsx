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

    // Reuse an existing open conversation with this agent if one exists —
    // same rule the mobile app follows, so the two stay in sync rather than
    // spawning duplicate threads.
    // agentId is the real uuid from AGENTS[].id
    const { data: existing } = await supabase
      .from("conversations")
      .select("id")
      .eq("user_id", session.user.id)
      .eq("agent_id", agentId)
      .maybeSingle();

    let conversationId = existing?.id;
    if (!conversationId) {
      const { data: created } = await supabase
        .from("conversations")
        .insert({ user_id: session.user.id, agent_id: agentId })
        .select("id")
        .single();
      conversationId = created?.id;
    }

    setStartingId(null);
    if (conversationId) router.push(`/${locale}/messages/${conversationId}`);
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
              {/* Use slug for readable URL; QuoteForm resolves slug → uuid */}
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
