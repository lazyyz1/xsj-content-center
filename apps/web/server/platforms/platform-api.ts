import { NextResponse } from "next/server";
import { projectApiError } from "../project-api";
import { PlatformContextError } from "./platform-context";
import { PlatformVariantError } from "./platform-variant-service";
import { LLMError } from "@content-center/providers";

export function platformApiError(error: unknown) {
  const project = projectApiError(error);
  if (project) return project;
  if (error instanceof PlatformContextError) return NextResponse.json({ error: error.code, message: error.message }, { status: 409 });
  if (error instanceof PlatformVariantError) {
    const status = error.code === "PLATFORM_VARIANT_NOT_FOUND" ? 404 : error.code === "PLATFORM_OUTPUT_INVALID" ? 400 : 409;
    return NextResponse.json({ error: error.code, message: error.message }, { status });
  }
  if (error instanceof LLMError) {
    const status = error.code === "LLM_RATE_LIMITED" ? 429 : error.code === "LLM_TIMEOUT" ? 504 : error.code === "LLM_CONTEXT_TOO_LARGE" ? 413 : error.code === "LLM_NOT_CONFIGURED" || error.code === "LLM_DISABLED" ? 409 : 502;
    return NextResponse.json({ error: error.code, message: error.message }, { status });
  }
  return NextResponse.json({ error: "PLATFORM_OPERATION_FAILED", message: "平台内容操作失败，请重试。" }, { status: 500 });
}
