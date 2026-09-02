"use client";

import { Badge, Button, Card, Input } from "@content-center/ui";
import { Eye, EyeOff } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

type Integration = {
  provider: "REDFOX" | "DOUBAO_ASR" | "TRANSCRIPTION" | "LLM" | "STORAGE";
  name: string;
  status: "CONFIGURED" | "UNCONFIGURED" | "ERROR" | "DISABLED" | "MOCK";
  configured: boolean;
  publicConfig: Record<string, unknown>;
  lastFour: string | null;
  updatedAt: string | null;
  description: string;
  usage: readonly string[];
  defaults: Record<string, string>;
  managedBy: "WORKSPACE" | "ENVIRONMENT";
  connectionTest: "UNSUPPORTED_UNTIL_PROVIDER_STAGE" | "LIVE_API_TEST_NOT_AVAILABLE" | "NOT_APPLICABLE";
};

const statusLabel = {
  CONFIGURED: "已配置",
  UNCONFIGURED: "未配置",
  ERROR: "配置异常",
  DISABLED: "已禁用",
  MOCK: "MOCK MODE",
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

class IntegrationClientError extends Error {
  constructor(readonly code: string, readonly detail: string) {
    super(detail);
  }
}

function friendlyError(error: IntegrationClientError) {
  if (error.code === "INTEGRATION_ENCRYPTION_NOT_CONFIGURED" || error.code === "INVALID_INTEGRATION_ENCRYPTION_KEY") {
    return "密钥加密服务尚未配置，请联系系统管理员。";
  }
  if (error.code === "INTEGRATION_SECRET_REQUIRED") return "请填写当前认证方式需要的 API 密钥。";
  if (error.code === "INVALID_INTEGRATION_CONFIG") return "配置内容格式不正确，请检查必填项和地址格式。";
  if (error.code === "FORBIDDEN") return "当前账户没有修改服务配置的权限。";
  return "配置保存失败，请稍后重试。";
}

function SecretInput({ label, ariaLabel, value: secret, onChange, required, placeholder }: {
  label: string;
  ariaLabel: string;
  value: string;
  onChange: (value: string) => void;
  required?: boolean;
  placeholder: string;
}) {
  const [visible, setVisible] = useState(false);
  return (
    <label className="grid gap-1.5 text-sm">
      <span className="flex items-center justify-between gap-3">
        {label}
        <button type="button" className="inline-flex items-center gap-1 text-xs text-[var(--text-secondary)] hover:text-[var(--text-primary)]" onClick={() => setVisible((current) => !current)}>
          {visible ? <EyeOff size={14} /> : <Eye size={14} />}
          {visible ? "隐藏" : "显示"}
        </button>
      </span>
      <Input type={visible ? "text" : "password"} value={secret} onChange={(event) => onChange(event.target.value)} aria-label={ariaLabel} autoComplete="new-password" required={required} placeholder={placeholder} />
    </label>
  );
}

function SavedSecret({ name, lastFour, onReplace, label = "API Key" }: { name: string; lastFour: string | null; onReplace: () => void; label?: string }) {
  if (!lastFour) return null;
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-[var(--surface-elevated)] px-4 py-3">
      <p className="text-sm" aria-label={`${name} 已保存凭证`}>{label}：<span className="font-mono">••••••••{lastFour}</span></p>
      <Button type="button" variant="ghost" className="h-8 px-2 text-xs" onClick={onReplace}>修改密钥</Button>
    </div>
  );
}

export function IntegrationCard({ integration, canManage, encryptionConfigured }: { integration: Integration; canManage: boolean; encryptionConfigured: boolean }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<IntegrationClientError | null>(null);
  const [secret, setSecret] = useState("");
  const [editingSecret, setEditingSecret] = useState(!integration.lastFour);
  const [doubaoApiKey, setDoubaoApiKey] = useState("");
  const [doubaoAccessToken, setDoubaoAccessToken] = useState("");
  const initialAuthMode = value(integration.publicConfig, "authMode") || "API_KEY";
  const [authMode, setAuthMode] = useState(initialAuthMode);
  const doubaoHasSelectedSecret = Boolean(integration.lastFour && authMode === initialAuthMode);

  async function call(path: string, method: string, body?: unknown) {
    const response = await fetch(path, { method, headers: body ? { "content-type": "application/json" } : undefined, body: body ? JSON.stringify(body) : undefined });
    const result = await response.json().catch(() => ({})) as { error?: string; message?: string };
    if (!response.ok) throw new IntegrationClientError(result.error ?? "INTEGRATION_OPERATION_FAILED", result.message ?? `HTTP ${response.status}`);
    return result;
  }

  async function act(work: () => Promise<void>) {
    setBusy(true);
    setError(null);
    try {
      await work();
      setSecret("");
      setDoubaoApiKey("");
      setDoubaoAccessToken("");
      setEditingSecret(false);
      router.refresh();
    } catch (cause) {
      setError(cause instanceof IntegrationClientError ? cause : new IntegrationClientError("INTEGRATION_OPERATION_FAILED", "Unknown error"));
    } finally {
      setBusy(false);
    }
  }

  function configFrom(formData: FormData) {
    if (integration.provider === "REDFOX") return { baseUrl: String(formData.get("baseUrl") || ""), ...(secret ? { apiKey: secret } : {}) };
    if (integration.provider === "DOUBAO_ASR") {
      return {
        authMode,
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
      provider: value(integration.publicConfig, "provider") || integration.defaults.provider,
      baseUrl: String(formData.get("baseUrl") || ""),
      ...(secret ? { apiKey: secret } : {}),
      label: String(formData.get("label") || "自定义模型"),
      modelId: String(formData.get("modelId") || ""),
    };
  }

  const verificationText = integration.provider === "REDFOX"
    ? "配置保存后，将在首次解析素材时验证。"
    : integration.provider === "DOUBAO_ASR"
      ? "配置保存后，将在首次转写时验证。"
      : "配置保存后，将在首次使用 AI 能力时验证。";

  return (
    <Card className="p-6 sm:p-7" aria-label={`${integration.name} 配置`}>
      <div className="flex items-start justify-between gap-4">
        <div><h2 className="text-lg font-semibold">{integration.name}</h2><p className="mt-2 max-w-xl text-sm leading-6 text-[var(--text-secondary)]">{integration.description}</p></div>
        <Badge className={statusColor[integration.status]}>{statusLabel[integration.status]}</Badge>
      </div>
      <div className="mt-4 flex flex-wrap items-center gap-2 text-xs text-[var(--text-secondary)]">
        <span>用于：</span>{integration.usage.map((item) => <span key={item} className="rounded-full bg-[var(--surface-elevated)] px-2.5 py-1">{item}</span>)}
      </div>

      {!canManage && integration.managedBy === "WORKSPACE" ? <p className="mt-5 rounded-xl bg-[var(--surface-elevated)] p-4 text-sm text-[var(--text-secondary)]">当前账户可查看服务状态，配置仅限管理员修改。</p> : null}

      {canManage && integration.managedBy === "WORKSPACE" ? (
        <form className="mt-6 grid gap-4 border-t pt-6" action={(formData) => act(async () => { await call(`/api/integrations/${integration.provider}`, "PUT", { config: configFrom(formData) }); })}>
          {integration.provider === "REDFOX" ? (
            <>
              <label className="grid gap-1.5 text-sm">Base URL<Input name="baseUrl" type="url" aria-label="RedFox Base URL" required defaultValue={value(integration.publicConfig, "baseUrl") || integration.defaults.baseUrl} /></label>
              {!editingSecret && integration.lastFour ? <SavedSecret name={integration.name} lastFour={integration.lastFour} onReplace={() => setEditingSecret(true)} /> : null}
              {editingSecret ? <SecretInput label="API Key" ariaLabel="RedFox API Key" value={secret} onChange={setSecret} required={!integration.lastFour} placeholder={integration.lastFour ? "输入新的 API Key" : "输入 API Key"} /> : null}
            </>
          ) : null}

          {integration.provider === "DOUBAO_ASR" ? (
            <>
              <div><p className="text-sm font-medium">认证方式</p><p className="mt-1 text-sm text-[var(--text-secondary)]">API Key（推荐）</p></div>
              {authMode === "API_KEY" ? (
                <>
                  {!editingSecret && doubaoHasSelectedSecret ? <SavedSecret name={integration.name} lastFour={integration.lastFour} onReplace={() => setEditingSecret(true)} /> : null}
                  {editingSecret ? <SecretInput label="API Key" ariaLabel="豆包语音识别 API Key" value={doubaoApiKey} onChange={setDoubaoApiKey} required={!doubaoHasSelectedSecret} placeholder={doubaoHasSelectedSecret ? "输入新的 API Key" : "输入 API Key"} /> : null}
                </>
              ) : null}
              <label className="grid gap-1.5 text-sm">Resource ID<Input name="resourceId" aria-label="豆包语音识别 Resource ID" required defaultValue={value(integration.publicConfig, "resourceId") || integration.defaults.resourceId} /></label>
              <details className="rounded-xl border border-[color-mix(in_srgb,var(--border)_65%,transparent)] p-4" open={authMode === "LEGACY_APP_TOKEN"}>
                <summary className="cursor-pointer text-sm font-medium">高级设置</summary>
                <div className="mt-4 grid gap-4">
                  <label className="grid gap-1.5 text-sm">Base URL<Input name="baseUrl" type="url" aria-label="豆包语音识别 Base URL" required defaultValue={value(integration.publicConfig, "baseUrl") || integration.defaults.baseUrl} /><span className="text-xs text-[var(--text-secondary)]">默认使用系统提供的服务地址。</span></label>
                  <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={authMode === "LEGACY_APP_TOKEN"} onChange={(event) => { setAuthMode(event.target.checked ? "LEGACY_APP_TOKEN" : "API_KEY"); setEditingSecret(true); }} />使用旧版认证</label>
                  {authMode === "LEGACY_APP_TOKEN" ? (
                    <div className="grid gap-4 rounded-xl bg-[var(--surface-elevated)] p-4">
                      <label className="grid gap-1.5 text-sm">App ID<Input name="appId" aria-label="豆包旧版 App ID" required defaultValue={value(integration.publicConfig, "appId")} /></label>
                      {!editingSecret && doubaoHasSelectedSecret ? <SavedSecret name={integration.name} lastFour={integration.lastFour} label="Access Token" onReplace={() => setEditingSecret(true)} /> : null}
                      {editingSecret ? <SecretInput label="Access Token" ariaLabel="豆包旧版 Access Token" value={doubaoAccessToken} onChange={setDoubaoAccessToken} required={!doubaoHasSelectedSecret} placeholder={doubaoHasSelectedSecret ? "输入新的 Access Token" : "输入 Access Token"} /> : null}
                    </div>
                  ) : null}
                  <label className="grid gap-1.5 text-sm">热词表 ID（可选）<Input name="boostingTableId" aria-label="豆包热词表 ID" defaultValue={value(integration.publicConfig, "boostingTableId")} /></label>
                  <label className="grid gap-1.5 text-sm">热词表名称（可选）<Input name="boostingTableName" aria-label="豆包热词表名称" defaultValue={value(integration.publicConfig, "boostingTableName")} /></label>
                </div>
              </details>
            </>
          ) : null}

          {integration.provider === "LLM" ? (
            <>
              <label className="grid gap-1.5 text-sm">Base URL<Input name="baseUrl" type="url" aria-label="Kimi AI Base URL" required defaultValue={value(integration.publicConfig, "baseUrl")} placeholder="填写 Kimi 控制台提供的 API 地址" /></label>
              {!editingSecret && integration.lastFour ? <SavedSecret name={integration.name} lastFour={integration.lastFour} onReplace={() => setEditingSecret(true)} /> : null}
              {editingSecret ? <SecretInput label="API Key" ariaLabel="Kimi AI API Key" value={secret} onChange={setSecret} required={!integration.lastFour} placeholder={integration.lastFour ? "输入新的 API Key" : "输入 API Key"} /> : null}
              <label className="grid gap-1.5 text-sm">模型显示名称<Input name="label" list="kimi-model-labels" aria-label="Kimi AI 模型显示名称" defaultValue={value(integration.publicConfig, "label") || "自定义模型"} /><datalist id="kimi-model-labels"><option value="Kimi 2.6" /><option value="Kimi 2.7" /><option value="自定义模型" /></datalist></label>
              <label className="grid gap-1.5 text-sm">Model ID<Input name="modelId" aria-label="Kimi AI Model ID" required defaultValue={value(integration.publicConfig, "modelId")} placeholder="请填写 Kimi 控制台提供的模型 ID" /></label>
              <div className="grid gap-2 rounded-xl bg-[var(--surface-elevated)] p-4 text-xs leading-5 text-[var(--text-secondary)]">
                <p><span className="font-medium text-[var(--text-primary)]">Kimi 2.6</span>：推荐日常分析、内容拆解、审核和多平台适配。</p>
                <p><span className="font-medium text-[var(--text-primary)]">Kimi 2.7</span>：推荐复杂多素材研究和深度观点整理。</p>
                <p>系统始终使用当前内容空间填写的 Model ID，不会自动切换模型。</p>
              </div>
            </>
          ) : null}

          {editingSecret && integration.lastFour && (secret || doubaoApiKey || doubaoAccessToken) ? <p className="text-xs text-[var(--warning)]">保存后将替换当前 API Key。</p> : null}
          <p className="text-xs text-[var(--text-secondary)]">{verificationText}</p>
          <div className="flex flex-wrap gap-2 pt-1">
            <Button disabled={busy || !encryptionConfigured}>保存配置</Button>
            {integration.status === "CONFIGURED" ? <Button type="button" variant="secondary" disabled={busy} onClick={() => act(async () => { await call(`/api/integrations/${integration.provider}/disable`, "POST"); })}>禁用</Button> : null}
            {integration.status === "DISABLED" ? <Button type="button" variant="secondary" disabled={busy || !encryptionConfigured} onClick={() => act(async () => { await call(`/api/integrations/${integration.provider}/enable`, "POST"); })}>启用</Button> : null}
            {integration.status !== "UNCONFIGURED" ? <Button type="button" variant="secondary" className="text-[var(--danger)]" disabled={busy} onClick={() => { if (window.confirm(`确定删除 ${integration.name} 配置吗？`)) void act(async () => { await call(`/api/integrations/${integration.provider}`, "DELETE"); }); }}>删除配置</Button> : null}
          </div>
        </form>
      ) : null}

      {error ? <div className="mt-4" role="alert"><p className="text-sm text-[var(--danger)]">{friendlyError(error)}</p><details className="mt-2 text-xs text-[var(--text-secondary)]"><summary className="cursor-pointer">高级错误详情</summary><p className="mt-2 font-mono">{error.code}: {error.detail}</p></details></div> : null}
    </Card>
  );
}

export function SystemServiceCard({ integration }: { integration: Integration }) {
  return (
    <Card className="p-5">
      <div className="flex items-center justify-between gap-4">
        <div><h2 className="font-medium">素材存储</h2><p className="mt-1 text-sm text-[var(--text-secondary)]">由系统环境安全管理，用于保存素材文件与音视频。</p></div>
        <Badge className={statusColor[integration.status]}>{statusLabel[integration.status]}</Badge>
      </div>
    </Card>
  );
}
