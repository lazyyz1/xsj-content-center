// @vitest-environment jsdom
import React,{act} from "react";
import {createRoot,type Root} from "react-dom/client";
import {afterEach,beforeEach,expect,it,vi} from "vitest";
const {refresh,router}=vi.hoisted(()=>{const refresh=vi.fn();return {refresh,router:{refresh}};});
vi.mock("next/navigation",()=>({useRouter:()=>router}));
import {SourceProcessingPoller} from "../components/library/source-processing-poller";
let root:Root,host:HTMLDivElement;
beforeEach(()=>{vi.useFakeTimers();refresh.mockClear();host=document.createElement("div");document.body.append(host);root=createRoot(host);(globalThis as Record<string,unknown>).IS_REACT_ACT_ENVIRONMENT=true;});
afterEach(async()=>{await act(async()=>root.unmount());host.remove();vi.useRealTimers();vi.unstubAllGlobals();});
const snapshot={busy:true,fingerprint:"fixture",transcriptionStatus:"RUNNING",hasTranscript:false,transcriptUpdatedAt:null,transcription:null};
it("shows a failed connection and resumes on the browser online event",async()=>{
 const fetcher=vi.fn().mockRejectedValueOnce(new TypeError("offline")).mockResolvedValue({ok:true,json:async()=>snapshot});vi.stubGlobal("fetch",fetcher);
 await act(async()=>root.render(<SourceProcessingPoller sourceId="fixture" active/>));expect(host.textContent).toContain("连接暂时中断");
 await act(async()=>window.dispatchEvent(new Event("online")));expect(fetcher).toHaveBeenCalledTimes(2);expect(host.textContent).toBe("");
});
it("aborts a stalled request and reports the uncertainty while continuing polling",async()=>{
 let aborted=false;vi.stubGlobal("fetch",vi.fn((_url,init)=>new Promise((_resolve,reject)=>init.signal.addEventListener("abort",()=>{aborted=true;reject(new DOMException("Timed out","AbortError"));}))));
 await act(async()=>root.render(<SourceProcessingPoller sourceId="fixture" active/>));await act(async()=>vi.advanceTimersByTimeAsync(12000));expect(aborted).toBe(true);expect(host.textContent).toContain("后台任务可能仍在处理");
});
it("refreshes on completed data without creating or retrying a job",async()=>{
 vi.stubGlobal("fetch",vi.fn().mockResolvedValue({ok:true,json:async()=>({...snapshot,busy:false,hasTranscript:true})}));
 await act(async()=>root.render(<SourceProcessingPoller sourceId="fixture" active/>));expect(refresh).toHaveBeenCalledTimes(1);expect(fetch).toHaveBeenCalledWith("/api/source-items/fixture/processing",expect.objectContaining({cache:"no-store"}));
});

import {ReportDesk} from "../components/research/report-desk";
import {reportDeskProps} from "./report-desk-fixture";
it("uses genuine duration proportions and preserves original quotes",async()=>{
 vi.stubGlobal("requestAnimationFrame",()=>1);vi.stubGlobal("cancelAnimationFrame",vi.fn());
 const data=reportDeskProps(),blocks=data.view.latest!.answer.structureBlocks;blocks[1]!.endMs=18000;blocks.splice(2);
 await act(async()=>root.render(<ReportDesk {...data}/>));
 const items=host.querySelectorAll<HTMLButtonElement>(".rd-sequence.is-timed button");expect(items).toHaveLength(2);expect(parseFloat(items[0]!.style.width)).toBeCloseTo(100/3);expect(parseFloat(items[1]!.style.width)).toBeCloseTo(200/3);
 expect(host.querySelector(".rd-quote blockquote")?.textContent).toBe(blocks[0]!.citation.quote);expect(host.querySelector(".rd-position button")).toBeNull();
});
it("uses an untimed sequence without guessing timestamps",async()=>{
 vi.stubGlobal("requestAnimationFrame",()=>1);vi.stubGlobal("cancelAnimationFrame",vi.fn());
 const data=reportDeskProps();data.view.latest!.answer.structureBlocks.forEach(block=>{block.startMs=null;block.endMs=null;});
 await act(async()=>root.render(<ReportDesk {...data}/>));
 expect(host.querySelector(".rd-sequence.is-timed")).toBeNull();expect(host.querySelectorAll(".rd-sequence button")).toHaveLength(3);expect(host.textContent).toContain("不代表时长");expect(host.querySelectorAll(".rd-position time")).toHaveLength(0);
});
