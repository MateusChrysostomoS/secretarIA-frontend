// attempt-error.ts — turns a failed activation attempt's raw `error_code`
// (signup_attempts.error_code, surfaced by GET /doctor/onboarding as
// last_attempt.error_code) into something a doctor can act on. Kept out of
// page.tsx so the fallback branching is unit-testable without jsdom, mirroring
// ./meta-embedded-signup.ts.
//
// There is no closed backend enum for this field — the codes come from three
// different places:
//   1. this app — "auth_cancelled" (the popup closed before Meta answered) and
//      "no_phone_number_id" (see resolveAttemptDecision in
//      ./meta-embedded-signup.ts);
//   2. brain-api's connect endpoint — "token_exchange_failed",
//      "waba_subscribe_failed", "secretaria_connection_failed";
//   3. Meta itself, passed straight through by classifySignupMessage — the
//      CANCEL event's `current_step`, or the ERROR event's free-form
//      `error_message`.
// Group 3 is open-ended, so the raw code always stays on screen: a translation
// is added in front of it, never swapped in for it. Support still needs to read
// the exact code off a screenshot.

export const ATTEMPT_ERROR_CODE_LABEL: Record<string, string> = {
  // --- produced by this app (meta-embedded-signup.ts) ---
  auth_cancelled: "a janela de autorização do Facebook foi fechada antes de concluir",
  no_phone_number_id:
    "o Facebook não informou qual número foi autorizado — refaça a autorização escolhendo o número da clínica",
  // CANCEL/ERROR messages that arrived without the detail field Meta normally fills in
  cancelled: "a autorização do Facebook foi cancelada antes de concluir",
  error: "o Facebook interrompeu a autorização",
  // --- produced by brain-api while finishing the connection ---
  token_exchange_failed: "não conseguimos concluir a troca de credenciais com o Facebook",
  waba_subscribe_failed:
    "o número foi autorizado, mas não conseguimos concluir a inscrição na conta do WhatsApp Business",
  secretaria_connection_failed:
    "o número foi autorizado, mas a conexão com a secretarIA não foi concluída",
};

// A CANCEL message carries the screen the user was on (`current_step`, e.g.
// PHONE_NUMBER_SETUP) as the code, which loses the fact that it was a
// cancellation. That set is Meta's and can grow, but it is reliably
// SCREAMING_SNAKE_CASE while every code we generate ourselves is lowercase, so
// the shape is enough to tell them apart. The wording is deliberately weak
// enough to stay true even if some other all-caps code ever matches.
const META_STEP_CODE = /^[A-Z][A-Z0-9_]*$/;

/** Portuguese explanation for `code`, or null when we have none to offer. */
export function explainAttemptError(code: string | null): string | null {
  if (!code) return null;
  const known = ATTEMPT_ERROR_CODE_LABEL[code];
  if (known) return known;
  if (META_STEP_CODE.test(code)) return "a autorização do Facebook não foi concluída";
  return null;
}

/**
 * The tail appended after "Falhou" on the last-attempt line.
 *
 * With a known code: ": <explicação> (<code>)". Without one, it degrades to the
 * bare " (<code>)" the screen showed before — the code is never hidden, it just
 * stops being the only explanation.
 */
export function attemptFailureSuffix(code: string | null): string {
  if (!code) return "";
  const explanation = explainAttemptError(code);
  return explanation ? `: ${explanation} (${code})` : ` (${code})`;
}
