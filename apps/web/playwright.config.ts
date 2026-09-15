import { randomBytes } from "node:crypto";
import { defineConfig, devices } from "@playwright/test";

process.env.INTEGRATION_ENCRYPTION_KEY ||= randomBytes(32).toString("base64");
process.env.ALLOW_PUBLIC_SIGNUP ??= "true";
process.env.SYSTEM_MANAGED_PROVIDERS ??= "false";

if (process.env.ENVIRONMENT_ID !== "LOCAL_TEST") {
  throw new Error("PLAYWRIGHT_ENVIRONMENT_GUARD_FAILED: E2E must run with ENVIRONMENT_ID=LOCAL_TEST");
}

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: "list",
  use: {
    baseURL: process.env.APP_URL ?? "http://localhost:3000",
    trace: "retain-on-failure",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: {
    command: "pnpm --filter @content-center/web dev",
    url: process.env.APP_URL ?? "http://localhost:3000",
    reuseExistingServer: false,
    timeout: 120_000,
  },
});
