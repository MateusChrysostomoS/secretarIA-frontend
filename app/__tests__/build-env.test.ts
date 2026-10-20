import { describe, expect, it } from "vitest";
import { readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";

// NEXT_PUBLIC_* values are baked into the static export at `npm run build`.
// In production that build runs inside the Dockerfile, so a variable exists
// only if the Dockerfile declares it as an ARG (so EasyPanel's Build Args can
// set it) AND re-exports it as an ENV (so `next build` can see it). Setting it
// only in EasyPanel's Environment panel does nothing — that has already broken
// a real integration once (see CLAUDE.md). This guard makes "new variable
// without its pair" a red test instead of a silently empty value in production.

const repoRoot = process.cwd();
const read = (rel: string) => readFileSync(path.join(repoRoot, rel), "utf8");

const sources = (() => {
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

const referenced = [
  ...new Set(
    sources.flatMap((f) =>
      [...read(f).matchAll(/process\.env\.(NEXT_PUBLIC_[A-Z0-9_]+)/g)].map((m) => m[1]),
    ),
  ),
].sort();

describe("every NEXT_PUBLIC_* the bundle reads is baked by the Dockerfile", () => {
  const dockerfile = read("Dockerfile");

  it("finds the variables to check", () => {
    // The two API bases plus the landing's two (platform login, site URL).
    expect(referenced).toEqual(
      expect.arrayContaining([
        "NEXT_PUBLIC_MANAGE_API_BASE_URL",
        "NEXT_PUBLIC_SECRETARIA_HUB_BASE_URL",
        "NEXT_PUBLIC_PLATFORM_LOGIN_URL",
        "NEXT_PUBLIC_SITE_URL",
      ]),
    );
  });

  it.each(referenced)("%s has an ARG and a matching ENV", (name) => {
    expect(dockerfile).toMatch(new RegExp(`^ARG ${name}(=.*)?$`, "m"));
    expect(dockerfile).toMatch(new RegExp(`^ENV ${name}=\\$\\{${name}\\}$`, "m"));
  });

  it.each(referenced)("%s is declared before `npm run build`", (name) => {
    expect(dockerfile.indexOf(`ENV ${name}=`)).toBeLessThan(dockerfile.indexOf("RUN npm run build"));
  });

  it("documents each variable in .env.example", () => {
    const example = read(".env.example");
    for (const name of referenced) expect(example).toContain(`${name}=`);
  });
});
