import { Button, Card } from "@content-center/ui";
import { ArrowRight } from "lucide-react";
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

  return (
    <>
      <PageHeader title="欢迎进入 AI 内容生产中心" description="素材统计来自当前 Workspace 的真实个人素材库。" />
      <section aria-label="内容概览" className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {metrics.map(([label, value]) => (
          <Card key={label} className="p-5">
            <p className="text-sm text-[var(--text-secondary)]">{label}</p>
            <p className="mt-4 text-3xl font-semibold tabular-nums">{value}</p>
          </Card>
        ))}
      </section>
      <Card className="mt-6 flex flex-col items-start justify-between gap-5 p-6 sm:flex-row sm:items-center">
        <div>
          <h2 className="font-semibold">开始整理你的内容素材</h2>
          <p className="mt-1 text-sm text-[var(--text-secondary)]">收录文字或公开网页，建立可检索的个人素材库。</p>
        </div>
        <Button asChild>
          <Link href="/library">开始创建内容 <ArrowRight size={16} /></Link>
        </Button>
      </Card>
    </>
  );
}
