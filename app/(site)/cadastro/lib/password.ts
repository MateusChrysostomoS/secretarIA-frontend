// password.ts — client-side mirror of brain-api's password policy
// (schemas/signup.py SignupIntentCreate / schemas/auth.py SetPasswordIn): at least
// 8 characters, with at least one letter and one digit. Kept as a tiny pure helper so
// the ContactStep can show an inline error before the network round-trip (the backend
// re-validates and 422s regardless — this is UX, not the security boundary).

export const MIN_PASSWORD_LENGTH = 8;

// Returns a human, pt-BR error string for an invalid password/confirmation pair, or
// null when the pair is acceptable. The messages match the effort of the sibling
// /convite SetPasswordForm so both post-signup flows read as one system.
export function passwordError(password: string, confirm: string): string | null {
  if (password.length < MIN_PASSWORD_LENGTH) {
    return `A senha precisa ter pelo menos ${MIN_PASSWORD_LENGTH} caracteres.`;
  }
  const hasLetter = /[A-Za-z]/.test(password);
  const hasDigit = /\d/.test(password);
  if (!hasLetter || !hasDigit) {
    return "A senha precisa ter pelo menos uma letra e um número.";
  }
  if (password !== confirm) {
    return "As senhas não coincidem.";
  }
  return null;
}
