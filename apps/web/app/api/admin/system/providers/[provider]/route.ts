import { apiError, getSystemAdminApiContext } from "@/server/api-access";

export async function PUT() {
  const context = await getSystemAdminApiContext();
  if ("response" in context) return context.response;
  return apiError("ENV_MANAGED_PROVIDER", 405, "生产 Provider 由服务端环境变量管理，不能在线修改。");
}
