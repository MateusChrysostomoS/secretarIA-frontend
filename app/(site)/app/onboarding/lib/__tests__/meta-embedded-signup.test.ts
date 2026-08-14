import { describe, expect, it } from "vitest";
import { classifySignupMessage, resolveAttemptDecision } from "../meta-embedded-signup";

// ---------------------------------------------------------------------------
// classifySignupMessage(data) is the pure classifier extracted out of the
// window "message" listener in meta-embedded-signup.ts — it takes the
// already-JSON-parsed { type, event, data } body Meta's Embedded Signup popup
// posts and returns what runEmbeddedSignup should do with it, without needing
// a real window/postMessage/FB.login round-trip.
// ---------------------------------------------------------------------------

describe("classifySignupMessage", () => {
  // All five known FINISH_* variants (Embedded Signup "Implementation" doc)
  // must resolve phone_number_id/waba_id the same way — this is the prefix
  // match added to survive Meta adding more variants later.
  const finishEvents = [
    "FINISH",
    "FINISH_ONLY_WABA",
    "FINISH_WHATSAPP_BUSINESS_APP_ONBOARDING",
    "FINISH_OBO_MIGRATION",
    "FINISH_GRANT_ONLY_API_ACCESS",
  ];

  it.each(finishEvents)("classifies %s with phone_number_id/waba_id present as a finish", (event) => {
    const result = classifySignupMessage({
      event,
      data: { phone_number_id: "123", waba_id: "456" },
    });
    expect(result).toEqual({ kind: "finish", phoneNumberId: "123", wabaId: "456" });
  });

  it.each(finishEvents)("classifies %s with no phone_number_id as a finish with null fields", (event) => {
    const result = classifySignupMessage({ event, data: {} });
    expect(result).toEqual({ kind: "finish", phoneNumberId: null, wabaId: null });
  });

  it("classifies an unrecognized FINISH_* variant as finish too (forward-compat prefix match)", () => {
    const result = classifySignupMessage({
      event: "FINISH_SOME_FUTURE_VARIANT",
      data: { phone_number_id: "789", waba_id: "abc" },
    });
    expect(result).toEqual({ kind: "finish", phoneNumberId: "789", wabaId: "abc" });
  });

  it("classifies CANCEL with current_step as a fail carrying that step", () => {
    const result = classifySignupMessage({
      event: "CANCEL",
      data: { current_step: "PHONE_NUMBER_SELECTION" },
    });
    expect(result).toEqual({ kind: "fail", errorCode: "PHONE_NUMBER_SELECTION" });
  });

  it("classifies CANCEL with no current_step as a fail with the 'cancelled' fallback", () => {
    const result = classifySignupMessage({ event: "CANCEL", data: {} });
    expect(result).toEqual({ kind: "fail", errorCode: "cancelled" });
  });

  it("classifies ERROR with error_message as a fail carrying that message", () => {
    const result = classifySignupMessage({
      event: "ERROR",
      data: { error_message: "something broke" },
    });
    expect(result).toEqual({ kind: "fail", errorCode: "something broke" });
  });

  it("classifies ERROR with no error_message as a fail with the 'error' fallback", () => {
    const result = classifySignupMessage({ event: "ERROR", data: {} });
    expect(result).toEqual({ kind: "fail", errorCode: "error" });
  });

  it("ignores an unrelated event", () => {
    const result = classifySignupMessage({ event: "SOMETHING_ELSE", data: {} });
    expect(result).toEqual({ kind: "ignore" });
  });

  it("ignores a message with no event at all", () => {
    const result = classifySignupMessage({ data: {} });
    expect(result).toEqual({ kind: "ignore" });
  });
});

// ---------------------------------------------------------------------------
// resolveAttemptDecision(outcome) is the pure helper ActivateButton uses to
// decide what to POST to /doctor/onboarding/attempts — extracted specifically
// so the "pass with no phoneNumberId becomes a fail" branch (the fix for the
// backend's 422 hole) is testable without jsdom/testing-library.
// ---------------------------------------------------------------------------

describe("resolveAttemptDecision", () => {
  it("keeps a pass outcome with a phoneNumberId as a pass", () => {
    const decision = resolveAttemptDecision({
      result: "pass",
      code: "auth-code",
      phoneNumberId: "111",
      wabaId: "222",
    });
    expect(decision).toEqual({ result: "pass", code: "auth-code", phoneNumberId: "111", wabaId: "222" });
  });

  it("turns a pass outcome with a null phoneNumberId into a no_phone_number_id fail", () => {
    const decision = resolveAttemptDecision({
      result: "pass",
      code: "auth-code",
      phoneNumberId: null,
      wabaId: null,
    });
    expect(decision).toEqual({ result: "fail", errorCode: "no_phone_number_id" });
  });

  it("passes a fail outcome through unchanged", () => {
    const decision = resolveAttemptDecision({ result: "fail", errorCode: "auth_cancelled" });
    expect(decision).toEqual({ result: "fail", errorCode: "auth_cancelled" });
  });
});
