"use client";

// PortalAccessNotice — what a portal screen renders instead of its content when
// usePortalGuard reports `accessDenied`: a platform admin (who owns no tenant,
// and so has no agenda or configuration to act on here), or any session whose
// only possible destination is the screen it is already on.
//
// Deliberately reuses the inline-alert pattern PlanCheckoutCta uses for the same
// situation in brain-frontend — an admin session reaching a tenant-only action —
// so the copy reads consistently across the two apps instead of inventing a
// second visual language for one message.

import type { CSSProperties } from "react";

const alertStyle: CSSProperties = {
  fontSize: 12.5,
  lineHeight: 1.4,
  color: "var(--danger, #c0392b)",
  margin: "8px 0 0",
};

const wrapStyle: CSSProperties = {
  maxWidth: 560,
  margin: "48px auto",
  padding: "0 20px",
  textAlign: "center",
};

export function PortalAccessNotice({ message }: { message: string }) {
  return (
    <div style={wrapStyle}>
      <p role="alert" style={alertStyle}>
        {message}
      </p>
    </div>
  );
}
