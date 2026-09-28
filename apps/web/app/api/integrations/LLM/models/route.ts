import { IntegrationService } from "@content-center/integrations";
import { providerFetch } from "@content-center/providers";
import { apiError, getApiWorkspaceContext } from "@/server/api-access";
export async function GET() {
  const context = await getApiWorkspaceContext();
  if (!context) return apiError("UNAUTHORIZED", 401);
  if (!["OWNER", "ADMIN"].includes(context.role)) return apiError("FORBIDDEN", 403);
  const config = await new IntegrationService().getDecryptedIntegrationConfig(context.workspace.id, "LLM");
  if (!config) return apiError("NOT_CONFIGURED", 409, "请先保存并启用模型服务。");
  try {
    const response = await providerFetch(String(config.baseUrl).replace(/\/$/, "") + "/models", { headers: { authorization: `Bearer ${config.apiKey}` }, signal: AbortSignal.timeout(20000) });
    if (!response.ok) return apiError("MODEL_LIST_UNAVAILABLE", 502, "服务商未返回模型列表，请检查配置，也可手动填写实际 Model ID。");
    const body = await response.json() as { data?: Array<{ id?: unknown; name?: unknown; display_name?: unknown }> };
    if (!Array.isArray(body.data)) throw new Error("INVALID_MODELS");
    const seen = new Set<string>();
    const items = body.data.slice(0, 500).flatMap(item => { if (typeof item.id !== "string" || !item.id || item.id.length > 200 || seen.has(item.id)) return []; seen.add(item.id); return [{ id: item.id, label: String(item.display_name || item.name || item.id).slice(0, 200) }]; });
    return Response.json({ items }, { headers: { "cache-control": "no-store" } });
  } catch { return apiError("MODEL_LIST_UNAVAILABLE", 502, "模型列表读取失败，可稍后重试或手动填写服务商提供的 Model ID。"); }
}
