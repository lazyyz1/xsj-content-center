import { db, type Prisma } from "@content-center/db";
import { decryptConfig, encryptConfig, parseMasterEncryptionKey, secretLastFour } from "./encryption";
import {
  type ConfigurableIntegrationProvider,
  isConfigurableIntegrationProvider,
  normalizePublicProviderConfig,
  parseProviderConfig,
  primarySecretField,
  splitProviderConfig,
} from "./schemas";

export const INTEGRATION_AUDIT_ACTIONS = [
  "integration.created",
  "integration.updated",
  "integration.disabled",
  "integration.enabled",
  "integration.deleted",
  "integration.tested",
  "integration.test_failed",
] as const;

export class IntegrationServiceError extends Error {
  constructor(
    readonly code: "INTEGRATION_NOT_FOUND" | "UNSUPPORTED_INTEGRATION" | "INTEGRATION_SECRET_REQUIRED",
    message: string,
  ) {
    super(message);
    this.name = "IntegrationServiceError";
  }
}

type IntegrationDatabase = typeof db;

function jsonObject(value: Prisma.JsonValue | null): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : {};
}

function inputJson(value: Record<string, unknown>): Prisma.InputJsonValue {
  return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
}

export type PublicIntegrationConfig = {
  provider: ConfigurableIntegrationProvider;
  status: "CONFIGURED" | "UNCONFIGURED" | "ERROR" | "DISABLED" | "MOCK";
  configured: boolean;
  publicConfig: Record<string, unknown>;
  lastFour: string | null;
  updatedAt: Date | null;
};

export class IntegrationService {
  constructor(
    private readonly prisma: IntegrationDatabase = db,
    private readonly keySource: () => string | undefined = () => process.env.INTEGRATION_ENCRYPTION_KEY,
  ) {
    const configuredKey = this.keySource();
    if (configuredKey?.trim()) parseMasterEncryptionKey(configuredKey);
  }

  async getIntegrationStatus(workspaceId: string, provider: ConfigurableIntegrationProvider): Promise<PublicIntegrationConfig> {
    const row = await this.prisma.integrationConfig.findUnique({
      where: { workspaceId_provider: { workspaceId, provider } },
    });
    if (!row) {
      return { provider, status: "UNCONFIGURED", configured: false, publicConfig: {}, lastFour: null, updatedAt: null };
    }
    return {
      provider,
      status: row.status,
      configured: row.status === "CONFIGURED",
      publicConfig: normalizePublicProviderConfig(provider, jsonObject(row.publicConfig)),
      lastFour: row.lastFour,
      updatedAt: row.updatedAt,
    };
  }

  async getPublicIntegrationConfig(workspaceId: string, provider: ConfigurableIntegrationProvider) {
    return this.getIntegrationStatus(workspaceId, provider);
  }

  async getDecryptedIntegrationConfig(workspaceId: string, provider: ConfigurableIntegrationProvider) {
    const row = await this.prisma.integrationConfig.findUnique({
      where: { workspaceId_provider: { workspaceId, provider } },
    });
    if (!row || row.status !== "CONFIGURED" || !row.encryptedConfig) return null;
    const secretConfig = decryptConfig(row.encryptedConfig, parseMasterEncryptionKey(this.keySource()));
    return { ...jsonObject(row.publicConfig), ...secretConfig };
  }

  async saveIntegrationConfig(input: {
    workspaceId: string;
    userId: string;
    provider: ConfigurableIntegrationProvider;
    config: unknown;
  }) {
    const parsed = parseProviderConfig(input.provider, input.config);
    const key = parseMasterEncryptionKey(this.keySource());
    const existing = await this.prisma.integrationConfig.findUnique({
      where: { workspaceId_provider: { workspaceId: input.workspaceId, provider: input.provider } },
    });
    const { publicConfig, secretConfig: suppliedSecrets } = splitProviderConfig(input.provider, parsed);
    const existingSecrets = existing?.encryptedConfig ? decryptConfig(existing.encryptedConfig, key) : {};
    const secretConfig = { ...existingSecrets, ...suppliedSecrets };
    const combinedConfig = { ...publicConfig, ...secretConfig };
    const primarySecret = primarySecretField(input.provider, combinedConfig);
    const primaryValue = secretConfig[primarySecret];
    if (typeof primaryValue !== "string" || !primaryValue) {
      throw new IntegrationServiceError("INTEGRATION_SECRET_REQUIRED", `${primarySecret} is required.`);
    }
    const configured = typeof primaryValue === "string" && primaryValue.length > 0;
    const encryptedConfig = Object.keys(secretConfig).length > 0 ? encryptConfig(secretConfig, key) : null;
    const changedFields = Object.keys(parsed).sort();
    const status = configured ? "CONFIGURED" : "UNCONFIGURED";

    return this.prisma.$transaction(async (tx) => {
      const row = await tx.integrationConfig.upsert({
        where: { workspaceId_provider: { workspaceId: input.workspaceId, provider: input.provider } },
        create: {
          workspaceId: input.workspaceId,
          provider: input.provider,
          status,
          configured,
          publicConfig: inputJson(publicConfig),
          encryptedConfig,
          lastFour: configured ? secretLastFour(primaryValue as string) : null,
          encryptionKeyVersion: 1,
        },
        update: {
          status,
          configured,
          publicConfig: inputJson(publicConfig),
          encryptedConfig,
          lastFour: configured ? secretLastFour(primaryValue as string) : null,
          encryptionKeyVersion: 1,
        },
      });
      await tx.auditLog.create({
        data: {
          workspaceId: input.workspaceId,
          userId: input.userId,
          action: existing ? "integration.updated" : "integration.created",
          resourceType: "integration_config",
          resourceId: row.id,
          metadata: { provider: input.provider, status, changedFields },
        },
      });
      return {
        provider: input.provider,
        status: row.status,
        configured: row.status === "CONFIGURED",
        publicConfig,
        lastFour: row.lastFour,
        updatedAt: row.updatedAt,
      } satisfies PublicIntegrationConfig;
    });
  }

  async disableIntegration(input: { workspaceId: string; userId: string; provider: ConfigurableIntegrationProvider }) {
    return this.setEnabled(input, false);
  }

  async enableIntegration(input: { workspaceId: string; userId: string; provider: ConfigurableIntegrationProvider }) {
    return this.setEnabled(input, true);
  }

  private async setEnabled(
    input: { workspaceId: string; userId: string; provider: ConfigurableIntegrationProvider },
    enabled: boolean,
  ) {
    const existing = await this.prisma.integrationConfig.findUnique({
      where: { workspaceId_provider: { workspaceId: input.workspaceId, provider: input.provider } },
    });
    if (!existing) throw new IntegrationServiceError("INTEGRATION_NOT_FOUND", "Integration does not exist.");
    let configured = false;
    if (enabled && existing.encryptedConfig) {
      const secrets = decryptConfig(existing.encryptedConfig, parseMasterEncryptionKey(this.keySource()));
      const publicConfig = normalizePublicProviderConfig(input.provider, jsonObject(existing.publicConfig));
      configured = typeof secrets[primarySecretField(input.provider, { ...publicConfig, ...secrets })] === "string";
    }
    const status = enabled ? (configured ? "CONFIGURED" : "UNCONFIGURED") : "DISABLED";
    await this.prisma.$transaction([
      this.prisma.integrationConfig.update({
        where: { id: existing.id },
        data: { status, configured },
      }),
      this.prisma.auditLog.create({
        data: {
          workspaceId: input.workspaceId,
          userId: input.userId,
          action: enabled ? "integration.enabled" : "integration.disabled",
          resourceType: "integration_config",
          resourceId: existing.id,
          metadata: { provider: input.provider, status, changedFields: ["status"] },
        },
      }),
    ]);
    return this.getIntegrationStatus(input.workspaceId, input.provider);
  }

  async deleteIntegration(input: { workspaceId: string; userId: string; provider: ConfigurableIntegrationProvider }) {
    const existing = await this.prisma.integrationConfig.findUnique({
      where: { workspaceId_provider: { workspaceId: input.workspaceId, provider: input.provider } },
    });
    if (!existing) throw new IntegrationServiceError("INTEGRATION_NOT_FOUND", "Integration does not exist.");
    await this.prisma.$transaction(async (tx) => {
      await tx.auditLog.create({
        data: {
          workspaceId: input.workspaceId,
          userId: input.userId,
          action: "integration.deleted",
          resourceType: "integration_config",
          resourceId: existing.id,
          metadata: { provider: input.provider, status: "UNCONFIGURED", changedFields: [] },
        },
      });
      await tx.integrationConfig.delete({ where: { id: existing.id } });
    });
  }
}

export function assertConfigurableProvider(value: string): ConfigurableIntegrationProvider {
  if (!isConfigurableIntegrationProvider(value)) {
    throw new IntegrationServiceError("UNSUPPORTED_INTEGRATION", "Integration provider is not configurable.");
  }
  return value;
}
