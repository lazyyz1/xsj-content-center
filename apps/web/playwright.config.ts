import { randomBytes } from "node:crypto";
import { defineConfig, devices } from "@playwright/test";

process.env.INTEGRATION_ENCRYPTION_KEY ||= randomBytes(32).toString("base64");
process.env.ALLOW_PUBLIC_SIGNUP ??= "true";
process.env.SYSTEM_MANAGED_PROVIDERS ??= "false";

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
    command: "pnpm dev",
    url: process.env.APP_URL ?? "http://localhost:3000",
    reuseExistingServer: true,
    timeout: 120_000,
  },
});
