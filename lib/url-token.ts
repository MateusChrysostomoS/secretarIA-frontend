// url-token.ts — takes a one-time token back out of the address bar once the
// screen that needs it has read it.
//
// Three screens are reached by a link that carries a secret in the query
// string: /esqueci_senha/token/?token=… , /esqueci_senha/atualizar_senha/
// ?token=… and /convite/?token=… . Two of them then sit there for as long as
// the person takes to choose a password, with the token visible in the address
// bar, saved in the browser's history, and offered to anything that reads the
// current URL. None of them used to clean it up.
//
// The rewrite is done with history.replaceState rather than a router
// navigation on purpose: it edits the CURRENT history entry in place, so the
// token-bearing URL is not merely navigated away from, it stops existing in
// the session history.
//
// This is the address-bar half of the fix. The header half — keeping the same
// token out of the Referer of the page's own scripts and stylesheets, which
// are requested before any of this can run — is the `no-referrer` map in
// nginx.conf, which covers exactly these routes.

/**
 * The URL to replace `current` with once `name` is stripped from its query, or
 * null when there is nothing to strip.
 *
 * Accepts either a full URL or a path; returns a root-relative URL, which is
 * what replaceState wants and what keeps the origin untouched. Any other query
 * parameters and the hash survive.
 */
export function urlWithoutParam(current: string, name: string): string | null {
  let url: URL;
  try {
    // The base only matters for a path-shaped input; it is never part of the
    // returned value.
    url = new URL(current, "http://placeholder.invalid");
  } catch {
    return null;
  }
  if (!url.searchParams.has(name)) return null;
  url.searchParams.delete(name);
  const query = url.searchParams.toString();
  return `${url.pathname}${query ? `?${query}` : ""}${url.hash}`;
}

/**
 * Rewrites the address bar so it no longer carries `name`. No-op outside the
 * browser, and no-op when the parameter is not there.
 *
 * Callers must have captured the value FIRST and must not re-read it from the
 * URL afterwards — see the useState-initializer capture in the three screens
 * that use this.
 */
export function stripQueryParamFromUrl(name = "token"): void {
  if (typeof window === "undefined") return;
  const next = urlWithoutParam(window.location.href, name);
  if (next === null) return;
  try {
    // history.state is passed through, not replaced with null: Next's App
    // Router keeps its own routing state in there, and clobbering it breaks
    // the browser's back button for the rest of the session.
    window.history.replaceState(window.history.state, "", next);
  } catch {
    // Some embedded webviews refuse replaceState. A token left in the bar is
    // the thing we were trying to avoid, not a reason to break the screen.
  }
}
