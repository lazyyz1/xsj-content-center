import { describe, expect, it } from "vitest";
import { extractDouyinShareUrl, isSupportedDouyinUrl } from "./platform";

describe("extractDouyinShareUrl", () => {
  it.each([
    ["https://v.douyin.com/abc/", "https://v.douyin.com/abc/"],
    ["  https://www.douyin.com/video/123  ", "https://www.douyin.com/video/123"],
    ["3.21 复制打开抖音，看看作品 https://v.douyin.com/share1/ ！", "https://v.douyin.com/share1/"],
    ["https://douyin.com/note/456", "https://douyin.com/note/456"],
    ["https://www.douyin.com/jingxuan?modal_id=789", "https://www.douyin.com/jingxuan?modal_id=789"],
  ])("extracts an explicit Douyin work URL", (input, expected) => {
    expect(extractDouyinShareUrl(input)).toBe(expected);
  });

  it("rejects multiple Douyin URLs", () => {
    expect(() => extractDouyinShareUrl("https://v.douyin.com/a/ https://v.douyin.com/b/"))
      .toThrow(expect.objectContaining({ code: "AMBIGUOUS_DOUYIN_URL" }));
  });

  it.each(["无链接", "https://example.com/video/1", "https://evil-douyin.com/video/1", "https://www.douyin.com/user/name"])("rejects %s", (input) => {
    expect(() => extractDouyinShareUrl(input)).toThrow(expect.objectContaining({ code: "INVALID_DOUYIN_URL" }));
  });

  it("supports official note and work variants only", () => {
    expect(isSupportedDouyinUrl("https://www.douyin.com/note/123")).toBe(true);
    expect(isSupportedDouyinUrl("javascript:alert(1)")).toBe(false);
  });
});
