import { describe, expect, it } from "vitest";

import {
  PRIVACY_HREF,
  TERMS_HREF,
  resolvePlatformLoginHref,
  resolveSiteUrl,
} from "../platform-links";
import { LOGIN_ROUTE } from "../portal-routes";

// The landing's "Entrar" comes from a build-time variable that a human types
// into EasyPanel's Build Args. Every way that can go wrong — left empty, pasted
// with spaces, pasted without a scheme, pasted as http — must still produce a
// button that opens SOMETHING that works, never a dead or dangerous link.
describe("resolvePlatformLoginHref", () => {
  const PLATFORM = "https://plataforma.exemplo.com.br/login";

  it("uses the configured platform login URL as-is", () => {
    expect(resolvePlatformLoginHref(PLATFORM)).toBe(PLATFORM);
  });

  it("trims what a copy-paste leaves around it", () => {
    expect(resolvePlatformLoginHref(`  ${PLATFORM}\n`)).toBe(PLATFORM);
  });

  it("falls back to this app's own login when the variable is empty", () => {
    // Same brain-api account works there: a working door, not a dead button.
    for (const raw of [undefined, null, "", "   "]) {
      expect(resolvePlatformLoginHref(raw)).toBe(LOGIN_ROUTE);
    }
  });

  it("falls back on anything that is not an absolute URL", () => {
    for (const raw of ["plataforma.exemplo.com.br/login", "/login", "login", "https://"]) {
      expect(resolvePlatformLoginHref(raw)).toBe(LOGIN_ROUTE);
    }
  });

  it("refuses plain http outside localhost", () => {
    expect(resolvePlatformLoginHref("http://plataforma.exemplo.com.br/login")).toBe(LOGIN_ROUTE);
  });

  it("accepts plain http on localhost, for local development", () => {
    expect(resolvePlatformLoginHref("http://localhost:3001/login")).toBe("http://localhost:3001/login");
  });

  it("refuses schemes a browser would run or hand to another app", () => {
    for (const raw of ["javascript:alert(1)", "data:text/html,oi", "mailto:x@y.com", "ftp://x.com/"]) {
      expect(resolvePlatformLoginHref(raw)).toBe(LOGIN_ROUTE);
    }
  });

  it("refuses a URL that carries credentials", () => {
    expect(resolvePlatformLoginHref("https://user:pass@plataforma.exemplo.com.br/login")).toBe(
      LOGIN_ROUTE,
    );
  });
});

describe("resolveSiteUrl", () => {
  it("keeps only the origin", () => {
    expect(resolveSiteUrl("https://secretaria.exemplo.com.br/qualquer/coisa?x=1")?.toString()).toBe(
      "https://secretaria.exemplo.com.br/",
    );
  });

  it("is null when unset or unusable, so the landing omits absolute tags", () => {
    for (const raw of [undefined, "", "secretaria.exemplo.com.br", "http://secretaria.exemplo.com.br"]) {
      expect(resolveSiteUrl(raw)).toBeNull();
    }
  });
});

describe("legal page links", () => {
  // The pages themselves belong to another change; this pins the paths the
  // landing promises, with the trailing slash the static export writes.
  it("point at /termos/ and /privacidade/", () => {
    expect(TERMS_HREF).toBe("/termos/");
    expect(PRIVACY_HREF).toBe("/privacidade/");
  });
});
