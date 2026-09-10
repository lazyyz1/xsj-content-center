"use client";

import { BookOpenCheck, FolderKanban, Search, UserRoundSearch, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

export function GlobalSearch() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [scope, setScope] = useState<"PROJECTS" | "LIBRARY">("PROJECTS");
  useEffect(() => {
    const openSearch = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") { event.preventDefault(); setOpen(true); }
      if (event.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", openSearch);
    return () => window.removeEventListener("keydown", openSearch);
  }, []);
  function submit(event: React.FormEvent) {
    event.preventDefault();
    const value = query.trim();
    router.push(`${scope === "PROJECTS" ? "/projects" : "/library"}${value ? `?search=${encodeURIComponent(value)}` : ""}`);
    setOpen(false);
  }
  return <>
    <button type="button" className="global-search-trigger" onClick={() => setOpen(true)}><Search size={18} /><span>搜索项目、资料、博主或方法</span><kbd>⌘ K</kbd></button>
    {open ? <div className="global-search-layer" role="presentation"><button type="button" aria-label="关闭搜索" onClick={() => setOpen(false)} /><section role="dialog" aria-modal="true" aria-label="全局搜索" className="global-search-panel"><header><div><h2>搜索已有内容</h2><p>不会触发联网搜索或创建新内容。</p></div><button type="button" aria-label="关闭" onClick={() => setOpen(false)}><X size={19} /></button></header><form onSubmit={submit}><label><Search size={19} /><input autoFocus value={query} onChange={(event) => setQuery(event.target.value)} placeholder={scope === "PROJECTS" ? "搜索项目名称、目标或受众" : "搜索资料标题、作者或正文"} /></label><div className="global-search-scopes"><button type="button" aria-pressed={scope === "PROJECTS"} onClick={() => setScope("PROJECTS")}><FolderKanban size={17} />项目</button><button type="button" aria-pressed={scope === "LIBRARY"} onClick={() => setScope("LIBRARY")}><BookOpenCheck size={17} />资料</button><button type="button" disabled><UserRoundSearch size={17} />博主 · 即将支持</button><button type="button" disabled><BookOpenCheck size={17} />方法 · 即将支持</button></div><button className="global-search-submit">搜索{scope === "PROJECTS" ? "项目" : "资料"}</button></form></section></div> : null}
  </>;
}
