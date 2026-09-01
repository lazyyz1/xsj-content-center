import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { getIntegrationStatuses } from "../server/integrations";

describe("integration status", () => {
  it("reports missing Workspace providers as UNCONFIGURED and storage from actual env", async () => {
    const statuses = await getIntegrationStatuses("missing-workspace");
    expect(statuses.find((item) => item.name === "红狐 API")).toMatchObject({ status: "UNCONFIGURED", managedBy: "WORKSPACE", lastFour: null });
    expect(statuses.find((item) => item.name === "豆包 ASR")).toMatchObject({ status: "UNCONFIGURED" });
    expect(statuses.find((item) => item.name === "LLM")).toMatchObject({ status: "UNCONFIGURED" });
    expect(statuses.find((item) => item.name === "Storage")).toMatchObject({ status: "CONFIGURED", managedBy: "ENVIRONMENT" });
  });

  it("never returns secret payload fields", async () => {
    const serialized = JSON.stringify(await getIntegrationStatuses("missing-workspace"));
    expect(serialized).not.toContain("encryptedConfig");
    expect(serialized).not.toContain("ciphertext");
  });
});
