import { canManageWorkspace } from "@content-center/core";
import { PageHeader } from "@/components/page";
import { IntegrationCard } from "@/components/integrations/integration-card";
import { requireWorkspace } from "@/server/access";
import { getIntegrationStatuses, integrationVisibleToRole } from "@/server/integrations";

export default async function IntegrationsPage() {
  const { workspace, role } = await requireWorkspace();
  const canManage = canManageWorkspace(role);
  const integrations = (await getIntegrationStatuses(workspace.id)).map((integration) =>
    integrationVisibleToRole(integration, canManage),
  );
  const encryptionConfigured = Boolean(process.env.INTEGRATION_ENCRYPTION_KEY?.trim());
  return (
    <>
      <PageHeader title="AI 与外部服务" description="内容空间的凭证在服务端加密保存；完整密钥不会返回浏览器。" />
      {canManage && !encryptionConfigured ? (
        <p role="alert" className="mb-4 rounded-xl border border-[color-mix(in_srgb,var(--danger)_30%,transparent)] bg-[var(--surface)] p-4 text-sm text-[var(--danger)]">
          Secret encryption is not configured.
        </p>
      ) : null}
      <div className="grid gap-4 md:grid-cols-2">
        {integrations.map((integration) => (
          <IntegrationCard
            key={integration.provider}
            integration={integration}
            canManage={canManage}
            encryptionConfigured={encryptionConfigured}
          />
        ))}
      </div>
    </>
  );
}
