import { NextResponse } from "next/server";
import { LLMError } from "@content-center/providers";
import { ReviewServiceError } from "./review-service";

export function reviewApiError(error: unknown) {
  if (error instanceof ReviewServiceError) {
    const status = error.code === "REVIEW_FORBIDDEN" ? 403 : error.code === "REVIEW_TARGET_NOT_FOUND" ? 404 : error.code === "REVIEW_COMMENT_REQUIRED" || error.code === "REVIEW_SUBMISSION_INCOMPLETE" ? 400 : 409;
    return NextResponse.json({ error: error.code, message: error.message }, { status });
  }
  if (error instanceof LLMError) {
    const status = error.code === "LLM_RATE_LIMITED" ? 429 : error.code === "LLM_TIMEOUT" ? 504 : error.code === "LLM_CONTEXT_TOO_LARGE" ? 413 : error.code === "LLM_NOT_CONFIGURED" || error.code === "LLM_DISABLED" ? 409 : 502;
    return NextResponse.json({ error: error.code, message: error.message }, { status });
  }
  return NextResponse.json({ error: "REVIEW_OPERATION_FAILED", message: "审核操作失败，请重试。" }, { status: 500 });
}
