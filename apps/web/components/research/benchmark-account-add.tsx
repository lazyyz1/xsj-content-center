"use client";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { platformLabel } from "./research-labels";

type FoundAccount = { externalId: string; platform: "DOUYIN" | "XIAOHONGSHU"; name: string; avatarUrl: string | null; bio: string | null; followers: number | null; likes: number | null; originalUrl: string | null; sourceProvider: "REDFOX" };
export function BenchmarkAccountAdd({ canManage }: { canManage: boolean }) {
  const router = useRouter(); const [query, setQuery] = useState(""); const [platform, setPlatform] = useState<"ALL" | "DOUYIN" | "XIAOHONGSHU">("ALL"); const [items, setItems] = useState<FoundAccount[] | null>(null); const [busy, setBusy] = useState(""); const [error, setError] = useState("");
  async function search(event: FormEvent) {
    event.preventDefault(); if (!query.trim()) return;
    setBusy("search"); setError("");
    try {
      const response = await fetch("/api/discovery/search", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ query: query.trim(), platform, sort: "RECOMMENDED", kind: "ACCOUNT" }) });
      const body = await response.json(); if (!response.ok) throw new Error(body.message || "账号查询失败。");
      setItems(body.items);
    } catch (cause) { setError(cause instanceof Error ? cause.message : "账号查询失败。"); }
    finally { setBusy(""); }
  }
  async function add(account: FoundAccount) {
    setBusy(account.externalId); setError("");
    try {
      const response = await fetch("/api/discovery/benchmarks", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ account }) });
      const body = await response.json(); if (!response.ok) throw new Error(body.message || "账号未能添加。");
      router.push(`/research/benchmarks/${body.item.id}`); router.refresh();
    } catch (cause) { setError(cause instanceof Error ? cause.message : "账号未能添加。"); }
    finally { setBusy(""); }
  }
  return canManage ? <details className="research-benchmark-add"><summary>添加对标账号</summary><form onSubmit={event => void search(event)}><label>账号名称或关键词<input type="search" value={query} onChange={event => setQuery(event.target.value)} maxLength={300} placeholder="输入账号名称" /></label><label>平台<select value={platform} onChange={event => setPlatform(event.target.value as typeof platform)}><option value="ALL">抖音与小红书</option><option value="DOUYIN">抖音</option><option value="XIAOHONGSHU">小红书</option></select></label><button type="submit" disabled={!query.trim() || Boolean(busy)}>{busy === "search" ? "正在查询…" : "查询账号"}</button></form><p className="research-caption">点击“查询账号”才请求 RedFox；选定账号后才保存到工作空间。</p>{error ? <p role="alert" className="research-error">{error}</p> : null}{items ? items.length ? <ul className="research-results-list">{items.slice(0, 20).map(item => <li key={`${item.platform}:${item.externalId}`}><div className="research-account-add-row"><span><strong>{item.name}</strong><small>{platformLabel[item.platform]} · 粉丝 {item.followers ?? "缺失"}</small></span><button type="button" disabled={Boolean(busy)} onClick={() => void add(item)}>{busy === item.externalId ? "正在添加…" : "添加账号"}</button></div></li>)}</ul> : <p className="research-center-empty-inline">未找到账号，可调整关键词或平台重试。</p> : null}</details> : <p className="research-caption">账号由工作空间管理员添加。</p>;
}
