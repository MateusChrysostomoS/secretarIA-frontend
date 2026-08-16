import { describe, expect, it } from "vitest";
import {
  MAX_PASSWORD_LENGTH,
  MIN_PASSWORD_LENGTH,
  passwordPolicyError,
} from "../password-policy";

describe("passwordPolicyError", () => {
  it("accepts a password with letter + digit inside the length range", () => {
    expect(passwordPolicyError("senha123")).toBeNull();
  });

  it("rejects a password shorter than the minimum", () => {
    expect(passwordPolicyError("abc123")).toBe(
      `A senha precisa ter entre ${MIN_PASSWORD_LENGTH} e ${MAX_PASSWORD_LENGTH} caracteres.`,
    );
  });

  it("accepts a password exactly at the minimum length boundary", () => {
    const atMin = "abcdef1x";
    expect(atMin.length).toBe(MIN_PASSWORD_LENGTH);
    expect(passwordPolicyError(atMin)).toBeNull();
  });

  it("rejects a password longer than the maximum", () => {
    const tooLong = "a1".repeat(37); // 74 chars
    expect(passwordPolicyError(tooLong)).toBe(
      `A senha precisa ter entre ${MIN_PASSWORD_LENGTH} e ${MAX_PASSWORD_LENGTH} caracteres.`,
    );
  });

  it("accepts a password exactly at the maximum length boundary", () => {
    const atMax = "a".repeat(71) + "1"; // 72 chars, letter + digit
    expect(atMax.length).toBe(MAX_PASSWORD_LENGTH);
    expect(passwordPolicyError(atMax)).toBeNull();
  });

  it("rejects a password missing a digit", () => {
    expect(passwordPolicyError("onlyletters")).toBe(
      "A senha precisa ter pelo menos uma letra e um número.",
    );
  });

  it("rejects a password missing a letter", () => {
    expect(passwordPolicyError("12345678")).toBe(
      "A senha precisa ter pelo menos uma letra e um número.",
    );
  });

  it("length check takes precedence over the letter/digit check", () => {
    // Too short AND missing a digit — the length message must win, matching
    // the backend's field order (min_length/max_length before the custom
    // field_validator runs).
    expect(passwordPolicyError("abc")).toBe(
      `A senha precisa ter entre ${MIN_PASSWORD_LENGTH} e ${MAX_PASSWORD_LENGTH} caracteres.`,
    );
  });
});
