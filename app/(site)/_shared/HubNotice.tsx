"use client";
// HubNotice — small inline banner shown above the page content whenever the
// secretarIA hub data path is NOT active: no session (demo/showcase mode),
// the tenant lacks the secretarIA entitlement, the hub is transiently
// unreachable, or this environment has no hub base URL configured at all.
// Renders nothing only while the check hasn't settled yet (`!ready`, to
// avoid a flash) — every SETTLED non-ready state below has a visible,
// honest branch. A logged-in page must never silently show blanks with no
// explanation.

import Link from "next/link";
import type { CSSProperties } from "react";
import { Btn, Icon } from "./ui";
import type { Session } from "@/lib/manage-api";
import { hubConfigured } from "@/lib/secretaria-hub";

type HubNoticeProps = {
  session: Session | null;
  notEntitled: boolean;
  ready: boolean;
  // True once every hub-token-mint retry has failed for a reason OTHER than
  // a 403 (network, 5xx, cold start) — a transient condition worth retrying.
  unavailable?: boolean;
  // Restarts the hub-token-mint cycle — wired to useSecretariaHub().retry().
  onRetry?: () => void;
};

const baseStyle: CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 9,
  margin: "0 28px 16px",
  padding: "10px 14px",
  borderRadius: 11,
  fontSize: 13,
  lineHeight: 1.5,
};

// Shared "pending/transient warning" look — same tokens as OnboardingBanner's
// non-blocking state, so the two banners read as one visual language.
const warnStyle: CSSProperties = {
  ...baseStyle,
  background: "var(--st-pending-bg, #fff6e5)",
  border: "1px solid var(--st-pending-bd, #f2d98a)",
  color: "var(--st-pending-ink, #9a6b00)",
};

// Renders the demo / not-entitled / unavailable / not-configured banner, or null.
export function HubNotice({ session, notEntitled, ready, unavailable, onRetry }: HubNoticeProps) {
  if (!ready) return null;

  if (!session) {
    return (
      <div
        style={{
          ...baseStyle,
          background: "var(--surface-2)",
          border: "1px solid var(--line)",
          color: "var(--ink-soft)",
        }}
      >
        <Icon name="user" size={15} style={{ flexShrink: 0 }} />
        <span>
          Você está vendo dados de demonstração.{" "}
          <Link href="/" style={{ color: "var(--brand)", fontWeight: 600 }}>
            Entre para conectar sua agenda real.
          </Link>
        </span>
      </div>
    );
  }

  if (notEntitled) {
    return (
      <div
        style={{
          ...baseStyle,
          background: "var(--st-miss-bg, #fdecea)",
          border: "1px solid var(--st-miss-bd, #f5c6c0)",
          color: "var(--st-miss-ink, #c0392b)",
        }}
      >
        <Icon name="ban" size={15} style={{ flexShrink: 0 }} />
        <span>
          Sua clínica não tem a secretarIA habilitada. Exibindo dados de demonstração.
        </span>
      </div>
    );
  }

  if (unavailable) {
    return (
      <div style={warnStyle}>
        <Icon name="clock" size={15} style={{ flexShrink: 0 }} />
        <span style={{ flex: 1 }}>
          Não foi possível carregar os dados reais da sua clínica agora. Nada do que você fizer
          aqui será salvo até a conexão voltar.
        </span>
        {onRetry && (
          <Btn variant="outline" size="sm" onClick={onRetry} style={{ flexShrink: 0 }}>
            Tentar novamente
          </Btn>
        )}
      </div>
    );
  }

  // Every failure mode above is ruled out (ready, session, not notEntitled,
  // not unavailable) — the entitlement mint itself must have succeeded. The
  // only remaining way real data can't load is a missing hub base URL in
  // THIS environment (see hubConfigured() in lib/secretaria-hub.ts).
  // Distinct from `unavailable`: retrying the mint would just succeed again
  // and land right back here, so no retry action is offered.
  if (!hubConfigured()) {
    return (
      <div style={warnStyle}>
        <Icon name="ban" size={15} style={{ flexShrink: 0 }} />
        <span>
          A conexão com os dados da sua clínica não está configurada neste ambiente. Nada do que
          você fizer aqui será salvo.
        </span>
      </div>
    );
  }

  return null;
}
