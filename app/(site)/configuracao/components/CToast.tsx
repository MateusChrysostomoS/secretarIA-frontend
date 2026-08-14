"use client";
// CToast — fixed bottom-center toast notification strip.
// Appears above the sticky save bar (bottom: 88px) and auto-dismisses
// after the parent clears the `toast` prop to null.
// The popIn animation comes from app-shell.css / product-tokens.css keyframes.
// `kind` picks the visual style — "error" NEVER reuses the success
// green+checkmark look, so a failed save can't read as a fake success.

import { Icon } from "../../_shared/ui";

type CToastProps = {
  toast: { message: string; kind: "success" | "error" } | null;
};

// Renders a success/error toast pill when toast is non-null; returns null otherwise.
export function CToast({ toast }: CToastProps) {
  if (!toast) return null;
  const isError = toast.kind === "error";

  return (
    <div style={{
      position: "fixed",
      bottom: 88,
      left: "50%",
      transform: "translateX(-50%)",
      zIndex: 80,
      animation: "popIn .25s var(--ease)",
    }}>
      <div style={{
        display: "flex",
        alignItems: "center",
        gap: 11,
        padding: "13px 20px",
        borderRadius: 14,
        background: isError ? "var(--st-miss-ink, #a4452f)" : "#0e564d",
        color: isError ? "#fff5f2" : "#eafff4",
        boxShadow: "var(--shadow-lg)",
        fontSize: 14,
        fontWeight: 500,
      }}>
        {/* icon chip */}
        <span style={{
          width: 26, height: 26, borderRadius: 99,
          background: "rgba(255,255,255,.16)",
          display: "flex", alignItems: "center", justifyContent: "center",
          flexShrink: 0,
        }}>
          <Icon name={isError ? "ban" : "check"} size={15} />
        </span>
        {toast.message}
      </div>
    </div>
  );
}
