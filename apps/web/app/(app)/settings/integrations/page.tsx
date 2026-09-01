import { Badge, Card } from "@content-center/ui";
import { PageHeader } from "@/components/page";
import { getIntegrationStatuses, type IntegrationDisplayStatus } from "@/server/integrations";

const statusColor: Record<IntegrationDisplayStatus, string> = {
  Configured: "border-[color-mix(in_srgb,var(--success)_30%,transparent)] text-[var(--success)]",
  Unconfigured: "text-[var(--text-secondary)]",
  Error: "border-[color-mix(in_srgb,var(--danger)_30%,transparent)] text-[var(--danger)]",
  Mock: "border-[color-mix(in_srgb,var(--warning)_30%,transparent)] text-[var(--warning)]",
};

export default function IntegrationsPage() {
  const integrations = getIntegrationStatuses();
  return (
    <>
      <PageHeader title="集成状态" description="这里只报告服务端配置状态。密钥不会返回到浏览器。" />
      <div className="grid gap-4 md:grid-cols-2">
        {integrations.map((integration) => (
          <Card key={integration.name} className="p-6">
            <div className="flex items-center justify-between gap-4">
              <h2 className="font-semibold">{integration.name}</h2>
              <Badge className={statusColor[integration.status]}>{integration.status}</Badge>
            </div>
            <p className="mt-3 text-sm leading-6 text-[var(--text-secondary)]">{integration.description}</p>
          </Card>
        ))}
      </div>
    </>
  );
}
