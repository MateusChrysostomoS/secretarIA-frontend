"use client";
// error.tsx — the (site) route-group error boundary.
//
// WHY THIS EXISTS
// ---------------
// Every signed-in screen lives under (site), and until now none of them had a
// boundary of any kind: no app/error.tsx, no app/global-error.tsx, no local
// one. This is a static export (`output: "export"`), so there is no server to
// re-render a failed page — an uncaught exception anywhere in the tree unmounts
// it and leaves Next.js's default "Application error: a client-side exception
// has occurred" screen, which is a blank white page with one line of grey text
// and no way forward. The router is gone with the tree, so the back button does
// nothing either: the user is genuinely stuck until they retype the URL. That
// is what a clinic hit on /secretaria/configuracao (FIX 33).
//
// A boundary does not stop the underlying bug. It stops the bug from taking the
// whole app hostage, and it turns an opaque white screen into something the
// user can read back to us — which is most of what made FIX 33 expensive to
// diagnose in the first place.
//
// ONE BOUNDARY, NOT TWO
// ---------------------
// A second copy under secretaria/configuracao/ would catch exactly the same
// errors this one does: (site)/layout.tsx renders a bare fragment, so a local
// boundary would keep no extra chrome alive and show the identical screen. Two
// identical files that must not drift is the cost, and it buys nothing.
//
// PRIVACY
// -------
// The log line follows the same rule as lib/hydration.ts's emitConfigEvent:
// category, message and stack only. No configuration value, no tenant or
// professional id, no session token, and never the page's form state — an
// error boundary receives the Error, not the props of what crashed, so there is
// nowhere for one to get in by construction.

import { useEffect } from "react";

type SiteErrorProps = {
  error: Error & { digest?: string };
  // Re-mounts the crashed subtree. State is rebuilt from scratch, so a screen
  // that broke on one bad response gets a clean load rather than the same one.
  reset: () => void;
};

export default function SiteError({ error, reset }: SiteErrorProps) {
  useEffect(() => {
    // Stack is capped: a long React component stack is not worth flooding the
    // console with, and the top frames are the ones that identify the fault.
    console.error(
      "[site-boundary]",
      JSON.stringify({
        event: "unhandled_render_error",
        route: typeof window === "undefined" ? null : window.location.pathname,
        name: error.name,
        message: error.message,
        digest: error.digest ?? null,
        stack: error.stack ? error.stack.slice(0, 2000) : null,
      }),
    );
  }, [error]);

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "40px 24px",
        background: "var(--page)",
      }}
    >
      <div style={{ maxWidth: 560, width: "100%" }}>
        <h1
          style={{
            fontSize: 26,
            fontWeight: 600,
            fontFamily: "var(--font-serif)",
            color: "var(--ink)",
            lineHeight: 1.15,
            letterSpacing: "-.01em",
            margin: 0,
          }}
        >
          Algo deu errado nesta tela
        </h1>
        <p
          style={{
            fontSize: 15,
            color: "var(--ink-soft)",
            lineHeight: 1.55,
            marginTop: 10,
            marginBottom: 0,
          }}
        >
          A tela parou de responder por causa de um erro inesperado.{" "}
          <b style={{ color: "var(--ink)" }}>Nada foi perdido do que já estava salvo</b> — mas o
          que você tiver alterado sem salvar precisará ser refeito.
        </p>

        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 24 }}>
          <button type="button" className="btn btn--primary" onClick={reset}>
            Tentar novamente
          </button>
          <button
            type="button"
            className="btn btn--outline"
            onClick={() => window.location.reload()}
          >
            Recarregar a página
          </button>
          <a className="btn btn--ghost" href="/">
            Ir para o início
          </a>
        </div>

        {/* Collapsed by default, but present: the message and stack are what
            turn "ficou em branco" into a report we can act on. Both are
            code-level strings — no configuration value reaches them. */}
        <details style={{ marginTop: 26 }}>
          <summary
            style={{
              fontSize: 13,
              fontWeight: 600,
              color: "var(--ink-faint)",
              cursor: "pointer",
            }}
          >
            Detalhes técnicos (para enviar ao suporte)
          </summary>
          <pre
            style={{
              marginTop: 10,
              padding: "12px 14px",
              borderRadius: 10,
              background: "var(--surface-2)",
              border: "1px solid var(--line)",
              color: "var(--ink-soft)",
              fontSize: 12,
              lineHeight: 1.5,
              whiteSpace: "pre-wrap",
              wordBreak: "break-word",
              overflowX: "auto",
              maxHeight: 260,
            }}
          >
            {error.name}: {error.message}
            {error.digest ? `\ndigest: ${error.digest}` : ""}
            {error.stack ? `\n\n${error.stack.slice(0, 2000)}` : ""}
          </pre>
        </details>
      </div>
    </div>
  );
}
