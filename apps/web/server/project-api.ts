import { ProjectTransitionError } from "@content-center/core";
import { NextResponse } from "next/server";
import { VersionConflictError } from "./brief-service";
import { ProjectServiceError } from "./project-service";

export function projectApiError(error: unknown) {
  if (error instanceof VersionConflictError) {
    return NextResponse.json({ error: error.code, message: error.message }, { status: 409 });
  }
  if (error instanceof ProjectTransitionError) {
    return NextResponse.json({ error: error.code, message: error.message }, { status: 409 });
  }
  if (error instanceof ProjectServiceError) {
    const status = error.code === "SOURCE_ALREADY_ADDED" ? 409 : 404;
    const message = error.code === "SOURCE_ALREADY_ADDED"
      ? "该素材已在项目中。"
      : error.code === "SOURCE_NOT_FOUND"
        ? "素材不存在或不属于当前 Workspace。"
        : "项目不存在。";
    return NextResponse.json({ error: error.code, message }, { status });
  }
  return null;
}
