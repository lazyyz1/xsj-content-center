import { afterEach, describe, expect, it, vi } from "vitest";
const network = vi.hoisted(() => ({ dns: vi.fn(), http: vi.fn(), https: vi.fn() }));
vi.mock("node:dns/promises", () => ({ lookup: network.dns }));
vi.mock("node:http", () => ({ request: network.http }));
vi.mock("node:https", () => ({ request: network.https }));
import { LocalAsrClient } from "./local-asr/client";
import { fetchPublicText, resolvePublicAddress } from "./safe-url";
import { providerFetch } from "./provider-fetch";
import { isLocalReviewOffline } from "./review-policy";

afterEach(() => { vi.unstubAllEnvs(); vi.clearAllMocks(); });
describe.each(["offline flag", "review profile", "daily cutover"])("%s external boundaries", mode => {
  it("blocks ASR health, initialization and transcription before fetch", async () => {
    vi.stubEnv("EXTERNAL_CALLS_DISABLED", mode === "daily cutover" ? "true" : "false");
    vi.stubEnv("LOCAL_REVIEW_OFFLINE", mode === "offline flag" ? "true" : "false");
    vi.stubEnv("ENVIRONMENT_ID", mode === "review profile" ? "LOCAL_REVIEW" : "LOCAL_TEST");
    const fetcher = vi.fn<typeof fetch>();
    const client = new LocalAsrClient({ endpoint: "https://asr.example.invalid", model: "SENSEVOICE_SMALL", device: "CPU" }, { fetch: fetcher });
    for (const attempt of [() => client.health(), () => client.installModel("SENSEVOICE_SMALL"), () => client.transcribe({ audio: { mode: "BINARY_DATA", data: new Uint8Array([1]) } })]) {
      await expect(attempt()).rejects.toMatchObject({ code: "LOCAL_REVIEW_OFFLINE", retryable: false });
    }
    expect(fetcher).not.toHaveBeenCalled();
  });
  it("blocks public scraping and provider calls before DNS or transport", async () => {
    vi.stubEnv("EXTERNAL_CALLS_DISABLED", mode === "daily cutover" ? "true" : "false");
    vi.stubEnv("LOCAL_REVIEW_OFFLINE", mode === "offline flag" ? "true" : "false");
    vi.stubEnv("ENVIRONMENT_ID", mode === "review profile" ? "LOCAL_REVIEW" : "LOCAL_TEST");
    const resolver = vi.fn(), transport = vi.fn();
    await expect(resolvePublicAddress("https://source.example.invalid", resolver)).rejects.toThrow("LOCAL_REVIEW_EXTERNAL_CALL_BLOCKED");
    await expect(fetchPublicText("https://source.example.invalid", { resolver, transport })).rejects.toThrow("LOCAL_REVIEW_EXTERNAL_CALL_BLOCKED");
    await expect(providerFetch("https://provider.example.invalid")).rejects.toThrow("LOCAL_REVIEW_EXTERNAL_CALL_BLOCKED");
    expect(resolver).not.toHaveBeenCalled(); expect(transport).not.toHaveBeenCalled();
    for (const spy of Object.values(network)) expect(spy).not.toHaveBeenCalled();
  });
});
it("preserves normal ASR transport outside review", async () => {
  vi.stubEnv("LOCAL_REVIEW_OFFLINE", "false"); vi.stubEnv("ENVIRONMENT_ID", "LOCAL_TEST"); vi.stubEnv("EXTERNAL_CALLS_DISABLED", "false");
  const fetcher = vi.fn<typeof fetch>().mockResolvedValue(new Response("{}", { status: 200 }));
  const client = new LocalAsrClient({ endpoint: "http://127.0.0.1:18765", model: "SENSEVOICE_SMALL", device: "CPU" }, { fetch: fetcher });
  await client.installModel("SENSEVOICE_SMALL"); expect(fetcher).toHaveBeenCalledOnce();
});
it("allows opted-in daily models while keeping collection, ASR and SSRF restrictions", async () => {
  vi.stubEnv("ENVIRONMENT_ID", "LOCAL_REAL"); vi.stubEnv("LOCAL_RELEASE_PROFILE", "daily");
  vi.stubEnv("LOCAL_REVIEW_OFFLINE", "false"); vi.stubEnv("EXTERNAL_CALLS_DISABLED", "true"); vi.stubEnv("LOCAL_LLM_ENABLED", "true");
  expect(isLocalReviewOffline("LLM")).toBe(false); expect(isLocalReviewOffline()).toBe(true);
  const resolver=vi.fn().mockResolvedValue([{address:"8.8.8.8",family:4}]);
  await expect(resolvePublicAddress("https://model.example.invalid",resolver,undefined,"LLM")).resolves.toMatchObject({addresses:[{address:"8.8.8.8"}]});
  await expect(resolvePublicAddress("https://source.example.invalid",resolver)).rejects.toThrow("LOCAL_REVIEW_EXTERNAL_CALL_BLOCKED");
  await expect(resolvePublicAddress("https://127.0.0.1",resolver,undefined,"LLM")).rejects.toMatchObject({code:"SSRF_BLOCKED"});
  const fetcher=vi.fn<typeof fetch>();
  await expect(new LocalAsrClient({endpoint:"https://asr.example.invalid",model:"SENSEVOICE_SMALL",device:"CPU"},{fetch:fetcher}).health()).rejects.toMatchObject({code:"LOCAL_REVIEW_OFFLINE"});
  expect(fetcher).not.toHaveBeenCalled();
});
it.each(["LOCAL_REVIEW","LOCAL_BUILD","LOCAL_TEST"])("cannot opt %s into the daily model exception", environment=>{
  vi.stubEnv("ENVIRONMENT_ID",environment); vi.stubEnv("LOCAL_RELEASE_PROFILE","daily");
  vi.stubEnv("LOCAL_REVIEW_OFFLINE","false"); vi.stubEnv("EXTERNAL_CALLS_DISABLED","true"); vi.stubEnv("LOCAL_LLM_ENABLED","true");
  expect(isLocalReviewOffline("LLM")).toBe(true);
});

it("research collection is a separate opt-in and keeps generic transport blocked",async()=>{
 vi.stubEnv("ENVIRONMENT_ID","LOCAL_REAL");vi.stubEnv("LOCAL_RELEASE_PROFILE","daily");vi.stubEnv("LOCAL_REVIEW_OFFLINE","false");vi.stubEnv("EXTERNAL_CALLS_DISABLED","true");vi.stubEnv("LOCAL_RESEARCH_COLLECTION_ENABLED","true");vi.stubEnv("LOCAL_LLM_ENABLED","false");
 expect(isLocalReviewOffline("RESEARCH_COLLECTION")).toBe(false);expect(isLocalReviewOffline()).toBe(true);expect(isLocalReviewOffline("LLM")).toBe(true);
 const resolver=vi.fn().mockResolvedValue([{address:"8.8.8.8",family:4}]);
 await expect(resolvePublicAddress("https://collection.example.invalid",resolver,undefined,"RESEARCH_COLLECTION")).resolves.toMatchObject({addresses:[{address:"8.8.8.8"}]});
 await expect(resolvePublicAddress("https://127.0.0.1",resolver,undefined,"RESEARCH_COLLECTION")).rejects.toMatchObject({code:"SSRF_BLOCKED"});
 for(const profile of ["LOCAL_REVIEW","LOCAL_BUILD","LOCAL_TEST"]){vi.stubEnv("ENVIRONMENT_ID",profile);expect(isLocalReviewOffline("RESEARCH_COLLECTION")).toBe(true);}
});
