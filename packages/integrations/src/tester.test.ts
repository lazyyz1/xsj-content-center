import { describe, expect, it } from "vitest";
import { UnsupportedIntegrationTester } from "./tester";

describe("IntegrationTester", () => {
  it("does not invent a live RedFox health endpoint", async () => {
    await expect(new UnsupportedIntegrationTester().testConnection("REDFOX")).resolves.toEqual({
      supported: false,
      status: "LIVE_API_TEST_NOT_AVAILABLE",
      message: "配置格式可校验；RedFox 未公开无需作品链接的轻量连接测试。",
    });
  });
});
