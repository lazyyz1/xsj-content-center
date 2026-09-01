"use client";

import { Badge, Button, Card, Input } from "@content-center/ui";
import { useRouter } from "next/navigation";
import { useState } from "react";

type Integration = {
  provider: "REDFOX" | "DOUBAO_ASR" | "LLM" | "STORAGE";
  name: string;
  status: "CONFIGURED" | "UNCONFIGURED" | "ERROR" | "DISABLED" | "MOCK";
  configured: boolean;
  publicConfig: Record<string, unknown>;
  lastFour: string | null;
  updatedAt: string | null;
  description: string;
  managedBy: "WORKSPACE" | "ENVIRONMENT";
  connectionTest: "UNSUPPORTED_UNTIL_PROVIDER_STAGE" | "LIVE_API_TEST_NOT_AVAILABLE" | "NOT_APPLICABLE";
};

const statusLabel = {
  CONFIGURED: "Configured",
  UNCONFIGURED: "Unconfigured",
  ERROR: "Error",
  DISABLED: "Disabled",
  MOCK: "Mock",
} as const;

const statusColor = {
  CONFIGURED: "border-[color-mix(in_srgb,var(--success)_30%,transparent)] text-[var(--success)]",
  UNCONFIGURED: "text-[var(--text-secondary)]",
  ERROR: "border-[color-mix(in_srgb,var(--danger)_30%,transparent)] text-[var(--danger)]",
  DISABLED: "text-[var(--text-secondary)]",
  MOCK: "border-[color-mix(in_srgb,var(--warning)_30%,transparent)] text-[var(--warning)]",
} as const;

function value(config: Record<string, unknown>, key: string) {
  return typeof config[key] === "string" ? config[key] : "";
}

export function IntegrationCard({
  integration,
  canManage,
  encryptionConfigured,
}: {
  integration: Integration;
  canManage: boolean;
  encryptionConfigured: boolean;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [secret, setSecret] = useState("");
  const [doubaoApiKey, setDoubaoApiKey] = useState("");
  const [doubaoAccessToken, setDoubaoAccessToken] = useState("");

  async function call(path: string, method: string, body?: unknown) {
    const response = await fetch(path, {
      method,
      headers: body ? { "content-type": "application/json" } : undefined,
      body: body ? JSON.stringify(body) : undefined,
    });
    const result = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(result.message || result.error || "Integration operation failed.");
    return result;
  }

  async function act(work: () => Promise<void>) {
    setBusy(true);
    setError("");
    try {
      await work();
      setSecret("");
      setDoubaoApiKey("");
      setDoubaoAccessToken("");
      router.refresh();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Integration operation failed.");
    } finally {
      setBusy(false);
    }
  }

  function configFrom(formData: FormData) {
    if (integration.provider === "REDFOX") {
      return {
        baseUrl: String(formData.get("baseUrl") || ""),
        ...(secret ? { apiKey: secret } : {}),
      };
    }
    if (integration.provider === "DOUBAO_ASR") {
      return {
        authMode: String(formData.get("authMode") || "API_KEY"),
        baseUrl: String(formData.get("baseUrl") || ""),
        ...(doubaoApiKey ? { apiKey: doubaoApiKey } : {}),
        appId: String(formData.get("appId") || ""),
        ...(doubaoAccessToken ? { accessToken: doubaoAccessToken } : {}),
        resourceId: String(formData.get("resourceId") || ""),
        boostingTableId: String(formData.get("boostingTableId") || ""),
        boostingTableName: String(formData.get("boostingTableName") || ""),
      };
    }
    return {
      provider: String(formData.get("llmProvider") || ""),
      baseUrl: String(formData.get("baseUrl") || ""),
      ...(secret ? { apiKey: secret } : {}),
      model: String(formData.get("model") || ""),
    };
  }

  return (
    <Card className="p-6">
      <div className="flex items-center justify-between gap-4">
        <h2 className="font-semibold">{integration.name}</h2>
        <Badge className={statusColor[integration.status]}>{statusLabel[integration.status]}</Badge>
      </div>
      <p className="mt-3 text-sm leading-6 text-[var(--text-secondary)]">{integration.description}</p>
      <p className="mt-2 text-xs text-[var(--text-secondary)]">
        {integration.managedBy === "ENVIRONMENT" ? "Environment Managed" : "Workspace Managed"}
      </p>

      {canManage && integration.lastFour ? (
        <p className="mt-3 text-sm" aria-label={`${integration.name} 已保存凭证`}>
          已保存凭证：<span className="font-mono">••••{integration.lastFour}</span>
        </p>
      ) : null}

      {canManage && integration.managedBy === "WORKSPACE" ? (
        <form
          className="mt-5 grid gap-3"
          action={(formData) =>
            act(async () => {
              await call(`/api/integrations/${integration.provider}`, "PUT", { config: configFrom(formData) });
            })
          }
        >
          {integration.provider === "LLM" ? (
            <label className="grid gap-1 text-sm">
              LLM Provider
              <Input name="llmProvider" aria-label="LLM Provider" required defaultValue={value(integration.publicConfig, "provider")} placeholder="openai-compatible" />
            </label>
          ) : null}
          {integration.provider === "DOUBAO_ASR" ? (
            <>
              <label className="grid gap-1 text-sm">
                认证方式
                <select name="authMode" aria-label="豆包认证方式" defaultValue={value(integration.publicConfig, "authMode") || "API_KEY"} className="h-10 rounded-[var(--radius)] border bg-transparent px-3">
                  <option value="API_KEY">API Key（推荐）</option>
                  <option value="LEGACY_APP_TOKEN">Legacy App ID + Access Token</option>
                </select>
              </label>
              <label className="grid gap-1 text-sm">
                API Key
                <Input type="password" value={doubaoApiKey} onChange={(event) => setDoubaoApiKey(event.target.value)} aria-label="豆包 ASR API Key" autoComplete="new-password" placeholder={integration.configured ? "留空以保留现有凭证" : "输入新版控制台 API Key"} />
              </label>
              <label className="grid gap-1 text-sm">Resource ID<Input name="resourceId" aria-label="豆包 Resource ID" defaultValue={value(integration.publicConfig, "resourceId") || "volc.bigasr.auc_turbo"} /></label>
              <details className="rounded-lg border p-3">
                <summary className="cursor-pointer text-sm font-medium">高级设置</summary>
                <div className="mt-3 grid gap-3">
                  <label className="grid gap-1 text-sm">Base URL<Input name="baseUrl" type="url" aria-label="豆包 ASR Base URL" defaultValue={value(integration.publicConfig, "baseUrl") || "https://openspeech.bytedance.com"} /></label>
                  <label className="grid gap-1 text-sm">Legacy App ID<Input name="appId" aria-label="豆包 App ID" defaultValue={value(integration.publicConfig, "appId")} /></label>
                  <label className="grid gap-1 text-sm">Legacy Access Token<Input type="password" value={doubaoAccessToken} onChange={(event) => setDoubaoAccessToken(event.target.value)} aria-label="豆包 ASR Access Token" autoComplete="new-password" placeholder="仅旧版控制台需要" /></label>
                  <label className="grid gap-1 text-sm">Hotword Table ID<Input name="boostingTableId" aria-label="豆包 Hotword Table ID" defaultValue={value(integration.publicConfig, "boostingTableId")} /></label>
                  <label className="grid gap-1 text-sm">Hotword Table Name<Input name="boostingTableName" aria-label="豆包 Hotword Table Name" defaultValue={value(integration.publicConfig, "boostingTableName")} /></label>
                </div>
              </details>
            </>
          ) : (
            <label className="grid gap-1 text-sm">
              {integration.name} Base URL
              <Input name="baseUrl" type="url" aria-label={`${integration.name} Base URL`} required defaultValue={value(integration.publicConfig, "baseUrl")} placeholder="https://example.invalid" />
            </label>
          )}
          {integration.provider === "LLM" ? (
            <label className="grid gap-1 text-sm">Model<Input name="model" aria-label="LLM Model" required defaultValue={value(integration.publicConfig, "model")} /></label>
          ) : null}
          {integration.provider !== "DOUBAO_ASR" ? (
            <label className="grid gap-1 text-sm">
              API Key
              <Input type="password" value={secret} onChange={(event) => setSecret(event.target.value)} aria-label={`${integration.name} API Key`} required={!integration.configured} autoComplete="new-password" placeholder={integration.configured ? "留空以保留现有凭证" : "输入凭证"} />
            </label>
          ) : null}
          <div className="flex flex-wrap gap-2">
            <Button disabled={busy || !encryptionConfigured}>保存{integration.name}</Button>
            {integration.status === "CONFIGURED" ? (
              <Button type="button" variant="secondary" disabled={busy} onClick={() => act(async () => { await call(`/api/integrations/${integration.provider}/disable`, "POST"); })}>Disable</Button>
            ) : null}
            {integration.status === "DISABLED" ? (
              <Button type="button" variant="secondary" disabled={busy || !encryptionConfigured} onClick={() => act(async () => { await call(`/api/integrations/${integration.provider}/enable`, "POST"); })}>Enable</Button>
            ) : null}
            {integration.status !== "UNCONFIGURED" ? (
              <Button type="button" variant="secondary" className="text-[var(--danger)]" disabled={busy} onClick={() => { if (window.confirm(`确定删除 ${integration.name} 配置吗？`)) act(async () => { await call(`/api/integrations/${integration.provider}`, "DELETE"); }); }}>Delete</Button>
            ) : null}
          </div>
        </form>
      ) : null}

      {integration.managedBy === "WORKSPACE" ? (
        <Button className="mt-3 w-full" variant="secondary" disabled>{integration.connectionTest === "LIVE_API_TEST_NOT_AVAILABLE" ? "配置格式有效 · 无轻量 Live Test" : "测试连接 — Provider 尚未接入"}</Button>
      ) : null}
      {error ? <p role="alert" className="mt-3 text-sm text-[var(--danger)]">{error}</p> : null}
    </Card>
  );
}
