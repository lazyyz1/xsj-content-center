"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { BookOpen, Compass, FolderSearch, Plus, TrendingUp } from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";
const links = [{ href: "/research", label: "研究首页", icon: Compass }, { href: "/research/trends", label: "趋势", icon: TrendingUp }, { href: "/research/benchmarks", label: "对标账号", icon: FolderSearch }, { href: "/research/results", label: "研究成果", icon: BookOpen }];
export function ResearchShell({ children, sessions }: { children: ReactNode; sessions: Array<{ id: string; title: string }> }) {
  const path = usePathname();
  const [recent, setRecent] = useState(sessions);
  useEffect(() => { setRecent(sessions); }, [sessions]);
  useEffect(() => {
    const controller = new AbortController();
    void fetch("/api/research/sessions", { signal: controller.signal }).then(async response => { if (response.ok) { const value = await response.json(); setRecent(value.items); } }).catch(() => undefined);
    return () => controller.abort();
  }, [path]);
  return <div className="research-center" data-testid="research-center"><aside className="research-navigation"><Link className="research-brand" href="/research">研究中心<span>RESEARCH</span></Link><Link href="/research" className="research-new"><Plus size={16} />开始研究</Link><nav aria-label="研究中心导航">{links.map(({ href, label, icon: Icon }) => <Link key={href} href={href} aria-current={(href === "/research" ? path === href : path.startsWith(href)) ? "page" : undefined}><Icon size={16} />{label}</Link>)}</nav><details className="research-session-nav" open><summary>最近研究</summary><nav aria-label="最近研究会话">{recent.map(session => <Link title={session.title} key={session.id} href={`/research/session/${session.id}`} aria-current={path === `/research/session/${session.id}` ? "page" : undefined}>{session.title}</Link>)}{!recent.length ? <p>开始第一次研究后，会话会保存在这里。</p> : null}</nav></details></aside><div className="research-main-pane">{children}</div></div>;
}
