import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";

// FIX 33 regression guard — the "tela em branco" on Configuração.
//
// THE BUG (what this file exists to prevent coming back)
// ------------------------------------------------------
// The Agenda and Configuração screens fill the viewport and scroll internally,
// via their own `.scroll` pane. Their root used to be `height: 100vh` in normal
// flow. That root box is exactly one viewport tall, but the content inside
// `.scroll` still inflates the DOCUMENT's scroll height (~5400px on a fully
// expanded Configuração). `body { overflow: hidden }` in app-shell.css then
// removes the scrollbar — and with it the user's ability to scroll back — while
// leaving the document perfectly scrollable PROGRAMMATICALLY.
//
// Nothing scrolls the window on purpose, but the browser does: clicking a radio
// pill focuses it, and when the layout collapses under that click (choosing
// "Herdar da clínica", or switching the Google Calendar mode — both hide a large
// editor) the browser scroll-into-views the focused input and parks the viewport
// thousands of pixels below the app.
//
// The user sees a blank, frozen screen. The app is still mounted and correct,
// just off-screen: no exception, no error boundary, no console output, nothing
// to find — and `history.scrollRestoration` replays the offset on reload, so
// reloading does not recover it either. That combination is what made this cost
// two sessions to diagnose.
//
// WHY THIS IS A SOURCE TEST AND NOT A RENDER TEST
// -----------------------------------------------
// vitest runs in the `node` environment here (see vitest.config.ts) — there is
// no jsdom, and jsdom would not compute layout anyway, so the off-screen scroll
// cannot be reproduced in-process. What CAN be locked down is the invariant that
// removes the failure entirely: the screen root must be out of flow, so the
// document has no overflow and the viewport has nothing to scroll.

const repoRoot = process.cwd();
const read = (rel: string) => readFileSync(path.join(repoRoot, rel), "utf8");

const SHELL_CSS = "app/(site)/app-shell.css";
const SCREENS = ["app/(site)/configuracao/page.tsx", "app/(site)/agenda/page.tsx"];

describe("full-viewport app shell (FIX 33)", () => {
  it("pins the screen root to the viewport with position: fixed", () => {
    const css = read(SHELL_CSS);
    const rule = css.slice(css.indexOf(".app-screen"));

    expect(rule).toContain("position: fixed");
    // `inset: 0` is what makes it fill the viewport once out of flow; without it
    // the fixed root collapses to its content and the layout silently breaks.
    expect(rule).toContain("inset: 0");
  });

  it("still hides body overflow, so the page body itself never scrolls", () => {
    expect(read(SHELL_CSS)).toMatch(/body\s*\{[^}]*overflow:\s*hidden/);
  });

  it.each(SCREENS)("%s uses .app-screen for its root", (file) => {
    expect(read(file)).toContain('className="app-screen"');
  });

  it.each(SCREENS)("%s has no in-flow height:100vh root left", (file) => {
    // The regression is specifically an IN-FLOW viewport-height box. Prose
    // mentions of `height:100vh` in comments are unquoted and do not match.
    expect(read(file)).not.toMatch(/height:\s*"100vh"/);
  });
});
