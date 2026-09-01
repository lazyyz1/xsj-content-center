import { LLMError } from "@content-center/providers";
import { NextResponse } from "next/server";
import { projectApiError } from "../project-api";
import { AIServiceError } from "./ai-run-service";

export function aiApiError(error: unknown) {
  const project = projectApiError(error);
  if (project) return project;
  if (error instanceof AIServiceError) {
    const status = error.code === "AI_RUN_NOT_FOUND" ? 404 : error.code === "AI_INVALID_INPUT" ? 400 : 409;
    return NextResponse.json({ error: error.code, message: error.message }, { status });
  }
  if (error instanceof LLMError) {
    const status = error.code === "LLM_RATE_LIMITED" ? 429 : error.code === "LLM_TIMEOUT" ? 504 : error.code === "LLM_CONTEXT_TOO_LARGE" ? 413 : error.code === "LLM_NOT_CONFIGURED" || error.code === "LLM_DISABLED" ? 409 : 502;
    return NextResponse.json({ error: error.code, message: error.message }, { status });
  }
  return NextResponse.json({ error: "LLM_GENERATION_FAILED", message: "AI 生成失败，请重试。" }, { status: 500 });
}
