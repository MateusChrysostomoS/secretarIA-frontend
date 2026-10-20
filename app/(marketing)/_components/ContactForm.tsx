"use client";

// ContactForm — "Falar com a equipe", the landing's one call to action for a
// clinic that does not use the secretarIA yet.
//
// It REUSES brain-api's existing public lead capture, POST /demo-requests
// (lib/manage-api.ts → submitDemoRequest, reached same-origin through the nginx
// `/api/` proxy). Nothing new on the backend: the route already has a per-IP rate
// limit and a honeypot, never logs the body, stores one `demo_requests` row and
// creates no tenant. The rows show up in the Brain admin's demo-requests list,
// tagged source="secretaria" / product_interest="secretaria".
//
// The backend's own confirmation copy promises a reply "em até 1 dia útil". That
// is a service-level promise nobody has confirmed for the pilot, so the screen
// shows its own, softer text instead of echoing the response message.
//
// It deliberately does NOT send visitors to /cadastro: that wizard sells the
// WhatsApp-based plan, and its billing is on hold.

import { useRef, useState, type FormEvent } from "react";

import { BrandIcon } from "@/app/(site)/_components/BrandIcon";
import { ManageApiError, submitDemoRequest } from "@/lib/manage-api";
import { PRIVACY_HREF, TERMS_HREF } from "@/lib/platform-links";

// Same permissive "did they typo it" check as LaunchWaitlistForm; brain-api's
// EmailStr is the real validator.
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

// Column widths of brain-api's DemoRequestCreate, so an over-long field fails
// here with a sentence instead of as a 422.
const MAX = { name: 255, email: 320, clinic: 255, message: 2000 } as const;

type FieldErrors = Partial<Record<"name" | "email", string>>;

export function ContactForm() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [clinic, setClinic] = useState("");
  const [message, setMessage] = useState("");
  // Honeypot — hidden from people and from assistive tech; see the input below.
  const [website, setWebsite] = useState("");
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState("");
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const doneRef = useRef<HTMLHeadingElement>(null);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setFormError("");

    const next: FieldErrors = {};
    if (!name.trim()) next.name = "Informe seu nome.";
    if (!EMAIL_RE.test(email.trim())) next.email = "Informe um e-mail válido.";
    setFieldErrors(next);
    if (next.name || next.email) {
      setFormError("Confira os campos destacados.");
      return;
    }

    setSending(true);
    try {
      await submitDemoRequest({
        name: name.trim(),
        email: email.trim(),
        clinic: clinic.trim() || null,
        message: message.trim() || null,
        product_interest: "secretaria",
        source: "secretaria",
        website,
      });
      setSent(true);
      // The form is gone; put focus on what replaced it so keyboard and screen
      // reader users are not left on a node that no longer exists.
      requestAnimationFrame(() => doneRef.current?.focus());
    } catch (err) {
      const status = err instanceof ManageApiError ? err.status : 0;
      setFormError(
        status === 429
          ? "Muitas tentativas seguidas. Aguarde um minuto e tente de novo."
          : status === 422
            ? "Não conseguimos aceitar esses dados. Confira o e-mail e tente de novo."
            : "Não foi possível enviar agora. Tente de novo em instantes.",
      );
    } finally {
      setSending(false);
    }
  }

  if (sent) {
    return (
      <div className="lp-form lp-done" role="status">
        <span className="lp-done__ico" aria-hidden="true">
          <BrandIcon name="check" />
        </span>
        <h3 ref={doneRef} tabIndex={-1}>
          Recebemos seu contato.
        </h3>
        <p>
          Obrigado, {name.trim().split(/\s+/)[0]}. A equipe da secretarIA vai responder no e-mail{" "}
          <strong>{email.trim()}</strong>.
        </p>
      </div>
    );
  }

  return (
    <form className="lp-form" onSubmit={handleSubmit} noValidate aria-labelledby="contato-form-title">
      <h3 id="contato-form-title" className="lp-form__title">
        Fale com a equipe
      </h3>
      <p className="lp-form__sub">Responderemos pelo e-mail que você informar.</p>

      <div className="lp-form__grid">
        <div className="lp-field">
          <label htmlFor="ct-name">Seu nome</label>
          <input
            id="ct-name"
            name="name"
            autoComplete="name"
            maxLength={MAX.name}
            value={name}
            onChange={(e) => setName(e.target.value)}
            aria-invalid={fieldErrors.name ? true : undefined}
            aria-describedby={fieldErrors.name ? "ct-name-err" : undefined}
            required
          />
          {fieldErrors.name && (
            <span id="ct-name-err" className="lp-form__err">
              {fieldErrors.name}
            </span>
          )}
        </div>

        <div className="lp-field">
          <label htmlFor="ct-email">E-mail</label>
          <input
            id="ct-email"
            name="email"
            type="email"
            inputMode="email"
            autoComplete="email"
            maxLength={MAX.email}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            aria-invalid={fieldErrors.email ? true : undefined}
            aria-describedby={fieldErrors.email ? "ct-email-err" : undefined}
            required
          />
          {fieldErrors.email && (
            <span id="ct-email-err" className="lp-form__err">
              {fieldErrors.email}
            </span>
          )}
        </div>

        <div className="lp-field lp-form__full">
          <label htmlFor="ct-clinic">
            Clínica <span className="opt">(opcional)</span>
          </label>
          <input
            id="ct-clinic"
            name="clinic"
            autoComplete="organization"
            maxLength={MAX.clinic}
            value={clinic}
            onChange={(e) => setClinic(e.target.value)}
          />
        </div>

        <div className="lp-field lp-form__full">
          <label htmlFor="ct-message">
            Conte um pouco sobre a clínica <span className="opt">(opcional)</span>
          </label>
          <textarea
            id="ct-message"
            name="message"
            maxLength={MAX.message}
            placeholder="Quantos médicos atendem, como os pacientes marcam consulta hoje…"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
          />
        </div>
      </div>

      {/* Honeypot: off-screen, out of the tab order and hidden from assistive
          tech. brain-api silently drops any request that fills it. */}
      <div className="lp-hp" aria-hidden="true">
        <label htmlFor="ct-website">Não preencha este campo</label>
        <input
          id="ct-website"
          name="website"
          tabIndex={-1}
          autoComplete="off"
          value={website}
          onChange={(e) => setWebsite(e.target.value)}
        />
      </div>

      <p className="lp-form__legal">
        Usamos estes dados para responder ao seu contato. Veja a{" "}
        <a href={PRIVACY_HREF}>Política de Privacidade</a> e os <a href={TERMS_HREF}>Termos de Uso</a>.
      </p>

      <div className="lp-form__actions">
        <button type="submit" className="btn btn--primary btn--icon-r" disabled={sending}>
          {sending ? "Enviando…" : "Enviar"}
          {!sending && <BrandIcon name="arrowR" />}
        </button>
        <span className="lp-form__err" role="alert">
          {formError}
        </span>
      </div>
    </form>
  );
}
