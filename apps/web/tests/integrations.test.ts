import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { getIntegrationStatuses } from "../server/integrations";

describe("integration status", () => {
  it("reports missing Workspace providers as UNCONFIGURED and storage from actual env", async () => {
    const statuses = await getIntegrationStatuses("missing-workspace");
    expect(statuses.find((item) => item.name === "RedFox")).toMatchObject({ status: "UNCONFIGURED", managedBy: "WORKSPACE", lastFour: null, defaults: { baseUrl: "https://redfox.hk" } });
    expect(statuses.find((item) => item.name === "豆包语音识别")).toMatchObject({ status: "UNCONFIGURED", defaults: { resourceId: "volc.bigasr.auc_turbo" } });
    expect(statuses.find((item) => item.name === "Kimi AI")).toMatchObject({ status: "UNCONFIGURED" });
    expect(statuses.find((item) => item.name === "Storage")).toMatchObject({ status: "CONFIGURED", managedBy: "ENVIRONMENT" });
  });

  it("never returns secret payload fields", async () => {
    const serialized = JSON.stringify(await getIntegrationStatuses("missing-workspace"));
    expect(serialized).not.toContain("encryptedConfig");
    expect(serialized).not.toContain("ciphertext");
  });
});
