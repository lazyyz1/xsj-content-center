import type {
  ProviderInput,
  ProviderResult,
  PublishingTaskStatus,
  SourceMetadata,
  FetchedSourceMedia,
  SourceIngestInput,
  SourceIngestResult,
  TranscriptResult,
} from "./types";
import type { Readable } from "node:stream";

export interface SourceProvider {
  supports(input: string): boolean;
  resolve(input: string): Promise<ProviderResult<SourceMetadata>>;
  fetchMetadata(input: string): Promise<ProviderResult<SourceMetadata>>;
  fetchMedia(input: string): Promise<ProviderResult<FetchedSourceMedia>>;
}

export interface IngestSourceProvider extends SourceProvider {
  readonly providerName: string;
  ingest(input: SourceIngestInput): Promise<ProviderResult<SourceIngestResult>>;
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
  upload(input: {
    key: string;
    body: Uint8Array | Readable;
    contentType?: string;
    contentLength?: number;
  }): Promise<ProviderResult<{ key: string }>>;
  delete(key: string): Promise<ProviderResult<{ key: string }>>;
  getSignedUrl(key: string, expiresInSeconds?: number): Promise<ProviderResult<{ url: string }>>;
}
