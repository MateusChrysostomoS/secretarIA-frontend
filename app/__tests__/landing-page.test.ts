import { describe, expect, it } from "vitest";
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";

// The public landing at "/" (2026-10-19) and the move of the login to /entrar.
//
// SOURCE TESTS, for the reason the rest of app/__tests__ gives: vitest runs in
// the `node` environment here, with no jsdom, so no React tree can be rendered.
// What can be pinned is the wiring, read as text — and for a marketing page the
// riskiest regressions ARE text: a claim the product cannot back, a CTA pointed
// at the wrong door, a link that sends a stranger to a form for a paused plan.

const repoRoot = process.cwd();
const read = (rel: string) => readFileSync(path.join(repoRoot, rel), "utf8");
const exists = (rel: string) => existsSync(path.join(repoRoot, rel));

const LANDING_DIR = "app/(marketing)";
const PAGE = `${LANDING_DIR}/page.tsx`;
const HEADER = `${LANDING_DIR}/_components/SiteHeader.tsx`;
const FORM = `${LANDING_DIR}/_components/ContactForm.tsx`;

// Every .tsx under the landing's route group — the copy lives in all of them.
const landingSources = (() => {
  const out: string[] = [];
  const walk = (dir: string) => {
    for (const entry of readdirSync(path.join(repoRoot, dir))) {
      const rel = `${dir}/${entry}`;
      if (statSync(path.join(repoRoot, rel)).isDirectory()) walk(rel);
      else if (entry.endsWith(".tsx")) out.push(rel);
    }
  };
  walk(LANDING_DIR);
  return out;
})();

// Comments explain what the copy must NOT say, and so name the very words the
// guards look for. Only the code (JSX text, strings) is checked.
const stripComments = (src: string) =>
  src.replace(/\{\/\*[\s\S]*?\*\/\}/g, "").replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");

describe("route ownership", () => {
  it('serves "/" from the marketing group and from nowhere else', () => {
    // Two route groups with a root page.tsx is a build error at best and the
    // wrong page at worst; the old login lived at app/(auth)/page.tsx.
    expect(exists(PAGE)).toBe(true);
    expect(exists("app/(auth)/page.tsx")).toBe(false);
    expect(exists("app/(site)/page.tsx")).toBe(false);
  });

  it("keeps the login form, now at /entrar", () => {
    const login = read("app/(auth)/entrar/page.tsx");
    expect(login).toContain("<form");
    expect(login).toContain("login(email.trim(), password)");
    // The reset flow's banner still has a reader.
    expect(login).toContain('search.get("reset") === "success"');
  });
});

describe("nothing still treats \"/\" as the login screen", () => {
  // Every redirect that meant "go log in" used a "/" literal before the move.
  // Left behind, each one would drop a signed-out doctor on marketing copy with
  // no form — silently, since "/" is a perfectly valid page.
  const files = (() => {
    const out: string[] = [];
    const walk = (dir: string) => {
      for (const entry of readdirSync(path.join(repoRoot, dir))) {
        const rel = `${dir}/${entry}`;
        if (entry === "__tests__" || entry === "node_modules") continue;
        if (statSync(path.join(repoRoot, rel)).isDirectory()) walk(rel);
        else if (/\.(ts|tsx)$/.test(entry)) out.push(rel);
      }
    };
    walk("app");
    walk("lib");
    return out;
  })();

  it.each([
    ['router.replace("/")', /router\.replace\(\s*["']\/["']\s*\)/],
    ['router.push("/")', /router\.push\(\s*["']\/["']\s*\)/],
    ['location.assign("/")', /location\.assign\(\s*["']\/["']\s*\)/],
    ['navigate("/")', /navigate\(\s*["']\/["']\s*\)/],
    ['"/?reset=success"', /["']\/\?reset=success["']/],
  ])("no %s anywhere in app/ or lib/", (_label, pattern) => {
    const offenders = files.filter((f) => pattern.test(read(f)));
    expect(offenders).toEqual([]);
  });

  it("keeps the dark-by-default theme on the login screen, not on the landing", () => {
    const layout = read("app/layout.tsx");
    expect(layout).toContain("p==='/entrar'||p==='/entrar/'");
    expect(layout).not.toContain("location.pathname==='/'");
  });
});

describe("calls to action", () => {
  const page = read(PAGE);
  const header = read(HEADER);

  it('"Entrar" opens the clinic platform login from the build variable', () => {
    expect(page).toContain("platformHref={PLATFORM_LOGIN_HREF}");
    expect(header).toMatch(/href=\{platformHref\}[\s\S]{0,120}Entrar/);
  });

  it("never sends a visitor to the signup wizard", () => {
    // /cadastro sells the WhatsApp-based plan, and its billing is on hold.
    for (const f of landingSources) {
      const code = stripComments(read(f));
      expect(code).not.toContain("/cadastro");
      expect(code).not.toContain("SIGNUP_HREF");
    }
  });

  it("does not probe for a session on a public page", () => {
    // ensureSession() spends the refresh cookie: one POST per stranger, for a
    // page that shows everyone the same thing.
    for (const f of landingSources) {
      const code = stripComments(read(f));
      expect(code).not.toMatch(/ensureSession|getSession/);
    }
  });

  it("captures new clinics through the existing demo-request endpoint", () => {
    const form = read(FORM);
    expect(form).toContain("submitDemoRequest(");
    expect(form).toContain('source: "secretaria"');
    expect(form).toContain('product_interest: "secretaria"');
    // brain-api's honeypot field is sent, so its bot filter actually runs.
    expect(form).toMatch(/\bwebsite,/);
  });

  it("links the legal pages from the footer and next to the form", () => {
    expect(page).toContain("href={TERMS_HREF}");
    expect(page).toContain("href={PRIVACY_HREF}");
    const form = read(FORM);
    expect(form).toContain("href={PRIVACY_HREF}");
    expect(form).toContain("href={TERMS_HREF}");
  });
});

describe("copy only claims what the product does today", () => {
  const all = landingSources.map((f) => stripComments(read(f))).join("\n");

  it.each([
    ["an official WhatsApp channel", /whatsapp oficial/i],
    ["a Meta approval", /homologad/i],
    ["encryption claims", /criptograf/i],
    ["data residency", /(dados|servidores)[^.]{0,40}no brasil/i],
    ["certifications", /certifica|\bISO\s?\d|HIPAA|SOC ?2/i],
    ["the model provider", /anthropic|claude|openai|\bgpt\b|chatgpt/i],
    ["testimonials", /depoimento/i],
  ])("does not claim %s", (_label, pattern) => {
    expect(all).not.toMatch(pattern);
  });

  it("names WhatsApp only as coming soon", () => {
    const page = stripComments(read(PAGE));
    expect(page).toContain("WhatsApp em breve");
    // Every sentence that names WhatsApp also says it is not live yet.
    const sentences = page.split(/(?<=[.?!])\s+/).filter((s) => /whatsapp/i.test(s));
    expect(sentences.length).toBeGreaterThan(0);
    for (const s of sentences) expect(s).toMatch(/breve|ainda não|em preparação/i);
  });

  it("states the emergency rule", () => {
    expect(all).toContain("192");
    expect(all).toMatch(/pronto-socorro/);
  });

  it("labels every product figure as an illustration with made-up data", () => {
    const figures = stripComments(read(`${LANDING_DIR}/_components/Figures.tsx`));
    const figs = figures.match(/<figure\b/g) ?? [];
    const captions = figures.match(/Ilustração com dados fictícios/g) ?? [];
    expect(figs.length).toBeGreaterThan(0);
    expect(captions.length).toBe(figs.length);
  });
});

describe("robots.txt for the new front door", () => {
  const robots = read("public/robots.txt");

  it("lets the landing be indexed", () => {
    expect(robots).toMatch(/^Allow: \/$/m);
  });

  it("keeps the login form out of the index", () => {
    expect(robots).toContain("Disallow: /entrar/");
  });
});
