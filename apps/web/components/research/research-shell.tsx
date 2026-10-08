"use client";
import Link from "next/link";
import { useParams, usePathname, useSearchParams } from "next/navigation";
import { ArrowUpRight, BookOpen, Compass, MessageSquare, MoreHorizontal, Newspaper, X } from "lucide-react";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { ResearchObjectAssistant } from "./research-object-assistant";
import type { ResearchObject } from "@/lib/contracts/research-object";
import { PersonalContentStart } from "../content/personal-content-start";

const sections = [
  { href: "/research", label: "日报", icon: Newspaper, active: (path: string) => path === "/research" },
  { href: "/research/benchmarks", label: "对标与作品", icon: Compass, active: (path: string) => path.startsWith("/research/benchmarks") || path === "/research/works" },
  { href: "/research/results", label: "拆解报告", icon: BookOpen, active: (path: string) => path.startsWith("/research/results") || path.startsWith("/research/session/") },
];
export function ResearchShell({ children, sessions, canWrite = false }: { children: ReactNode; sessions: Array<{ id: string; title: string }>; canWrite?: boolean }) {
  const path = usePathname();
  const params = useParams(), search = useSearchParams();
  const [topicKey,setTopicKey] = useState("00000000-0000-4000-a000-000000000001"), [focused,setFocused] = useState<ResearchObject|null>(null);
  const selectionKey=path==="/research/results"?search.toString():"";
  useEffect(()=>{setTopicKey(crypto.randomUUID());setFocused(null);},[path,selectionKey]);
  const [open, setOpen] = useState(false);
  const [desktopAssistant, setDesktopAssistant] = useState(false);
  const drawer = useRef<HTMLDialogElement>(null), trigger = useRef<HTMLButtonElement>(null), assistantOpener = useRef<HTMLElement|null>(null), extras = useRef<HTMLDetailsElement>(null);
  useEffect(()=>{const focus=(event:Event)=>{const value=(event as CustomEvent<{object:ResearchObject;open?:boolean}>).detail;if(value?.object){setFocused(value.object);if(value.open)setOpen(true);}};window.addEventListener("research:focus-object",focus);return()=>window.removeEventListener("research:focus-object",focus);},[]);
  useEffect(()=>{const show=(event:Event)=>{const opener=(event as CustomEvent<{trigger?:HTMLElement}>).detail?.trigger;assistantOpener.current=opener instanceof HTMLElement?opener:trigger.current;setOpen(true);};window.addEventListener("research:open-assistant",show);return()=>window.removeEventListener("research:open-assistant",show);},[]);
  const id = typeof params.id === "string" ? params.id : "", workId = typeof params.workId === "string" ? params.workId : "";
  const object:ResearchObject = focused || (workId ? {kind:"WORK",id:workId,...(search.get("report")?{reportId:search.get("report")!}:{})} : id && path.startsWith("/research/benchmarks/") ? {kind:"ACCOUNT",id} : id && path.startsWith("/research/sources/") ? {kind:"MATERIAL",id} : typeof params.stableKey === "string" ? {kind:"TREND",id:params.stableKey} : {kind:"TOPIC",key:topicKey});
  const reportPage=path==="/research/results"&&(!search.get("library")||search.get("library")==="reports");
  const reportReady=!reportPage||(!search.get("empty")&&object.kind==="WORK"&&Boolean(object.reportId)&&(!search.get("report")||object.reportId===search.get("report")));
  useEffect(() => { extras.current?.removeAttribute("open"); }, [path, open]);
  useEffect(() => {
    const media = window.matchMedia("(min-width: 1100px)");
    const sync = () => {
      setDesktopAssistant(media.matches);
      const dialog = drawer.current;
      if (!dialog) return;
      if (dialog.open) dialog.close();
      if (open) { if (media.matches) dialog.show(); else dialog.showModal(); }
    };
    sync();
    media.addEventListener("change", sync);
    return () => media.removeEventListener("change", sync);
  }, [open]);
  useEffect(() => {
    if (!open || !desktopAssistant) return;
    const escape = (event: KeyboardEvent) => { if (event.key === "Escape") { setOpen(false); (assistantOpener.current??trigger.current)?.focus(); } };
    window.addEventListener("keydown", escape);
    return () => window.removeEventListener("keydown", escape);
  }, [open, desktopAssistant]);
  function close() { setOpen(false); requestAnimationFrame(() => (assistantOpener.current??trigger.current)?.focus()); }
  return <div className={`research-center research-workspace${path.startsWith("/research/benchmarks/") ? " is-dossier" : ""}${open && desktopAssistant ? " is-assistant-open" : ""}`} data-testid="research-center">
    <header className="research-desk-bar">
      <Link className="research-desk-brand" href="/research"><span aria-hidden="true"><Compass size={19} /></span><strong>研究</strong></Link>
      <nav aria-label="研究中心导航">{sections.map(({ href, label, icon: Icon, active }) => <Link key={href} href={href} aria-current={active(path) ? "page" : undefined}><Icon size={16} /><span>{label}</span></Link>)}</nav>
      <div className="research-desk-tools">
        <details className="research-desk-more" ref={extras}><summary aria-label="更多研究入口"><MoreHorizontal size={19} /></summary><nav aria-label="其他研究能力"><Link href="/research/sources">已保存来源</Link><Link href="/research/trends">趋势观察</Link><Link href="/research/focus">跨账号比较</Link><Link href="/research/new">自定义研究</Link><Link href="/research/works?view=favorites&days=all">收藏的作品</Link><Link href="/content">我的稿件 <ArrowUpRight size={14} /></Link><PersonalContentStart canWrite={canWrite}/></nav></details>
        <button type="button" className="research-assistant-trigger" ref={trigger} aria-label="研究助手" aria-haspopup="dialog" aria-expanded={open} onClick={() => {assistantOpener.current=trigger.current;setOpen(true);}}><MessageSquare size={16} /><span>研究助手</span></button>
      </div>
    </header>
    <div className="research-main-pane">{children}</div>
    <dialog ref={drawer} className="research-assistant-drawer" aria-labelledby="research-assistant-title" aria-modal={open && !desktopAssistant ? true : undefined} onCancel={event => { event.preventDefault(); close(); }} onClick={event => { if (!desktopAssistant && event.target === event.currentTarget) close(); }}>
      <header><div><span>RESEARCH DESK</span><h2 id="research-assistant-title">研究助手</h2></div><button type="button" onClick={close} aria-label="收起研究助手"><X size={20} /></button></header>
      <ResearchObjectAssistant object={object} canWrite={canWrite} active={open&&reportReady}/>
      <section className="research-assistant-history"><h3>继续上次研究</h3>{sessions.length ? sessions.slice(0, 8).map(session => <Link key={session.id} href={`/research/session/${session.id}`} onClick={close}><span>{session.title}</span><ArrowUpRight size={14} /></Link>) : <p>开始一次研究后，会话会保存在这里。</p>}<Link href="/research/results?library=history" onClick={close}>查看全部研究历史 →</Link></section>
    </dialog>
  </div>;
}
