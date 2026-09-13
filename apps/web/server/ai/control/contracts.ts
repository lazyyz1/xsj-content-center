import type { AIModelCapability } from "@content-center/integrations";

export const AI_CONTROL_TASKS = [
  "CONTENT_CHECK",
  "TOPIC_CANDIDATES",
  "DRAFT_SUGGESTION",
  "SOURCE_UNDERSTANDING",
  "RESEARCH",
  "METHOD_GUIDANCE",
  "MATERIAL_SEARCH",
  "GENERAL_QUERY",
] as const;

export type AIControlTask = (typeof AI_CONTROL_TASKS)[number];
export type WorkspaceAIEngine = "DEEPSEEK" | "KIMI" | "AUTO";

export const AI_CONTROL_ACTIONS = [
  "GENERATE_SUGGESTIONS",
  "GENERATE_TOPIC_CANDIDATES",
  "CREATE_FREE_TEXT_CANDIDATE",
  "CREATE_RESEARCH_CANDIDATE",
  "FIND_MATERIALS",
  "CHECK_CONTENT",
  "OVERWRITE_PRIMARY_DRAFT",
  "CONFIRM_OWN_INFORMATION",
  "SET_PRIMARY_DRAFT",
  "UPDATE_CREATOR_PROFILE",
  "SAVE_FORMAL_METHOD",
  "UPDATE_DEFAULT_METHOD",
  "PUBLISH_CONTENT",
  "DELETE_IMPORTANT_SOURCE",
  "DELETE_FORMAL_DRAFT",
  "MODIFY_CONFIRMED_COMPANY_FACT",
  "PROMOTE_EXTERNAL_TO_OWN_FACT",
  "CALL_OUT_OF_SCOPE_TOOL",
] as const;

export type AIControlAction = (typeof AI_CONTROL_ACTIONS)[number];
export type WorkspaceRoleName = "OWNER" | "ADMIN" | "EDITOR" | "VIEWER";
export type ScopeDecision = "ALLOW" | "ALLOW_WITH_CONTEXT" | "OUT_OF_SCOPE";
export type FactDecision = "PASS" | "PASS_WITH_WARNINGS" | "BLOCK";
export type PermissionDecision = "ALLOW" | "REQUIRE_CONFIRMATION" | "DENY";

export const CONTEXT_OWNERSHIPS = ["OWN_CONFIRMED", "EXTERNAL", "PENDING", "HYPOTHETICAL", "PROHIBITED", "METHOD_GUIDANCE"] as const;
export type ContextOwnership = (typeof CONTEXT_OWNERSHIPS)[number];

export type SelectedContextObject = {
  objectType: string;
  objectId: string;
  version?: number | string | null;
  ownership?: ContextOwnership;
  whySelected?: string;
};

export type ContextItem = {
  objectType: string;
  objectId: string;
  version: number | string | null;
  ownership: ContextOwnership;
  provenance: string;
  whySelected: string;
  truncated: boolean;
  content: string;
};

export type ContextManifest = {
  schemaVersion: "ai-context-manifest-v1";
  manifestId: string;
  generatedAt: string;
  project: { id: string; version: string };
  currentDraft: { branchId: string; workingVersion: number; currentRevisionId: string | null } | null;
  selectedObjects: Array<Pick<ContextItem, "objectType" | "objectId" | "version" | "ownership" | "whySelected" | "truncated">>;
  methodVersions: Array<{ assetId: string; versionId: string; version: number }>;
  creatorProfile: { id: string; version: string } | null;
  confirmedInformationRefs: string[];
  sourceRefs: string[];
  externalRefs: string[];
  items: ContextItem[];
  truncation: { any: boolean; categories: Record<string, boolean> };
};

export type ModelRouteRequest = {
  taskType: AIControlTask;
  requiredCapabilities?: readonly AIModelCapability[];
  structuredOutput?: boolean;
  longContext?: boolean;
  reasoningNeed?: "LOW" | "MEDIUM" | "HIGH";
  latencyPreference?: "FAST" | "BALANCED" | "QUALITY";
};

export const AI_CONTROL_ERROR_CODES = [
  "OUT_OF_SCOPE",
  "NO_CONTEXT",
  "FACT_BLOCKED",
  "PERMISSION_DENIED",
  "PROVIDER_UNAVAILABLE",
  "MODEL_UNAVAILABLE",
  "TIMEOUT",
  "INVALID_OUTPUT",
  "RATE_LIMITED",
  "UNKNOWN",
] as const;

export type AIControlErrorCode = (typeof AI_CONTROL_ERROR_CODES)[number];

const employeeMessages: Record<AIControlErrorCode, string> = {
  OUT_OF_SCOPE: "鑫小助主要用于当前内容项目相关的研究、资料整理和创作。",
  NO_CONTEXT: "当前项目还没有足够的内容信息，请先补充项目目标、稿件或资料。",
  FACT_BLOCKED: "这次请求可能把未确认信息写成事实，请补充依据或改成明确的示例、假设。",
  PERMISSION_DENIED: "当前账号不能执行这个操作，请联系项目负责人。",
  PROVIDER_UNAVAILABLE: "AI 服务暂时不可用，请稍后重试或联系管理员。",
  MODEL_UNAVAILABLE: "当前 AI 能力暂时不可用，请稍后重试或联系管理员。",
  TIMEOUT: "AI 处理超时，请稍后重试。",
  INVALID_OUTPUT: "AI 返回的内容未通过检查，请重试。",
  RATE_LIMITED: "当前请求较多，请稍后再试。",
  UNKNOWN: "AI 处理失败，请稍后重试。",
};

export class AIControlError extends Error {
  constructor(readonly code: AIControlErrorCode, message = employeeMessages[code], readonly retryable = false) {
    super(message);
    this.name = "AIControlError";
  }
}

export function employeeAIErrorMessage(code: AIControlErrorCode) {
  return employeeMessages[code];
}
