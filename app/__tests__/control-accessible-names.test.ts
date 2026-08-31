import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";

// Regression guard for the 2026-08-31 audit finding A11Y-1 (accessible names).
//
// This design system has no component library: the switch has three independent
// implementations and the select two, and every one rendered a decorative <span>
// inside a <button>, or a bare <select>, with nothing to compute a name from.
// 43 selects and 14 switches on /configuracao reached a screen reader unnamed.
//
// The fix is a contract rather than a patch: each control takes `label` as a
// REQUIRED prop and spends it on aria-label, so the compiler enumerates the call
// sites. This file guards the contract itself, because two things make the
// regression invisible otherwise:
//
//   - the suite runs in the `node` environment with no jsdom (see
//     vitest.config.ts), so no test can render a component or ask the platform
//     for an accessible name; and
//   - axe-core passes a control whose ancestor <label> is actually bound to a
//     DIFFERENT element, which is exactly how two of these went unreported.
//
// So this asserts on the SOURCE, the same technique as
// app/__tests__/no-third-party-resources.test.ts. Full reasoning, and the
// browser measurements behind it, in docs/CHECKPOINT_a11y_nomes_acessiveis.md
// and the `custom-control-accessible-name` skill.

const repoRoot = process.cwd();
const read = (rel: string) => readFileSync(path.join(repoRoot, rel), "utf8");

const CTOGGLE = "app/(site)/configuracao/components/CToggle.tsx";
const CSELECT = "app/(site)/configuracao/components/CSelect.tsx";
const TOGGLE_ROW = "app/(site)/configuracao/components/ToggleRow.tsx";
const MODALS = "app/(site)/agenda/modals.tsx";
const PAUSE_TOGGLES = "app/(site)/app/onboarding/_components/PauseToggles.tsx";
const PIX = "app/(site)/configuracao/components/PixSection.tsx";

// Every file that renders one of the controls below.
const CALL_SITE_FILES = [
  "app/(site)/configuracao/components/AvailabilitySection.tsx",
  "app/(site)/configuracao/components/MessagesSection.tsx",
  "app/(site)/configuracao/components/ServicesSection.tsx",
  PIX,
  TOGGLE_ROW,
  MODALS,
  PAUSE_TOGGLES,
];

// The hand-written controls, each with the file that defines it.
const CONTROLS = [
  { name: "CToggle", definedIn: CTOGGLE },
  { name: "CSelect", definedIn: CSELECT },
  { name: "Select", definedIn: MODALS },
  { name: "Toggle", definedIn: MODALS },
  { name: "Switch", definedIn: PAUSE_TOGGLES },
];

// The three that render <button role="switch"> directly. ToggleRow only wraps
// CToggle, so it has no element of its own to carry the role.
const SWITCH_IMPLEMENTATIONS = [CTOGGLE, MODALS, PAUSE_TOGGLES];

/**
 * The opening tag of every `<Name ...>` element in `src`.
 *
 * Scans brace depth rather than matching to the first ">", because the props
 * here are full of arrow functions (`onChange={v => ...}`) whose ">" would end
 * the tag far too early and make this guard pass on unlabelled call sites.
 */
function callSites(src: string, name: string): string[] {
  const needle = "<" + name;
  const found: string[] = [];
  let i = src.indexOf(needle);
  while (i !== -1) {
    // Reject <SelectSomething> when looking for <Select>.
    const next = src[i + needle.length];
    if (next === undefined || /[\s/>]/.test(next)) {
      let depth = 0;
      let j = i + needle.length;
      for (; j < src.length; j++) {
        const c = src[j];
        if (c === "{") depth++;
        else if (c === "}") depth--;
        else if (c === ">" && depth === 0) break;
      }
      found.push(src.slice(i, j));
    }
    i = src.indexOf(needle, i + needle.length);
  }
  return found;
}

describe("hand-written form controls declare a required label (A11Y-1)", () => {
  it.each(CONTROLS)("$name takes `label` as a required prop", ({ definedIn }) => {
    const code = read(definedIn);
    expect(code).toMatch(/\blabel: string;/);
    // `label?: string` would let a call site omit it and ship an unnamed
    // control with no compiler complaint — the exact failure mode being fixed.
    expect(code).not.toMatch(/\blabel\?:/);
  });

  it.each(CONTROLS)("$name spends that label on aria-label", ({ definedIn }) => {
    expect(read(definedIn)).toMatch(/aria-label=\{label\}/);
  });

  it("ToggleRow forwards its visible title down as the switch's name", () => {
    // Its <label> wrapper does name the button — but with the label's whole
    // text content, title and ~300-char description run together.
    expect(read(TOGGLE_ROW)).toMatch(/<CToggle[\s\S]*?label=\{title\}/);
  });

  it("NumberField names its input directly", () => {
    // Field's <label> binds to its FIRST labelable descendant, which is
    // HelpTip's <button> whenever `tip` is set — so the input gets nothing.
    expect(read(PIX)).toMatch(/aria-label=\{label\}/);
  });
});

describe("every call site supplies a name", () => {
  const sources = new Map(CALL_SITE_FILES.map((f) => [f, read(f)] as const));

  it.each(CONTROLS)("no <$name> is rendered without label=", ({ name }) => {
    const unlabelled: string[] = [];
    let total = 0;
    for (const [file, src] of sources) {
      for (const tag of callSites(src, name)) {
        total++;
        if (!/\blabel=/.test(tag)) unlabelled.push(file + ": " + tag.replace(/\s+/g, " "));
      }
    }
    // A rename would otherwise make this suite pass by finding nothing at all.
    expect(total).toBeGreaterThan(0);
    expect(unlabelled).toEqual([]);
  });
});

describe("every switch reports its role and state", () => {
  it.each(SWITCH_IMPLEMENTATIONS)("%s uses role=switch with aria-checked", (file) => {
    const code = read(file);
    expect(code).toMatch(/role="switch"/);
    // Without aria-checked the on/off state is carried by colour alone.
    expect(code).toMatch(/aria-checked=\{on\}/);
  });
});
