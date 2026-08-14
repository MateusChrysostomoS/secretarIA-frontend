"use client";

// OnboardingBanner — compact status banner surfaced at the top of
// /configuracao whenever the tenant's WhatsApp onboarding isn't
// finished yet (Feature 2's cross-link into the full /app/onboarding screen).
// Self-sufficient: fetches GET /doctor/onboarding itself and renders nothing
// when there's no session, the fetch fails, or the tenant is already `ativo`
// — a demo/logged-out visitor or a fetch hiccup never sees a broken banner.

import Link from "next/link";
import { useEffect, useState } from "react";
import { getDoctorOnboarding, type DoctorOnboarding, type Session } from "@/lib/manage-api";

const STATE_LABEL: Record<string, string> = {
  pending: "Cadastro em andamento",
  aquecimento: "Aquecendo o número no WhatsApp",
  aguardando_elegibilidade: "Aguardando elegibilidade",
  aguardando_acao_manual: "Ação necessária para continuar",
  conectado: "Conectado — sincronizando histórico",
};

export function OnboardingBanner({ session }: { session: Session | null }) {
  const [data, setData] = useState<DoctorOnboarding | null>(null);

  useEffect(() => {
    if (!session) return;
    let cancelled = false;
    getDoctorOnboarding(session)
      .then((d) => {
        if (!cancelled) setData(d);
      })
      .catch(() => {
        // Fail-open: no banner rather than a broken page — the full
        // /app/onboarding screen is still reachable directly.
      });
    return () => {
      cancelled = true;
    };
  }, [session]);

  if (!session || !data || data.onboarding_state === "ativo") return null;

  const needsAction = data.onboarding_state === "aguardando_acao_manual";

  return (
    <div
      role="status"
      style={{
        display: "flex",
        alignItems: "center",
        gap: 9,
        margin: "0 28px 16px",
        padding: "10px 14px",
        borderRadius: 11,
        fontSize: 13,
        lineHeight: 1.5,
        background: needsAction ? "var(--st-miss-bg, #fdecea)" : "var(--st-pending-bg, #fff6e5)",
        border: `1px solid ${needsAction ? "var(--st-miss-bd, #f5c6c0)" : "var(--st-pending-bd, #f2d98a)"}`,
        color: needsAction ? "var(--st-miss-ink, #c0392b)" : "var(--st-pending-ink, #9a6b00)",
      }}
    >
      <span>
        WhatsApp da clínica: {STATE_LABEL[data.onboarding_state] ?? data.onboarding_state}.
      </span>
      <Link
        href="/app/onboarding"
        style={{ marginLeft: "auto", fontWeight: 700, color: "inherit", flexShrink: 0 }}
      >
        Ver detalhes →
      </Link>
    </div>
  );
}
