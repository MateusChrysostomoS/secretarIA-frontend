// AuthShell — chrome for the public entry screen (/).
// Renders the cream + teal background (medical grid, drifting dots,
// ECG trace), the centred brand block, the card wrapper, and the
// footer line. The page-specific content lives in `children`;
// optional slots cover everything else.
//
// Ported from brain-frontend's (SignOut) group, where it was shared by /login
// and /esqueci_senha/*. This app has a single public route, and no password
// reset (brain-api exposes no reset endpoint — see docs/), so the shell now
// serves one caller.

import Link from "next/link";
import type { ReactNode } from "react";
import "./auth-shell.css";

// Single PQRS heartbeat — drawn once, reused by the live + ghost traces.
const ECG_PATH =
  "M0,100 L180,100 L210,100 L226,60 L242,150 L260,72 L278,118 L296,100 L500,100 L530,100 L548,40 L566,170 L586,52 L606,140 L624,100 L820,100 L850,100 L868,60 L884,150 L902,72 L920,118 L938,100 L1140,100 L1170,100 L1188,40 L1206,170 L1226,52 L1246,140 L1264,100 L1460,100 L1490,100 L1508,60 L1524,150 L1542,72 L1560,118 L1578,100 L1800,100";

type AuthShellProps = {
  /** Small uppercase label under the wordmark. */
  role?: string;
  /** Where the brand wordmark links to. Defaults to the marketing site. */
  brandHref?: string;
  /** Card title — supports rich JSX so callers can italicise an accent word. */
  title: ReactNode;
  /** Card subtitle / supporting copy. */
  subtitle?: ReactNode;
  /** Inline error banner above the form. */
  error?: string;
  /** Inline success banner above the form. */
  success?: string;
  /** Card body — usually the form. */
  children: ReactNode;
  /** Optional content rendered below the form: divider + help text. */
  belowCard?: ReactNode;
  /** Optional footer link row. Defaults to the marketing footer used on /login. */
  footer?: ReactNode;
};

// No link row: `/` is the only public route in this app, so "voltar ao site"
// would point at the page the visitor is already on, and the #privacidade /
// #suporte anchors it used to carry belong to the Brain marketing home, which
// does not exist on this domain.
const DEFAULT_FOOTER = <span>secretarIA é um produto Brain.</span>;

export function AuthShell({
  role = "por Brain",
  brandHref = "/",
  title,
  subtitle,
  error,
  success,
  children,
  belowCard,
  footer = DEFAULT_FOOTER,
}: AuthShellProps) {
  return (
    <main className="login-page">
      {/* Decorations — purely visual, hidden from assistive tech. */}
      <div className="login-grid" aria-hidden="true" />

      <div className="login-dots" aria-hidden="true">
        <span className="login-dot d1" />
        <span className="login-dot d2" />
        <span className="login-dot d3" />
        <span className="login-dot d4" />
        <span className="login-dot d5" />
        <span className="login-dot d6" />
      </div>

      <div className="page-ecg" aria-hidden="true">
        <svg viewBox="0 0 1800 200" preserveAspectRatio="none">
          <path className="ecg-ghost" d={ECG_PATH} />
          <path className="ecg-line" d={ECG_PATH} pathLength={1000} />
        </svg>
      </div>

      <div className="login-shell">
        {/* Product mark. The chrome is inherited from the ported PreCheck auth
            screen, but the brand is not: this domain is secretarIA, so the
            wordmark reads secretarIA and the role line credits Brain — matching
            the "Brain │ secretarIA" lockup the portal header shows once the
            user is in. */}
        <Link href={brandHref} className="login-brand" aria-label="secretarIA por Brain">
          <span className="wordmark">
            secretar<em>IA</em>
          </span>
          <span className="role">{role}</span>
        </Link>

        <div className="login-card">
          <h1 className="login-title">{title}</h1>
          {subtitle ? <p className="login-sub">{subtitle}</p> : null}

          {/* Status banners — kept in the DOM so we don't shift layout when
              they appear; visibility is toggled via the `show` modifier. */}
          <AuthBanner kind="error" message={error} />
          <AuthBanner kind="success" message={success} />

          {children}

          {belowCard}
        </div>

        <div className="login-foot">{footer}</div>
      </div>
    </main>
  );
}

// AuthBanner — small inline status row above the form.
// Kept as a sub-component so the shell file stays focused on layout.
function AuthBanner({
  kind,
  message,
}: {
  kind: "error" | "success";
  message?: string;
}) {
  const className = kind === "error" ? "login-error" : "login-success";
  return (
    <div
      className={message ? `${className} show` : className}
      role={kind === "error" ? "alert" : "status"}
    >
      {kind === "error" ? <ErrorIcon /> : <CheckIcon />}
      <span>{message}</span>
    </div>
  );
}

function ErrorIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="12" cy="12" r="10" />
      <line x1="12" y1="8" x2="12" y2="12" />
      <line x1="12" y1="16" x2="12.01" y2="16" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M20 6 9 17l-5-5" />
    </svg>
  );
}
