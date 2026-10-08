import { ZodError } from "zod";
import { apiError, getApiWorkspaceContext } from "../api-access";
import { ResearchError } from "../research/access";
export async function personalContentActor() {
 const value = await getApiWorkspaceContext();
 if (!value) throw new ResearchError("UNAUTHORIZED", "请登录后继续。", 401);
 return { workspaceId: value.workspace.id, userId: value.session.user.id };
}
export function personalContentApiError(error: unknown) {
 if (error instanceof ResearchError) return apiError(error.code, error.status, error.message);
 if (error instanceof ZodError) return apiError("INVALID_INPUT", 400, "请检查稿件、参考和版本。");
 return apiError("CONTENT_UNAVAILABLE", 503, "稿件服务暂时不可用，当前编辑内容请保留后重试。");
}
