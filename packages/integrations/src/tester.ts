import type { ConfigurableIntegrationProvider } from "./schemas";

export type IntegrationTestResult = {
  supported: false;
  status: "UNSUPPORTED_UNTIL_PROVIDER_STAGE" | "LIVE_API_TEST_NOT_AVAILABLE";
  message: string;
};

export interface IntegrationTester {
  testConnection(provider: ConfigurableIntegrationProvider): Promise<IntegrationTestResult>;
}

export class UnsupportedIntegrationTester implements IntegrationTester {
  async testConnection(_provider: ConfigurableIntegrationProvider): Promise<IntegrationTestResult> {
    if (_provider === "REDFOX") {
      return {
        supported: false,
        status: "LIVE_API_TEST_NOT_AVAILABLE",
        message: "配置格式可校验；RedFox 未公开无需作品链接的轻量连接测试。",
      };
    }
    return {
      supported: false,
      status: "UNSUPPORTED_UNTIL_PROVIDER_STAGE",
      message: "Provider 尚未接入",
    };
  }
}
