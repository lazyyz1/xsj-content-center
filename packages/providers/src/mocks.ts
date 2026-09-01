import type {
  LLMProvider,
  PublishingProvider,
  SourceProvider,
  StorageProvider,
  TranscriptionProvider,
} from "./contracts";
import type { ProviderResult } from "./types";

function mockResult<T>(provider: string, data: T): ProviderResult<T> {
  console.warn("MOCK_PROVIDER_USED", { provider });
  return { providerMode: "MOCK", data };
}

export class MockSourceProvider implements SourceProvider {
  supports(): boolean {
    console.warn("MOCK_PROVIDER_USED", { provider: "SourceProvider" });
    return true;
  }

  async resolve(input: string) {
    return mockResult("SourceProvider", { sourceType: "mock", url: input, title: "MOCK MODE" });
  }

  async fetchMetadata(input: string) {
    return mockResult("SourceProvider", { sourceType: "mock", url: input, title: "MOCK MODE" });
  }

  async fetchMedia(_input: string) {
    return mockResult("SourceProvider", { body: new Uint8Array(), contentType: "application/octet-stream" });
  }
}

export class MockTranscriptionProvider implements TranscriptionProvider {
  async transcribe(_input: Parameters<TranscriptionProvider["transcribe"]>[0]) {
    return mockResult("TranscriptionProvider", { fullText: "MOCK MODE", segments: [] });
  }
}

export class MockLLMProvider implements LLMProvider {
  async generate(input: { prompt: string }) {
    return mockResult("LLMProvider", { text: `MOCK MODE: ${input.prompt}` });
  }

  async rewrite(input: { prompt: string }) {
    return mockResult("LLMProvider", { text: `MOCK MODE: ${input.prompt}` });
  }

  async summarize(input: { prompt: string }) {
    return mockResult("LLMProvider", { text: `MOCK MODE: ${input.prompt}` });
  }

  async classify() {
    return mockResult("LLMProvider", { labels: ["MOCK MODE"] });
  }

  async adapt(input: { prompt: string; platform: string }) {
    return mockResult("LLMProvider", { text: `MOCK MODE (${input.platform}): ${input.prompt}` });
  }
}

export class MockPublishingProvider implements PublishingProvider {
  async validate(_input: { content: string }) {
    return mockResult("PublishingProvider", { valid: false, issues: ["MOCK MODE"] });
  }

  async publish(_input: { content: string }) {
    return mockResult("PublishingProvider", { status: "MOCK" as const });
  }

  async getStatus(_input: { externalId: string }) {
    return mockResult("PublishingProvider", { status: "MOCK" as const });
  }
}

export class MockStorageProvider implements StorageProvider {
  async upload(input: Parameters<StorageProvider["upload"]>[0]) {
    return mockResult("StorageProvider", { key: input.key });
  }

  async delete(key: string) {
    return mockResult("StorageProvider", { key });
  }

  async getSignedUrl(key: string) {
    return mockResult("StorageProvider", { url: `mock://storage/${encodeURIComponent(key)}` });
  }
}
