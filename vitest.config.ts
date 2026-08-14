import { defineConfig } from "vitest/config";
import path from "node:path";

// Minimal node-environment config for lib/** unit tests. No jsdom/happy-dom —
// tests that need `window` stub it themselves (see lib/__tests__/manage-api.test.ts).
// Also covers route-local __tests__ folders (e.g. onboarding's meta-embedded-signup)
// so pure logic extracted out of app/ components stays testable without jsdom.
export default defineConfig({
  test: {
    environment: "node",
    include: ["lib/__tests__/**/*.test.ts", "app/**/__tests__/**/*.test.ts"],
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "."),
    },
  },
});
