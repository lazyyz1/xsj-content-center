import { redirect } from "next/navigation";
import { requireWorkspace } from "@/server/access";
import { newsReadModel } from "@/server/research/news/service";
import { ResearchNews } from "@/components/research/research-news";
import "@/components/research/research-news.css";
import Link from "next/link";
import { researchWorkInbox } from "@/server/research/read-model";
type Params = { projectId?: string; entry?: string; accounts?: string | string[]; trend?: string; material?: string };
export default async function ResearchDaily({ searchParams }: { searchParams: Promise<Params> }) {
  const params = await searchParams;
  if (params.entry || params.accounts || params.material || params.trend || params.projectId) {
    const query = new URLSearchParams();
    for (const [key, value] of Object.entries(params)) if (value) for (const item of Array.isArray(value) ? value : [value]) query.append(key, item);
    redirect("/research/new?" + query.toString());
  }
  const { workspace, session } = await requireWorkspace();
  const actor = { workspaceId: workspace.id, userId: session.user.id };
  const [news, works] = await Promise.all([newsReadModel(actor), researchWorkInbox(actor)]);
  const unread = works.items.filter(work => !work.read).length;
  return <><Link className="research-followed-updates" href="/research/benchmarks?view=unread&order=newest#works"><strong>关注账号更新</strong><span>{unread} 条未读</span><small>最近 {works.items.length} 条已保存作品 · 查看更新 →</small></Link><ResearchNews initial={news} /></>;
}
