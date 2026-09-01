import type { ZodType } from "zod";
import type { LLMProvider } from "../contracts";
import type { LLMGenerateInput, LLMTextResult, ProviderResult } from "../types";
import { LLMError } from "./errors";
import { chatCompletionResponseSchema, openAICompatibleConfigSchema, type OpenAICompatibleConfig } from "./schemas";

export type OpenAICompatibleOptions = { fetch?: typeof fetch; timeoutMs?: number; maxRetries?: 0 | 1 };

function endpoint(baseUrl: string) {
  const normalized = baseUrl.replace(/\/+$/, "");
  return normalized.endsWith("/chat/completions") ? normalized : `${normalized}/chat/completions`;
}

function responseError(response: Response) {
  const details = { httpStatus: response.status, providerRequestId: response.headers.get("x-request-id") ?? undefined };
  if (response.status === 401 || response.status === 403) return new LLMError("LLM_AUTH_FAILED", "AI 模型凭证无效或无权限。", false, details);
  if (response.status === 413) return new LLMError("LLM_CONTEXT_TOO_LARGE", "AI 上下文超过模型限制。", false, details);
  if (response.status === 429) return new LLMError("LLM_RATE_LIMITED", "AI 模型请求过于频繁。", false, details);
  if (response.status >= 500) return new LLMError("LLM_SERVER_ERROR", "AI 模型服务暂时不可用。", true, details);
  return new LLMError("LLM_GENERATION_FAILED", "AI 模型拒绝了本次生成请求。", false, details);
}

export class OpenAICompatibleLLMProvider implements LLMProvider {
  private readonly config: OpenAICompatibleConfig;
  private readonly fetcher: typeof fetch;
  private readonly timeoutMs: number;
  private readonly maxRetries: 0 | 1;

  constructor(config: OpenAICompatibleConfig, options: OpenAICompatibleOptions = {}) {
    this.config = openAICompatibleConfigSchema.parse(config);
    this.fetcher = options.fetch ?? fetch;
    this.timeoutMs = options.timeoutMs ?? 30_000;
    this.maxRetries = options.maxRetries ?? 1;
  }

  async generateText(input: LLMGenerateInput): Promise<ProviderResult<LLMTextResult>> {
    let lastError: unknown;
    for (let attempt = 0; attempt <= this.maxRetries; attempt += 1) {
      try {
        return await this.request(input);
      } catch (error) {
        lastError = error;
        if (!(error instanceof LLMError) || !error.retryable || attempt >= this.maxRetries) throw error;
      }
    }
    throw lastError;
  }

  async generateStructured<T>(input: LLMGenerateInput, schema: ZodType<T>) {
    const result = await this.generateText(input);
    let raw: unknown;
    try {
      raw = JSON.parse(result.data.text);
    } catch {
      throw new LLMError("LLM_INVALID_RESPONSE", "AI 模型没有返回有效 JSON。", false, { providerRequestId: result.data.providerRequestId });
    }
    const parsed = schema.safeParse(raw);
    if (!parsed.success) {
      throw new LLMError("LLM_INVALID_RESPONSE", "AI 模型返回的数据结构不符合要求。", false, { providerRequestId: result.data.providerRequestId });
    }
    return { ...result, data: { ...result.data, value: parsed.data } };
  }

  async generate(input: { prompt: string }) { const result = await this.generateText(input); return { providerMode: result.providerMode, data: { text: result.data.text } } as const; }
  async rewrite(input: { prompt: string }) { return this.generate(input); }
  async summarize(input: { prompt: string }) { return this.generate(input); }
  async classify(input: { prompt: string }) { const result = await this.generateText(input); return { providerMode: result.providerMode, data: { labels: [result.data.text] } }; }
  async adapt(input: { prompt: string; platform: string }) { return this.generate({ prompt: input.prompt }); }

  private async request(input: LLMGenerateInput): Promise<ProviderResult<LLMTextResult>> {
    let response: Response;
    try {
      response = await this.fetcher(endpoint(this.config.baseUrl), {
        method: "POST",
        headers: { authorization: `Bearer ${this.config.apiKey}`, "content-type": "application/json" },
        body: JSON.stringify({
          model: this.config.model,
          messages: [
            ...(input.systemPrompt ? [{ role: "system", content: input.systemPrompt }] : []),
            { role: "user", content: input.prompt },
          ],
          temperature: input.temperature ?? 0.4,
          response_format: { type: "json_object" },
        }),
        signal: AbortSignal.timeout(this.timeoutMs),
      });
    } catch (error) {
      if (error instanceof Error && (error.name === "TimeoutError" || error.name === "AbortError")) {
        throw new LLMError("LLM_TIMEOUT", "AI 模型请求超时。", true);
      }
      throw new LLMError("LLM_SERVER_ERROR", "无法连接 AI 模型服务。", true);
    }
    if (!response.ok) throw responseError(response);
    let raw: unknown;
    try { raw = JSON.parse(await response.text()); }
    catch { throw new LLMError("LLM_INVALID_RESPONSE", "AI 模型返回了无效响应。", false, { httpStatus: response.status }); }
    const parsed = chatCompletionResponseSchema.safeParse(raw);
    if (!parsed.success || !parsed.data.choices[0]?.message.content.trim()) {
      throw new LLMError("LLM_INVALID_RESPONSE", "AI 模型返回结构不符合协议。", false, { httpStatus: response.status });
    }
    const providerRequestId = response.headers.get("x-request-id") ?? parsed.data.id;
    return {
      providerMode: "REAL",
      data: {
        text: parsed.data.choices[0].message.content,
        model: parsed.data.model ?? this.config.model,
        providerRequestId,
        usage: parsed.data.usage ? { inputTokens: parsed.data.usage.prompt_tokens, outputTokens: parsed.data.usage.completion_tokens } : undefined,
      },
    };
  }
}
