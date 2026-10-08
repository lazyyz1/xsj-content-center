// @vitest-environment jsdom
import React,{act} from "react";
import {createRoot,type Root} from "react-dom/client";
import {afterEach,beforeEach,expect,it,vi} from "vitest";
vi.mock("../components/research/research-use-findings",()=>({ResearchUseFindings:()=>null}));
import {ResearchObjectAssistant} from "../components/research/research-object-assistant";
let root:Root,host:HTMLDivElement;
const priorScroll=Object.getOwnPropertyDescriptor(HTMLElement.prototype,"scrollIntoView");
beforeEach(()=>{host=document.createElement("div");document.body.append(host);root=createRoot(host);(globalThis as Record<string,unknown>).IS_REACT_ACT_ENVIRONMENT=true;Object.defineProperty(HTMLElement.prototype,"scrollIntoView",{configurable:true,writable:true,value:vi.fn()});});
afterEach(async()=>{await act(async()=>root.unmount());host.remove();vi.unstubAllGlobals();if(priorScroll)Object.defineProperty(HTMLElement.prototype,"scrollIntoView",priorScroll);else Reflect.deleteProperty(HTMLElement.prototype,"scrollIntoView");});
function type(element:HTMLTextAreaElement,text:string){Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype,"value")!.set!.call(element,text);element.dispatchEvent(new Event("input",{bubbles:true}));}
it("can discuss a new object while a previous object's request is pending, ignoring its late response",async()=>{
 let finishOld:(response:unknown)=>void=()=>undefined;
 vi.stubGlobal("fetch",vi.fn((url:string,options?:RequestInit)=>{
  if(options?.method==="POST")return new Promise(resolve=>{finishOld=resolve;});
  const object=JSON.parse(new URL(url,"http://localhost").searchParams.get("object")!);
  return Promise.resolve({ok:true,json:async()=>({object,title:object.id,sessionId:null,runs:[]})});
 }));
 await act(async()=>root.render(<ResearchObjectAssistant object={{kind:"ACCOUNT",id:"旧账号"}} canWrite/>));
 await act(async()=>type(host.querySelector("textarea")!,"研究旧账号"));
 await act(async()=>host.querySelector("form")!.dispatchEvent(new Event("submit",{bubbles:true,cancelable:true})));
 expect(host.querySelector("textarea")!.disabled).toBe(true);
 await act(async()=>root.render(<ResearchObjectAssistant object={{kind:"ACCOUNT",id:"新账号"}} canWrite/>));
 expect(host.querySelector("textarea")!.disabled).toBe(false);
 expect(host.querySelector("h3")!.textContent).toBe("新账号");
 await act(async()=>type(host.querySelector("textarea")!,"新账号自己的问题"));
 await act(async()=>{finishOld({ok:true,json:async()=>({runId:"old-run"})});});
 expect(host.querySelector("textarea")!.value).toBe("新账号自己的问题");
 expect(host.querySelector("h3")!.textContent).toBe("新账号");
});
it("can reopen the same object while its submission is pending without leaving the input locked",async()=>{
 let finish:(response:unknown)=>void=()=>undefined;
 const object={kind:"ACCOUNT" as const,id:"同一个账号"};
 vi.stubGlobal("fetch",vi.fn((_url:string,options?:RequestInit)=>options?.method==="POST"?new Promise(resolve=>{finish=resolve;}):Promise.resolve({ok:true,json:async()=>({object,title:object.id,sessionId:null,runs:[]})})));
 await act(async()=>root.render(<ResearchObjectAssistant object={object} canWrite active/>));
 await act(async()=>type(host.querySelector("textarea")!,"保留这个问题"));
 await act(async()=>host.querySelector("form")!.dispatchEvent(new Event("submit",{bubbles:true,cancelable:true})));
 await act(async()=>root.render(<ResearchObjectAssistant object={object} canWrite active={false}/>));
 await act(async()=>root.render(<ResearchObjectAssistant object={object} canWrite active/>));
 expect(host.querySelector("textarea")!.disabled).toBe(false);
 expect(host.querySelector("textarea")!.value).toBe("保留这个问题");
 await act(async()=>{finish({ok:true,json:async()=>({runId:"pending-run"})});});
 expect(host.querySelector("textarea")!.disabled).toBe(false);
});
