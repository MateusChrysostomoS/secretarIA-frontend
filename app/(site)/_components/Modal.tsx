"use client";

// Modal — reusable dialog for the portals (e.g. the admin create-user form).
// Overlay click + Esc close; locks body scroll while open; focuses the card.
// Styling lives in PortalShell.css (.portal-modal-*).

import { useEffect, useRef, type ReactNode } from "react";

type ModalProps = {
  open: boolean;
  title: string;
  onClose: () => void;
  children: ReactNode;
  // Action buttons rendered in the footer row (right-aligned).
  footer?: ReactNode;
};

export function Modal({ open, title, onClose, children, footer }: ModalProps) {
  const cardRef = useRef<HTMLDivElement>(null);

  // Latest-ref for onClose so the effect below depends ONLY on `open`: if it
  // re-ran on every new onClose identity (parents often pass inline callbacks),
  // the focus() call would yank focus away from form fields mid-typing.
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  // Lock scroll + wire Esc while open; restore on close/unmount. Focuses the
  // card exactly once per open, not on every parent re-render.
  useEffect(() => {
    if (!open) return;
    cardRef.current?.focus();
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onCloseRef.current();
    };
    document.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = "";
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  if (!open) return null;

  return (
    <div className="portal-modal-overlay" onClick={onClose}>
      <div
        ref={cardRef}
        className="portal-modal-card"
        role="dialog"
        aria-modal="true"
        aria-label={title}
        tabIndex={-1}
        onClick={(e) => e.stopPropagation()}
      >
        <h2>{title}</h2>
        {children}
        {footer && <div className="portal-modal-actions">{footer}</div>}
      </div>
    </div>
  );
}
