"use client";

// useBrandTheme — reads/writes the data-theme attribute on <html> and persists to
// localStorage. Returns `mounted` so callers can avoid SSR/client mismatch by
// rendering a stable fallback before hydration.

import { useState, useEffect } from "react";

export type Theme = "light" | "dark";

// Must stay in sync with THEME_INIT_SCRIPT in app/layout.tsx, which reads the
// same key before first paint to avoid a theme flash.
const STORAGE_KEY = "secretaria_theme";

export function useBrandTheme(): {
  theme: Theme;
  toggle: () => void;
  mounted: boolean;
} {
  // Start with "light" so SSR output matches the initial HTML render.
  const [theme, setTheme] = useState<Theme>("light");
  const [mounted, setMounted] = useState(false);

  // On mount: read the real theme from the DOM (set by the layout's inline script
  // or a previous toggle) and mark as mounted to enable client-only rendering.
  useEffect(() => {
    const current =
      (document.documentElement.getAttribute("data-theme") as Theme) || "light";
    setTheme(current);
    setMounted(true);
  }, []);

  function toggle() {
    const next: Theme = theme === "dark" ? "light" : "dark";
    // Write to DOM immediately so CSS variables update without a re-render cycle.
    document.documentElement.setAttribute("data-theme", next);
    // Persist so the next page load (or layout script) picks up the preference.
    try {
      localStorage.setItem(STORAGE_KEY, next);
    } catch {
      // localStorage can be blocked by privacy settings — fail silently.
    }
    setTheme(next);
  }

  return { theme, toggle, mounted };
}
