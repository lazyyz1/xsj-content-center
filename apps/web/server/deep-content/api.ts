import { LLMError } from "@content-center/providers";
import { NextResponse } from "next/server";
import { projectApiError } from "../project-api";
import { DeepContentPackageError } from "./service";
import { GPTDraftImportError } from "./gpt-draft-import";
import { GPTTaskPackageError } from "./gpt-task-package";

export function deepContentApiError(error: unknown) {
  const project = projectApiError(error);
  if (project) return project;
  if (error instanceof DeepContentPackageError) {
    const status = error.code === "DEEP_PACKAGE_NOT_FOUND" ? 404 : error.code === "DEEP_PACKAGE_INVALID_INPUT" ? 400 : 409;
    return NextResponse.json({ error: error.code, message: error.message }, { status });
  }
  if (error instanceof GPTTaskPackageError || error instanceof GPTDraftImportError) return NextResponse.json({ error: error.code, message: error.message }, { status: 409 });
  if (error instanceof LLMError) {
    const status = error.code === "LLM_RATE_LIMITED" ? 429 : error.code === "LLM_TIMEOUT" ? 504 : error.code === "LLM_CONTEXT_TOO_LARGE" ? 413 : error.code === "LLM_NOT_CONFIGURED" || error.code === "LLM_DISABLED" ? 409 : 502;
    return NextResponse.json({ error: error.code, message: error.message }, { status });
  }
  return NextResponse.json({ error: "DEEP_CONTENT_OPERATION_FAILED", message: "深度创作操作失败，请重试。" }, { status: 500 });
}
