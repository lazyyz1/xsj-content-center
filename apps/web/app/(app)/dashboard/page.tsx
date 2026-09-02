import { Button, Card } from "@content-center/ui";
import { ArrowRight, FolderPlus, LibraryBig, Settings2 } from "lucide-react";
import Link from "next/link";
import { PageHeader } from "@/components/page";
import { requireWorkspace } from "@/server/access";
import { getDashboardCounts } from "@/server/dashboard";
import { getIntegrationStatuses } from "@/server/integrations";

export default async function DashboardPage() {
  const { workspace } = await requireWorkspace();
  const [counts, integrations] = await Promise.all([getDashboardCounts(workspace.id), getIntegrationStatuses(workspace.id)]);
  const missingServices = integrations
    .filter((integration) => integration.provider !== "STORAGE" && integration.status !== "CONFIGURED" && integration.status !== "MOCK")
    .map((integration) => integration.name);
  const metrics = [
    ["素材", counts.materials, "/library"],
    ["内容项目", counts.projects, "/projects"],
    ["待审核", counts.pendingReview, "/projects?review=pending"],
    ["待发布", counts.pendingPublish, "/calendar?view=pending"],
  ] as const;

  return (
    <>
      <PageHeader title="今天从哪里开始？" description="查看真实进度，并继续下一步内容工作。" />
      {missingServices.length > 0 ? (
        <Link href="/settings/integrations" className="mb-6 flex items-center justify-between gap-4 rounded-2xl border bg-[var(--surface)] p-4 transition-colors hover:border-[var(--accent)] sm:p-5">
          <div className="flex items-start gap-3"><Settings2 size={19} className="mt-0.5 shrink-0 text-[var(--accent)]" /><div><p className="text-sm font-medium">完成 AI 服务配置</p><p className="mt-1 text-xs leading-5 text-[var(--text-secondary)]">尚未就绪：{missingServices.join("、")}。可按实际使用需要逐项配置。</p></div></div>
          <ArrowRight size={17} className="shrink-0 text-[var(--text-secondary)]" />
        </Link>
      ) : null}
      <section aria-label="内容概览" className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {metrics.map(([label, value, href]) => (
          <Link key={label} href={href} aria-label={`${label} ${value}，查看详情`} className="group rounded-[calc(var(--radius)+4px)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]">
            <Card className="h-full p-5 transition-[border-color,transform,background-color] group-hover:-translate-y-0.5 group-hover:border-[var(--accent)] group-hover:bg-[var(--surface-elevated)] group-active:translate-y-0">
            <p className="text-sm text-[var(--text-secondary)]">{label}</p>
            <div className="mt-4 flex items-end justify-between gap-3"><p className="text-3xl font-semibold tabular-nums">{value}</p><ArrowRight size={17} className="mb-1 text-[var(--text-secondary)] transition-transform group-hover:translate-x-0.5" /></div>
            </Card>
          </Link>
        ))}
      </section>
      <Card className="mt-6 p-6">
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center"><div><h2 className="font-semibold">开始一次内容创作</h2><p className="mt-1 text-sm text-[var(--text-secondary)]">收录新素材，或新建一个内容项目。</p></div><div className="flex flex-wrap gap-2"><Button variant="secondary" asChild><Link href="/library"><LibraryBig size={16} />收录素材</Link></Button><Button asChild><Link href="/projects/new"><FolderPlus size={16} />新建项目</Link></Button></div></div>
      </Card>
    </>
  );
}
