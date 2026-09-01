export const SOURCE_TYPES = ["TEXT", "URL", "VIDEO", "AUDIO", "IMAGE", "DOCUMENT"] as const;
export type SourceType = (typeof SOURCE_TYPES)[number];

export const SOURCE_PLATFORMS = [
  "GENERIC",
  "DOUYIN",
  "XIAOHONGSHU",
  "WECHAT",
  "BILIBILI",
  "YOUTUBE",
  "TIKTOK",
  "OTHER",
] as const;
export type SourcePlatform = (typeof SOURCE_PLATFORMS)[number];

export const SOURCE_ITEM_STATUSES = ["PENDING", "PROCESSING", "READY", "FAILED", "ARCHIVED"] as const;
export type SourceItemStatus = (typeof SOURCE_ITEM_STATUSES)[number];

export const JOB_STATUSES = ["QUEUED", "RUNNING", "SUCCEEDED", "FAILED", "CANCELLED"] as const;
export type JobStatus = (typeof JOB_STATUSES)[number];

const sourceTransitions: Record<SourceItemStatus, readonly SourceItemStatus[]> = {
  PENDING: ["PROCESSING", "FAILED", "ARCHIVED"],
  PROCESSING: ["READY", "FAILED", "ARCHIVED"],
  READY: ["ARCHIVED"],
  FAILED: ["PENDING", "ARCHIVED"],
  ARCHIVED: [],
};

const jobTransitions: Record<JobStatus, readonly JobStatus[]> = {
  QUEUED: ["RUNNING", "CANCELLED"],
  RUNNING: ["QUEUED", "SUCCEEDED", "FAILED", "CANCELLED"],
  SUCCEEDED: [],
  FAILED: ["QUEUED", "CANCELLED"],
  CANCELLED: [],
};

export function canTransitionSource(from: SourceItemStatus, to: SourceItemStatus): boolean {
  return sourceTransitions[from].includes(to);
}

export function canTransitionJob(from: JobStatus, to: JobStatus): boolean {
  return jobTransitions[from].includes(to);
}

export function detectSourcePlatform(input: string): SourcePlatform {
  if (input.startsWith("mock://")) return "OTHER";
  try {
    const hostname = new URL(input).hostname.toLowerCase();
    if (hostname === "youtu.be" || hostname.endsWith("youtube.com")) return "YOUTUBE";
    if (hostname.endsWith("douyin.com")) return "DOUYIN";
    if (hostname.endsWith("xiaohongshu.com") || hostname === "xhslink.com") return "XIAOHONGSHU";
    if (hostname.endsWith("weixin.qq.com") || hostname.endsWith("qq.com")) return "WECHAT";
    if (hostname.endsWith("bilibili.com") || hostname === "b23.tv") return "BILIBILI";
    if (hostname.endsWith("tiktok.com")) return "TIKTOK";
    return "GENERIC";
  } catch {
    return "OTHER";
  }
}

export function isRetryableIngestError(input: { code?: string; httpStatus?: number }): boolean {
  if (input.httpStatus && input.httpStatus >= 500) return true;
  return ["TIMEOUT", "NETWORK_TEMPORARY", "DNS_TEMPORARY"].includes(input.code ?? "");
}
