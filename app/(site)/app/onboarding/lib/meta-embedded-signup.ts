// meta-embedded-signup.ts — thin wrapper around Meta's JS SDK (WhatsApp
// Embedded Signup) for the "Tentar ativar agora" button (Feature 2). Kept out
// of the React component so the SDK's global `window.FB` + postMessage
// plumbing is easy to reason about (and stub) in isolation.
//
// Two data sources have to be combined into one outcome:
//   1. FB.login's callback — carries the OAuth `code` (or nothing, if the
//      user closed the popup without finishing).
//   2. The `WA_EMBEDDED_SIGNUP` window `message` event Meta's flow posts as
//      the user completes phone-number selection — carries `phone_number_id`
//      / `waba_id`, which the login callback does NOT include.
// The message consistently arrives before the popup closes and the login
// callback fires, so this listens first and resolves from the callback once
// both pieces are available (or immediately on an explicit CANCEL/ERROR
// message, which never gets a `code`).

const SDK_SRC = "https://connect.facebook.net/en_US/sdk.js";
// Graph API / JS SDK version (matches backend's META_GRAPH_BASE_URL). This is a
// DIFFERENT axis from the Embedded Signup flow version (v2/v4, see the FB.login
// `extras` comment below) — bumping this does not affect which Embedded Signup
// version runs, and vice versa. See GUIA_CREDENCIAIS_META_EMBEDDED_SIGNUP.md
// ("Versão do Embedded Signup", brain-api/docs) for the full writeup + sources.
const SDK_VERSION = "v23.0";

// Meta only ever posts embedded-signup messages from these two origins.
const TRUSTED_MESSAGE_ORIGINS = new Set([
  "https://www.facebook.com",
  "https://web.facebook.com",
]);

type FacebookLoginResponse = {
  authResponse?: { code?: string } | null;
};

declare global {
  interface Window {
    FB?: {
      init: (opts: { appId: string; version: string }) => void;
      login: (
        callback: (response: FacebookLoginResponse) => void,
        opts: Record<string, unknown>,
      ) => void;
    };
    fbAsyncInit?: () => void;
  }
}

let sdkLoadPromise: Promise<void> | null = null;

// Lazily injects the Meta SDK <script> tag exactly once per page load and
// resolves once `window.FB` is ready. Safe to call repeatedly — later calls
// reuse the same in-flight/resolved promise.
export function loadFacebookSdk(): Promise<void> {
  if (typeof window === "undefined") {
    return Promise.reject(new Error("loadFacebookSdk called with no window"));
  }
  if (window.FB) return Promise.resolve();
  if (sdkLoadPromise) return sdkLoadPromise;

  sdkLoadPromise = new Promise((resolve, reject) => {
    window.fbAsyncInit = () => resolve();
    const script = document.createElement("script");
    script.src = SDK_SRC;
    script.async = true;
    script.defer = true;
    script.crossOrigin = "anonymous";
    script.onerror = () => reject(new Error("Failed to load the Meta SDK script"));
    document.body.appendChild(script);
  });
  return sdkLoadPromise;
}

export type EmbeddedSignupOutcome =
  | { result: "pass"; code: string; phoneNumberId: string | null; wabaId: string | null }
  | { result: "fail"; errorCode: string | null };

// What ActivateButton should actually POST to /doctor/onboarding/attempts,
// given a raw EmbeddedSignupOutcome. Kept as a pure function (no fetch, no
// React state) so this decision is unit-testable without jsdom/testing-library.
export type OnboardingAttemptDecision =
  | { result: "pass"; code: string; phoneNumberId: string; wabaId: string | null }
  | { result: "fail"; errorCode: string | null };

// A "pass" outcome with no phoneNumberId means the Meta flow returned an
// OAuth code but the WA_EMBEDDED_SIGNUP message never carried a
// phone_number_id — the backend has nothing to activate on, and used to 422
// on that "pass" attempt instead. This maps it to an actionable
// "no_phone_number_id" fail locally so the caller can show retry copy
// instead of surfacing a doomed pass (Task 2 finding).
export function resolveAttemptDecision(outcome: EmbeddedSignupOutcome): OnboardingAttemptDecision {
  if (outcome.result === "fail") {
    return { result: "fail", errorCode: outcome.errorCode };
  }
  if (outcome.phoneNumberId === null) {
    return { result: "fail", errorCode: "no_phone_number_id" };
  }
  return { result: "pass", code: outcome.code, phoneNumberId: outcome.phoneNumberId, wabaId: outcome.wabaId };
}

// Result of classifying one already-parsed WA_EMBEDDED_SIGNUP message body
// ({event, data}). Extracted as a pure function (no window/FB access) so the
// FINISH*/CANCEL/ERROR branching can be unit-tested directly instead of only
// through a real postMessage round-trip.
export type SignupMessageClassification =
  | { kind: "finish"; phoneNumberId: string | null; wabaId: string | null }
  | { kind: "fail"; errorCode: string | null }
  | { kind: "ignore" };

export function classifySignupMessage(data: Record<string, unknown>): SignupMessageClassification {
  const payload = (data.data ?? {}) as Record<string, unknown>;
  const event = data.event;

  // Meta has been adding FINISH_* variants over time (Coexistence, OBO
  // migration, grant-only API access) rather than replacing FINISH, so this
  // matches by prefix instead of an exact set. Known values as of this
  // writing (Embedded Signup "Implementation" doc,
  // developers.facebook.com/documentation/business-messaging/whatsapp/embedded-signup/implementation):
  // FINISH, FINISH_ONLY_WABA, FINISH_WHATSAPP_BUSINESS_APP_ONBOARDING (Coexistence),
  // FINISH_OBO_MIGRATION, FINISH_GRANT_ONLY_API_ACCESS. A prefix match means a
  // future variant this list doesn't yet know about still resolves phone_number_id/
  // waba_id instead of being silently ignored.
  if (typeof event === "string" && event.startsWith("FINISH")) {
    return {
      kind: "finish",
      phoneNumberId: typeof payload.phone_number_id === "string" ? payload.phone_number_id : null,
      wabaId: typeof payload.waba_id === "string" ? payload.waba_id : null,
    };
  }
  if (event === "CANCEL") {
    const step = typeof payload.current_step === "string" ? payload.current_step : "cancelled";
    return { kind: "fail", errorCode: step };
  }
  if (event === "ERROR") {
    const msg = typeof payload.error_message === "string" ? payload.error_message : "error";
    return { kind: "fail", errorCode: msg };
  }
  return { kind: "ignore" };
}

// Runs one Embedded Signup round-trip: loads the SDK, inits it with the
// tenant's app_id, opens FB.login with the given config_id, and listens for
// the WA_EMBEDDED_SIGNUP message to capture phone_number_id/waba_id.
//
// `featureType`, when passed, selects a specific onboarding sub-flow via
// FB.login's `extras.featureType` (e.g. Coexistence — see the `extras`
// comment below). Omit it for the default "new number" flow.
export async function runEmbeddedSignup(
  appId: string,
  configId: string,
  featureType?: string,
): Promise<EmbeddedSignupOutcome> {
  await loadFacebookSdk();
  const FB = window.FB;
  if (!FB) throw new Error("Meta SDK failed to initialize");

  FB.init({ appId, version: SDK_VERSION });

  return new Promise((resolve) => {
    let phoneNumberId: string | null = null;
    let wabaId: string | null = null;
    let settled = false;

    function finish(outcome: EmbeddedSignupOutcome) {
      if (settled) return;
      settled = true;
      window.removeEventListener("message", onMessage);
      resolve(outcome);
    }

    function onMessage(event: MessageEvent) {
      if (!TRUSTED_MESSAGE_ORIGINS.has(event.origin)) return;
      let data: Record<string, unknown>;
      try {
        data = typeof event.data === "string" ? JSON.parse(event.data) : event.data;
      } catch {
        return; // not JSON — not our message
      }
      if (data?.type !== "WA_EMBEDDED_SIGNUP") return;

      // Contract-shape debug: Meta's own docs are inconsistent on whether the
      // `extras.featureType` key we send is echoed back as `featureType` or
      // `feature_type` (Task 0 finding). Logging event + payload key names
      // (never values — phone numbers/tokens can be in there) for every real
      // signup message is how a live test against the Meta popup confirms
      // which spelling actually shows up, without shipping a debug UI.
      if (process.env.NODE_ENV !== "production") {
        const debugPayload = (data.data ?? {}) as Record<string, unknown>;
        console.debug("[meta-embedded-signup] WA_EMBEDDED_SIGNUP message", {
          event: data.event,
          payloadKeys: Object.keys(debugPayload),
        });
      }

      const classification = classifySignupMessage(data);
      if (classification.kind === "finish") {
        phoneNumberId = classification.phoneNumberId;
        wabaId = classification.wabaId;
      } else if (classification.kind === "fail") {
        finish({ result: "fail", errorCode: classification.errorCode });
      }
    }

    window.addEventListener("message", onMessage);

    FB.login(
      (response) => {
        const code = response.authResponse?.code;
        if (code) {
          finish({ result: "pass", code, phoneNumberId, wabaId });
        } else {
          finish({ result: "fail", errorCode: "auth_cancelled" });
        }
      },
      {
        config_id: configId,
        response_type: "code",
        override_default_response_type: true,
        // v4 is the current Embedded Signup version (v2 deprecates 2026-10-15,
        // per Meta's official docs). What v4 actually retired is
        // `sessionInfoVersion` — v2 required it to get phone_number_id/waba_id
        // on the FINISH message; v4 sends full session info for every flow by
        // default, so that field alone is gone. `featureType` is NOT v2-only:
        // the v4 docs page states in prose that "Onboarding WhatsApp Business
        // app users continues to be supported through the feature_type
        // parameter", and the Coexistence custom-flows doc
        // (docs/whatsapp/embedded-signup/custom-flows/onboarding-business-app-users)
        // documents the JS SDK key as `extras.featureType =
        // "whatsapp_business_app_onboarding"`. So the key is only included
        // when a caller explicitly opts into that (or a future) sub-flow —
        // omitting it keeps the default "new number" flow byte-identical to
        // before. Which flow VERSION runs at all is still NOT selected here —
        // that's `configId` itself: a Facebook Login for Business
        // Configuration created in the Meta App Dashboard (App Dashboard >
        // Facebook Login for Business > Configurations > "Embedded Signup" >
        // select products). See GUIA_CREDENCIAIS_META_EMBEDDED_SIGNUP.md
        // ("Versão do Embedded Signup", brain-api/docs) for sources.
        extras: featureType ? { setup: {}, featureType } : { setup: {} },
      },
    );
  });
}
