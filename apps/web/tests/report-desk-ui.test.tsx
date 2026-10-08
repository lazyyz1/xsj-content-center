// @vitest-environment jsdom
import React,{act} from "react";
import {createRoot,type Root} from "react-dom/client";
import {afterEach,beforeEach,expect,it,vi} from "vitest";
const {router,fetcher}=vi.hoisted(()=>({router:{push:vi.fn(),replace:vi.fn(),refresh:vi.fn()},fetcher:vi.fn()}));
vi.mock("next/navigation",()=>({useRouter:()=>router}));
import {ReportDesk} from "../components/research/report-desk";
import {reportDeskProps} from "./report-desk-fixture";
import {sampleAnswer} from "./work-research-fixture";
import {WorkResearchControls} from "../components/research/work-research-controls";
let host:HTMLDivElement,root:Root;
beforeEach(()=>{host=document.createElement("div");document.body.append(host);root=createRoot(host);(globalThis as Record<string,unknown>).IS_REACT_ACT_ENVIRONMENT=true;vi.stubGlobal("fetch",fetcher);fetcher.mockReset();Object.values(router).forEach(fn=>fn.mockClear());HTMLDialogElement.prototype.showModal=function(){this.open=true;};HTMLDialogElement.prototype.close=function(){this.open=false;};vi.stubGlobal("matchMedia",()=>({matches:true,addEventListener:vi.fn(),removeEventListener:vi.fn()}));vi.stubGlobal("requestAnimationFrame",(callback:FrameRequestCallback)=>{callback(0);return 1;});vi.stubGlobal("cancelAnimationFrame",vi.fn());});
afterEach(async()=>{await act(async()=>root.unmount());host.remove();vi.useRealTimers();vi.unstubAllGlobals();vi.restoreAllMocks();});

it("shows the report and its selection on one page with separate reading regions",async()=>{
 const data=reportDeskProps();data.view.latest!.answer.structureBlocks.forEach(block=>{block.startMs=null;block.endMs=null;});
 await act(async()=>root.render(<ReportDesk {...data}/>));
 expect(host.querySelectorAll(".rd-pane-scroll")).toHaveLength(2);expect(host.querySelectorAll(".rd-metrics>div")).toHaveLength(6);
 expect(host.querySelector(".rd-library [aria-current=page]")?.getAttribute("href")).toBe("/research/results?report=report-current");
 expect(host.querySelectorAll("[role=tab]")).toHaveLength(0);expect(host.querySelector(".rd-mainline")?.textContent).toContain("先指出用户问题，再演示操作");
 expect(host.querySelector(".rd-sequence.is-timed")).toBeNull();expect(host.querySelector(".rd-axis")?.textContent).toContain("不代表时长");expect(host.querySelector(".rd-analysis h3")?.textContent).toBe("为什么有效");expect(fetcher).not.toHaveBeenCalled();
});
it("opens and closes supplementary content without resetting either reading position",async()=>{
 await act(async()=>root.render(<ReportDesk {...reportDeskProps()}/>));
 const left=host.querySelector<HTMLDivElement>('[aria-label="主线结构滚动区域"]')!,right=host.querySelector<HTMLDivElement>('[aria-label="分析滚动区域"]')!;
 left.scrollTop=120;right.scrollTop=210;
 const button=[...host.querySelectorAll<HTMLButtonElement>("button")].find(node=>node.textContent==="原文与视频")!;
 await act(async()=>button.click());expect(host.querySelector<HTMLDialogElement>(".rd-modal")!.open).toBe(true);expect(host.querySelector(".rd-modal-body")?.textContent).toContain("完整原文与视频");
 await act(async()=>host.querySelector<HTMLButtonElement>(".rd-modal>header button")!.click());expect(left.scrollTop).toBe(120);expect(right.scrollTop).toBe(210);expect(document.activeElement).toBe(button);expect(fetcher).not.toHaveBeenCalled();
});
it("selects historical versions on the report route and archives once before selecting the next report",async()=>{
 await act(async()=>root.render(<ReportDesk {...reportDeskProps()}/>));
 const select=host.querySelector<HTMLSelectElement>('[aria-label="报告版本"]')!;
 await act(async()=>{select.value="report-old";select.dispatchEvent(new Event("change",{bubbles:true}));});expect(router.push).toHaveBeenCalledWith("/research/results?report=report-old",{scroll:false});
 fetcher.mockResolvedValue({ok:true,json:async()=>({followed:true})});
 const button=[...host.querySelectorAll<HTMLButtonElement>("button")].find(node=>node.textContent==="看完归档")!;
 await act(async()=>{button.click();button.click();});expect(fetcher).toHaveBeenCalledOnce();expect(JSON.parse(fetcher.mock.calls[0]![1].body)).toEqual({kind:"REPORT_ARCHIVED",key:"report-current",action:"FOLLOW"});expect(router.replace).toHaveBeenCalledWith("/research/results?report=report-next",{scroll:false});
});
it("keeps a selected report visible outside the filtered list and exposes invalid reports without substituting a result",async()=>{
 const data=reportDeskProps();data.library.items=[];data.library.count=0;
 await act(async()=>root.render(<ReportDesk {...data}/>));expect(host.querySelector(".rd-pinned")?.textContent).toContain("列表范围外");expect(host.querySelector(".rd-selected")).not.toBeNull();
 await act(async()=>root.render(<ReportDesk {...data} view={null} error="报告不存在或不可访问。"/>));expect(host.querySelector(".rd-selected")).toBeNull();expect(host.querySelector('[role="alert"]')?.textContent).toContain("报告不存在或不可访问");
});
it("opens the original before requesting the selected timestamp and binds the displayed report",async()=>{
 const data=reportDeskProps();data.view.current.mediaAssetId="media";
 const focus=vi.fn(),seek=vi.fn();window.addEventListener("research:focus-object",focus);window.addEventListener("research:seek-work",seek);
 try{
  await act(async()=>root.render(<ReportDesk {...data}/>));expect((focus.mock.calls[0]![0] as CustomEvent).detail.object).toEqual({kind:"WORK",id:"work",reportId:"report-current"});
  await act(async()=>host.querySelector<HTMLButtonElement>(".rd-position button")!.click());
  expect(host.querySelector<HTMLDialogElement>(".rd-modal")!.open).toBe(true);expect((seek.mock.calls[0]![0] as CustomEvent).detail).toEqual({accountId:"account",workId:"work",startMs:0});expect(fetcher).not.toHaveBeenCalled();
 }finally{window.removeEventListener("research:focus-object",focus);window.removeEventListener("research:seek-work",seek);}
});
it("adds the displayed report to the pool once and then opens the saved topic",async()=>{
 fetcher.mockResolvedValue({ok:true,json:async()=>({href:"/research/pool#topic-private"})});
 await act(async()=>root.render(<ReportDesk {...reportDeskProps()}/>));
 const button=host.querySelector<HTMLButtonElement>(".rd-pool-action")!;
 await act(async()=>{button.click();button.click();});expect(fetcher).toHaveBeenCalledOnce();expect(fetcher.mock.calls[0]![0]).toBe("/api/research/benchmarks/account/works/work/analysis/report-current/pool");expect(button.textContent).toContain("在选题池里");
 await act(async()=>button.click());expect(router.push).toHaveBeenCalledWith("/research/pool#topic-private");
});
it("uses the saved paragraph summaries and exposes a detour only when assessed",async()=>{
 const data=reportDeskProps();data.view.latest!.answer.structureBlocks[0]!.display={label:"开场",summary:"用实际问题进入内容。",mainlineRelation:"DETOUR",mainlineReason:"这一段与报告主张关系较弱。"};
 await act(async()=>root.render(<ReportDesk {...data}/>));expect(host.querySelector(".rd-decision")?.textContent).toBe("用实际问题进入内容。");expect(host.querySelector(".rd-fragments .is-detour")?.textContent).toContain("不服务主线");expect(host.querySelector(".rd-structure>header")?.textContent).toContain("待评估");expect(host.querySelectorAll(".rd-legend i").length).toBeGreaterThan(0);
});
it("locates a paragraph in its own scrolling pane even in a narrow viewport",async()=>{
 await act(async()=>root.render(<ReportDesk {...reportDeskProps()}/>));
 vi.stubGlobal("matchMedia",()=>({matches:false,addEventListener:vi.fn(),removeEventListener:vi.fn()}));
 const left=host.querySelector<HTMLDivElement>('[aria-label="主线结构滚动区域"]')!,right=host.querySelector<HTMLDivElement>('[aria-label="分析滚动区域"]')!,target=host.querySelector<HTMLElement>("#rd-fragment-1")!;
 left.style.overflowY="auto";left.scrollTop=120;right.scrollTop=210;left.getBoundingClientRect=()=>({top:100} as DOMRect);target.getBoundingClientRect=()=>({top:500} as DOMRect);target.scrollIntoView=vi.fn();
 await act(async()=>host.querySelector<HTMLButtonElement>(".rd-sequence button")!.click());
 expect(left.scrollTop).toBe(510);expect(right.scrollTop).toBe(210);expect(target.scrollIntoView).not.toHaveBeenCalled();
});

it("reads the selected report's complete mainline and concrete writing methods, with a legacy fallback",async()=>{
 const data=reportDeskProps();
 await act(async()=>root.render(<ReportDesk {...data}/>));
 expect(host.querySelector(".rd-mainline")?.textContent).toBe("先指出用户问题，再演示操作，最后说明结果如何用于自己。");
 expect(host.querySelector(".rd-core-writing")?.textContent).toContain("问题先行；展示过程；解释可用结果");
 expect([...host.querySelectorAll(".rd-mechanism h4")].map(node=>node.textContent)).toEqual(["问题到操作","操作展示"]);
 const fullButton=[...host.querySelectorAll<HTMLButtonElement>("button")].find(node=>node.textContent==="完整研究与借鉴方法")!;
 await act(async()=>fullButton.click());
 expect(host.querySelector(".rd-full")?.textContent).toContain("先问题后动作");
 expect(host.querySelector(".rd-full")?.textContent).toContain("比较先提问题与先展示结果两种开头");
 data.view.latest!.answer=sampleAnswer();
 await act(async()=>root.render(<ReportDesk {...data}/>));
 expect(host.querySelector(".rd-mainline")?.textContent).toBe("结果要能用于自己");
 expect(host.querySelector(".rd-core-writing")).toBeNull();
 expect(fetcher).not.toHaveBeenCalled();
});

it("keeps expression observations beside the original without repeating the paragraph summary",async()=>{
 const data=reportDeskProps();
 data.view.latest!.answer.structureBlocks[0]!.display={label:"提出问题",summary:"先展示用户的问题。",mainlineRelation:"SERVES",mainlineReason:"把问题放在开头。"};
 await act(async()=>root.render(<ReportDesk {...data}/>));
 const paragraph=host.querySelector(".rd-fragments>li")!,quote=paragraph.querySelector(".rd-quote")!;
 expect(paragraph.querySelector(".rd-expression")?.textContent).toBe("把问题放在开头。");
 expect(quote.textContent).toContain("表达观察：直接说问题");
 expect(quote.textContent).toContain("这一段的作用：先让观众认出自己的问题。");
 expect(quote.textContent).not.toContain("内容概括：");
 expect(quote.textContent).not.toContain("作用说明：把问题放在开头。");
 expect(quote.querySelector("blockquote")?.textContent).toBe("先展示用户的真实问题。");
 expect(fetcher).not.toHaveBeenCalled();
});

it("makes missing reading assessments discoverable without automatically regenerating an old report",async()=>{
 await act(async()=>root.render(<ReportDesk {...reportDeskProps()}/>));
 const action=host.querySelector<HTMLButtonElement>(".rd-reading-status")!;
 expect(action.textContent).toContain("主线关系待评估");
 await act(async()=>action.click());
 expect(host.querySelector<HTMLDialogElement>(".rd-modal")!.open).toBe(true);
 expect(host.querySelector(".rd-modal>header h3")?.textContent).toBe("资料与研究操作");
 expect(host.querySelector(".rd-modal-body")?.textContent).toContain("关联资料与重新拆解");
 expect(fetcher).not.toHaveBeenCalled();
});

it("keeps following an explicitly started report after its operation dialog closes",async()=>{
 vi.useFakeTimers();
 const data=reportDeskProps();let completed=false;
 const operations=<WorkResearchControls reportPage accountId="account" workId="work" view={data.view} canWrite/>;
 fetcher.mockImplementation(async(url:string,init?:RequestInit)=>({ok:true,json:async()=>init?.method==="POST"?{runId:"new-report",sessionId:"session",status:"RUNNING"}:{status:completed?"COMPLETED":"RUNNING",stage:completed?"COMPLETED":"ANALYZING"}}));
 await act(async()=>root.render(<ReportDesk {...data} operations={operations}/>));
 expect(fetcher).not.toHaveBeenCalled();
 await act(async()=>host.querySelector<HTMLButtonElement>(".rd-reading-status")!.click());
 const start=[...host.querySelectorAll<HTMLButtonElement>(".work-research-actions button")].find(node=>node.textContent==="补齐段落概括与主线判断")!;
 await act(async()=>start.click());
 expect(fetcher).toHaveBeenCalledWith("/api/research/benchmarks/account/works/work/analysis",expect.objectContaining({method:"POST"}));
 await act(async()=>host.querySelector<HTMLButtonElement>(".rd-modal>header button")!.click());
 expect(host.querySelector<HTMLDialogElement>(".rd-modal")!.open).toBe(false);
 completed=true;
 await act(async()=>vi.advanceTimersByTimeAsync(3500));
 expect(router.push).toHaveBeenCalledWith("/research/results?report=new-report",{scroll:false});
 expect(fetcher.mock.calls.filter(call=>call[1]?.method==="POST")).toHaveLength(1);
});

it("distinguishes a historical report from the newest version even with unchanged evidence",async()=>{
 const data=reportDeskProps();
 data.view.history=[{...data.view.history[0]!,id:"newest-report",version:10},...data.view.history];
 await act(async()=>root.render(<WorkResearchControls reportPage accountId="account" workId="work" view={data.view} canWrite/>));
 const action=host.querySelector<HTMLButtonElement>(".dossier-primary")!;
 expect(action.textContent).toBe("本版证据与当前一致");
 expect(action.disabled).toBe(true);
 expect(fetcher).not.toHaveBeenCalled();
});

it("opens the server's reusable report when an explicit update needs no new model run",async()=>{
 const data=reportDeskProps();data.view.latest!.currentEvidence=false;
 fetcher.mockResolvedValue({ok:true,json:async()=>({unchanged:true,runId:"reusable-report",version:10,status:"COMPLETED"})});
 await act(async()=>root.render(<WorkResearchControls reportPage accountId="account" workId="work" view={data.view} canWrite/>));
 await act(async()=>host.querySelector<HTMLButtonElement>(".dossier-primary")!.click());
 expect(router.push).toHaveBeenCalledWith("/research/results?report=reusable-report",{scroll:false});
 expect(fetcher).toHaveBeenCalledOnce();
 expect(JSON.parse(fetcher.mock.calls[0]![1].body).force).toBe(false);
});

it("reports a failed rerun even when the prior report still matches its evidence",async()=>{
 const data=reportDeskProps();data.view.failure="这次重新拆解未完成，原报告仍可阅读。";
 await act(async()=>root.render(<WorkResearchControls reportPage accountId="account" workId="work" view={data.view} canWrite/>));
 expect(host.querySelector('[role="status"]')?.textContent).toBe(data.view.failure);
 expect(host.querySelector(".dossier-primary")?.textContent).toBe("已有报告证据一致");
 expect(fetcher).not.toHaveBeenCalled();
});
