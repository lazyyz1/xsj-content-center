import { describe, expect, it, vi } from "vitest";
// Every client below injects a fake fetch; no network transport is used.
vi.mock("../review-policy",()=>({isLocalReviewOffline:()=>false}));
import { LocalAsrClient } from "./client";
import { LocalFunASRTranscriptionProvider } from "./provider";

const config = { endpoint: "http://127.0.0.1:8765", model: "SENSEVOICE_SMALL" as const, device: "CPU" as const };

describe("LocalAsrClient", () => {
  it("sends private binary audio as multipart and normalizes the provider result", async () => {
    const fetcher = vi.fn(async (_url: URL, init?: RequestInit) => {
      expect(init?.body).toBeInstanceOf(FormData);
      const form = init!.body as FormData;
      expect(form.get("model")).toBe("SENSEVOICE_SMALL");
      expect(form.get("device")).toBe("CPU");
      expect(form.get("file")).toBeInstanceOf(Blob);
      return new Response(JSON.stringify({
        language: "zh",
        durationMs: 1_250,
        fullText: "本地转写完成。",
        segments: [{ startMs: 0, endMs: 1_250, text: "本地转写完成。" }],
        model: "SENSEVOICE_SMALL",
        modelLabel: "SenseVoiceSmall",
        device: "CPU",
        processingMs: 380,
        resources: { ramMb: 900 },
      }), { status: 200, headers: { "content-type": "application/json" } });
    });
    const provider = new LocalFunASRTranscriptionProvider(new LocalAsrClient(config, { fetch: fetcher as typeof fetch }));
    await expect(provider.transcribe({ audio: { mode: "BINARY_DATA", data: new Uint8Array([1, 2, 3]) }, contentType: "audio/mpeg" })).resolves.toEqual({
      providerMode: "REAL",
      data: {
        language: "zh",
        durationMs: 1_250,
        fullText: "本地转写完成。",
        segments: [{ startMs: 0, endMs: 1_250, text: "本地转写完成。" }],
      },
    });
    expect(provider.getLastRequestMetadata()).toMatchObject({ model: "SENSEVOICE_SMALL", device: "CPU", processingMs: 380 });
  });

  it("reports an unavailable local service explicitly", async () => {
    const client = new LocalAsrClient(config, { fetch: vi.fn(async () => { throw new TypeError("connect failed"); }) as typeof fetch });
    await expect(client.health()).rejects.toMatchObject({ code: "LOCAL_ASR_NOT_RUNNING", retryable: true });
  });
});


describe("ASR response safety",()=>{
 it("classifies body timeouts and does not turn them into schema errors",async()=>{
 const client=new LocalAsrClient(config,{fetch:vi.fn(async()=>({ok:true,json:async()=>{throw new DOMException("private fixture details","TimeoutError");}})) as unknown as typeof fetch});
 await expect(client.transcribe({audio:{mode:"BINARY_DATA",data:new Uint8Array([1])}})).rejects.toMatchObject({code:"LOCAL_ASR_TIMEOUT"});
 });
 it("does not echo arbitrary provider error text",async()=>{
 const client=new LocalAsrClient(config,{fetch:vi.fn(async()=>new Response(JSON.stringify({detail:{code:"LOCAL_ASR_TRANSCRIPTION_FAILED",message:"SECRET-fixture-token"}}),{status:500})) as typeof fetch});
 const error=await client.transcribe({audio:{mode:"BINARY_DATA",data:new Uint8Array([1])}}).catch(e=>e);
 expect(error.message).not.toContain("SECRET");expect(error.code).toBe("LOCAL_ASR_TRANSCRIPTION_FAILED");
 });
});
