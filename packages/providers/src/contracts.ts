import type {
  ProviderInput,
  ProviderResult,
  PublishingTaskStatus,
  SourceMetadata,
  TranscriptResult,
} from "./types";

export interface SourceProvider {
  supports(input: string): boolean;
  resolve(input: string): Promise<ProviderResult<SourceMetadata>>;
  fetchMetadata(input: string): Promise<ProviderResult<SourceMetadata>>;
  fetchMedia(input: string): Promise<ProviderResult<{ body: Uint8Array; contentType?: string }>>;
}

export interface TranscriptionProvider {
  transcribe(input: { body: Uint8Array; contentType?: string }): Promise<ProviderResult<TranscriptResult>>;
}

export interface LLMProvider {
  generate(input: ProviderInput): Promise<ProviderResult<{ text: string }>>;
  rewrite(input: ProviderInput): Promise<ProviderResult<{ text: string }>>;
  summarize(input: ProviderInput): Promise<ProviderResult<{ text: string }>>;
  classify(input: ProviderInput): Promise<ProviderResult<{ labels: string[] }>>;
  adapt(input: ProviderInput & { platform: string }): Promise<ProviderResult<{ text: string }>>;
}

export interface PublishingProvider {
  validate(input: { content: string }): Promise<ProviderResult<{ valid: boolean; issues: string[] }>>;
  publish(input: { content: string }): Promise<ProviderResult<{ status: PublishingTaskStatus; externalId?: string }>>;
  getStatus(input: { externalId: string }): Promise<ProviderResult<{ status: PublishingTaskStatus }>>;
}

export interface StorageProvider {
  upload(input: { key: string; body: Uint8Array; contentType?: string }): Promise<ProviderResult<{ key: string }>>;
  delete(key: string): Promise<ProviderResult<{ key: string }>>;
  getSignedUrl(key: string, expiresInSeconds?: number): Promise<ProviderResult<{ url: string }>>;
}
