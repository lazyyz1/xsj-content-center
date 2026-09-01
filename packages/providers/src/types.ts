export type ProviderMode = "REAL" | "MOCK";

export type ProviderResult<T> = {
  providerMode: ProviderMode;
  data: T;
};

export type SourceMetadata = {
  sourceType: string;
  platform?: string;
  url?: string;
  title?: string;
  author?: string;
  description?: string;
  thumbnailUrl?: string;
  publishedAt?: string;
  raw?: unknown;
};

export type TranscriptResult = {
  language?: string;
  durationMs?: number;
  fullText: string;
  segments: Array<{
    startMs: number;
    endMs: number;
    text: string;
  }>;
};

export type ProviderInput = { prompt: string };

export type PublishingTaskStatus =
  | "DRAFT"
  | "WAITING_APPROVAL"
  | "APPROVED"
  | "QUEUED"
  | "PUBLISHING"
  | "PUBLISHED"
  | "FAILED"
  | "CANCELLED"
  | "MOCK";
