// @vitest-environment jsdom
import React,{act} from "react";
import {createRoot,type Root} from "react-dom/client";
import {afterEach,beforeEach,expect,it,vi} from "vitest";
const {router}=vi.hoisted(()=>({router:{push:vi.fn(),refresh:vi.fn()}}));
vi.mock("next/navigation",()=>({useRouter:()=>router}));
import {ResearchUseFindings} from "../components/research/research-use-findings";
import {useArtifactEditor,type ArtifactEditorState} from "../components/projects/use-artifact-editor";
let root:Root,host:HTMLDivElement;
beforeEach(()=>{host=document.createElement("div");document.body.append(host);root=createRoot(host);(globalThis as Record<string,unknown>).IS_REACT_ACT_ENVIRONMENT=true;router.push.mockClear();HTMLDialogElement.prototype.showModal=function(){this.open=true;};HTMLDialogElement.prototype.close=function(){this.open=false;};});
afterEach(async()=>{await act(async()=>root.unmount());host.remove();vi.unstubAllGlobals();});
const source={actor:{workspaceId:"workspace",userId:"owner"},kind:"run",version:1,title:"参考报告",saved:false,sessionId:"session",projects:[],blocks:[{id:"structure-0",type:"text",title:"提出问题",text:"先提出具体的问题。",provenance:"AI_INTERPRETATION",sourceRefs:[],limitation:null},{id:"other",type:"text",title:"其他判断",text:"没有主动选择的判断",provenance:"AI_INTERPRETATION",sourceRefs:[],limitation:null}]};
it("uses a whole structure directly to open a persistent private manuscript",async()=>{
 const fetcher=vi.fn().mockResolvedValueOnce({ok:true,json:async()=>source}).mockResolvedValueOnce({ok:true,json:async()=>({artifactId:"draft",href:"/content/draft"})});vi.stubGlobal("fetch",fetcher);
 await act(async()=>root.render(<ResearchUseFindings resultId="report" canWrite sourceOutline={[{role:"提出问题",purpose:"建立相关性"}]} sourceVersion={1}/>));
 await act(async()=>host.querySelector<HTMLButtonElement>(".research-primary")!.click());
 expect(fetcher).toHaveBeenCalledTimes(2);expect(fetcher.mock.calls[1]![0]).toBe("/api/artifacts");
 const body=JSON.parse(fetcher.mock.calls[1]![1].body);expect(body).not.toHaveProperty("projectId");expect(body).not.toHaveProperty("content");expect(body.research.selection.items).toEqual([{id:"structure-0",text:"先提出具体的问题。"}]);
 expect(router.push).toHaveBeenCalledWith("/content/draft");expect(host.querySelector("dialog")?.open).toBe(false);
});
it("adopts a selected fragment without a project form or review checkbox",async()=>{
 const fetcher=vi.fn().mockResolvedValueOnce({ok:true,json:async()=>source}).mockResolvedValueOnce({ok:true,json:async()=>({href:"/content/fragment"})});vi.stubGlobal("fetch",fetcher);
 await act(async()=>root.render(<ResearchUseFindings resultId="report" canWrite sourceOutline={[{role:"问题",purpose:"进入内容"}]}/>));
 await act(async()=>window.dispatchEvent(new CustomEvent("research:select-finding",{detail:{resultId:"report",kind:"run",blockId:"structure-0"}})));
 expect(router.push).toHaveBeenCalledWith("/content/fragment");expect(host.querySelector('[aria-label="研究使用项目"]')).toBeNull();
});
it("does not create or share a manuscript just by loading the findings panel",async()=>{
 const fetcher=vi.fn().mockResolvedValue({ok:true,json:async()=>source});vi.stubGlobal("fetch",fetcher);
 await act(async()=>root.render(<ResearchUseFindings resultId="report" canWrite/>));
 expect(fetcher).not.toHaveBeenCalled();expect(router.push).not.toHaveBeenCalled();
});
let editor:ArtifactEditorState;
function EditorHarness({beforeSave}:{beforeSave?:()=>Promise<boolean>}){
 editor=useArtifactEditor({contentId:"draft",canWrite:true,initialArtifact:{artifactId:"draft",type:"TEXT",title:"未命名内容",version:1,content:"",excerpt:"",updatedAt:"2026-10-08T00:00:00Z"},beforeSave});
 return <div ref={editor.editorRef}><input aria-label="成果名称" value={editor.title==="未命名内容"?"":editor.title} onChange={e=>editor.editTitle(e.target.value)}/><textarea aria-label="我的角度" value="这不是稿件正文" readOnly/><textarea aria-label="成果正文" value={editor.body} onChange={e=>editor.editBody(e.target.value)}/></div>;
}
it("treats an unnamed empty manuscript as saved instead of forcing a title",async()=>{
 const fetcher=vi.fn();vi.stubGlobal("fetch",fetcher);
 await act(async()=>root.render(<EditorHarness/>));
 expect(editor.hasUnsavedContent()).toBe(false);let saved=false;await act(async()=>{saved=await editor.save();});expect(saved).toBe(true);expect(fetcher).not.toHaveBeenCalled();
});
it("retains typing that arrives while the private draft save is in flight",async()=>{
 let finish:(value:unknown)=>void=()=>undefined;vi.stubGlobal("fetch",vi.fn(()=>new Promise(resolve=>{finish=resolve;})));
 await act(async()=>root.render(<EditorHarness/>));await act(async()=>editor.editBody("第一段"));
 let pending:Promise<boolean>;await act(async()=>{pending=editor.save();});
 await act(async()=>editor.editBody("第一段，加上后来输入的句子。"));
 await act(async()=>{finish({ok:true,json:async()=>({artifactId:"draft",type:"TEXT",title:"未命名内容",version:2,content:"第一段",excerpt:"第一段",updatedAt:"2026-10-08T00:01:00Z"})});await pending!;});
 expect(editor.body).toBe("第一段，加上后来输入的句子。");expect(editor.artifact?.content).toBe("第一段");expect(editor.hasUnsavedContent()).toBe(true);
});
it("captures the actual manuscript instead of an earlier angle textarea",async()=>{
 const fetcher=vi.fn().mockResolvedValue({ok:true,json:async()=>({artifactId:"draft",type:"TEXT",title:"未命名内容",version:2,content:"自己的正文",excerpt:"自己的正文",updatedAt:"2026-10-08T00:00:00Z"})});vi.stubGlobal("fetch",fetcher);
 await act(async()=>root.render(<EditorHarness/>));
 const body=host.querySelector<HTMLTextAreaElement>('textarea[aria-label="成果正文"]')!;
 await act(async()=>{Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype,"value")!.set!.call(body,"自己的正文");body.dispatchEvent(new Event("input",{bubbles:true}));});
 await act(async()=>{await editor.save();});
 expect(JSON.parse(fetcher.mock.calls[0]![1].body).body).toBe("自己的正文");
 expect(editor.artifact?.content).toBe("自己的正文");
});
