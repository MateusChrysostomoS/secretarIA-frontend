// whatsapp-limits.ts — client-side mirror of the WhatsApp Cloud API display
// caps that secretarIA's backend enforces in
// `src/secretaria/core/whatsapp_limits.py`.
//
// WHY THIS EXISTS
// ---------------
// When a patient picks a doctor on WhatsApp, the bot sends an *interactive
// list* and each doctor is one row. Meta caps a list-row title at 24
// characters — no wrapping, no scrolling, no ellipsis of its own. A clinic that
// invites "Dra. Maria Fernanda Albuquerque" gets a row that reads
// "Dra. Maria Fernanda Alb…", and nobody in the hub is told why.
//
// The backend has always truncated (so the send never fails), but truncating is
// damage control, not a fix: by then the name is already stored. The fix is to
// refuse the too-long name at the only place a human types it — the invite
// form — while the person is still looking at the field.
//
// NOT the security boundary: `ProfessionalCreate.name` on the backend still
// accepts up to 255 characters (schemas/professional.py) and a professional row
// can also be created from brain-api's own user name, which never passes
// through this form. Those paths keep landing on the backend truncation. This
// file is UX — it stops the clinic from *choosing* a name that will look
// broken.
//
// DELIBERATELY NOT applied to the secretary half of InviteTeamMemberModal: a
// secretary has no `professionals` row and never appears in a WhatsApp list
// (see the modal's own header comment), so capping their name would be an
// invented restriction.

// Meta's interactive-list row-title cap. Mirrors MAX_LIST_ROW_TITLE_CHARS in
// core/whatsapp_limits.py — keep the two in step.
//
// NOT to be confused with the 20-char *reply-button* cap
// (MAX_BUTTON_LABEL_CHARS): different element, different limit. A doctor row is
// a list row, so 24 is the number that applies here.
export const MAX_LIST_ROW_TITLE_CHARS = 24;

// Tooltip behind the "?" next to the field label (Field's `tip` prop).
export const PROFESSIONAL_NAME_TIP =
  `O WhatsApp mostra no máximo ${MAX_LIST_ROW_TITLE_CHARS} caracteres no nome de cada ` +
  "profissional quando o paciente escolhe com quem quer agendar. Nomes maiores " +
  "aparecem cortados para o paciente.";

// Shown in red under the field. Same wording for both states below, because
// from the clinic's point of view they are the same problem — the name does not
// fit — and two different sentences would just add noise.
export const PROFESSIONAL_NAME_LIMIT_MESSAGE =
  `Máximo de ${MAX_LIST_ROW_TITLE_CHARS} caracteres — o WhatsApp corta nomes maiores ` +
  "na lista de profissionais.";

/**
 * Non-null when the name is genuinely INVALID (over the cap) — the caller must
 * block submission.
 *
 * With `maxLength` on the input this is unreachable by typing; it stays because
 * `maxLength` is a browser courtesy, not a guarantee (autofill, a paste some
 * browsers let through, or a future screen that edits an already-stored long
 * name all bypass it), and because it is the piece worth unit-testing.
 */
export function professionalNameError(name: string): string | null {
  return name.trim().length > MAX_LIST_ROW_TITLE_CHARS ? PROFESSIONAL_NAME_LIMIT_MESSAGE : null;
}

/**
 * True when the name sits exactly ON the cap.
 *
 * This is what a person actually experiences: `maxLength` swallows the 25th
 * keystroke in silence, so without this the field just stops responding and the
 * clinic assumes the keyboard broke. A name of exactly 24 characters is still
 * VALID and must stay submittable — the caller shows the message but keeps the
 * button enabled.
 */
export function isProfessionalNameAtLimit(name: string): boolean {
  return name.trim().length === MAX_LIST_ROW_TITLE_CHARS;
}
