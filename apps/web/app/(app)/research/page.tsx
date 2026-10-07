import { redirect } from "next/navigation";
import { requireWorkspace } from "@/server/access";
import { newsReadModel } from "@/server/research/news/service";
import { ResearchNews } from "@/components/research/research-news";
import "@/components/research/research-news.css";
type Params = { projectId?: string; entry?: string; accounts?: string | string[]; trend?: string; material?: string };
export default async function ResearchDaily({ searchParams }: { searchParams: Promise<Params> }) {
  const params = await searchParams;
  if (params.entry || params.accounts || params.material || params.trend || params.projectId) {
    const query = new URLSearchParams();
    for (const [key, value] of Object.entries(params)) if (value) for (const item of Array.isArray(value) ? value : [value]) query.append(key, item);
    redirect("/research/new?" + query.toString());
  }
  const { workspace, session } = await requireWorkspace();
  return <ResearchNews initial={await newsReadModel({ workspaceId: workspace.id, userId: session.user.id })} />;
}
