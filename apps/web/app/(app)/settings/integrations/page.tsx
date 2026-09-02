import { canManageWorkspace } from "@content-center/core";
import { Card } from "@content-center/ui";
import { PageHeader } from "@/components/page";
import { IntegrationCard, SystemServiceCard } from "@/components/integrations/integration-card";
import { requireWorkspace } from "@/server/access";
import { getIntegrationStatuses, integrationVisibleToRole } from "@/server/integrations";

export default async function IntegrationsPage() {
  const { workspace, role } = await requireWorkspace();
  const canManage = canManageWorkspace(role);
  const integrations = (await getIntegrationStatuses(workspace.id)).map((integration) =>
    integrationVisibleToRole(integration, canManage),
  );
  const primaryIntegrations = integrations.filter((integration) => integration.provider !== "STORAGE");
  const storage = integrations.find((integration) => integration.provider === "STORAGE");
  const encryptionConfigured = Boolean(process.env.INTEGRATION_ENCRYPTION_KEY?.trim());
  return (
    <>
      <PageHeader title="AI 与外部服务" description="在这里配置内容生产中心使用的外部服务。API 密钥会加密保存，仅服务端可使用。" />
      <Card className="mb-6 p-5 sm:p-6">
        <h2 className="font-semibold">内容生产能力</h2>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {[storage, ...primaryIntegrations].filter(Boolean).map((integration) => {
            const ready = integration!.status === "CONFIGURED" || integration!.status === "MOCK";
            const label = integration!.provider === "STORAGE" ? "素材存储" : integration!.name;
            return <div key={integration!.provider} className="flex items-center gap-2 text-sm"><span className={ready ? "text-[var(--success)]" : "text-[var(--text-secondary)]"}>{ready ? "✓" : "○"}</span><span>{label}</span></div>;
          })}
        </div>
      </Card>
      {canManage && !encryptionConfigured ? (
        <p role="alert" className="mb-4 rounded-xl border border-[color-mix(in_srgb,var(--danger)_30%,transparent)] bg-[var(--surface)] p-4 text-sm text-[var(--danger)]">
          密钥加密服务尚未配置。为避免明文保存，当前无法新增或修改 API 密钥，请联系系统管理员。
        </p>
      ) : null}
      <section aria-labelledby="external-services-title">
        <h2 id="external-services-title" className="mb-4 text-sm font-medium text-[var(--text-secondary)]">外部服务</h2>
        <div className="grid gap-5 xl:grid-cols-3">
        {primaryIntegrations.map((integration) => (
          <IntegrationCard
            key={`${integration.provider}-${integration.updatedAt ?? "new"}`}
            integration={integration}
            canManage={canManage}
            encryptionConfigured={encryptionConfigured}
          />
        ))}
        </div>
      </section>
      {storage ? (
        <section aria-labelledby="system-services-title" className="mt-8">
          <h2 id="system-services-title" className="mb-4 text-sm font-medium text-[var(--text-secondary)]">系统服务</h2>
          <div className="max-w-2xl"><SystemServiceCard integration={storage} /></div>
        </section>
      ) : null}
    </>
  );
}
