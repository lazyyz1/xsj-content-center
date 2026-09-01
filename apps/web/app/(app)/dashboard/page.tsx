import { Button, Card } from "@content-center/ui";
import { ArrowRight, CheckCircle2, FolderPlus, LibraryBig, Send } from "lucide-react";
import Link from "next/link";
import { PageHeader } from "@/components/page";
import { requireWorkspace } from "@/server/access";
import { getDashboardCounts } from "@/server/dashboard";

export default async function DashboardPage() {
  const { workspace } = await requireWorkspace();
  const counts = await getDashboardCounts(workspace.id);
  const metrics = [
    ["素材", counts.materials],
    ["内容项目", counts.projects],
    ["待审核", counts.pendingReview],
    ["待发布", counts.pendingPublish],
  ] as const;
  const quickActions = [
    ["收录素材", "添加文本、网页或抖音作品", "/library", LibraryBig],
    ["新建项目", "把素材组织成创作任务", "/projects/new", FolderPlus],
    ["处理待审核", `${counts.pendingReview} 条内容等待人工结论`, "/projects", CheckCircle2],
    ["准备发布", `${counts.pendingPublish} 个发布任务待处理`, "/calendar?view=pending", Send],
  ] as const;

  return (
    <>
      <PageHeader title="今天从哪里开始？" description="查看真实进度，并继续下一步内容工作。" />
      <section aria-label="内容概览" className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {metrics.map(([label, value]) => (
          <Card key={label} className="p-5">
            <p className="text-sm text-[var(--text-secondary)]">{label}</p>
            <p className="mt-4 text-3xl font-semibold tabular-nums">{value}</p>
          </Card>
        ))}
      </section>
      <Card className="mt-6 p-6">
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center"><div><h2 className="font-semibold">开始一次内容创作</h2><p className="mt-1 text-sm text-[var(--text-secondary)]">先收录素材，或从已有项目和待办继续。</p></div><Button asChild><Link href="/library">收录新素材 <ArrowRight size={16} /></Link></Button></div>
        <div className="mt-5 grid gap-3 border-t pt-5 sm:grid-cols-2 xl:grid-cols-4">
          {quickActions.map(([title, description, href, Icon]) => <Link key={title} href={href} className="rounded-xl border p-4 transition-colors hover:border-[var(--accent)] hover:bg-[var(--surface-elevated)]"><Icon size={18} className="text-[var(--accent)]" /><p className="mt-3 text-sm font-medium">{title}</p><p className="mt-1 text-xs leading-5 text-[var(--text-secondary)]">{description}</p></Link>)}
        </div>
      </Card>
    </>
  );
}
