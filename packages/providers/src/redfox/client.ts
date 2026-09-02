import { RedFoxError } from "./errors";
import { RedFoxApiResponseSchema, RedFoxParseDataSchema, type RedFoxParseData } from "./schemas";

export const REDFOX_PARSE_PATH = "/story/api/parseWork/parse";
export const REDFOX_DEFAULT_BASE_URL = "https://redfox.hk";
export const REDFOX_DEFAULT_TIMEOUT_MS = 30_000;

export type RedFoxParseResult = {
  data: RedFoxParseData;
  providerRequestId?: string;
  providerCode: string;
};

export type RedFoxApiResult = {
  data: unknown;
  providerRequestId?: string;
  providerCode: string;
};

type FetchLike = typeof fetch;

function cleanRequestId(value: string | null | undefined): string | undefined {
  const trimmed = value?.trim();
  return trimmed && trimmed.length <= 200 ? trimmed : undefined;
}

function apiError(
  code: string,
  message: string,
  httpStatus?: number,
  providerRequestId?: string,
): RedFoxError {
  if (code === "3106" || code === "3107" || code === "401" || code === "4001" || httpStatus === 401 || httpStatus === 403) {
    return new RedFoxError("REDFOX_AUTH_FAILED", "RedFox API Key 无效、缺失或已失效。", false, httpStatus, code, providerRequestId);
  }
  if (code === "429" || httpStatus === 429) {
    return new RedFoxError("REDFOX_RATE_LIMITED", "RedFox 请求频率已达上限，请稍后重试。", true, 429, code, providerRequestId);
  }
  if (code === "400" || httpStatus === 400) {
    return new RedFoxError("REDFOX_BAD_REQUEST", "RedFox 无法解析该请求。", false, 400, code, providerRequestId);
  }
  if (httpStatus && httpStatus >= 500) {
    return new RedFoxError("REDFOX_SERVER_ERROR", "RedFox 服务暂时不可用。", true, httpStatus, code, providerRequestId);
  }
  return new RedFoxError("REDFOX_API_ERROR", message || "RedFox API 返回错误。", false, httpStatus, code, providerRequestId);
}

export class RedFoxClient {
  constructor(
    private readonly config: {
      apiKey: string;
      baseUrl?: string;
      timeoutMs?: number;
      source?: string;
      fetch?: FetchLike;
    },
  ) {
    if (!config.apiKey.trim()) throw new RedFoxError("REDFOX_NOT_CONFIGURED", "RedFox 尚未配置。", false);
  }

  private async post(path: string, body: Record<string, unknown>, authHeader: "x-api-key" | "REDFOX_API_KEY"): Promise<RedFoxApiResult> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.config.timeoutMs ?? REDFOX_DEFAULT_TIMEOUT_MS);
    let response: Response;
    try {
      response = await (this.config.fetch ?? fetch)(
        new URL(path, this.config.baseUrl ?? REDFOX_DEFAULT_BASE_URL),
        {
          method: "POST",
          headers: { "content-type": "application/json", [authHeader]: this.config.apiKey },
          body: JSON.stringify(body),
          signal: controller.signal,
        },
      );
    } catch (error) {
      if (controller.signal.aborted || (error instanceof Error && error.name === "AbortError")) {
        throw new RedFoxError("REDFOX_TIMEOUT", "RedFox 请求超时。", true);
      }
      throw new RedFoxError("REDFOX_API_ERROR", "RedFox 网络请求失败。", true);
    } finally {
      clearTimeout(timeout);
    }

    const headerRequestId = cleanRequestId(response.headers.get("x-request-id"));
    if (response.status === 429 || response.status >= 500 || response.status === 401 || response.status === 403) {
      throw apiError(String(response.status), "RedFox HTTP 请求失败。", response.status, headerRequestId);
    }

    let raw: unknown;
    try {
      raw = await response.json();
    } catch {
      throw new RedFoxError("REDFOX_INVALID_RESPONSE", "RedFox 返回了无效 JSON。", false, response.status, undefined, headerRequestId);
    }
    const parsed = RedFoxApiResponseSchema.safeParse(raw);
    if (!parsed.success) {
      throw new RedFoxError("REDFOX_INVALID_RESPONSE", "RedFox 响应结构无效。", false, response.status, undefined, headerRequestId);
    }
    const providerCode = String(parsed.data.code);
    const providerRequestId = cleanRequestId(parsed.data.requestId) ?? headerRequestId;
    if (!providerCode.startsWith("2") || !response.ok) {
      throw apiError(providerCode, parsed.data.msg ?? parsed.data.message ?? "RedFox API 返回错误。", response.status, providerRequestId);
    }
    if (!parsed.data.data) {
      throw new RedFoxError("REDFOX_EMPTY_DATA", "RedFox 未返回作品数据。", false, response.status, providerCode, providerRequestId);
    }
    return { data: parsed.data.data, providerRequestId, providerCode };
  }

  async parseWork(url: string): Promise<RedFoxParseResult> {
    const result = await this.post(
      REDFOX_PARSE_PATH,
      { url, source: this.config.source ?? "AI内容生产中心" },
      "x-api-key",
    );
    const parsed = RedFoxParseDataSchema.safeParse(result.data);
    if (!parsed.success) {
      throw new RedFoxError("REDFOX_INVALID_RESPONSE", "RedFox 作品响应结构无效。", false, 200, result.providerCode, result.providerRequestId);
    }
    return { ...result, data: parsed.data };
  }

  searchContent(input: { platform: "DOUYIN" | "XIAOHONGSHU"; keyword: string; offset?: number; sortType?: string }) {
    const path = input.platform === "DOUYIN"
      ? "/story/api/dyData/searchArticle"
      : "/story/api/xhsUser/searchArticle";
    return this.post(path, { keyword: input.keyword, offset: input.offset ?? 0, sortType: input.sortType }, "REDFOX_API_KEY");
  }

  searchAccounts(input: { platform: "DOUYIN" | "XIAOHONGSHU"; keyword: string; offset?: number; sortType?: string }) {
    const path = input.platform === "DOUYIN"
      ? "/story/api/dyData/searchUser"
      : "/story/api/xhsUser/searchUser";
    return this.post(path, { keyword: input.keyword, offset: input.offset ?? 0, sortType: input.sortType }, "REDFOX_API_KEY");
  }

  getAccountDetail(input: { platform: "DOUYIN" | "XIAOHONGSHU"; accountId: string; userId?: string }) {
    const path = input.platform === "DOUYIN"
      ? "/story/api/dyData/queryUser"
      : "/story/api/xhsUser/queryAccountDetail";
    return this.post(path, {
      accountId: input.accountId,
      ...(input.platform === "XIAOHONGSHU" && input.userId ? { userId: input.userId } : {}),
    }, "REDFOX_API_KEY");
  }

  getAccountWorks(input: { platform: "DOUYIN" | "XIAOHONGSHU"; accountId: string; offset?: number; sortType?: string }) {
    const path = input.platform === "DOUYIN"
      ? "/story/api/dyData/queryWorkList"
      : "/story/api/xhsUser/queryWorkList";
    const identity = input.platform === "DOUYIN" ? { accountId: input.accountId } : { redId: input.accountId };
    return this.post(path, { ...identity, offset: input.offset ?? 0, sortType: input.sortType }, "REDFOX_API_KEY");
  }

  getWorkDetail(input: { platform: "DOUYIN" | "XIAOHONGSHU"; externalId?: string; url?: string }) {
    const path = input.platform === "DOUYIN"
      ? "/story/api/dyData/queryWork"
      : "/story/api/xhsUser/queryWorkDetail";
    const data = input.platform === "DOUYIN"
      ? { workId: input.externalId, workUrl: input.url }
      : { workId: input.externalId, workLink: input.url };
    return this.post(path, data, "REDFOX_API_KEY");
  }
}
