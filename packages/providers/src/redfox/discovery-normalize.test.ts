import { describe, expect, it } from "vitest";
import { normalizeAccountPage, normalizeContentPage } from "./discovery-normalize";

describe("RedFox discovery normalization", () => {
  it("normalizes Douyin content without turning missing metrics into zero", () => {
    const page = normalizeContentPage("DOUYIN", {
      total: 1,
      hasMore: false,
      list: [{ awemeId: "dy-1", desc: "AI 获客", author: { uid: "u1", nickname: "王老板" }, statistics: { diggCount: 123 }, shareUrl: "https://www.douyin.com/video/dy-1" }],
    });
    expect(page.items[0]).toMatchObject({ externalId: "dy-1", authorName: "王老板", metrics: { likes: 123, comments: null } });
  });

  it("normalizes Xiaohongshu accounts into the shared DTO", () => {
    const page = normalizeAccountPage("XIAOHONGSHU", {
      list: [{ redId: "red-1", nickname: "内容研究社", fansCount: "12000", signature: "用内容做生意" }],
    });
    expect(page.items[0]).toMatchObject({ externalId: "red-1", platform: "XIAOHONGSHU", name: "内容研究社", followers: 12000 });
  });
});
