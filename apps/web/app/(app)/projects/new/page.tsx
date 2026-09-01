import { Card } from "@content-center/ui";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ProjectForm } from "@/components/projects/project-form";
import { requireWorkspace } from "@/server/access";

export default async function NewProjectPage({ searchParams }: { searchParams: Promise<{ sourceItemId?: string }> }) {
  const { role } = await requireWorkspace();
  if (role === "VIEWER") redirect("/projects");
  const query = await searchParams;
  return <div className="mx-auto max-w-2xl"><Link href="/projects" className="mb-5 inline-flex items-center gap-2 text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)]"><ArrowLeft size={16} />返回项目列表</Link><header className="mb-6"><h1 className="text-3xl font-semibold tracking-tight">新建内容项目</h1><p className="mt-2 text-sm text-[var(--text-secondary)]">先定义项目边界，再进入创作工作台。</p></header><Card className="p-6"><ProjectForm sourceItemId={query.sourceItemId} /></Card></div>;
}
