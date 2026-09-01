import type { ConfigurableIntegrationProvider } from "./schemas";

export type IntegrationTestResult = {
  supported: false;
  status: "UNSUPPORTED_UNTIL_PROVIDER_STAGE";
  message: "Provider 尚未接入";
};

export interface IntegrationTester {
  testConnection(provider: ConfigurableIntegrationProvider): Promise<IntegrationTestResult>;
}

export class UnsupportedIntegrationTester implements IntegrationTester {
  async testConnection(_provider: ConfigurableIntegrationProvider): Promise<IntegrationTestResult> {
    return {
      supported: false,
      status: "UNSUPPORTED_UNTIL_PROVIDER_STAGE",
      message: "Provider 尚未接入",
    };
  }
}
