// @vitest-environment jsdom
import React, { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
const { router, fetcher } = vi.hoisted(() => ({ router: { push: vi.fn(), refresh: vi.fn() }, fetcher: vi.fn() }));
vi.mock("next/navigation", () => ({ useRouter: () => router, usePathname: () => "/research/benchmarks", useParams: () => ({}), useSearchParams: () => new URLSearchParams() }));
vi.mock("../components/research/research-composer", () => ({ ResearchComposer: () => <form aria-label="研究测试助手" /> }));
vi.mock("../components/research/research-object-assistant", () => ({ ResearchObjectAssistant: () => <form aria-label="对象研究测试助手" /> }));
import { BenchmarkWorkList, type ResearchWorkRow } from "../components/research/benchmark-work-list";
import { ResearchShell } from "../components/research/research-shell";
import { WorkOriginalMedia } from "../components/research/work-research-controls";
let root: Root, host: HTMLDivElement;
beforeEach(() => {
  host = document.createElement("div"); document.body.append(host); root = createRoot(host);
  (globalThis as Record<string, unknown>).IS_REACT_ACT_ENVIRONMENT = true;
  vi.stubGlobal("fetch", fetcher); fetcher.mockClear(); router.push.mockClear();
  HTMLDialogElement.prototype.showModal = function () { this.open = true; };
  HTMLDialogElement.prototype.show = function () { this.open = true; };
  HTMLDialogElement.prototype.close = function () { this.open = false; };
  vi.stubGlobal("matchMedia", () => ({matches:true,addEventListener:vi.fn(),removeEventListener:vi.fn()}));
});
afterEach(async () => { await act(async () => root.unmount()); host.remove(); vi.unstubAllGlobals(); });
const works: ResearchWorkRow[] = [
 { id: "old", accountId: "account", accountName: "老师", platform: "DOUYIN", title: "历史演示作品", publishedAt: "2026-01-01T00:00:00Z", multiple: 3, durationMs: null, counts: { likes: 120, favorites: null, comments: 2, shares: null } },
 { id: "new", accountId: "account", accountName: "老师", platform: "DOUYIN", title: "最新表达作品", publishedAt: "2026-10-01T00:00:00Z", multiple: null, durationMs: null, counts: { likes: 15, favorites: 3, comments: null, shares: 1 } },
];
const statuses = [{ id: "old", readable: true, reportId: null, read: false }, { id: "new", readable: true, reportId: "report", read: true }];
it("keeps historical works visible, preserves null metrics and the return location", async () => {
 await act(async () => root.render(<BenchmarkWorkList works={works} statuses={statuses} returnTo="/research/benchmarks?period=all#works" />));
 expect(host.querySelectorAll(".research-work-item")).toHaveLength(2);
 expect(host.querySelector('[aria-label="藏 —"]')?.textContent).toContain("—");
 expect(host.querySelector<HTMLAnchorElement>(".research-work-open")?.href).toContain(encodeURIComponent("/research/benchmarks?period=all#work-old"));
 expect(fetcher).not.toHaveBeenCalled();
});

it("paginates 26 works, separates hashtags and retains the page in return links",async()=>{
 const rows=Array.from({length:26},(_,index)=>({...works[0]!,id:"paged-"+index,title:"教学方法 "+index+" #教学 #案例",multiple:index+1}));
 await act(async()=>root.render(<BenchmarkWorkList works={rows} statuses={rows.map(row=>({id:row.id,readable:true,reportId:null,read:false}))} returnTo="/research/benchmarks#works"/>));
 expect(host.querySelectorAll(".research-work-item")).toHaveLength(25);expect(host.querySelector("h3")?.textContent).not.toContain("#");
 host.querySelector<HTMLElement>("#works")!.scrollIntoView=vi.fn();
 await act(async()=>[...host.querySelectorAll("button")].find(button=>button.textContent==="下一页")!.click());
 expect(host.querySelectorAll(".research-work-item")).toHaveLength(1);expect(host.querySelector<HTMLAnchorElement>(".research-work-open")!.href).toContain("page%3D2");
 expect(fetcher).not.toHaveBeenCalled();
});
it("filters completed reports and clears a local empty result without external requests", async () => {
 await act(async () => root.render(<BenchmarkWorkList works={works} statuses={statuses} returnTo="/research/benchmarks#works" />));
 const select = host.querySelector<HTMLSelectElement>('[aria-label="作品就绪状态"]')!;
 await act(async () => { select.value = "report"; select.dispatchEvent(new Event("change", { bubbles: true })); });
 expect(host.querySelectorAll(".research-work-item")).toHaveLength(1);
 expect(host.textContent).toContain("最新表达作品");
 await act(async () => root.render(<BenchmarkWorkList works={works} statuses={statuses.slice(0, 1)} returnTo="/research/benchmarks#works" />));
 expect(host.textContent).toContain("没有符合筛选的作品");
 await act(async () => host.querySelector<HTMLButtonElement>(".research-library-empty button")!.click());
 expect(host.querySelectorAll(".research-work-item")).toHaveLength(2);
 expect(fetcher).not.toHaveBeenCalled();
});
it("maps legacy unread links to the reading view instead of a duplicate readiness filter", async () => {
 await act(async () => root.render(<BenchmarkWorkList works={works} statuses={statuses} returnTo="/research/benchmarks" initialFilter="unread" />));
 expect(host.querySelectorAll(".research-work-item")).toHaveLength(1);
 expect(host.querySelector('[aria-label="作品阅读状态"] [aria-current="page"]')?.textContent).toBe("未读");
 expect(host.querySelector<HTMLSelectElement>('[aria-label="作品就绪状态"]')!.value).toBe("all");
 expect(host.querySelector('[aria-label="作品就绪状态"] option[value="unread"]')).toBeNull();
});
it("makes the page primary and the assistant an explicit closable drawer", async () => {
 await act(async () => root.render(<ResearchShell canWrite sessions={[]}><h1>真实作品列表</h1></ResearchShell>));
 expect(host.querySelectorAll('[aria-label="研究中心导航"] a')).toHaveLength(3);
 expect(host.querySelector<HTMLDialogElement>("dialog")!.open).toBe(false);
 await act(async () => host.querySelector<HTMLButtonElement>(".research-assistant-trigger")!.click());
 expect(host.querySelector<HTMLDialogElement>("dialog")!.open).toBe(true);
 expect(host.querySelector("dialog")!.getAttribute("aria-modal")).toBeNull();
 expect(host.querySelector(".research-workspace")!.classList.contains("is-assistant-open")).toBe(true);
 expect(host.textContent).toContain("真实作品列表");
 await act(async () => host.querySelector<HTMLButtonElement>('[aria-label="收起研究助手"]')!.click());
 expect(host.querySelector<HTMLDialogElement>("dialog")!.open).toBe(false);
 expect(fetcher).not.toHaveBeenCalled();
});
it("opens the matching original video on a timestamp and waits for metadata before seeking", async () => {
 await act(async () => root.render(<details><summary>原视频</summary><WorkOriginalMedia accountId="account" workId="work" sourceItemId="source" originalUrl={null}/></details>));
 const video=host.querySelector("video")!,disclosure=host.querySelector("details")!;
 video.scrollIntoView=vi.fn();
 await act(async () => window.dispatchEvent(new CustomEvent("research:seek-work",{detail:{accountId:"other",workId:"work",startMs:20000}})));
 expect(disclosure.open).toBe(false);
 await act(async () => window.dispatchEvent(new CustomEvent("research:seek-work",{detail:{accountId:"account",workId:"work",startMs:20000}})));
 expect(disclosure.open).toBe(true); expect(video.currentTime).toBe(0);
 Object.defineProperty(video,"duration",{value:10,configurable:true});
 await act(async () => video.dispatchEvent(new Event("loadedmetadata")));
 expect(video.currentTime).toBe(10); expect(video.paused).toBe(true);
});

it("returns keyboard focus to the report's visible assistant opener",async()=>{
 vi.stubGlobal("requestAnimationFrame",(callback:FrameRequestCallback)=>{callback(0);return 1;});
 await act(async()=>root.render(<ResearchShell canWrite sessions={[]}><button type="button" className="report-assistant-opener" onClick={event=>window.dispatchEvent(new CustomEvent("research:open-assistant",{detail:{trigger:event.currentTarget}}))}>报告里的研究助手</button></ResearchShell>));
 const opener=host.querySelector<HTMLButtonElement>(".report-assistant-opener")!;
 await act(async()=>opener.click());
 expect(host.querySelector<HTMLDialogElement>("dialog")!.open).toBe(true);
 await act(async()=>host.querySelector<HTMLButtonElement>('[aria-label="收起研究助手"]')!.click());
 expect(host.querySelector<HTMLDialogElement>("dialog")!.open).toBe(false);
 expect(document.activeElement).toBe(opener);
 expect(fetcher).not.toHaveBeenCalled();
});
