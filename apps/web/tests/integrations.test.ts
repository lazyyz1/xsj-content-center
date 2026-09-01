import { afterEach, describe, expect, it } from "vitest";
import { getIntegrationStatuses } from "../server/integrations";

describe("integration status", () => {
  const originalMockMode = process.env.MOCK_MODE;

  afterEach(() => {
    process.env.MOCK_MODE = originalMockMode;
  });

  it("reports external providers as Unconfigured and storage from actual env", () => {
    process.env.MOCK_MODE = "false";
    const statuses = Object.fromEntries(getIntegrationStatuses().map((item) => [item.name, item.status]));
    expect(statuses["红狐 API"]).toBe("Unconfigured");
    expect(statuses["豆包 ASR"]).toBe("Unconfigured");
    expect(statuses.LLM).toBe("Unconfigured");
    expect(statuses.Storage).toBe("Configured");
  });

  it("marks unavailable external providers as Mock only in explicit mock mode", () => {
    process.env.MOCK_MODE = "true";
    const statuses = getIntegrationStatuses();
    expect(statuses.slice(0, 3).every((item) => item.status === "Mock")).toBe(true);
  });
});
