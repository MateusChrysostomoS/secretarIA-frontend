import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";

// Deploy-config regression guard for the 2026-08-30 security audit
// (SEC-1 / SEC-3 / SEC-4). nginx.conf is not TypeScript and never runs in
// vitest, so this asserts on its SOURCE — the same technique
// app/(site)/__tests__/app-shell-viewport.test.ts uses for CSS.
//
// It exists because all three findings were invisible from inside the app:
// nothing in the React code changes when the container stops sending
// X-Frame-Options, or when an unknown URL starts answering 200 with the login
// screen. The only signal was a curl against production.

const repoRoot = process.cwd();
const read = (rel: string) => readFileSync(path.join(repoRoot, rel), "utf8");

const CONF = "nginx.conf";

describe("nginx security headers (SEC-1)", () => {
  const REQUIRED = [
    "X-Content-Type-Options",
    "X-Frame-Options",
    "Referrer-Policy",
    "Strict-Transport-Security",
    "Content-Security-Policy",
    "Permissions-Policy",
  ];

  it.each(REQUIRED)("sends %s", (header) => {
    expect(read(CONF)).toContain(`add_header ${header}`);
  });

  it("marks every add_header `always`, so error responses carry them too", () => {
    // Without `always` nginx drops add_header on 4xx/5xx — including the 404
    // page introduced below, which is a real page a stranger can reach.
    const lines = read(CONF)
      .split("\n")
      .filter((l) => l.trim().startsWith("add_header"));
    expect(lines.length).toBeGreaterThan(0);
    for (const line of lines) expect(line.trimEnd()).toMatch(/always;$/);
  });

  it("declares every add_header at server level and none inside a location", () => {
    // THE TRAP THIS TEST EXISTS FOR: nginx's add_header replaces rather than
    // merges across levels. A `location` that sets one header of its own
    // inherits NONE from the server block — so adding a single `add_header
    // Cache-Control` back into `location /` would silently strip every
    // security header above from every HTML response, with no error anywhere.
    const lines = read(CONF).split("\n");
    const firstLocation = lines.findIndex((l) => l.trim().startsWith("location "));
    expect(firstLocation).toBeGreaterThan(-1);
    expect(lines.slice(firstLocation).join("\n")).not.toContain("add_header");
  });

  it("keeps connect-src in sync with the API origins baked by the Dockerfile", () => {
    // These are NEXT_PUBLIC_MANAGE_API_BASE_URL and
    // NEXT_PUBLIC_SECRETARIA_HUB_BASE_URL. If one changes there and not here,
    // the browser blocks every API call and the server never sees a request.
    const conf = read(CONF);
    const csp = conf.slice(conf.indexOf("add_header Content-Security-Policy"));
    for (const [, value] of read("Dockerfile").matchAll(
      /^ARG NEXT_PUBLIC_(?:MANAGE_API|SECRETARIA_HUB)_BASE_URL=(\S+)$/gm,
    )) {
      // A PATH (brain-api, proxied under this origin at /api) is same-origin by
      // construction, so 'self' is what has to be there — not the path. What
      // must exist for it is the proxy, asserted in its own block below.
      if (value.startsWith("/")) {
        expect(csp).toContain("'self'");
        continue;
      }
      expect(csp).toContain(value);
    }
  });
});

// SEC-2 — the refresh token moved to an HttpOnly cookie, and the ONLY reason
// that cookie can be first-party (SameSite=Lax, immune to ITP/ETP eviction) is
// this proxy. Every assertion here fails invisibly in production if it is wrong:
// nothing in the React code changes, and nothing errors at build time.
describe("brain-api is proxied under this origin (SEC-2)", () => {
  const manageBase = () =>
    read("Dockerfile").match(/^ARG NEXT_PUBLIC_MANAGE_API_BASE_URL=(\S+)$/m)![1];

  const proxyBlock = () => {
    const conf = read(CONF);
    const start = conf.indexOf(`location ${manageBase()}/ {`);
    expect(start).toBeGreaterThan(-1);
    // The block ends at the first close-brace back at `location` indentation.
    const end = conf.indexOf("\n    }", start);
    return conf.slice(start, end);
  };

  it("bakes a same-origin PATH, not the brain-api origin", () => {
    // Point this back at an origin and the cookie is third-party again: Safari's
    // ITP and Firefox's ETP become free to drop it, and the silent refresh dies
    // for a slice of real users with nothing failing loudly.
    expect(manageBase()).toMatch(/^\/[a-z0-9-]+$/);
  });

  it("proxies that exact prefix to one https upstream, with SNI", () => {
    const block = proxyBlock();
    // The trailing slash strips the prefix: /api/auth/token -> /auth/token.
    expect(block).toMatch(/proxy_pass\s+https:\/\/\S+\/;/);
    // Without SNI the TLS terminator in front of brain-api cannot tell which
    // vhost is meant and answers with the wrong certificate.
    expect(block).toContain("proxy_ssl_server_name on;");
  });

  it("sends the UPSTREAM host, never this frontend's", () => {
    // EasyPanel's ingress routes by Host, so $host would land on the wrong
    // service — and it is also the name the certificate is verified against.
    expect(proxyBlock()).toContain("proxy_set_header Host $proxy_host;");
    expect(proxyBlock()).not.toContain("proxy_set_header Host $host;");
  });

  it("appends to X-Forwarded-For instead of replacing it", () => {
    // brain-api rate-limits per client IP off the FIRST hop of that header.
    // Replace it and every clinic in the country shares one 10-per-minute auth
    // budget, which presents as a login that randomly stops working.
    expect(proxyBlock()).toContain("$proxy_add_x_forwarded_for");
  });

  it("declares no add_header of its own", () => {
    // Same trap as the server-level list above: one add_header here strips every
    // security header from every /api/ response.
    expect(proxyBlock()).not.toContain("add_header");
  });

  it("ships the CA bundle whenever it verifies the upstream certificate", () => {
    // nginx refuses to START if proxy_ssl_trusted_certificate names a file that
    // is not there — a whole-site outage, not a degraded API.
    if (proxyBlock().includes("proxy_ssl_verify on;")) {
      expect(read("Dockerfile")).toContain("ca-certificates");
    }
  });
});

describe("nginx 404 handling (SEC-4)", () => {
  it("does not fall back to the login page for unknown URLs", () => {
    // `try_files … /index.html` answered 200 with the entry screen for every
    // url that did not exist, /robots.txt included.
    expect(read(CONF)).not.toMatch(/try_files[^;]*\/index\.html\s*;/);
  });

  it("ends try_files in =404 and serves the exported 404 page", () => {
    const conf = read(CONF);
    expect(conf).toMatch(/try_files[^;]*=404\s*;/);
    expect(conf).toMatch(/error_page\s+404\s+\/404(\.html|\/index\.html)\s*;/);
  });
});

describe("robots.txt (SEC-4)", () => {
  const robots = () => read("public/robots.txt");

  it("keeps the logged-in clinic surfaces out of search indexes", () => {
    for (const route of ["/agenda/", "/configuracao/", "/inicio/"]) {
      expect(robots()).toContain(`Disallow: ${route}`);
    }
  });

  it("keeps the token-bearing link targets out too", () => {
    for (const route of ["/esqueci_senha/", "/convite/"]) {
      expect(robots()).toContain(`Disallow: ${route}`);
    }
  });
});

describe("Referrer-Policy on the token routes (SEC-3)", () => {
  it("sends no-referrer where the URL carries a token", () => {
    // strict-origin-when-cross-origin still sends the FULL url as the Referer
    // of a page's own same-origin scripts and stylesheets — which would write
    // the reset token straight into this server's access log.
    const conf = read(CONF);
    const map = conf.slice(
      conf.indexOf("map $uri $secretaria_referrer_policy"),
      conf.indexOf("server {"),
    );
    expect(map).toContain("no-referrer");
    expect(map).toMatch(/esqueci_senha/);
    expect(map).toMatch(/convite/);
  });
});

describe("the three screens reached with a token in the URL (SEC-3)", () => {
  const SCREENS = [
    "app/(auth)/esqueci_senha/token/page.tsx",
    "app/(auth)/esqueci_senha/atualizar_senha/page.tsx",
    "app/(site)/convite/page.tsx",
  ];

  it.each(SCREENS)("%s takes the token back out of the address bar", (file) => {
    expect(read(file)).toContain("stripQueryParamFromUrl()");
  });

  it.each(SCREENS)("%s captures the token once instead of re-reading it", (file) => {
    // Reading it reactively after the rewrite gives an empty value: on
    // /convite that flips the view to "missing-token" mid-invite, and on
    // step 2 it re-runs the effect and cancels the verification in flight.
    expect(read(file)).toMatch(/useState\(\(\) => search(Params)?\.get\("token"\)/);
  });
});
