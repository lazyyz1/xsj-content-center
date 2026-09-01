import { randomBytes, randomUUID } from "node:crypto";
import { db } from "@content-center/db";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { IntegrationService } from "./service";

describe("IntegrationService integration", () => {
  const runId = randomUUID();
  const userId = `integration-admin-${runId}`;
  const plaintext = `fake-admin-secret-${randomUUID()}`;
  const key = randomBytes(32).toString("base64");
  const service = new IntegrationService(db, () => key);
  let workspaceId = "";

  beforeAll(async () => {
    await db.user.create({ data: { id: userId, name: "Integration Admin", email: `${userId}@example.test` } });
    const workspace = await db.workspace.create({
      data: {
        name: "Integration Test",
        slug: `integration-${runId}`,
        members: { create: { userId, role: "ADMIN" } },
      },
    });
    workspaceId = workspace.id;
  });

  afterAll(async () => {
    if (workspaceId) await db.workspace.delete({ where: { id: workspaceId } });
    await db.user.deleteMany({ where: { id: userId } });
    await db.$disconnect();
  });

  it("stores an ADMIN-provided RedFox key encrypted and only exposes public data", async () => {
    const publicResult = await service.saveIntegrationConfig({
      workspaceId,
      userId,
      provider: "REDFOX",
      config: { baseUrl: "https://example.invalid", apiKey: plaintext },
    });
    expect(publicResult).toMatchObject({ status: "CONFIGURED", configured: true, lastFour: plaintext.slice(-4) });
    expect(JSON.stringify(publicResult)).not.toContain(plaintext);

    const stored = await db.integrationConfig.findUniqueOrThrow({
      where: { workspaceId_provider: { workspaceId, provider: "REDFOX" } },
    });
    expect(stored.encryptedConfig).not.toContain(plaintext);
    expect(JSON.stringify(stored.publicConfig)).not.toContain(plaintext);
    await expect(service.getDecryptedIntegrationConfig(workspaceId, "REDFOX")).resolves.toEqual({
      baseUrl: "https://example.invalid",
      apiKey: plaintext,
    });

    await expect(service.disableIntegration({ workspaceId, userId, provider: "REDFOX" })).resolves.toMatchObject({ status: "DISABLED" });
    await expect(service.getDecryptedIntegrationConfig(workspaceId, "REDFOX")).resolves.toBeNull();
    await expect(service.enableIntegration({ workspaceId, userId, provider: "REDFOX" })).resolves.toMatchObject({ status: "CONFIGURED" });

    const audits = await db.auditLog.findMany({ where: { workspaceId, resourceId: stored.id } });
    expect(JSON.stringify(audits)).not.toContain(plaintext);
    expect(audits.map((audit) => audit.action)).toEqual(expect.arrayContaining([
      "integration.created",
      "integration.disabled",
      "integration.enabled",
    ]));
    expect(audits).toHaveLength(3);
  });

  it("fails closed without a master key and does not create a plaintext row", async () => {
    const withoutKey = new IntegrationService(db, () => undefined);
    await expect(withoutKey.saveIntegrationConfig({
      workspaceId,
      userId,
      provider: "LLM",
      config: {
        provider: "openai-compatible",
        baseUrl: "https://example.invalid/v1",
        apiKey: "must-never-be-stored",
        model: "example-model",
      },
    })).rejects.toThrow("Secret encryption is not configured");
    await expect(db.integrationConfig.findUnique({
      where: { workspaceId_provider: { workspaceId, provider: "LLM" } },
    })).resolves.toBeNull();
  });

  it("stores the current Doubao API key encrypted and exposes only protocol defaults", async () => {
    const apiKey = `doubao-${randomUUID()}`;
    const result = await service.saveIntegrationConfig({
      workspaceId,
      userId,
      provider: "DOUBAO_ASR",
      config: { authMode: "API_KEY", apiKey },
    });
    expect(result).toMatchObject({
      status: "CONFIGURED",
      configured: true,
      publicConfig: {
        authMode: "API_KEY",
        baseUrl: "https://openspeech.bytedance.com",
        resourceId: "volc.bigasr.auc_turbo",
      },
      lastFour: apiKey.slice(-4),
    });
    expect(JSON.stringify(result)).not.toContain(apiKey);
    const stored = await db.integrationConfig.findUniqueOrThrow({
      where: { workspaceId_provider: { workspaceId, provider: "DOUBAO_ASR" } },
    });
    expect(stored.encryptedConfig).not.toContain(apiKey);
    expect(JSON.stringify(stored.publicConfig)).not.toContain(apiKey);
    await expect(service.getDecryptedIntegrationConfig(workspaceId, "DOUBAO_ASR")).resolves.toMatchObject({ apiKey });
  });
});
