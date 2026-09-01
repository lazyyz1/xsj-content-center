import { describe, expect, it } from "vitest";
import { UnsupportedIntegrationTester } from "./tester";

describe("IntegrationTester", () => {
  it("reports the provider stage as unsupported without making a request", async () => {
    await expect(new UnsupportedIntegrationTester().testConnection("REDFOX")).resolves.toEqual({
      supported: false,
      status: "UNSUPPORTED_UNTIL_PROVIDER_STAGE",
      message: "Provider 尚未接入",
    });
  });
});
