/* finesse · register=product · shell=glass-tabs+detail-drawer · palette=cool-blue-grey · density=6 */
"use client";

import { Badge, Card } from "@content-center/ui";
import { ChevronDown, ChevronRight, FileText, Video, X } from "lucide-react";
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
  if (!source.coverUrl || failed) return <div aria-hidden="true" className={`benchmark-media-fallback ${className}`}><Video size={20} /></div>;
  return <img src={source.coverUrl} alt="" className={className} onError={() => setFailed(true)} />;
}

export function WorkspaceTabs({ value, onChange }: { value: BenchmarkView; onChange: (value: BenchmarkView) => void }) {
  const items: Array<[BenchmarkView, string]> = [["PROFILE", "画像"], ["CONTENT", "内容"], ["RESEARCH", "研究"]];
  return <div className="benchmark-tabs" role="tablist" aria-label="博主详情视图">{items.map(([id, label]) => <button key={id} type="button" role="tab" aria-selected={value === id} className="benchmark-tab" onClick={() => onChange(id)}>{label}</button>)}</div>;
}

export function BenchmarkCreatorHeader({ profile }: { profile: BenchmarkCreatorDetailDTO }) {
  const [avatarFailed, setAvatarFailed] = useState(false);
  const stats = [
    ["已发现内容", profile.stats.discovered], ["已收录", profile.stats.collected], ["已研究", profile.stats.studied], ["已有精华", profile.stats.distilled], ["文案分析", profile.stats.copywriting],
  ] as const;
  return <Card className="benchmark-glass overflow-hidden border-0">
    <div className="p-5 sm:p-6">
      <div className="flex min-w-0 items-start gap-4">
        {profile.account.avatarUrl && !avatarFailed ? <img src={profile.account.avatarUrl} alt={`${profile.account.name}头像`} className="h-16 w-16 shrink-0 rounded-full object-cover ring-4 ring-white/60 sm:h-20 sm:w-20" onError={() => setAvatarFailed(true)} /> : <div aria-hidden="true" className="grid h-16 w-16 shrink-0 place-items-center rounded-full bg-[var(--benchmark-accent-soft)] text-xl font-semibold text-[var(--accent)] sm:h-20 sm:w-20">{profile.account.name.slice(0, 1)}</div>}
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2"><h1 className="min-w-0 text-2xl font-semibold tracking-[-0.02em] [overflow-wrap:anywhere] sm:text-3xl">{profile.account.name}</h1><Badge>{platformLabel[profile.account.platform] ?? profile.account.platform}</Badge></div>
          {profile.account.bio ? <p className="mt-2 max-w-3xl text-sm leading-6 text-[var(--text-secondary)]">{profile.account.bio}</p> : null}
          {profile.account.tags.length ? <div className="mt-3 flex flex-wrap gap-2">{profile.account.tags.map((tag) => <span key={tag} className="benchmark-tag">{tag}</span>)}</div> : null}
        </div>
      </div>
    </div>
    <div className="grid grid-cols-2 border-t border-white/60 bg-white/35 sm:grid-cols-5">{stats.map(([label, number]) => <div key={label} className="min-w-0 border-b border-r border-white/60 p-4 last:border-r-0 sm:border-b-0"><p className="text-xl font-semibold tabular-nums">{number}</p><p className="mt-1 text-xs text-[var(--text-secondary)]">{label}</p></div>)}</div>
  </Card>;
}

function PreviewHeading({ title, description, action }: { title: string; description: string; action?: ReactNode }) {
  return <div className="flex flex-wrap items-end justify-between gap-3"><div><h2 className="text-lg font-semibold">{title}</h2><p className="mt-1 text-sm leading-6 text-[var(--text-secondary)]">{description}</p></div>{action}</div>;
}

export function CollapsibleSection({ title, summary, children }: { title: string; summary: string; children?: ReactNode }) {
  return <details className="benchmark-glass group rounded-2xl border-0"><summary className="flex min-h-14 cursor-pointer list-none items-center justify-between gap-4 px-4 py-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]"><div className="min-w-0"><span className="font-medium">{title}</span><span className="ml-3 text-sm text-[var(--text-secondary)]">{summary}</span></div><ChevronDown size={17} className="shrink-0 text-[var(--text-secondary)] transition-transform group-open:rotate-180" /></summary>{children ? <div className="border-t border-white/60 px-4 py-4">{children}</div> : null}</details>;
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
      <header className="flex items-center justify-between border-b border-white/60 px-5 py-4"><p className="font-medium">观点详情</p><button ref={closeRef} type="button" aria-label="关闭观点详情" onClick={onClose} className="grid h-11 w-11 place-items-center rounded-full text-[var(--text-secondary)] hover:bg-white/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]"><X size={20} /></button></header>
      <div className="overflow-y-auto p-5 sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-3"><h2 id="highlight-drawer-title" className="min-w-0 flex-1 text-xl font-semibold [overflow-wrap:anywhere]">{highlight.title}</h2><Badge>{qualityLabel[highlight.quality]}</Badge></div>
        <p className="mt-4 text-sm leading-7 text-[var(--text-secondary)]">{highlight.explanation}</p>
        <section className="mt-7"><h3 className="font-medium">来源视频</h3>{source ? <Link href={`/library/${source.id}`} className="mt-3 grid min-h-24 grid-cols-[6rem_minmax(0,1fr)] gap-3 rounded-2xl bg-white/55 p-3 hover:bg-white/75 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]"><MediaThumb source={source} className="aspect-video h-full w-24 rounded-xl object-cover" /><div className="min-w-0"><p className="line-clamp-3 text-sm font-medium">{source.title}</p><p className="mt-2 text-xs text-[var(--text-secondary)]">{source.hasTranscript ? "有文字稿" : "还没有文字稿"} · {source.hasDistillation ? "已有精华" : "还没有精华"}</p></div></Link> : null}</section>
        <details className="mt-6 rounded-2xl bg-white/45 p-4"><summary className="cursor-pointer text-sm font-medium text-[var(--accent)]">查看依据</summary><p className="mt-3 text-sm leading-6 text-[var(--text-secondary)]">这条精华来自上方视频。完整原文与对应依据保留在素材详情中。</p></details>
        <Link href={`/library/${highlight.sourceItemId}`} className="mt-6 inline-flex min-h-11 items-center gap-1 text-sm font-medium text-[var(--accent)]">查看完整素材<ChevronRight size={16} /></Link>
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
  const highlights = profile.highlights.slice(0, 4);
  return <div data-testid="benchmark-profile-view" role="tabpanel" className="space-y-5">
    <section className="benchmark-glass rounded-2xl p-4 sm:p-5"><PreviewHeading title="代表内容" description="先看最有代表性的几条，完整列表放在内容页。" action={profile.representativeSources.length > 4 ? <button type="button" onClick={onShowContent} className="benchmark-text-action">查看全部<ChevronRight size={16} /></button> : null} />{previews.length ? <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">{previews.map((source) => <SourcePreviewCard key={source.id} source={source} />)}</div> : <div className="mt-4"><Empty compact>还没有收录这个博主的代表内容。</Empty></div>}</section>

    <section className="benchmark-glass rounded-2xl p-4 sm:p-5"><PreviewHeading title="观点与精华" description="按原视频呈现已经完成的单条精华，点击查看来源详情。" />{highlights.length ? <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">{highlights.map((highlight, index) => <button key={`${highlight.sourceItemId}-${highlight.title}-${index}`} type="button" className="benchmark-highlight-card" onClick={() => setSelected(highlight)}><div className="flex items-start justify-between gap-2"><h3 className="line-clamp-2 text-left text-sm font-medium">{highlight.title}</h3><span className="benchmark-quality">{qualityLabel[highlight.quality]}</span></div><p className="mt-2 line-clamp-3 text-left text-sm leading-6 text-[var(--text-secondary)]">{highlight.explanation}</p><p className="mt-3 line-clamp-1 text-left text-xs text-[var(--text-secondary)]">{highlight.sourceTitle}</p></button>)}</div> : <div className="mt-4"><Empty compact>这些内容还没有完成精华提炼。</Empty></div>}</section>

    <section className="benchmark-glass rounded-2xl p-4 sm:p-5"><PreviewHeading title="视频怎么写" description="只展示已经完成的文案拆解，不自动补齐。" />{profile.copywriting.length ? <div className="mt-4 grid gap-3 md:grid-cols-2">{profile.copywriting.slice(0, 2).map((item) => <article key={item.sourceItemId} className="rounded-2xl bg-white/50 p-4"><div className="flex items-start gap-3"><FileText size={18} className="mt-0.5 shrink-0 text-[var(--accent)]" /><div className="min-w-0"><h3 className="line-clamp-2 font-medium">{item.sourceTitle}</h3><p className="mt-2 line-clamp-2 text-sm leading-6 text-[var(--text-secondary)]">{item.core}</p><Link href={`/library/${item.sourceItemId}`} className="mt-2 inline-flex min-h-11 items-center text-sm text-[var(--accent)]">查看文案拆解</Link></div></div></article>)}</div> : <div className="mt-4"><Empty compact>这些代表内容还没有文案深挖结果。</Empty></div>}</section>

    <div className="space-y-3">
      <CollapsibleSection title="账号研究摘要" summary={profile.accountResearch ? `已比较 ${profile.accountResearch.sampleCount} 条代表内容` : "还没有完成账号层研究"}><AccountResearchSummary profile={profile} /></CollapsibleSection>
      <CollapsibleSection title="常见内容模式" summary={profile.playbooks.length ? `已有 ${profile.playbooks.length} 套正式结果` : "暂时还没有形成可靠的内容模式判断"}>{profile.playbooks.length ? <div className="space-y-3">{profile.playbooks.map((playbook) => <article key={playbook.name} className="rounded-xl bg-white/50 p-3"><div className="flex items-start justify-between gap-2"><p className="font-medium">{playbook.name}</p><Badge>{playbook.maturity === "STABLE" ? "比较稳定" : "继续观察"}</Badge></div><p className="mt-2 text-sm leading-6 text-[var(--text-secondary)]">{playbook.flow}</p></article>)}</div> : <p className="text-sm text-[var(--text-secondary)]">没有结果也不影响查看其他资料。</p>}</CollapsibleSection>
      <CollapsibleSection title="我们已经留下了什么" summary={profile.savedMethods.length ? `已保存 ${profile.savedMethods.length} 个方法` : "还没有从这里保存方法"}>{profile.savedMethods.length ? <div className="space-y-2">{profile.savedMethods.slice(0, 3).map((method) => <Link key={method.id} href={`/library/methods/${method.id}`} className="flex min-h-12 items-center justify-between gap-3 rounded-xl bg-white/50 px-3"><span className="font-medium">{method.title}</span><span className="text-sm text-[var(--text-secondary)]">{methodStatus[method.status]}</span></Link>)}</div> : <p className="text-sm text-[var(--text-secondary)]">还没有从这个博主的内容中保存方法。</p>}</CollapsibleSection>
    </div>
    <DetailDrawer highlight={selected} source={selectedSource} onClose={() => setSelected(null)} />
  </div>;
}

export function BenchmarkCreatorContent({ profile }: { profile: BenchmarkCreatorDetailDTO }) {
  return <div data-testid="benchmark-content-view" role="tabpanel" className="benchmark-glass rounded-3xl p-4 sm:p-5"><PreviewHeading title="这个博主的内容" description={`已收录 ${profile.representativeSources.length} 条内容，继续进入素材详情查看文字稿和研究结果。`} />{profile.representativeSources.length ? <div className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">{profile.representativeSources.map((source) => <SourcePreviewCard key={source.id} source={source} />)}</div> : <div className="mt-5"><Empty>还没有收录这个博主的代表内容。</Empty></div>}</div>;
}
