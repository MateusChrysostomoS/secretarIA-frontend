# ── Stage 1: build the static export ───────────────────────────────
# Build context = this repository ROOT.
# EasyPanel → secretarIA-frontend service → Dockerfile: Dockerfile
FROM node:20-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
# Public API base URLs baked into the static build. Override with --build-arg if needed.
#
# This app talks to exactly TWO backends — there is deliberately no
# NEXT_PUBLIC_API_URL here (that one pointed at the PreCheck API, which this
# domain never calls; see docs/CHECKPOINT_secretaria_frontend.md).
#
# NEXT_PUBLIC_MANAGE_API_BASE_URL → brain-api base (login /auth/token, /auth/me,
#   /entitlements, /billing/checkout, /public/signup-intents).
#
#   A PATH, NOT AN ORIGIN, since 2026-08-31 — and that is the point. nginx.conf
#   reverse-proxies `location /api/` to the real brain-api, so the browser sees a
#   single origin and the session's refresh token can be a first-party HttpOnly
#   cookie (`__Host-refresh_token`). Pointing this back at the brain-api origin
#   would make that cookie third-party again: Safari's ITP and Firefox's ETP would
#   be free to drop it, and the silent refresh would fail for a slice of real
#   users with nothing failing loudly. Change it here only together with the
#   `location /api/` block in nginx.conf; app/__tests__/nginx-hardening.test.ts
#   asserts the pair.
#
#   For LOCAL dev against a brain-api on another port, set the full origin
#   (e.g. http://localhost:8000): localhost is same-SITE across ports, so the
#   cookie still works there.
ARG NEXT_PUBLIC_MANAGE_API_BASE_URL=/api
ENV NEXT_PUBLIC_MANAGE_API_BASE_URL=${NEXT_PUBLIC_MANAGE_API_BASE_URL}
# NEXT_PUBLIC_SECRETARIA_HUB_BASE_URL → secretarIA hub base (/tenants/me/config,
#   /tenants/me/calendar/*). Read by lib/secretaria-hub.ts; empty makes
#   hubConfigured() false, which is what renders the "conexão com os dados da sua
#   clínica não está configurada neste ambiente" banner and keeps every screen on
#   demo data. Setting this in EasyPanel's Environment panel has NO effect: the
#   build is a static export served by nginx, so NEXT_PUBLIC_* values only exist
#   if they are present HERE, at `npm run build` time.
#
# Use the secretarIA service's PUBLIC origin, taken from EasyPanel → secretarIA
# service → Domains. Scheme + host only: no trailing slash, no path, no port.
# NOT brain-api's SECRETARIA_BASE_URL — that one may be an internal-network
# address, which the doctor's browser cannot reach.
ARG NEXT_PUBLIC_SECRETARIA_HUB_BASE_URL=https://secretaria-secretaria-api.cpux9k.easypanel.host
ENV NEXT_PUBLIC_SECRETARIA_HUB_BASE_URL=${NEXT_PUBLIC_SECRETARIA_HUB_BASE_URL}
# Fail the build loudly if the placeholder above was never replaced. Without this
# guard an unreplaced "<host-...>" would bake an unreachable URL into the bundle:
# hubConfigured() would flip to true, every hub fetch would fail, and the UI would
# swap the honest "not configured" banner for a misleading "tente novamente" one.
# A "<" can never appear in a valid origin, so this is a no-op once replaced.
RUN case "$NEXT_PUBLIC_SECRETARIA_HUB_BASE_URL" in \
      *"<"*) echo "ERROR: replace the NEXT_PUBLIC_SECRETARIA_HUB_BASE_URL placeholder in Dockerfile with the secretarIA public origin." >&2; exit 1 ;; \
    esac
RUN npm run build

# ── Stage 2: serve the static files with nginx ──────────────────────
FROM nginx:1.27-alpine
# Needed by `proxy_ssl_verify on` in nginx.conf: without a CA bundle on disk
# nginx refuses to start, so this is not optional decoration — the /api/ proxy
# hop to brain-api is authenticated, not just encrypted.
RUN apk add --no-cache ca-certificates
COPY --from=build /app/out /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
