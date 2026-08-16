// password-policy.ts — client-side mirror of brain-api's password-reset policy
// (POST /auth/password-reset/confirm -> schemas/auth.py PasswordResetConfirmIn):
// 8-72 characters, with at least one letter AND one digit. Kept as a tiny pure
// helper so /esqueci_senha/atualizar_senha can show an inline error before the
// network round-trip — the backend re-validates and 422s regardless, so this is
// UX, not the security boundary.
//
// Deliberately NOT shared with app/(site)/cadastro/lib/password.ts's signup rule:
// that helper has no upper bound today, so reusing it here would silently accept
// a password the reset endpoint would 422 on. Both mirror the same backend policy
// (min 8 + letter + digit) but this one also enforces the 72-char ceiling the
// reset contract specifies.

export const MIN_PASSWORD_LENGTH = 8;
export const MAX_PASSWORD_LENGTH = 72;

// Returns a human, pt-BR error string for an invalid new password, or null when it
// satisfies the policy. Does NOT check password/confirmation match — callers compare
// the two fields separately (same split the ported /esqueci_senha/atualizar_senha
// screen uses).
export function passwordPolicyError(password: string): string | null {
  if (password.length < MIN_PASSWORD_LENGTH || password.length > MAX_PASSWORD_LENGTH) {
    return `A senha precisa ter entre ${MIN_PASSWORD_LENGTH} e ${MAX_PASSWORD_LENGTH} caracteres.`;
  }
  const hasLetter = /[A-Za-z]/.test(password);
  const hasDigit = /\d/.test(password);
  if (!hasLetter || !hasDigit) {
    return "A senha precisa ter pelo menos uma letra e um número.";
  }
  return null;
}
