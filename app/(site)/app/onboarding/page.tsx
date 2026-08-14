"use client";

// /app/onboarding — WhatsApp activation eligibility screen (Feature 2). Reads
// GET /doctor/onboarding and renders a state timeline (aquecimento -> conectado
// -> ativo), blocker-specific copy, the "Tentar ativar agora" Embedded Signup
// button, the last-attempt status line, a success banner once conectado/ativo,
// and (owner-only) the retry/config-reminder pause toggles. Sibling route to
// /app/reativar — same dash-header/dash-main chrome; guarded via
// usePortalGuard (clinic roles only: doctor, manager, secretary).

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { BrandGlyph } from "../../_components/BrandGlyph";
import { BrandIcon } from "../../_components/BrandIcon";
import { ThemeToggle } from "../../_components/ThemeToggle";
import { clearSession, isSessionExpired, usePortalGuard } from "../../_components/usePortalGuard";
import { PortalAccessNotice } from "../../_components/PortalAccessNotice";
import {
  getDoctorOnboarding,
  logout,
  resolveOnboardingBlocker,
  type DoctorOnboarding,
  type OnboardingBlockerReason,
} from "@/lib/manage-api";
import { StateTimeline } from "./_components/StateTimeline";
import { ActivateButton } from "./_components/ActivateButton";
import { PauseToggles } from "./_components/PauseToggles";
import "../dashboard-shell.css";
import "./onboarding.css";

// Exact copy required for `atividade_insuficiente` (spec §B) — do not reword.
const BLOCKER_COPY: Record<OnboardingBlockerReason, string> = {
  atividade_insuficiente:
    "Seu número ainda está ganhando histórico no WhatsApp Business. Continue atendendo seus pacientes normalmente pelo app por mais alguns dias — isso é o que o WhatsApp precisa para liberar a automação. Assim que estiver pronto, a gente te avisa aqui e por email.",
  numero_em_outro_bsp:
    'Esse número está registrado em outro provedor de WhatsApp Business API (BSP). Peça ao fornecedor anterior para desconectar o número da API dele, ou solicite a portabilidade. Quando resolver, clique em "Já resolvi".',
  sem_acesso_admin_waba:
    'Você precisa de acesso de administrador à conta do WhatsApp Business (WABA) vinculada a esse número. Peça a quem administra para te adicionar como administrador no Meta Business Suite. Quando resolver, clique em "Já resolvi".',
  sem_pagina_facebook:
    'A ativação exige uma Página no Facebook vinculada à clínica. Crie uma Página gratuita em facebook.com/pages/create. Quando resolver, clique em "Já resolvi".',
  outro:
    "Identificamos uma pendência na ativação do seu número. Nossa equipe já foi notificada e vai entrar em contato — se preferir, você pode tentar novamente em instantes.",
};

// Blockers that need a manual action from the doctor (vs. atividade_insuficiente,
// which just needs waiting) — these get the "Já resolvi" button.
const MANUAL_ACTION_REASONS = new Set<OnboardingBlockerReason>([
  "numero_em_outro_bsp",
  "sem_acesso_admin_waba",
  "sem_pagina_facebook",
  "outro",
]);

const ATTEMPT_RESULT_LABEL: Record<string, string> = {
  pass: "Sucesso",
  fail: "Falhou",
};

export default function OnboardingPage() {
  // legacy values accepted during the role-taxonomy transition
  const { session, ready, accessDenied } = usePortalGuard(["doctor", "manager", "secretary", "tenant_owner", "tenant_staff"]);

  const [data, setData] = useState<DoctorOnboarding | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [resolving, setResolving] = useState(false);

  const load = useCallback(() => {
    if (!session) return;
    getDoctorOnboarding(session)
      .then((d) => setData(d))
      .catch((e) => {
        if (isSessionExpired(e)) {
          clearSession();
          window.location.assign("/");
          return;
        }
        setLoadError("Não foi possível carregar o status da ativação. Tente novamente.");
      });
  }, [session]);

  useEffect(() => {
    if (!ready || !session) return;
    load();
  }, [ready, session, load]);

  async function handleResolveBlocker() {
    if (!session) return;
    setResolving(true);
    try {
      await resolveOnboardingBlocker(session);
      load();
    } catch (e) {
      console.error("secretaria onboarding: failed to resolve blocker", e);
    } finally {
      setResolving(false);
    }
  }

  // A valid session this app has no screen for (a platform admin). There is
  // nowhere to redirect them, so the guard hands back a message to show in place.
  if (accessDenied) return <PortalAccessNotice message={accessDenied} />;
  if (!ready || !session) return null;

  return (
    <>
      <header className="dash-header">
        <div className="container dash-nav">
          <Link className="brand-mark" href="/" aria-label="Brain">
            <BrandGlyph size={28} />
            <span className="wordmark" style={{ fontSize: 22 }}>
              Brain
            </span>
          </Link>
          <div className="dash-user">
            <ThemeToggle />
            <Link className="btn btn--outline btn--sm" href="/agenda">
              <BrandIcon name="arrowR" className="flip-h" />
              Voltar ao painel
            </Link>
            <Link className="btn btn--outline btn--sm" href="/" onClick={() => void logout()}>
              Sair
            </Link>
          </div>
        </div>
      </header>

      {!data && !loadError && (
        <div className="dash-loading" aria-live="polite" aria-label="Carregando">
          <div className="spinner" />
          <div style={{ fontSize: 13.5, fontWeight: 600 }}>Carregando status da ativação…</div>
        </div>
      )}

      {loadError && !data && (
        <main className="dash-main">
          <section className="panel">
            <p role="alert" className="muted">
              {loadError}
            </p>
          </section>
        </main>
      )}

      {data && (
        <main className="dash-main">
          <section className="panel">
            <div className="panel-head">
              <div>
                <span className="eyebrow">Ativação · WhatsApp Business</span>
                <h1 className="panel-title" style={{ fontSize: 30 }}>
                  Conectar o WhatsApp da clínica
                </h1>
              </div>
            </div>

            <StateTimeline state={data.onboarding_state} />

            {/* --- Blocker-specific copy branch --- */}
            {data.blocker_reason && (
              <div className={"onb-card " + (MANUAL_ACTION_REASONS.has(data.blocker_reason) ? "warn" : "neutral")}>
                <div>{BLOCKER_COPY[data.blocker_reason]}</div>
                {MANUAL_ACTION_REASONS.has(data.blocker_reason) && (
                  <div className="onb-card-actions">
                    <button
                      type="button"
                      className="btn btn--outline btn--sm"
                      onClick={handleResolveBlocker}
                      disabled={resolving}
                    >
                      {resolving ? "Confirmando…" : "Já resolvi"}
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* --- Success state --- */}
            {(data.onboarding_state === "conectado" || data.onboarding_state === "ativo") && (
              <div className="onb-card success">
                <div className="onb-success-row">
                  <span className="onb-success-icon">
                    <BrandIcon name="checkCircle" />
                  </span>
                  <div style={{ flex: 1, minWidth: 220 }}>
                    <strong>
                      {data.onboarding_state === "ativo"
                        ? "Sua secretarIA está ativa!"
                        : "Número conectado!"}
                    </strong>
                    <p style={{ margin: "4px 0 0", fontSize: 13.5 }}>
                      {data.onboarding_state === "ativo"
                        ? "O WhatsApp da clínica está sendo atendido pela secretarIA."
                        : "Estamos sincronizando o histórico do seu WhatsApp Business — isso pode levar algumas horas. Mantenha o Business App aberto e o celular desbloqueado enquanto isso."}
                    </p>
                  </div>
                  <Link href="/configuracao" className="btn btn--primary btn--sm">
                    Concluir configuração
                  </Link>
                </div>
              </div>
            )}

            {/* --- Activate button (hidden once connected) --- */}
            {data.onboarding_state !== "conectado" && data.onboarding_state !== "ativo" && (
              <>
                <ActivateButton session={session} embeddedSignup={data.embedded_signup} onAttemptComplete={load} />
                <p className="muted" style={{ fontSize: 12.5, marginTop: 14, maxWidth: "60ch" }}>
                  Depois de conectar, a sincronização do histórico pode levar algumas horas — mantenha
                  o WhatsApp Business App aberto e o celular desbloqueado durante esse período.
                </p>
              </>
            )}

            {/* --- Last attempt status line --- */}
            {data.last_attempt && (
              <p className="onb-attempt-line">
                Última tentativa: {formatDateTime(data.last_attempt.created_at)} —{" "}
                {ATTEMPT_RESULT_LABEL[data.last_attempt.result] ?? data.last_attempt.result}
                {data.last_attempt.result === "fail" && data.last_attempt.error_code
                  ? ` (${data.last_attempt.error_code})`
                  : ""}
              </p>
            )}

            {/* --- Owner-only pause toggles --- */}
            {/* Owner gate (not a role check): is_owner is the new claim; role
                === "tenant_owner" is the legacy fallback during the transition. */}
            {(session.isOwner || session.role === "tenant_owner") && (
              <PauseToggles
                session={session}
                retryPaused={data.retry_paused}
                configReminderPaused={data.config_reminder_paused}
                onChanged={load}
              />
            )}
          </section>
        </main>
      )}
    </>
  );
}

function formatDateTime(iso: string): string {
  try {
    return new Date(iso).toLocaleString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
}
