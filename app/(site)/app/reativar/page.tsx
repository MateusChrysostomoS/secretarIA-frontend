"use client";

// /app/reativar — activation test-window screen (Task 2). Reads GET
// /doctor/onboarding/test-window and renders one of: loading, load error (with
// retry), "doesn't apply to your plan", "already connected", an active window
// (deadline + days_total), or an expired window with a "Reiniciar período de
// teste" action. Sibling route to /app/onboarding — same dash-header/dash-main
// chrome; guarded via usePortalGuard (clinic roles only: doctor, manager,
// secretary), mirroring ../onboarding/page.tsx's guard+shell pattern exactly.

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { BrandGlyph } from "../../_components/BrandGlyph";
import { BrandIcon } from "../../_components/BrandIcon";
import { ThemeToggle } from "../../_components/ThemeToggle";
import { clearSession, isSessionExpired, usePortalGuard } from "../../_components/usePortalGuard";
import { PortalAccessNotice } from "../../_components/PortalAccessNotice";
import { getTestWindow, logout, type TestWindow } from "@/lib/manage-api";
import { RestartButton } from "./_components/RestartButton";
import "../dashboard-shell.css";
import "./reativar.css";

// Formats an ISO date string as a Brazilian date (DD/MM/AAAA); "—" for a missing
// value, and the raw string if it fails to parse — mirrors the defensive
// fallback in /app/onboarding's formatDateTime.
function formatDate(iso: string | null): string {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  } catch {
    return iso;
  }
}

function isConnected(data: TestWindow): boolean {
  return data.onboarding_state === "conectado" || data.onboarding_state === "ativo";
}

export default function ReativarPage() {
  // legacy values accepted during the role-taxonomy transition
  const { session, ready, accessDenied } = usePortalGuard(["doctor", "manager", "secretary", "tenant_owner", "tenant_staff"]);

  const [data, setData] = useState<TestWindow | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  // Set from the restart response (payment_method_present) — that field only
  // exists on the restart response, not on GET /test-window, so it's tracked
  // separately and surfaced on top of whatever `data` shows next.
  const [paymentNotice, setPaymentNotice] = useState(false);

  // `silent` skips the full-page spinner — used right after a successful
  // restart, where we already know the mutation worked and just need the
  // authoritative window state (never a fabricated/merged local object).
  const load = useCallback(
    (opts?: { silent?: boolean }) => {
      if (!session) return;
      if (!opts?.silent) setLoading(true);
      setLoadError(null);
      getTestWindow(session)
        .then((d) => {
          setData(d);
          setLoading(false);
        })
        .catch((e) => {
          if (isSessionExpired(e)) {
            clearSession();
            window.location.assign("/");
            return;
          }
          setLoadError("Não foi possível carregar o período de teste. Tente novamente.");
          setLoading(false);
        });
    },
    [session],
  );

  useEffect(() => {
    if (!ready || !session) return;
    load();
  }, [ready, session, load]);

  // A valid session this app has no screen for (a platform admin). There is
  // nowhere to redirect them, so the guard hands back a message to show in place.
  if (accessDenied) return <PortalAccessNotice message={accessDenied} />;
  if (!ready || !session) return null;

  return (
    <>
      <header className="dash-header">
        <div className="container dash-nav">
          <Link className="brand-mark" href="/" aria-label="Brain">
            <BrandGlyph size={28} />
            <span className="wordmark" style={{ fontSize: 22 }}>
              Brain
            </span>
          </Link>
          <div className="dash-user">
            <ThemeToggle />
            <Link className="btn btn--outline btn--sm" href="/agenda">
              <BrandIcon name="arrowR" className="flip-h" />
              Voltar ao painel
            </Link>
            <Link className="btn btn--outline btn--sm" href="/" onClick={() => void logout()}>
              Sair
            </Link>
          </div>
        </div>
      </header>

      {loading && (
        <div className="dash-loading" aria-live="polite" aria-label="Carregando">
          <div className="spinner" />
          <div style={{ fontSize: 13.5, fontWeight: 600 }}>Carregando período de teste…</div>
        </div>
      )}

      {!loading && loadError && (
        <main className="dash-main">
          <section className="panel">
            <p role="alert" className="muted">
              {loadError}
            </p>
            <div className="rtv-actions">
              <button type="button" className="btn btn--outline" onClick={() => load()}>
                Tentar novamente
              </button>
            </div>
          </section>
        </main>
      )}

      {!loading && !loadError && data && (
        <main className="dash-main">
          <section className="panel">
            <div className="panel-head">
              <div>
                <span className="eyebrow">Ativação · Teste</span>
                <h1 className="panel-title" style={{ fontSize: 30 }}>
                  Período de teste de ativação
                </h1>
              </div>
            </div>

            {/* --- Not applicable to this tenant's plan --- */}
            {!data.applicable && (
              <>
                <div className="rtv-card info">
                  <p style={{ margin: 0 }}>
                    O período de teste de ativação é a janela em que aguardamos a aprovação do
                    WhatsApp Coexistence pela Meta antes de começar a cobrar a assinatura — isso
                    não se aplica ao seu plano atual.
                  </p>
                </div>
                <div className="rtv-actions">
                  <Link href="/agenda" className="btn btn--outline">
                    Voltar ao painel
                  </Link>
                </div>
              </>
            )}

            {/* --- Already connected: the window is moot, Meta already approved --- */}
            {data.applicable && isConnected(data) && (
              <>
                <div className="rtv-card success">
                  <strong>Seu número já foi aprovado pela Meta.</strong>
                  <p style={{ margin: "6px 0 0" }}>
                    O WhatsApp Coexistence já está ativo para essa clínica — não há período de
                    teste em aberto.
                  </p>
                </div>
                <div className="rtv-actions">
                  <Link href="/agenda" className="btn btn--primary">
                    Voltar ao painel
                  </Link>
                </div>
              </>
            )}

            {/* --- Active window: still waiting on Meta, not charged yet --- */}
            {data.applicable && !isConnected(data) && !data.expired && (
              <>
                <div className="rtv-card info">
                  <p style={{ margin: 0 }}>
                    Estamos tentando aprovar o WhatsApp Coexistence no seu número junto à Meta.
                    Nenhuma cobrança acontece enquanto essa aprovação não é confirmada.
                  </p>
                </div>
                <div className="rtv-stats">
                  <div>
                    <div className="rtv-stat-value">{formatDate(data.deadline_at)}</div>
                    <div className="rtv-stat-label">Prazo final</div>
                  </div>
                  <div>
                    <div className="rtv-stat-value">{data.days_total}</div>
                    <div className="rtv-stat-label">Dias de teste</div>
                  </div>
                  {data.started_at && (
                    <div>
                      <div className="rtv-stat-value">{formatDate(data.started_at)}</div>
                      <div className="rtv-stat-label">Início</div>
                    </div>
                  )}
                </div>
                {paymentNotice && (
                  <div className="rtv-payment-notice" role="status">
                    {/* No link: the billing screen lives in the Brain portal, on
                        its own domain, and is deliberately not part of this app. */}
                    Não encontramos uma forma de pagamento cadastrada. Adicione uma
                    em Assinatura, no portal Brain, para garantir a cobrança assim
                    que a Meta aprovar.
                  </div>
                )}
              </>
            )}

            {/* --- Expired: window ended without approval, nothing was charged --- */}
            {data.applicable && !isConnected(data) && data.expired && (
              <>
                <div className="rtv-card warn">
                  <strong>O período de teste terminou sem aprovação da Meta.</strong>
                  <p style={{ margin: "6px 0 0" }}>
                    A Meta não aprovou o WhatsApp Coexistence no seu número dentro do prazo. Nada
                    foi cobrado — a assinatura foi cancelada automaticamente.
                  </p>
                </div>
                <div className="rtv-actions">
                  <RestartButton
                    session={session}
                    onRestarted={(result) => {
                      setPaymentNotice(result.payment_method_present === false);
                      load({ silent: true });
                    }}
                  />
                </div>
              </>
            )}
          </section>
        </main>
      )}
    </>
  );
}
