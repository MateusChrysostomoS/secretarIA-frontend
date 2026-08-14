"use client";

// ThemeToggle — icon button that flips light/dark via useBrandTheme.
// Renders moon before mount (stable SSR output) and switches to sun when dark is active.

import { BrandIcon } from "./BrandIcon";
import { useBrandTheme } from "./useBrandTheme";

type ThemeToggleProps = {
  className?: string;
};

export function ThemeToggle({ className }: ThemeToggleProps) {
  const { theme, toggle, mounted } = useBrandTheme();

  // Before hydration: show moon so SSR HTML matches the default light-theme state.
  // After mount: show sun when dark (so clicking toggles to light), moon otherwise.
  const showSun = mounted && theme === "dark";

  return (
    <button
      className={"icon-btn " + (className ?? "")}
      aria-label="Alternar tema"
      onClick={toggle}
      // Suppress hydration warning — the icon flips post-mount intentionally.
      suppressHydrationWarning
    >
      {showSun ? (
        <BrandIcon name="sun" />
      ) : (
        <BrandIcon name="moon" />
      )}
    </button>
  );
}
