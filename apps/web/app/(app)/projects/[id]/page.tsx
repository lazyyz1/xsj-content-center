import { Badge, Button, Card } from "@content-center/ui";
import { ArrowLeft, ArrowRight } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { requireWorkspace } from "@/server/access";
import { getProjectForUser } from "@/server/project-service";

const statusLabels: Record<string, string> = { DRAFT: "草稿", RESEARCHING: "研究中", BRIEF_READY: "Brief 已就绪", WRITING: "写作中", IN_REVIEW: "审核中", APPROVED: "已批准", ARCHIVED: "已归档" };

export default async function ProjectDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { session, workspace } = await requireWorkspace();
  const { id } = await params;
  const project = await getProjectForUser({ userId: session.user.id, workspaceId: workspace.id, projectId: id });
  if (!project) notFound();
  return <><Link href="/projects" className="mb-5 inline-flex items-center gap-2 text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)]"><ArrowLeft size={16} />返回项目列表</Link><header className="mb-6 flex flex-col justify-between gap-4 sm:flex-row sm:items-start"><div><div className="mb-3 flex gap-2"><Badge>{statusLabels[project.status]}</Badge></div><h1 className="text-3xl font-semibold tracking-tight">{project.title}</h1><p className="mt-2 text-sm text-[var(--text-secondary)]">创建者：{project.createdBy.name} · 更新于 {project.updatedAt.toLocaleString("zh-CN")}</p></div><Button asChild><Link href={`/projects/${project.id}/studio`}>进入工作台 <ArrowRight size={16} /></Link></Button></header><div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_320px]"><Card className="p-6"><h2 className="font-semibold">项目说明</h2><p className="mt-4 whitespace-pre-wrap text-sm leading-7 text-[var(--text-secondary)]">{project.description || "暂无项目说明"}</p><div className="mt-6 grid gap-5 border-t pt-5 sm:grid-cols-2"><div><h3 className="text-sm font-medium">创作目标</h3><p className="mt-2 whitespace-pre-wrap text-sm text-[var(--text-secondary)]">{project.goal || "未填写"}</p></div><div><h3 className="text-sm font-medium">目标受众</h3><p className="mt-2 whitespace-pre-wrap text-sm text-[var(--text-secondary)]">{project.audience || "未填写"}</p></div></div></Card><Card className="p-6"><h2 className="font-semibold">项目内容</h2><dl className="mt-5 grid gap-4 text-sm"><div className="flex justify-between"><dt className="text-[var(--text-secondary)]">Sources</dt><dd>{project.sources.length}</dd></div><div className="flex justify-between"><dt className="text-[var(--text-secondary)]">Evidence</dt><dd>{project.evidenceItems.length}</dd></div><div className="flex justify-between"><dt className="text-[var(--text-secondary)]">Creative Brief</dt><dd>{project.creativeBrief ? "已创建" : "未创建"}</dd></div><div className="flex justify-between"><dt className="text-[var(--text-secondary)]">Mother Content</dt><dd>{project.motherContent?.body.trim() ? "已有正文" : "未开始"}</dd></div></dl></Card></div></>;
}
