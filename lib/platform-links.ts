// platform-links.ts — the links the public site hands a visitor that lead OUT of
// this app, or to pages another change owns. Pure on purpose (no React, no
// window), so the node-environment vitest setup can exercise every branch.
//
// Two build-time variables feed it, each with an ARG/ENV pair in the Dockerfile
// (setting them only in EasyPanel's Environment panel does nothing — this is a
// static export, NEXT_PUBLIC_* exist only if present at `npm run build`):
//
//   NEXT_PUBLIC_PLATFORM_LOGIN_URL — the FULL URL of the clinic platform's login
//     page (the Brain-Message console, where doctors and secretaries work:
//     Conversas, Agenda, Contexto). The landing's "Entrar" points here.
//   NEXT_PUBLIC_SITE_URL — this site's own public origin. Only used to make
//     canonical / og:url / og:image absolute; social scrapers ignore relative ones.

import { LOGIN_ROUTE } from "./portal-routes";

// Owned by a separate change (the legal pages). Linked from the footer and next
// to every form, but NOT created here. Trailing slash on purpose: plain <a>
// links (not next/link) and `trailingSlash: true` mean this is the exact path
// the export writes, so no redirect hop.
export const TERMS_HREF = "/termos/";
export const PRIVACY_HREF = "/privacidade/";

// Accepts only an absolute http(s) URL a browser can actually be sent to.
// Plain http is allowed for localhost alone (local development); credentials
// in the URL are refused outright — a link that carries a password is a leak,
// not a configuration.
function parsePublicUrl(raw: string | undefined | null): URL | null {
  const value = (raw ?? "").trim();
  if (!value) return null;
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    return null;
  }
  if (url.username || url.password) return null;
  const isLocal = url.hostname === "localhost" || url.hostname === "127.0.0.1";
  if (url.protocol === "https:") return url;
  if (url.protocol === "http:" && isLocal) return url;
  return null;
}

// Where the landing's "Entrar" goes.
//
// FALLBACK WHEN EMPTY OR INVALID: this app's own login (LOGIN_ROUTE). The same
// brain-api account signs in there, so a build that forgot the variable still
// gives a doctor a working door instead of a dead button — it just opens the
// older hub rather than the platform. The report and the Dockerfile both say
// to set it.
export function resolvePlatformLoginHref(raw: string | undefined | null): string {
  const url = parsePublicUrl(raw);
  return url ? url.toString() : LOGIN_ROUTE;
}

// This site's public origin, or null. Only the ORIGIN survives: canonical and
// og:url are built from it, and a stray path would make every one of them wrong.
export function resolveSiteUrl(raw: string | undefined | null): URL | null {
  const url = parsePublicUrl(raw);
  return url ? new URL(url.origin) : null;
}

export const PLATFORM_LOGIN_HREF = resolvePlatformLoginHref(
  process.env.NEXT_PUBLIC_PLATFORM_LOGIN_URL,
);

export const SITE_URL = resolveSiteUrl(process.env.NEXT_PUBLIC_SITE_URL);
