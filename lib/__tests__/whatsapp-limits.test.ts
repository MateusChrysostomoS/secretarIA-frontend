import { describe, expect, it } from "vitest";
import {
  INSURANCES_TIP,
  insurancesError,
  isProfessionalNameAtLimit,
  isServiceNameAtLimit,
  MAX_LIST_ROW_TITLE_CHARS,
  PROFESSIONAL_NAME_LIMIT_MESSAGE,
  PROFESSIONAL_NAME_TIP,
  professionalNameError,
  SERVICE_NAME_LIMIT_MESSAGE,
  SERVICE_NAME_TIP,
  serviceNameError,
} from "../whatsapp-limits";

// The invite modal renders these three states, so they are what gets tested:
//   under the cap  -> no message, submit enabled
//   exactly on it  -> message shown, submit STILL enabled (24 chars is valid)
//   over the cap   -> message shown, submit blocked

describe("professionalNameError", () => {
  it("accepts a name comfortably under the cap", () => {
    expect(professionalNameError("Dra. Camila Nogueira")).toBeNull();
  });

  it("accepts a name exactly at the cap", () => {
    const atCap = "Dra. Mariana Albuquerque";
    expect(atCap.length).toBe(MAX_LIST_ROW_TITLE_CHARS);
    expect(professionalNameError(atCap)).toBeNull();
  });

  it("rejects a name one character over the cap", () => {
    const overCap = "a".repeat(MAX_LIST_ROW_TITLE_CHARS + 1);
    expect(professionalNameError(overCap)).toBe(PROFESSIONAL_NAME_LIMIT_MESSAGE);
  });

  it("rejects a long pre-existing name being edited", () => {
    // The case `maxLength` cannot catch: a value that arrived already too long
    // (autofill, or a future edit screen loading a name stored before this cap
    // existed). The modal must surface it rather than submit it.
    expect(professionalNameError("Dra. Maria Fernanda Albuquerque")).toBe(
      PROFESSIONAL_NAME_LIMIT_MESSAGE,
    );
  });

  it("ignores surrounding whitespace, matching what the modal submits", () => {
    // handleSubmit posts `name.trim()`, so padding must not fail a name that
    // actually fits once trimmed.
    const padded = `   ${"a".repeat(MAX_LIST_ROW_TITLE_CHARS)}   `;
    expect(padded.length).toBeGreaterThan(MAX_LIST_ROW_TITLE_CHARS);
    expect(professionalNameError(padded)).toBeNull();
  });

  it("counts accented characters as one each", () => {
    // pt-BR names are accent-heavy and the WhatsApp budget is characters, not
    // bytes — a name that fits must not be rejected for its cedillas.
    const accented = "Dr. José Antônio Gonçal";
    expect(accented.length).toBeLessThanOrEqual(MAX_LIST_ROW_TITLE_CHARS);
    expect(professionalNameError(accented)).toBeNull();
  });

  it("accepts an empty name (the modal's own required check owns that)", () => {
    expect(professionalNameError("")).toBeNull();
  });
});

describe("isProfessionalNameAtLimit", () => {
  it("is true exactly on the cap, where maxLength starts swallowing keystrokes", () => {
    expect(isProfessionalNameAtLimit("a".repeat(MAX_LIST_ROW_TITLE_CHARS))).toBe(true);
  });

  it("is false one character below the cap", () => {
    expect(isProfessionalNameAtLimit("a".repeat(MAX_LIST_ROW_TITLE_CHARS - 1))).toBe(false);
  });

  it("is false over the cap — that state is an error, not a heads-up", () => {
    // The modal shows `nameError ?? atLimit` and must not double-report; over
    // the cap it is professionalNameError's job.
    expect(isProfessionalNameAtLimit("a".repeat(MAX_LIST_ROW_TITLE_CHARS + 1))).toBe(false);
  });

  it("is false for an empty name", () => {
    expect(isProfessionalNameAtLimit("")).toBe(false);
  });
});

describe("copy", () => {
  it("names the actual limit in both the tooltip and the error", () => {
    // The tooltip is the only place the clinic learns WHY the field is capped,
    // so the number in it has to track the constant rather than be retyped.
    expect(PROFESSIONAL_NAME_TIP).toContain(String(MAX_LIST_ROW_TITLE_CHARS));
    expect(PROFESSIONAL_NAME_LIMIT_MESSAGE).toContain(String(MAX_LIST_ROW_TITLE_CHARS));
  });

  it("names the limit in every tooltip, not just the professional one", () => {
    // Each of the three fields has its own "?" and each must carry the number;
    // a tooltip that says "curto" teaches nothing.
    for (const tip of [PROFESSIONAL_NAME_TIP, SERVICE_NAME_TIP, INSURANCES_TIP]) {
      expect(tip).toContain(String(MAX_LIST_ROW_TITLE_CHARS));
    }
  });

  it("names the limit in the service error too", () => {
    expect(SERVICE_NAME_LIMIT_MESSAGE).toContain(String(MAX_LIST_ROW_TITLE_CHARS));
  });

  it("mirrors the backend list-row cap, not the 20-char button cap", () => {
    // Guards the confusion the audit flagged: MAX_BUTTON_LABEL_CHARS is a
    // different WhatsApp element. A doctor row is a list row.
    expect(MAX_LIST_ROW_TITLE_CHARS).toBe(24);
  });
});

// ---------------------------------------------------------------------------
// Service name — ServiceCard. Same cap, but a WARNING: /configuracao saves the
// whole clinic behind one button, so a long legacy name must not block it.
// ---------------------------------------------------------------------------

describe("serviceNameError", () => {
  it("accepts a name under the cap", () => {
    expect(serviceNameError("Retorno")).toBeNull();
  });

  it("accepts a name exactly at the cap", () => {
    const atCap = "Consulta de rotina adult";
    expect(atCap.length).toBe(MAX_LIST_ROW_TITLE_CHARS);
    expect(serviceNameError(atCap)).toBeNull();
  });

  it("rejects a name one character over the cap", () => {
    expect(serviceNameError("a".repeat(MAX_LIST_ROW_TITLE_CHARS + 1))).toBe(
      SERVICE_NAME_LIMIT_MESSAGE,
    );
  });

  it("rejects the prefix-heavy pair the backend truncation is built around", () => {
    // "Consulta de rotina adulto"/"…infantil" are the names that motivated the
    // marked cut in core/whatsapp_limits.py. Both are over 24, so the clinic
    // should be told here rather than discovering it from a patient.
    expect(serviceNameError("Consulta de rotina adulto")).toBe(SERVICE_NAME_LIMIT_MESSAGE);
    expect(serviceNameError("Consulta de rotina infantil")).toBe(SERVICE_NAME_LIMIT_MESSAGE);
  });

  it("ignores surrounding whitespace", () => {
    expect(serviceNameError(`  ${"a".repeat(MAX_LIST_ROW_TITLE_CHARS)}  `)).toBeNull();
  });

  it("accepts an empty name — a blank new card is not an error yet", () => {
    // ServicesSection.add() seeds `name: ""`; flagging that instantly would
    // paint every freshly added card red.
    expect(serviceNameError("")).toBeNull();
  });
});

describe("isServiceNameAtLimit", () => {
  it("is true exactly on the cap", () => {
    expect(isServiceNameAtLimit("a".repeat(MAX_LIST_ROW_TITLE_CHARS))).toBe(true);
  });

  it("is false below and above the cap", () => {
    expect(isServiceNameAtLimit("a".repeat(MAX_LIST_ROW_TITLE_CHARS - 1))).toBe(false);
    expect(isServiceNameAtLimit("a".repeat(MAX_LIST_ROW_TITLE_CHARS + 1))).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Insurance plans — per ITEM, because one field holds N plans
// ---------------------------------------------------------------------------

describe("insurancesError", () => {
  it("accepts an empty list (clinic is particular-only)", () => {
    expect(insurancesError([])).toBeNull();
  });

  it("accepts several short plans", () => {
    expect(insurancesError(["Unimed", "Amil", "SulAmérica"])).toBeNull();
  });

  it("accepts a list far longer than the cap in TOTAL characters", () => {
    // The whole point of validating per item: three legal plans easily exceed
    // 24 characters combined, and a maxLength on the field would forbid them.
    const plans = ["Unimed", "Bradesco Saúde", "SulAmérica Saúde"];
    expect(plans.join(", ").length).toBeGreaterThan(MAX_LIST_ROW_TITLE_CHARS);
    expect(insurancesError(plans)).toBeNull();
  });

  it("names the single offending plan", () => {
    const error = insurancesError(["Unimed", "Bradesco Saúde Premium Nacional"]);
    expect(error).toContain('"Bradesco Saúde Premium Nacional"');
    expect(error).toContain(String(MAX_LIST_ROW_TITLE_CHARS));
  });

  it("names every offending plan when more than one is too long", () => {
    const error = insurancesError([
      "Unimed",
      "Bradesco Saúde Premium Nacional",
      "SulAmérica Saúde Especial Master",
    ]);
    expect(error).toContain('"Bradesco Saúde Premium Nacional"');
    expect(error).toContain('"SulAmérica Saúde Especial Master"');
    expect(error).not.toContain('"Unimed"');
  });

  it("accepts a plan exactly at the cap", () => {
    const atCap = "a".repeat(MAX_LIST_ROW_TITLE_CHARS);
    expect(insurancesError([atCap])).toBeNull();
  });

  it("measures each plan trimmed, matching toWireInsurances", () => {
    // toWireInsurances already trims, so a padded plan can never reach here —
    // but the check must not depend on that to stay correct.
    expect(insurancesError([`  ${"a".repeat(MAX_LIST_ROW_TITLE_CHARS)}  `])).toBeNull();
  });
});
