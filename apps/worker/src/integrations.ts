import { IntegrationService, type ConfigurableIntegrationProvider } from "@content-center/integrations";

const integrationService = new IntegrationService();

export function getWorkspaceIntegrationConfig(
  workspaceId: string,
  provider: ConfigurableIntegrationProvider,
) {
  return integrationService.getDecryptedIntegrationConfig(workspaceId, provider);
}
