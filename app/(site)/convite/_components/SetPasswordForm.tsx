"use client";

// SetPasswordForm — the "crie sua senha" step of /convite (Feature D). Plain
// password inputs (no show/hide toggle — kept simple, matching the effort of
// a one-time setup form) using the same `.field-l`/`.input` classes as the
// /cadastro wizard, so both post-signup flows read as one system.

import { useState, type FormEvent } from "react";

// Mirrors the backend rule (see /esqueci_senha/atualizar_senha's identical constant).
const MIN_PASSWORD_LENGTH = 8;

type SetPasswordFormProps = {
  onSubmit: (password: string) => Promise<void>;
  submitting: boolean;
  error: string | null;
};

export function SetPasswordForm({ onSubmit, submitting, error }: SetPasswordFormProps) {
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [localError, setLocalError] = useState("");

  function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLocalError("");
    if (password.length < MIN_PASSWORD_LENGTH) {
      setLocalError(`A senha precisa ter pelo menos ${MIN_PASSWORD_LENGTH} caracteres.`);
      return;
    }
    if (password !== confirm) {
      setLocalError("As senhas não coincidem.");
      return;
    }
    void onSubmit(password);
  }

  return (
    <form onSubmit={handleSubmit} noValidate>
      <label className="field-l">
        <span>Nova senha</span>
        <input
          className="input"
          type="password"
          autoComplete="new-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />
      </label>

      <label className="field-l mt-m">
        <span>Confirmar senha</span>
        <input
          className="input"
          type="password"
          autoComplete="new-password"
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          required
        />
      </label>

      {(localError || error) && (
        <p role="alert" style={{ fontSize: 12.5, color: "var(--danger, #c0392b)", marginTop: 14 }}>
          {localError || error}
        </p>
      )}

      <button
        type="submit"
        className="btn btn--primary btn--block"
        style={{ marginTop: 20 }}
        disabled={submitting || !password || !confirm}
      >
        {submitting ? "Salvando…" : "Criar senha e entrar"}
      </button>
    </form>
  );
}
