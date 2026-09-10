/* finesse · register=product · shell=method-asset-workbench · palette=continued-cool-slate-cobalt · density=6 */
import { Badge } from "@content-center/ui";
import { ArrowRight, BookOpenCheck, Bot, Boxes, BriefcaseBusiness, CheckCircle2, Clock3, FileImage, FileText, FolderKanban, Lightbulb, MessageSquareText, PackageCheck, Search, Sparkles, Star, Upload, Users, WandSparkles, Workflow, Zap } from "lucide-react";
import Link from "next/link";
import { methodStatusLabels } from "@/lib/content-labels";
import { requireWorkspace } from "@/server/access";
import { getCreatorMethodsOverview, type CreatorMethodDTO } from "@/server/creator-methods/service";
import { getDefaultContentMethod } from "@/server/default-content-method/service";
import { DefaultContentMethod } from "@/components/projects/default-content-method";

const demoMethods = [
  ["老板观点表达法", "把复杂的观点，变成清晰有力的表达。", ["观点", "开头", "金句", "口语化"], MessageSquareText],
  ["经营问题切入法", "从真实经营问题切入，建立内容共鸣。", ["选题", "案例", "行业", "分析"], BriefcaseBusiness],
  ["真实案例转内容法", "把真实案例，转化为高质量内容。", ["案例", "故事", "启发", "结构"], FileText],
  ["短视频开头钩子法", "用清晰冲突快速抓住观众注意力。", ["开头", "情绪", "悬念", "场景"], Zap],
  ["口播结构整理法", "快速整理口播稿的逻辑与结构。", ["结构", "框架", "转场", "收尾"], Workflow],
  ["对标灵感提炼法", "从优秀对标中提炼可复用的灵感。", ["对标", "拆解", "灵感", "优化"], Sparkles],
] as const;

const assembly = [
  ["从研究沉淀方法", "基于研究内容和项目经验，提炼可复用的方法。", "可操作", FileText],
  ["让 GPT 生成 Skill 文件", "基于方法生成标准化 Skill 文件。", "即将支持", WandSparkles],
  ["上传 Skill 文件", "上传本地 Skill 文件，进行解析与校验。", "即将支持", Upload],
  ["安装到方法中心", "一键安装为可用的创作能力。", "即将支持", PackageCheck],
  ["用于 Studio 创作", "在创作时随时调用，提高效率。", "已启用", Bot],
] as const;

const candidateSources = [["来自博主研究", "3 个待确认的方法", BookOpenCheck], ["来自单素材研究", "2 个待确认的方法", FileImage], ["来自团队经验", "4 个待确认的方法", Users]] as const;

export default async function CreatorMethodsPage() {
  const { session, workspace, role } = await requireWorkspace();
  const [overview, defaultMethod] = await Promise.all([getCreatorMethodsOverview({ workspaceId: workspace.id, ownerUserId: session.user.id }), getDefaultContentMethod({ workspaceId: workspace.id })]);
  const activeMethods = overview.all.filter((method) => method.status !== "DISABLED");
  const currentVersion = defaultMethod.current?.version;
  return <div className="methods-v2">
    <header className="methods-v2-hero"><div><h1>方法中心</h1><p>把经验沉淀成方法，把方法变成可调用的创作能力。</p></div><div aria-hidden="true" className="methods-hero-art"><span><Lightbulb size={26} /></span><span><Boxes size={24} /></span><p>从研究到方法<br />再回到创作</p></div></header>
    <section className="methods-overview-grid" aria-label="方法中心概览">
      <article className="methods-overview-card is-baseline"><header><span><Star size={22} fill="currentColor" /></span><h2>鑫世界创作基线</h2><Badge>{currentVersion ? "默认启用" : "尚未发布"}</Badge></header><p>基于平台最佳实践，提供高质量创作的通用方法与标准。</p><div>{["优质结构", "内容安全", "风格适配", "持续更新"].map((tag) => <span key={tag}>{tag}</span>)}</div></article>
      <article className="methods-overview-card"><header><span><FolderKanban size={21} /></span><h2>我的方法</h2><Link href="/library/methods">查看方法库<ArrowRight size={14} /></Link></header><strong>{activeMethods.length || demoMethods.length} <small>个方法</small></strong>{!activeMethods.length ? <em>前端示例</em> : null}<div>{["内容创作", "视频口播", "案例分析", "行业研究"].map((tag) => <span key={tag}>{tag}</span>)}</div></article>
      <article className="methods-overview-card is-capability"><header><span><Zap size={22} fill="currentColor" /></span><h2>可执行能力</h2><button type="button" disabled>管理能力<ArrowRight size={14} /></button></header><p>将方法封装为 Skill，扩展更多创作能力。</p><div><span className="is-ready"><CheckCircle2 size={13} />Studio 已启用</span><span><Clock3 size={13} />更多能力即将支持</span></div></article>
    </section>
    <div className="methods-main-grid">
      <section className="methods-library-panel"><header><div><h2><Boxes size={20} />方法库</h2><p>沉淀可复用的创作方法，支持一键应用到你的创作中。</p></div><div className="methods-library-tools"><label title="搜索即将支持"><Search size={15} /><input aria-label="搜索方法（即将支持）" placeholder="搜索方法..." disabled /></label><select aria-label="方法分类（即将支持）" defaultValue="ALL" disabled><option value="ALL">全部分类</option><option>内容创作</option><option>视频口播</option><option>案例分析</option></select></div></header>{activeMethods.length ? <div className="methods-card-grid">{activeMethods.slice(0, 6).map((method) => <RealMethodCard key={method.id} method={method} />)}</div> : <><p className="methods-demo-note">当前还没有个人方法，以下为可替换的前端示例。</p><div className="methods-card-grid">{demoMethods.map(([title, description, tags, Icon], index) => <article key={title} className="methods-library-card is-demo"><header><span><Icon size={19} /></span><Badge>V{index % 2 + 1}</Badge></header><h3>{title}</h3><p>{description}</p><div>{tags.map((tag) => <span key={tag}>{tag}</span>)}</div><footer><Link href="/projects">用于创作<ArrowRight size={14} /></Link><button type="button" aria-label={`${title}更多操作`} disabled>•••</button></footer></article>)}</div></>}</section>
      <aside className="methods-assembly-panel"><header><div><h2><Workflow size={20} />方法装配台</h2><p>将研究、经验转化为可执行的创作能力。</p></div><button type="button" disabled>了解更多<ArrowRight size={14} /></button></header><ol>{assembly.map(([title, description, status, Icon], index) => <li key={title}><span>{index + 1}</span><article><i><Icon size={17} /></i><div><h3>{title}</h3><p>{description}</p></div><Badge className={status === "已启用" || status === "可操作" ? "text-[var(--success)]" : ""}>{status}</Badge></article></li>)}</ol></aside>
    </div>
    <div className="methods-bottom-grid"><section><header><div><h2><Lightbulb size={20} />候选方法</h2><p>从研究、素材和团队经验中，发现值得继续沉淀的内容。</p></div><span>界面预览</span></header><div className="methods-candidate-grid">{candidateSources.map(([title, count, Icon]) => <article key={title}><span><Icon size={19} /></span><div><h3>{title}</h3><p>{count}</p></div><ArrowRight size={16} /></article>)}</div></section><section><header><div><h2><Clock3 size={20} />最近更新</h2><p>方法与能力的最新动态。</p></div><span>界面预览</span></header><ul className="methods-update-list"><li><i /><strong>经营问题切入法</strong><Badge>V2</Badge><span>优化了案例结构与应用场景</span><time>2 小时前</time></li><li><i /><strong>默认方法摘要已更新</strong><span>完善了适用场景与使用建议</span><time>1 天前</time></li><li><i /><strong>视频脚本助手</strong><span>扩展了脚本生成能力</span><time>3 天前</time></li></ul></section></div>
    <details className="methods-real-details"><summary>查看当前默认方法、依据与版本 <ArrowRight size={15} /></summary><div><DefaultContentMethod initial={defaultMethod} editable={role !== "VIEWER"} /></div></details>
  </div>;
}

function RealMethodCard({ method }: { method: CreatorMethodDTO }) {
  return <article className="methods-library-card"><header><span><BookOpenCheck size={19} /></span><Badge>{methodStatusLabels[method.status]}</Badge></header><h3>{method.current.title}</h3><p>{method.current.steps[0] || "已保存的方法内容"}</p><div><span>真实方法</span>{method.attempts ? <span>已使用 {method.attempts} 次</span> : null}</div><footer><Link href={`/library/methods/${method.id}`}>用于创作<ArrowRight size={14} /></Link><Link href={`/library/methods/${method.id}`} aria-label={`查看${method.current.title}详情`}>•••</Link></footer></article>;
}
