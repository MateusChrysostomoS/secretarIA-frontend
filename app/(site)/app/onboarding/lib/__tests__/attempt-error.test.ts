import { describe, expect, it } from "vitest";
import {
  ATTEMPT_ERROR_CODE_LABEL,
  attemptFailureSuffix,
  explainAttemptError,
} from "../attempt-error";

// ---------------------------------------------------------------------------
// The last-attempt line on /app/onboarding used to interpolate error_code raw,
// so a doctor read "Falhou (auth_cancelled)". These cover the three tiers the
// lookup has to handle: a code we know, a Meta CANCEL step we can only describe
// generically, and a code we have never seen — where the old raw-code output is
// still exactly what should be shown.
// ---------------------------------------------------------------------------

describe("explainAttemptError", () => {
  it("translates the code observed live in the production audit", () => {
    expect(explainAttemptError("auth_cancelled")).toBe(
      "a janela de autorização do Facebook foi fechada antes de concluir",
    );
  });

  it.each(Object.keys(ATTEMPT_ERROR_CODE_LABEL))("translates %s", (code) => {
    expect(explainAttemptError(code)).toBe(ATTEMPT_ERROR_CODE_LABEL[code]);
  });

  // Meta's CANCEL messages put `current_step` in the code slot — an open set,
  // recognized by its casing rather than by an exhaustive list.
  it.each(["PHONE_NUMBER_SETUP", "WABA_SELECTION", "SOME_FUTURE_STEP"])(
    "describes the Meta cancel step %s generically",
    (step) => {
      expect(explainAttemptError(step)).toBe("a autorização do Facebook não foi concluída");
    },
  );

  it("offers nothing for an unknown code, rather than guessing", () => {
    expect(explainAttemptError("Invalid parameter: something odd")).toBeNull();
    expect(explainAttemptError("some_unknown_code")).toBeNull();
  });

  it("offers nothing when there is no code at all", () => {
    expect(explainAttemptError(null)).toBeNull();
    expect(explainAttemptError("")).toBeNull();
  });
});

describe("attemptFailureSuffix", () => {
  it("puts the explanation in front of the code, never in place of it", () => {
    const suffix = attemptFailureSuffix("auth_cancelled");
    expect(suffix).toBe(
      ": a janela de autorização do Facebook foi fechada antes de concluir (auth_cancelled)",
    );
    // support has to be able to read the exact code off a screenshot
    expect(suffix).toContain("(auth_cancelled)");
  });

  it("falls back to the bare code the screen showed before", () => {
    expect(attemptFailureSuffix("some_unknown_code")).toBe(" (some_unknown_code)");
  });

  it("renders nothing when the attempt carries no code", () => {
    expect(attemptFailureSuffix(null)).toBe("");
  });
});
