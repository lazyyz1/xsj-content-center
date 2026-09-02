import "server-only";

import {
  IntegrationSecretError,
  IntegrationServiceError,
  assertConfigurableProvider,
} from "@content-center/integrations";
import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { apiError } from "./api-access";

export function configurableProviderOrResponse(value: string) {
  try {
    return { provider: assertConfigurableProvider(value.toUpperCase()) };
  } catch {
    return { response: apiError("UNSUPPORTED_INTEGRATION", 404) };
  }
}

export function integrationApiError(error: unknown) {
  if (error instanceof IntegrationSecretError) {
    const status = error.code === "INTEGRATION_ENCRYPTION_NOT_CONFIGURED" ? 503 : 500;
    return apiError(error.code, status, error.message);
  }
  if (error instanceof IntegrationServiceError) {
    const status = error.code === "INTEGRATION_NOT_FOUND" ? 404 : error.code === "INTEGRATION_SECRET_REQUIRED" ? 400 : 404;
    return apiError(error.code, status, error.message);
  }
  if (error instanceof ZodError) return apiError("INVALID_INTEGRATION_CONFIG", 400, "配置内容格式不正确。");
  return apiError("INTEGRATION_OPERATION_FAILED", 500, "配置操作失败。");
}

export function noContent() {
  return new NextResponse(null, { status: 204 });
}
