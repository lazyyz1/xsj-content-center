import { createServer, type Server } from "node:http";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { z } from "zod";
import { OpenAICompatibleLLMProvider } from "./provider";

let fixture: Server;
let origin = "";
let retryRequests = 0;
let lastRequestBody: Record<string, unknown> = {};

function completion(content: string) {
  return JSON.stringify({ id: "fixture-request", model: "fixture-model", choices: [{ message: { content } }], usage: { prompt_tokens: 12, completion_tokens: 7 } });
}

beforeAll(async () => {
  fixture = createServer((request, response) => {
    let body = "";
    request.on("data", (chunk) => { body += String(chunk); });
    request.on("end", () => {
      const parsed = JSON.parse(body) as { messages: Array<{ content: string }> };
      lastRequestBody = parsed;
      const prompt = parsed.messages.at(-1)?.content ?? "";
      const send = (status: number, value: string) => { response.writeHead(status, { "content-type": "application/json", "x-request-id": "fixture-header-id" }); response.end(value); };
      if (request.headers.authorization !== "Bearer fixture-secret") return send(401, "{}");
      if (prompt.includes("STATUS_401")) return send(401, "{}");
      if (prompt.includes("STATUS_429")) return send(429, "{}");
      if (prompt.includes("STATUS_500")) return send(500, "{}");
      if (prompt.includes("RETRY_ONCE") && ++retryRequests === 1) return send(500, "{}");
      if (prompt.includes("INVALID_ENVELOPE_JSON")) return send(200, "not-json");
      if (prompt.includes("INVALID_ENVELOPE_SCHEMA")) return send(200, JSON.stringify({ choices: [] }));
      if (prompt.includes("INVALID_STRUCTURED")) return send(200, completion(JSON.stringify({ wrong: true })));
      if (prompt.includes("TIMEOUT")) return setTimeout(() => send(200, completion(JSON.stringify({ ok: true }))), 100);
      return send(200, completion(JSON.stringify({ ok: true, title: "Fixture result" })));
    });
  });
  await new Promise<void>((resolve) => fixture.listen(0, "127.0.0.1", resolve));
  const address = fixture.address();
  if (!address || typeof address === "string") throw new Error("Fixture did not bind");
  origin = `http://127.0.0.1:${address.port}/v1`;
});

afterAll(async () => new Promise<void>((resolve) => fixture.close(() => resolve())));

function provider(options: { timeoutMs?: number; maxRetries?: 0 | 1 } = {}) {
  return new OpenAICompatibleLLMProvider({ provider: "fixture", baseUrl: origin, apiKey: "fixture-secret", model: "fixture-model" }, options);
}

function kimiProvider(options: { timeoutMs?: number; maxRetries?: 0 | 1 } = {}) {
  return new OpenAICompatibleLLMProvider({ provider: "KIMI", baseUrl: origin, apiKey: "fixture-secret", model: "kimi-k2.6" }, options);
}

describe("OpenAICompatibleLLMProvider HTTP fixture", () => {
  it("sends OpenAI-compatible chat requests and returns real usage", async () => {
    await expect(provider().generateText({ systemPrompt: "Fixture system", prompt: "SUCCESS" })).resolves.toMatchObject({ providerMode: "REAL", data: { model: "fixture-model", providerRequestId: "fixture-header-id", usage: { inputTokens: 12, outputTokens: 7 } } });
  });

  it("uses Kimi 2.6 compatible request parameters", async () => {
    await kimiProvider().generateText({ prompt: "KIMI_SUCCESS" });
    expect(lastRequestBody).toMatchObject({ model: "kimi-k2.6", thinking: { type: "disabled" }, response_format: { type: "json_object" } });
    expect(lastRequestBody).not.toHaveProperty("temperature");
  });

  it("keeps the existing temperature behavior for other compatible providers", async () => {
    await provider().generateText({ prompt: "GENERIC_SUCCESS" });
    expect(lastRequestBody).toMatchObject({ model: "fixture-model", temperature: 0.4, response_format: { type: "json_object" } });
    expect(lastRequestBody).not.toHaveProperty("thinking");
  });

  it("validates structured JSON with Zod", async () => {
    const result = await provider().generateStructured({ prompt: "STRUCTURED" }, z.object({ ok: z.boolean(), title: z.string() }));
    expect(result.data.value).toEqual({ ok: true, title: "Fixture result" });
  });

  it.each([["STATUS_401", "LLM_AUTH_FAILED"], ["STATUS_429", "LLM_RATE_LIMITED"], ["STATUS_500", "LLM_SERVER_ERROR"]])("maps %s to %s", async (prompt, code) => {
    await expect(provider({ maxRetries: 0 }).generateText({ prompt })).rejects.toMatchObject({ code });
  });

  it("maps timeout", async () => {
    await expect(provider({ timeoutMs: 20, maxRetries: 0 }).generateText({ prompt: "TIMEOUT" })).rejects.toMatchObject({ code: "LLM_TIMEOUT" });
  });

  it("retries a retryable failure at most once", async () => {
    retryRequests = 0;
    await expect(provider().generateText({ prompt: "RETRY_ONCE" })).resolves.toMatchObject({ providerMode: "REAL" });
    expect(retryRequests).toBe(2);
  });

  it.each(["INVALID_ENVELOPE_JSON", "INVALID_ENVELOPE_SCHEMA"])("rejects invalid response %s", async (prompt) => {
    await expect(provider({ maxRetries: 0 }).generateText({ prompt })).rejects.toMatchObject({ code: "LLM_INVALID_RESPONSE" });
  });

  it("rejects invalid structured output", async () => {
    await expect(provider().generateStructured({ prompt: "INVALID_STRUCTURED" }, z.object({ ok: z.boolean(), title: z.string() }))).rejects.toMatchObject({ code: "LLM_INVALID_RESPONSE" });
  });
});
