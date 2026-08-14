"use client";
// InviteTeamMemberModal — the clinic's one invite form, in two flavours chosen
// by `kind` (the caller's button already made the choice, so there is no toggle
// inside the modal):
//
//   "professional" -> POST /doctor/professionals/invites (nome/email/
//                     especialidade). Creates a secretaria professional row and
//                     a `doctor` user bound to it.
//   "secretary"    -> POST /doctor/secretaries/invites (nome/email only).
//                     Creates a `secretary` user with NO professional linkage —
//                     the clinic's human receptionist, who runs secretarIA but
//                     never appears in the agenda and never sees clinical data.
//
// Both return a copyable `invite_link` and send the same (team-generic)
// `professional_invite` email, fail-soft — the link is shown either way.
//
// Open to any authenticated tenant member, including another secretary; the
// backend is the real authority on who may invite.
// Reuses the shared portal Modal (app/(site)/_components/Modal.tsx) and its
// PortalShell.css — imported directly here since this route never otherwise
// pulls that stylesheet in.

import { useState } from "react";
import { Modal } from "../../_components/Modal";
import { Field, TextInput } from "../../_shared/ui";
import {
  createProfessionalInvite,
  createSecretaryInvite,
  ManageApiError,
  type Session,
} from "@/lib/manage-api";
import "../../_components/PortalShell.css";

export type InviteKind = "professional" | "secretary";

// Per-kind copy, kept in one place so the two flows cannot drift apart.
const COPY: Record<InviteKind, { title: string; namePlaceholder: string; emailPlaceholder: string }> = {
  professional: {
    title: "Convidar profissional",
    namePlaceholder: "Dra. Camila Nogueira",
    emailPlaceholder: "camila@clinica.com.br",
  },
  secretary: {
    title: "Convidar secretária",
    namePlaceholder: "Rita Andrade",
    emailPlaceholder: "recepcao@clinica.com.br",
  },
};

type InviteTeamMemberModalProps = {
  session: Session;
  kind: InviteKind;
  open: boolean;
  onClose: () => void;
  // Caller refetches the matching list so the new (pending) row shows up.
  onInvited: () => void;
};

export function InviteTeamMemberModal({ session, kind, open, onClose, onInvited }: InviteTeamMemberModalProps) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [specialty, setSpecialty] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [inviteLink, setInviteLink] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const copy = COPY[kind];
  const isSecretary = kind === "secretary";

  function reset() {
    setName("");
    setEmail("");
    setSpecialty("");
    setError(null);
    setInviteLink(null);
    setCopied(false);
  }

  function handleClose() {
    if (submitting) return;
    const hadInvite = inviteLink !== null;
    reset();
    onClose();
    if (hadInvite) onInvited(); // refresh the list once the inviter is done reading the link
  }

  async function handleSubmit() {
    setError(null);
    setSubmitting(true);
    try {
      const result = isSecretary
        ? await createSecretaryInvite(session, { name: name.trim(), email: email.trim() })
        : await createProfessionalInvite(session, {
            name: name.trim(),
            email: email.trim(),
            specialty: specialty.trim() || null,
          });
      setInviteLink(result.invite_link);
    } catch (e) {
      const status = e instanceof ManageApiError ? e.status : 0;
      setError(
        status === 409
          ? "Esse e-mail já está cadastrado na Brain."
          : "Não foi possível criar o convite agora. Tente novamente.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  async function copyLink() {
    if (!inviteLink) return;
    try {
      await navigator.clipboard.writeText(inviteLink);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard API unavailable — the link is still selectable text.
    }
  }

  return (
    <Modal open={open} title={copy.title} onClose={handleClose}>
      {inviteLink ? (
        <div>
          <p style={{ fontSize: 13.5, color: "var(--ink-soft, #555)", marginBottom: 12 }}>
            Convite criado e enviado por e-mail. Você também pode copiar o link abaixo e enviar
            diretamente.
          </p>
          <div className="pfield">
            <label>Link do convite</label>
            <input readOnly value={inviteLink} onFocus={(e) => e.target.select()} />
          </div>
          <div style={{ display: "flex", gap: 10, marginTop: 6 }}>
            <button type="button" className="btn btn--outline" onClick={copyLink}>
              {copied ? "Copiado!" : "Copiar link"}
            </button>
            <button type="button" className="btn btn--primary" style={{ flex: 1 }} onClick={handleClose}>
              Concluir
            </button>
          </div>
        </div>
      ) : (
        <div>
          {isSecretary && (
            <p style={{ fontSize: 13, color: "var(--ink-soft, #555)", marginBottom: 14 }}>
              A secretária acessa a agenda de todos os profissionais, a configuração da
              secretarIA e a assinatura da clínica — mas não atende pacientes e não vê
              anamneses.
            </p>
          )}
          <Field label="Nome">
            <TextInput
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={copy.namePlaceholder}
              autoFocus
            />
          </Field>
          <div style={{ marginTop: 14 }}>
            <Field label="E-mail">
              <TextInput
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder={copy.emailPlaceholder}
              />
            </Field>
          </div>
          {!isSecretary && (
            <div style={{ marginTop: 14 }}>
              <Field label="Especialidade (opcional)">
                <TextInput
                  value={specialty}
                  onChange={(e) => setSpecialty(e.target.value)}
                  placeholder="Clínica geral, Cardiologia…"
                />
              </Field>
            </div>
          )}

          {error && (
            <p role="alert" style={{ fontSize: 12.5, color: "var(--danger, #c0392b)", marginTop: 14 }}>
              {error}
            </p>
          )}

          <div style={{ display: "flex", gap: 10, marginTop: 20 }}>
            <button type="button" className="btn btn--ghost" onClick={handleClose} disabled={submitting}>
              Cancelar
            </button>
            <button
              type="button"
              className="btn btn--primary"
              style={{ flex: 1 }}
              onClick={handleSubmit}
              disabled={submitting || !name.trim() || !email.trim()}
            >
              {submitting ? "Enviando…" : "Enviar convite"}
            </button>
          </div>
        </div>
      )}
    </Modal>
  );
}
