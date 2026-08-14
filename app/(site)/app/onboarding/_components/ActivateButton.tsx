"use client";

// ActivateButton — "Tentar ativar agora" (Feature 2). When Embedded Signup is
// configured (embedded_signup.configured), runs the Meta JS SDK flow and
// reports the outcome via POST /doctor/onboarding/attempts; otherwise renders
// a disabled button with an explanatory note.

import { useState } from "react";
import {
  postOnboardingAttempt,
  type DoctorOnboarding,
  type Session,
} from "@/lib/manage-api";
import { resolveAttemptDecision, runEmbeddedSignup } from "../lib/meta-embedded-signup";

type ActivateButtonProps = {
  session: Session;
  embeddedSignup: DoctorOnboarding["embedded_signup"];
  // Caller refetches GET /doctor/onboarding to pick up the new state.
  onAttemptComplete: () => void;
};

export function ActivateButton({ session, embeddedSignup, onAttemptComplete }: ActivateButtonProps) {
  const [running, setRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // `featureType` selects the Coexistence sub-flow ("I already use this
  // number") when passed; omitted, it's the default "new number" flow. One
  // `running` flag covers both buttons below — only one signup round-trip
  // can be in flight at a time.
  async function handleClick(featureType?: string) {
    if (!embeddedSignup.app_id || !embeddedSignup.config_id) return;
    setError(null);
    setRunning(true);
    try {
      const outcome = await runEmbeddedSignup(embeddedSignup.app_id, embeddedSignup.config_id, featureType);
      // resolveAttemptDecision turns a "pass" with no phoneNumberId into an
      // actionable "no_phone_number_id" fail instead of a doomed pass (see
      // its own doc comment) — unit-tested on its own in meta-embedded-signup.
      const decision = resolveAttemptDecision(outcome);
      const attempt_id = crypto.randomUUID();
      if (decision.result === "pass") {
        await postOnboardingAttempt(session, {
          attempt_id,
          result: "pass",
          code: decision.code,
          phone_number_id: decision.phoneNumberId,
          waba_id: decision.wabaId,
        });
      } else {
        await postOnboardingAttempt(session, {
          attempt_id,
          result: "fail",
          error_code: decision.errorCode,
        });
        if (decision.errorCode === "no_phone_number_id") {
          setError(
            "A conexão com a Meta terminou sem retornar o número. Tente novamente e conclua a seleção do número na janela da Meta.",
          );
        }
      }
      onAttemptComplete();
    } catch (e) {
      console.error("secretaria onboarding: embedded signup attempt failed", e);
      setError("Não foi possível concluir a ativação agora. Tente novamente.");
    } finally {
      setRunning(false);
    }
  }

  if (!embeddedSignup.configured) {
    return (
      <div>
        <button type="button" className="btn btn--primary" disabled>
          Tentar ativar agora
        </button>
        <p className="muted" style={{ fontSize: 12.5, marginTop: 10 }}>
          Ativação assistida ainda não configurada — nossa equipe entra em contato.
        </p>
      </div>
    );
  }

  // Backend offers the Coexistence path (existing WhatsApp Business app
  // number) alongside the default one — show both as separate actions
  // instead of the single legacy button.
  if (embeddedSignup.coexistence_feature_type) {
    const coexistenceFeatureType = embeddedSignup.coexistence_feature_type;
    return (
      <div>
        <p className="muted" style={{ fontSize: 12.5, marginBottom: 10, maxWidth: "60ch" }}>
          Você pode usar o número que a clínica já usa no aplicativo WhatsApp Business, ou
          cadastrar um número novo só para o sistema.
        </p>
        <div className="onb-card-actions">
          <button
            type="button"
            className="btn btn--primary"
            onClick={() => handleClick(coexistenceFeatureType)}
            disabled={running}
          >
            {running ? "Conectando…" : "Já uso este número no WhatsApp Business"}
          </button>
          <button
            type="button"
            className="btn btn--outline"
            onClick={() => handleClick()}
            disabled={running}
          >
            {running ? "Conectando…" : "Quero um número novo para a API"}
          </button>
        </div>
        {error && (
          <p role="alert" style={{ fontSize: 12.5, color: "var(--danger, #c0392b)", marginTop: 10 }}>
            {error}
          </p>
        )}
      </div>
    );
  }

  return (
    <div>
      <button type="button" className="btn btn--primary" onClick={() => handleClick()} disabled={running}>
        {running ? "Conectando…" : "Tentar ativar agora"}
      </button>
      {error && (
        <p role="alert" style={{ fontSize: 12.5, color: "var(--danger, #c0392b)", marginTop: 10 }}>
          {error}
        </p>
      )}
    </div>
  );
}
