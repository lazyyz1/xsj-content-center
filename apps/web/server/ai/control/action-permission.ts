import type { AIControlAction, PermissionDecision, WorkspaceRoleName } from "./contracts";

const direct = new Set<AIControlAction>(["GENERATE_SUGGESTIONS", "GENERATE_TOPIC_CANDIDATES", "CREATE_FREE_TEXT_CANDIDATE", "CREATE_RESEARCH_CANDIDATE", "FIND_MATERIALS", "CHECK_CONTENT"]);
const confirmation = new Set<AIControlAction>(["OVERWRITE_PRIMARY_DRAFT", "CONFIRM_OWN_INFORMATION", "SET_PRIMARY_DRAFT", "UPDATE_CREATOR_PROFILE", "SAVE_FORMAL_METHOD", "UPDATE_DEFAULT_METHOD"]);

export type ActionPermissionResult = { decision: PermissionDecision; reason: string };

export class ActionPermissionPolicy {
  evaluate(input: { role: WorkspaceRoleName; action: AIControlAction; userConfirmed?: boolean }): ActionPermissionResult {
    if (direct.has(input.action)) return { decision: "ALLOW", reason: "NON_DESTRUCTIVE_RESULT" };
    if (input.role === "VIEWER") return { decision: "DENY", reason: "VIEWER_WRITE_FORBIDDEN" };
    if (confirmation.has(input.action)) {
      return input.userConfirmed
        ? { decision: "ALLOW", reason: "EXPLICIT_USER_CONFIRMATION" }
        : { decision: "REQUIRE_CONFIRMATION", reason: "USER_CONFIRMATION_REQUIRED" };
    }
    return { decision: "DENY", reason: "AUTOMATION_FORBIDDEN" };
  }
}
