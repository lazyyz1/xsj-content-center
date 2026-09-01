import { normalizeSourceUrl } from "@content-center/core";
import { RedFoxError } from "./errors";

const TRAILING_SHARE_PUNCTUATION = /[),.;!?\]}>，。；！？）】》」』]+$/u;

export function isSupportedDouyinUrl(input: string): boolean {
  try {
    const url = new URL(input);
    if (url.protocol !== "http:" && url.protocol !== "https:") return false;
    const host = url.hostname.toLowerCase();
    if (host === "v.douyin.com") return url.pathname.length > 1;
    if (host !== "douyin.com" && host !== "www.douyin.com") return false;
    return /^\/(video|note)\/[A-Za-z0-9_-]+(?:\/|$)/.test(url.pathname) ||
      (url.pathname === "/jingxuan" && Boolean(url.searchParams.get("modal_id")));
  } catch {
    return false;
  }
}

export function extractDouyinShareUrl(input: string): string {
  const candidates = input
    .trim()
    .match(/https?:\/\/[^\s<>"']+/giu)
    ?.map((candidate) => candidate.replace(TRAILING_SHARE_PUNCTUATION, ""))
    .filter(isSupportedDouyinUrl) ?? [];
  const unique = [...new Set(candidates.map((candidate) => normalizeSourceUrl(candidate)))];
  if (unique.length > 1) {
    throw new RedFoxError("AMBIGUOUS_DOUYIN_URL", "检测到多个抖音链接，请每次只提交一个。", false);
  }
  const url = unique[0];
  if (!url) throw new RedFoxError("INVALID_DOUYIN_URL", "请输入有效的抖音作品分享链接。", false);
  return url;
}

export function mapRedFoxPlatform(platform: string): "DOUYIN" {
  const normalized = platform.trim().toLowerCase();
  if (["dy", "douyin", "抖音"].includes(normalized)) return "DOUYIN";
  throw new RedFoxError(
    "REDFOX_UNSUPPORTED_PLATFORM",
    "RedFox 返回了当前阶段未开放的平台。",
    false,
    undefined,
    platform,
  );
}
