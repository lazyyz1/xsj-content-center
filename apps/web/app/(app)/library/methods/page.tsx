import { ArrowRight, BookOpenCheck, FilePenLine, Search, ShieldCheck, Sparkles } from "lucide-react";
import Link from "next/link";
import { DefaultContentMethod } from "@/components/projects/default-content-method";
import { WorkflowSkillImport } from "@/components/library/workflow-skill-import";
import { methodStatusLabels } from "@/lib/content-labels";
import { requireWorkspace } from "@/server/access";
import { getDefaultContentMethod } from "@/server/default-content-method/service";
import { listMethods } from "@/server/methods/service";

type MethodView = "COMPANY" | "MINE";

const principleLabels = {
  AUDIENCE: "像本人",
  TOPIC: "观点清楚",
  OPENING: "真实表达",
  BODY: "内容有价值",
  EVIDENCE: "有事实支撑",
  ENDING: "表达完整",
  BOUNDARY: "不乱承诺",
} as const;

function sourceLabel(source: { benchmarkStudyId: string | null; sourceMaterialDistillationId: string | null }) {
  if (source.benchmarkStudyId) return "来自博主研究";
  if (source.sourceMaterialDistillationId) return "来自资料提炼";
  return "来自内容研究";
}

function methodHref(view: MethodView, query = "") {
  const params = new URLSearchParams({ view });
  if (query) params.set("q", query);
  return `/library/methods?${params.toString()}`;
}

export default async function MethodsPage({ searchParams }: { searchParams: Promise<{ view?: string; q?: string; default?: string }> }) {
  const { session, workspace, role } = await requireWorkspace();
  const query = await searchParams;
  const view: MethodView = query.view === "COMPANY" ? "COMPANY" : "MINE";
  const keyword = query.q?.trim() ?? "";
  const normalizedKeyword = keyword.toLocaleLowerCase("zh-CN");
  const [defaultMethod, methods] = await Promise.all([
    getDefaultContentMethod({ workspaceId: workspace.id }),
    listMethods({ workspaceId: workspace.id, ownerUserId: session.user.id }),
  ]);
  const editable = role !== "VIEWER";
  const defaultPrinciples = (defaultMethod.current?.sections ?? []).map(({ code }) => principleLabels[code]).filter(Boolean).slice(0, 5);
  const companyVisible = Boolean(defaultMethod.current) && (!normalizedKeyword || [defaultMethod.title, ...defaultPrinciples].some((value) => value.toLocaleLowerCase("zh-CN").includes(normalizedKeyword)));
  const statusOrder = { CORE: 0, TRIAL: 1, SAVED: 2, DISABLED: 3 } as const;
  const visibleMethods = methods.filter((method) => {
    if (!normalizedKeyword) return true;
    const searchable = [method.current.title, ...method.current.steps, ...method.current.applicableScenarios, method.current.source.title].join(" ").toLocaleLowerCase("zh-CN");
    return searchable.includes(normalizedKeyword);
  }).sort((left, right) => statusOrder[left.status] - statusOrder[right.status] || right.updatedAt.localeCompare(left.updatedAt));

  return <>
    <div className="method-center-page">
      <header className="method-center-header"><div><h1>创作方法</h1><p>选择适合当前创作的方法，让 AI 帮你写出更像你的内容。</p></div></header>

      <details key={`${view}:${keyword}:${query.default === "open" ? "open" : "closed"}`} id="default-content-method" className="method-default-banner" open={query.default === "open"}>
        <summary>
          <div className="method-default-copy">
            <div className="method-default-title"><h2>鑫世界默认创作方法</h2><span>{editable && defaultMethod.draft ? "正在调整" : defaultMethod.current ? "当前使用" : "尚未设置"}</span></div>
            <p>{defaultMethod.current ? "AI 创作时默认遵循的公司内容标准。" : "当前还没有正在使用的公司默认创作方法。"}</p>
            {defaultPrinciples.length ? <div>{defaultPrinciples.map((principle) => <em key={principle}><ShieldCheck size={14} />{principle}</em>)}</div> : null}
          </div>
          <aside><strong>{editable ? "调整" : "查看详情"}<ArrowRight size={15} /></strong>{defaultMethod.updatedAt ? <small>最近调整 {new Date(defaultMethod.updatedAt).toLocaleDateString("zh-CN")}</small> : <small>{editable ? "可以开始设置" : "等待负责人设置"}</small>}</aside>
        </summary>
        <div className="method-default-detail"><DefaultContentMethod initial={defaultMethod} editable={editable} /></div>
      </details>

      <section className="method-browser" aria-labelledby="method-browser-title">
        <header>
          <div><h2 id="method-browser-title">创作方法</h2><p>选择适合的方法，让 AI 帮你生成更符合预期的内容。</p></div>
          <div className="method-browser-actions">
            <form method="get"><input type="hidden" name="view" value={view} /><label htmlFor="method-search"><Search size={17} /><input id="method-search" name="q" defaultValue={keyword} placeholder="搜索创作方法" /></label><button type="submit">搜索</button></form>
            {editable ? <Link href="/discovery"><FilePenLine size={17} />从研究中保存创作方法</Link> : null}
            {editable ? <WorkflowSkillImport /> : null}
          </div>
        </header>

        <nav className="method-view-tabs" aria-label="创作方法来源">
          <Link href={methodHref("COMPANY", keyword)} aria-current={view === "COMPANY" ? "page" : undefined}>公司创作方法</Link>
          <Link href={methodHref("MINE", keyword)} aria-current={view === "MINE" ? "page" : undefined}>我的创作方法</Link>
        </nav>

        {view === "COMPANY" ? companyVisible ? <div className="method-card-grid is-company">
          <Link href={`${methodHref("COMPANY", keyword)}&default=open#default-content-method`} className="method-card method-card-company">
            <div className="method-card-cover cover-company"><span><Sparkles size={25} /></span><i /><b /></div>
            <div className="method-card-body"><header><span>公司创作方法</span><em>当前使用</em></header><h3>鑫世界默认创作方法</h3><p>AI 创作时默认遵循的公司内容标准。</p><div className="method-card-tags">{defaultPrinciples.slice(0, 2).map((principle) => <span key={principle}>{principle}</span>)}</div><footer><small>鑫世界官方</small><strong>查看创作方法<ArrowRight size={14} /></strong></footer></div>
          </Link>
        </div> : keyword ? <SearchEmpty view={view} /> : <EmptyState title="暂时没有公司创作方法" description="当前没有正在使用的公司创作方法。" /> : visibleMethods.length ? <div className="method-card-grid">
          {visibleMethods.map((method, index) => <Link key={method.id} href={`/library/methods/${method.id}`} className={`method-card method-cover-${index % 6} ${method.status === "DISABLED" ? "is-disabled" : ""}`}>
            <div className="method-card-cover"><span>{index % 3 === 0 ? <BookOpenCheck size={25} /> : index % 3 === 1 ? <Sparkles size={25} /> : <FilePenLine size={25} />}</span><i /><b /></div>
            <div className="method-card-body"><header><span>我的创作方法</span>{method.status === "DISABLED" ? <em>{methodStatusLabels[method.status]}</em> : null}</header><h3>{method.current.title}</h3><p>{method.current.steps[0] || "已保存的创作方法内容"}</p><div className="method-card-tags">{method.current.applicableScenarios.slice(0, 2).map((scenario) => <span key={scenario}>{scenario}</span>)}</div><footer><small>{sourceLabel(method.current.source)}</small><strong>查看创作方法<ArrowRight size={14} /></strong></footer></div>
          </Link>)}
        </div> : keyword ? <SearchEmpty view={view} /> : <EmptyState title="还没有自己的创作方法" description="可以从研究结果中保存，或从一份资料开始提炼。" />}
      </section>
    </div>
  </>;
}

function SearchEmpty({ view }: { view: MethodView }) {
  return <div className="method-empty"><span><Search size={22} /></span><h2>没有找到相关创作方法</h2><p>换一个关键词再试。</p><Link href={methodHref(view)}>清除搜索</Link></div>;
}

function EmptyState({ title, description }: { title: string; description: string }) {
  return <div className="method-empty"><span><BookOpenCheck size={22} /></span><h2>{title}</h2><p>{description}</p></div>;
}
