import { Button, Card } from "@content-center/ui";
import { ArrowRight, FolderOpen, Lightbulb, Plus, Shapes } from "lucide-react";
import Link from "next/link";
import ProjectStudioPage from "../projects/[id]/studio/page";
import { requireWorkspace } from "@/server/access";
import { getDashboardWork } from "@/server/dashboard";

export default async function DashboardPage({ searchParams }: { searchParams: Promise<{ project?: string; new?: string }> }) {
  const { workspace } = await requireWorkspace();
  const query = await searchParams;
  const work = await getDashboardWork(workspace.id);
  const currentProjectId = query.new === "1" ? undefined : typeof query.project === "string" && query.project.trim() ? query.project : work.projects[0]?.id;

  if (currentProjectId) return <div className="dashboard-workbench"><ProjectStudioPage params={Promise.resolve({ id: currentProjectId })} /></div>;

  const starts = [
    ["从一个想法开始", "先写下这次最想讲清楚的事", "/projects/new", Plus],
    ["从研究开始", "从外部内容里找到可借鉴的方向", "/discovery", Lightbulb],
    ["从资产开始", "从已有资料、依据或方法开始", "/library", Shapes],
    ["打开最近工作", "查看和恢复已有内容项目", "/projects", FolderOpen],
  ] as const;
  return <div className="empty-workbench"><Card><header><span>当前工作台</span><h1>开始一项新的内容工作</h1><p>选一个最接近你当前状态的入口，开始后会直接进入同一张内容画布。</p></header><div>{starts.map(([title, description, href, Icon], index) => <Button key={title} variant={index ? "secondary" : "primary"} asChild><Link href={href}><Icon size={19} /><span><strong>{title}</strong><small>{description}</small></span><ArrowRight size={17} /></Link></Button>)}</div></Card></div>;
}
