"use client";
// useSecretariaHub — client hook shared by the agenda and configuração pages.
// Resolves whether the real secretarIA hub data path is usable, without ever
// hard-redirecting: these product routes double as demo showcases, so a
// missing session or a missing entitlement just means "stay in demo mode".
//
// Flow:
//   1. No session -> stays in demo mode; pages show a "faça login" notice.
//   2. Session, but brain-api refuses the hub token with 403
//      (`secretaria_not_entitled`) -> notEntitled=true immediately; demo
//      mode + notice. Not retried — a plan limitation isn't transient.
//   3. Session, hub token mint fails for any OTHER reason (network, 5xx,
//      cold start) -> retried with backoff (immediate, ~1s, ~3s, ~7s — 4
//      attempts total). If every attempt fails, unavailable=true so the page
//      can show a truthful "couldn't connect, try again" banner instead of
//      silently sitting in demo mode forever.
//   4. Session + entitled + a hub base URL is configured -> hubTokenReady=true.
//
// NAMING, deliberately: `hubTokenReady`, not `hubReady`. It means "a token was
// minted and a base URL exists", which is strictly weaker than "the hub
// answered". No GET has been attempted at this point, so a screen that treats
// this as "the data is here" will happily present whatever placeholder it was
// initialised with. That conflation is exactly what let the Configuração page
// show demo values to a tenant whose config GET had failed; pages now track
// their own per-source load phases on top of this flag (see
// configuracao/lib/hydration.ts).

import { useCallback, useEffect, useRef, useState } from "react";
import {
  ensureSession,
  getSession,
  ManageApiError,
  type Session,
} from "@/lib/manage-api";
import { getHubToken, hubConfigured } from "@/lib/secretaria-hub";

export type UseSecretariaHubResult = {
  session: Session | null;
  // True once the session/entitlement check has settled: success, a 403
  // (not entitled), or every retry attempt has been exhausted.
  ready: boolean;
  // True when the tenant does not have the secretarIA entitlement.
  notEntitled: boolean;
  // True once every retry attempt has failed for a reason OTHER than a 403
  // (network, 5xx, cold start, etc). Distinct from notEntitled: this is a
  // transient condition worth retrying, not a plan limitation.
  unavailable: boolean;
  // True when it's safe to ATTEMPT a hub call: session + entitled + hub base
  // URL configured. Not a promise that any call has succeeded — see the
  // naming note at the top of this file.
  hubTokenReady: boolean;
  // Restarts the mint cycle from attempt 1 (resetting ready/notEntitled/
  // unavailable/entitlement). No-op without a session. Wired to the
  // "Tentar novamente" action in HubNotice.
  retry: () => void;
};

// Delay (ms) before each RETRY attempt (i.e. attempts 2, 3, 4) — the first
// attempt always fires immediately on mount/retry.
const RETRY_DELAYS_MS = [1000, 3000, 7000];
const MAX_ATTEMPTS = RETRY_DELAYS_MS.length + 1; // 4

export function useSecretariaHub(): UseSecretariaHubResult {
  const [session, setSession] = useState<Session | null>(null);
  const [ready, setReady] = useState(false);
  const [notEntitled, setNotEntitled] = useState(false);
  const [unavailable, setUnavailable] = useState(false);
  const [entitled, setEntitled] = useState(false);

  // Bumped at the start of every cycle (mount or retry()) so a still-pending
  // attempt/timer from a SUPERSEDED cycle recognises it's stale and no-ops
  // instead of clobbering fresher state (e.g. a slow attempt resolving after
  // retry() already started a brand new cycle, or a React StrictMode
  // double-invoke in dev).
  const generationRef = useRef(0);
  // Pending retry timers for the CURRENT cycle — cleared on every new cycle
  // and on unmount so nothing fires after the hook stops caring.
  const timersRef = useRef<ReturnType<typeof setTimeout>[]>([]);

  // Runs one full mint-with-retry cycle for the given session. Safe to call
  // again mid-cycle (retry()) — it supersedes whatever was running.
  const runCycle = useCallback((current: Session) => {
    const myGeneration = ++generationRef.current;
    timersRef.current.forEach(clearTimeout);
    timersRef.current = [];

    const attempt = (attemptIndex: number) => {
      if (generationRef.current !== myGeneration) return; // superseded — ignore
      getHubToken(current)
        .then(() => {
          if (generationRef.current !== myGeneration) return;
          setEntitled(true);
          setReady(true);
        })
        .catch((e) => {
          if (generationRef.current !== myGeneration) return;
          if (e instanceof ManageApiError && e.status === 403) {
            setNotEntitled(true);
            setReady(true);
            return; // a plan limitation, not transient — never retry
          }
          if (attemptIndex + 1 < MAX_ATTEMPTS) {
            const timer = setTimeout(() => attempt(attemptIndex + 1), RETRY_DELAYS_MS[attemptIndex]);
            timersRef.current.push(timer);
            return;
          }
          // Every attempt failed for a non-403 reason — the hub is genuinely
          // unreachable right now, not just "this tenant lacks the add-on".
          setUnavailable(true);
          setReady(true);
        });
    };

    attempt(0);
  }, []);

  // Restarts the cycle from scratch. Resets every outcome flag (not just
  // ready/unavailable) so a fresh cycle can't inherit a stale verdict from
  // the previous one.
  const retry = useCallback(() => {
    if (!session) return;
    setReady(false);
    setNotEntitled(false);
    setUnavailable(false);
    setEntitled(false);
    runCycle(session);
  }, [session, runCycle]);

  useEffect(() => {
    // Async for the same reason as usePortalGuard: since the refresh token moved
    // to an HttpOnly cookie, a RELOAD leaves nothing in memory, and reading the
    // session synchronously here would answer "no session" — dropping a paying
    // clinic into the demo view of its own agenda, silently and every time.
    let cancelled = false;
    void (async () => {
      const current = getSession() ?? (await ensureSession());
      if (cancelled) return;
      setSession(current);
      if (!current) {
        setReady(true);
        return;
      }
      runCycle(current);
    })();
    return () => {
      cancelled = true;
      // Unmounting (or a StrictMode dev double-invoke) mid-cycle: supersede
      // any in-flight attempt's .then/.catch and clear pending timers.
      generationRef.current++;
      timersRef.current.forEach(clearTimeout);
      timersRef.current = [];
    };
    // Intentionally mount-only: this hook re-derives session once and never
    // reacts to it changing — login/logout in this app is a route push
    // (fresh mount), not an in-place session swap. See secretaria-hub.ts.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return {
    session,
    ready,
    notEntitled,
    unavailable,
    hubTokenReady: entitled && hubConfigured(),
    retry,
  };
}
