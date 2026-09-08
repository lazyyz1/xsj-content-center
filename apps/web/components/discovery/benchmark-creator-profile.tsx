/* finesse · register=product · shell=floating-research-canvas · palette=cool-slate-cobalt · density=7 */
"use client";

import { Badge, Card } from "@content-center/ui";
import { BookmarkCheck, ChartNoAxesCombined, ChevronDown, ChevronRight, Clapperboard, ExternalLink, FileSearch, FileText, Quote, Sparkles, Video, X } from "lucide-react";
import Link from "next/link";
import { useEffect, useRef, useState, type ReactNode } from "react";
import type { BenchmarkCreatorDetailDTO } from "@/server/discovery/benchmark-creator-read-model";

export type BenchmarkView = "PROFILE" | "CONTENT" | "RESEARCH";
type Highlight = BenchmarkCreatorDetailDTO["highlights"][number];
type Source = BenchmarkCreatorDetailDTO["representativeSources"][number];

const platformLabel: Record<string, string> = { DOUYIN: "抖音", XIAOHONGSHU: "小红书" };
const qualityLabel: Record<Highlight["quality"], string> = { WORTH_KEEPING: "值得留下", OBSERVE: "先观察", CASE_ONLY: "案例参考", DO_NOT_KEEP: "暂不沉淀" };
const methodStatus: Record<BenchmarkCreatorDetailDTO["savedMethods"][number]["status"], string> = { SAVED: "已收藏", TRIAL: "试用中", CORE: "常用", DISABLED: "已停用" };

function Empty({ children, compact = false }: { children: string; compact?: boolean }) {
  return <div className={`benchmark-empty ${compact ? "benchmark-empty-compact" : ""}`}>{children}</div>;
}

function MediaThumb({ source, className = "" }: { source: Pick<Source, "coverUrl" | "title">; className?: string }) {
  const [failed, setFailed] = useState(false);
  const imageRef = useRef<HTMLImageElement>(null);
  useEffect(() => {
    const image = imageRef.current;
    if (image?.complete && image.naturalWidth === 0) setFailed(true);
  }, [source.coverUrl]);
  if (!source.coverUrl || failed) return <div aria-hidden="true" className={`benchmark-media-fallback ${className}`}><span className="benchmark-media-fallback-mark"><Video size={18} /><b>{source.title.trim().slice(0, 1) || "影"}</b></span><span>暂无封面</span></div>;
  return <img ref={imageRef} src={source.coverUrl} alt="" className={className} onError={() => setFailed(true)} />;
}

export function WorkspaceTabs({ value, onChange }: { value: BenchmarkView; onChange: (value: BenchmarkView) => void }) {
  const items: Array<[BenchmarkView, string]> = [["PROFILE", "画像"], ["CONTENT", "内容"], ["RESEARCH", "研究"]];
  return <div className="benchmark-tabs" role="tablist" aria-label="博主详情视图">{items.map(([id, label]) => <button key={id} type="button" role="tab" aria-selected={value === id} className="benchmark-tab" onClick={() => onChange(id)}>{label}</button>)}</div>;
}

export function BenchmarkCreatorHeader({ profile }: { profile: BenchmarkCreatorDetailDTO }) {
  const [avatarFailed, setAvatarFailed] = useState(false);
  const stats = [
    { label: "已发现内容", value: profile.stats.discovered, tone: "blue", icon: <Clapperboard size={17} /> },
    { label: "已收录", value: profile.stats.collected, tone: "violet", icon: <BookmarkCheck size={17} /> },
    { label: "已研究", value: profile.stats.studied, tone: "mint", icon: <ChartNoAxesCombined size={17} /> },
    { label: "已有精华", value: profile.stats.distilled, tone: "amber", icon: <Sparkles size={17} /> },
    { label: "文案分析", value: profile.stats.copywriting, tone: "rose", icon: <FileSearch size={17} /> },
  ] as const;
  return <Card className="benchmark-profile-header benchmark-glass overflow-hidden border-0">
    <div className="benchmark-header-main">
      <div className="flex min-w-0 items-start gap-4 sm:gap-5">
        {profile.account.avatarUrl && !avatarFailed ? <img src={profile.account.avatarUrl} alt={`${profile.account.name}头像`} className="benchmark-avatar" onError={() => setAvatarFailed(true)} /> : <div aria-hidden="true" className="benchmark-avatar benchmark-avatar-fallback">{profile.account.name.slice(0, 1)}</div>}
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2"><h1 className="benchmark-profile-title">{profile.account.name}</h1><Badge>{platformLabel[profile.account.platform] ?? profile.account.platform}</Badge></div>
          {profile.account.bio ? <p className="benchmark-profile-bio">{profile.account.bio}</p> : null}
          {profile.account.tags.length ? <div className="benchmark-tag-row">{profile.account.tags.map((tag) => <span key={tag} className="benchmark-tag">{tag}</span>)}</div> : null}
        </div>
      </div>
    </div>
    <div className="benchmark-stats-grid">{stats.map((stat) => <div key={stat.label} className={`benchmark-stat-tile benchmark-stat-${stat.tone}`}><span className="benchmark-stat-icon">{stat.icon}</span><div className="min-w-0"><p className="benchmark-stat-value">{stat.value}</p><p className="benchmark-stat-label">{stat.label}</p></div></div>)}</div>
  </Card>;
}

function PreviewHeading({ title, description, action }: { title: string; description: string; action?: ReactNode }) {
  return <div className="benchmark-section-heading"><div className="min-w-0"><div className="flex items-center gap-2"><span className="benchmark-section-dot" aria-hidden="true" /><h2>{title}</h2></div><p>{description}</p></div>{action}</div>;
}

export function CollapsibleSection({ title, summary, children }: { title: string; summary: string; children?: ReactNode }) {
  return <details className="benchmark-accordion benchmark-glass group"><summary><span className="benchmark-accordion-icon" aria-hidden="true"><FileText size={16} /></span><span className="benchmark-accordion-copy"><b>{title}</b><span>{summary}</span></span><ChevronDown size={17} className="benchmark-accordion-chevron" /></summary>{children ? <div className="benchmark-accordion-content">{children}</div> : null}</details>;
}

export function DetailDrawer({ highlight, source, onClose }: { highlight: Highlight | null; source: Source | null; onClose: () => void }) {
  const closeRef = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    if (!highlight) return undefined;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    closeRef.current?.focus();
    const onKey = (event: KeyboardEvent) => { if (event.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => { document.body.style.overflow = previousOverflow; window.removeEventListener("keydown", onKey); };
  }, [highlight, onClose]);
  if (!highlight) return null;
  return <div className="benchmark-drawer-layer" data-testid="highlight-drawer">
    <button type="button" aria-label="关闭详情" className="benchmark-drawer-backdrop" onClick={onClose} />
    <aside role="dialog" aria-modal="true" aria-labelledby="highlight-drawer-title" className="benchmark-drawer-panel">
      <header className="benchmark-drawer-header"><div><p>观点详情</p><span>来自真实素材与现有精华提炼</span></div><button ref={closeRef} type="button" aria-label="关闭观点详情" onClick={onClose} className="benchmark-drawer-close"><X size={19} /></button></header>
      <div className="benchmark-drawer-body">
        <div className="flex flex-wrap items-start justify-between gap-3"><h2 id="highlight-drawer-title" className="min-w-0 flex-1 text-xl font-semibold [overflow-wrap:anywhere]">{highlight.title}</h2><Badge>{qualityLabel[highlight.quality]}</Badge></div>
        <div className="benchmark-drawer-explanation"><Quote size={18} aria-hidden="true" /><p>{highlight.explanation}</p></div>
        <section className="benchmark-drawer-group"><h3>来源视频</h3>{source ? <Link href={`/library/${source.id}`} className="benchmark-drawer-source"><MediaThumb source={source} className="aspect-video h-full w-28 rounded-xl object-cover" /><div className="min-w-0"><p className="line-clamp-3 text-sm font-medium">{source.title}</p><p className="mt-2 text-xs text-[var(--text-secondary)]">{source.hasTranscript ? "有文字稿" : "还没有文字稿"} · {source.hasDistillation ? "已有精华" : "还没有精华"}</p></div></Link> : null}</section>
        <details className="benchmark-evidence-block"><summary>查看依据<ChevronDown size={15} /></summary><p>这条精华来自上方视频。完整原文与对应依据保留在素材详情中。</p></details>
        <div className="benchmark-drawer-actions"><Link href={`/library/${highlight.sourceItemId}`} className="benchmark-drawer-primary">查看完整素材<ExternalLink size={15} /></Link></div>
      </div>
    </aside>
  </div>;
}

function SourcePreviewCard({ source }: { source: Source }) {
  return <Link href={`/library/${source.id}`} className="benchmark-content-card group"><MediaThumb source={source} className="aspect-video w-full object-cover" /><div className="p-3"><h3 className="line-clamp-2 min-h-10 text-sm font-medium">{source.title}</h3><div className="mt-2 flex flex-wrap gap-2 text-xs text-[var(--text-secondary)]"><span>{source.hasTranscript ? "有文字稿" : "还没有文字稿"}</span>{source.hasDistillation ? <span className="text-[var(--success)]">已有精华</span> : null}<span className="ml-auto text-[var(--accent)]">查看素材</span></div></div></Link>;
}

function AccountResearchSummary({ profile }: { profile: BenchmarkCreatorDetailDTO }) {
  if (!profile.accountResearch) return <p className="text-sm text-[var(--text-secondary)]">还没有完成账号层研究。</p>;
  return <div className="grid gap-4 md:grid-cols-2">{profile.accountResearch.groups.map((group) => <section key={group.title}><h3 className="font-medium">{group.title}</h3><div className="mt-2 space-y-2">{group.items.slice(0, 3).map((item) => <article key={`${group.title}-${item.name}`} className="rounded-xl bg-white/50 p-3"><p className="text-sm font-medium">{item.name}</p><p className="mt-1 text-sm leading-6 text-[var(--text-secondary)]">{item.summary}</p>{item.sources.length ? <div className="mt-2 flex flex-wrap gap-2">{item.sources.map((source) => <Link key={source.id} href={`/library/${source.id}`} className="text-xs text-[var(--accent)]">{source.title}</Link>)}</div> : null}</article>)}</div></section>)}</div>;
}

export function BenchmarkCreatorProfile({ profile, onShowContent }: { profile: BenchmarkCreatorDetailDTO; onShowContent: () => void }) {
  const [selected, setSelected] = useState<Highlight | null>(null);
  const selectedSource = selected ? profile.representativeSources.find(({ id }) => id === selected.sourceItemId) ?? null : null;
  const previews = profile.representativeSources.slice(0, 4);
  const highlights = profile.highlights.slice(0, 3);
  return <div data-testid="benchmark-profile-view" role="tabpanel" className="benchmark-profile-stack">
    <section className="benchmark-section benchmark-glass"><PreviewHeading title="代表内容" description="精选这个博主的代表内容，快速了解内容风格和核心主题。" action={profile.representativeSources.length > 4 ? <button type="button" onClick={onShowContent} className="benchmark-text-action">查看全部<ChevronRight size={16} /></button> : null} />{previews.length ? <div className="benchmark-preview-grid">{previews.map((source) => <SourcePreviewCard key={source.id} source={source} />)}</div> : <div className="mt-4"><Empty compact>还没有收录这个博主的代表内容。</Empty></div>}</section>

    <section className="benchmark-section benchmark-glass"><PreviewHeading title="观点与精华" description="基于已研究内容，提炼值得关注的观点与可复用经验。" />{highlights.length ? <div className="benchmark-highlight-grid">{highlights.map((highlight, index) => <button key={`${highlight.sourceItemId}-${highlight.title}-${index}`} type="button" className="benchmark-highlight-card" data-selected={selected === highlight ? "true" : "false"} onClick={() => setSelected(highlight)}><h3>{highlight.title}</h3><p>{highlight.explanation}</p><div className="benchmark-highlight-meta"><span className="line-clamp-1">{highlight.sourceTitle}</span><span className="benchmark-quality">{qualityLabel[highlight.quality]}</span></div></button>)}</div> : <div className="mt-4"><Empty compact>这些内容还没有完成精华提炼。</Empty></div>}</section>

    {profile.copywriting.length ? <section className="benchmark-section benchmark-glass"><PreviewHeading title="视频怎么写" description="只展示已经完成的文案拆解，不自动补齐。" /><div className="mt-3 grid gap-3 md:grid-cols-2">{profile.copywriting.slice(0, 2).map((item) => <article key={item.sourceItemId} className="benchmark-copywriting-card"><FileText size={18} /><div className="min-w-0"><h3>{item.sourceTitle}</h3><p>{item.core}</p><Link href={`/library/${item.sourceItemId}`}>查看文案拆解</Link></div></article>)}</div></section> : null}

    <div className="space-y-3">
      <CollapsibleSection title="账号研究摘要" summary={profile.accountResearch ? `已比较 ${profile.accountResearch.sampleCount} 条代表内容` : "还没有完成账号层研究"}><AccountResearchSummary profile={profile} /></CollapsibleSection>
      <CollapsibleSection title="常见内容模式" summary={profile.playbooks.length ? `已有 ${profile.playbooks.length} 套正式结果` : "暂时还没有形成可靠的内容模式判断"}>{profile.playbooks.length ? <div className="space-y-3">{profile.playbooks.map((playbook) => <article key={playbook.name} className="rounded-xl bg-white/50 p-3"><div className="flex items-start justify-between gap-2"><p className="font-medium">{playbook.name}</p><Badge>{playbook.maturity === "STABLE" ? "比较稳定" : "继续观察"}</Badge></div><p className="mt-2 text-sm leading-6 text-[var(--text-secondary)]">{playbook.flow}</p></article>)}</div> : <p className="text-sm text-[var(--text-secondary)]">没有结果也不影响查看其他资料。</p>}</CollapsibleSection>
      <CollapsibleSection title="我们已经留下了什么" summary={profile.savedMethods.length ? `已保存 ${profile.savedMethods.length} 个方法` : "还没有从这里保存方法"}>{profile.savedMethods.length ? <div className="space-y-2">{profile.savedMethods.slice(0, 3).map((method) => <Link key={method.id} href={`/library/methods/${method.id}`} className="flex min-h-12 items-center justify-between gap-3 rounded-xl bg-white/50 px-3"><span className="font-medium">{method.title}</span><span className="text-sm text-[var(--text-secondary)]">{methodStatus[method.status]}</span></Link>)}</div> : <p className="text-sm text-[var(--text-secondary)]">还没有从这个博主的内容中保存方法。</p>}</CollapsibleSection>
    </div>
    <DetailDrawer highlight={selected} source={selectedSource} onClose={() => setSelected(null)} />
  </div>;
}

export function BenchmarkCreatorContent({ profile }: { profile: BenchmarkCreatorDetailDTO }) {
  return <div data-testid="benchmark-content-view" role="tabpanel" className="benchmark-section benchmark-glass"><PreviewHeading title="这个博主的内容" description={`已收录 ${profile.representativeSources.length} 条内容，继续进入素材详情查看文字稿和研究结果。`} />{profile.representativeSources.length ? <div className="benchmark-content-grid">{profile.representativeSources.map((source) => <SourcePreviewCard key={source.id} source={source} />)}</div> : <div className="mt-5"><Empty>还没有收录这个博主的代表内容。</Empty></div>}</div>;
}
