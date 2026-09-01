export type LLMErrorCode =
  | "LLM_NOT_CONFIGURED"
  | "LLM_DISABLED"
  | "LLM_AUTH_FAILED"
  | "LLM_RATE_LIMITED"
  | "LLM_TIMEOUT"
  | "LLM_SERVER_ERROR"
  | "LLM_INVALID_RESPONSE"
  | "LLM_CONTEXT_TOO_LARGE"
  | "LLM_GENERATION_FAILED";

export class LLMError extends Error {
  constructor(
    readonly code: LLMErrorCode,
    message: string,
    readonly retryable: boolean,
    readonly details: { httpStatus?: number; providerRequestId?: string } = {},
  ) {
    super(message);
    this.name = "LLMError";
  }
}
