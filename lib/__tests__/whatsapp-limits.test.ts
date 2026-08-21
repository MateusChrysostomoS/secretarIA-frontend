import { describe, expect, it } from "vitest";
import {
  isProfessionalNameAtLimit,
  MAX_LIST_ROW_TITLE_CHARS,
  PROFESSIONAL_NAME_LIMIT_MESSAGE,
  PROFESSIONAL_NAME_TIP,
  professionalNameError,
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

  it("mirrors the backend list-row cap, not the 20-char button cap", () => {
    // Guards the confusion the audit flagged: MAX_BUTTON_LABEL_CHARS is a
    // different WhatsApp element. A doctor row is a list row.
    expect(MAX_LIST_ROW_TITLE_CHARS).toBe(24);
  });
});
