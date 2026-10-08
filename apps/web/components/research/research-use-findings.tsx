"use client";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import type { ResearchBlock } from "@content-center/core";
import type { ResearchSelection } from "@/lib/contracts/references";
import { guardedArtifactNavigation } from "../projects/use-artifact-editor";
type SourceView={actor:{userId:string;workspaceId:string};kind:"run"|"study";version:number;title:string;blocks:ResearchBlock[];saved:boolean;sessionId:string|null;projects:Array<{id:string;title:string}>};
type Choice={id:string;text:string};
type Preview={body:string;blockCount?:number;sourceCount?:number};
export function ResearchUseFindings({resultId,kind="run",canWrite,sourceOutline,sourceVersion,sourceCurrent=true,wholeLabel,compactActions=false,extraActions,hidePrimary=false}:{resultId:string;kind?:"run"|"study";canWrite:boolean;sourceOutline?:Array<{role:string;purpose:string}>;sourceVersion?:number;sourceCurrent?:boolean;wholeLabel?:string;compactActions?:boolean;extraActions?:ReactNode;hidePrimary?:boolean}){
 const router=useRouter(),dialog=useRef<HTMLDialogElement>(null),lock=useRef(false),controller=useRef<AbortController|null>(null),sourceRef=useRef<SourceView|null>(null),requestId=useRef<string|null>(null),requestSelection=useRef(""),createTrigger=useRef<HTMLButtonElement>(null);
 const [data,setData]=useState<SourceView|null>(null),[mode,setMode]=useState<"select"|"share"|null>(null),[items,setItems]=useState<Choice[]>([]),[busy,setBusy]=useState(false),[loading,setLoading]=useState(false),[error,setError]=useState(""),[notice,setNotice]=useState("");
 const [projectId,setProjectId]=useState(""),[preview,setPreview]=useState<Preview|null>(null),[reviewed,setReviewed]=useState(false),[existingArtifact,setExistingArtifact]=useState(""),[ready,setReady]=useState(false);
 useEffect(()=>{setReady(true);return()=>controller.current?.abort();},[]);
 useEffect(()=>{controller.current?.abort();sourceRef.current=null;requestId.current=null;setData(null);setItems([]);setMode(null);setProjectId("");setPreview(null);setReviewed(false);setExistingArtifact("");setError("");setNotice("");},[resultId,kind]);
 useEffect(()=>{if(mode&&!dialog.current?.open)dialog.current?.showModal();if(!mode&&dialog.current?.open)dialog.current.close();},[mode]);
 async function request(url:string,body?:unknown){
  const aborter=new AbortController();controller.current=aborter;
  const response=await fetch(url,{method:body?"POST":"GET",cache:"no-store",headers:body?{"content-type":"application/json"}:undefined,body:body?JSON.stringify(body):undefined,signal:aborter.signal});
  const value=await response.json().catch(()=>({}));if(!response.ok)throw Error(value.message||"暂时无法完成，请重试。");return value;
 }
 async function load():Promise<SourceView>{
  if(sourceRef.current)return sourceRef.current;
  setLoading(true);
  try{const value=await request("/api/research/creation?kind="+kind+"&resultId="+encodeURIComponent(resultId)) as SourceView;sourceRef.current=value;setData(value);return value;}finally{setLoading(false);}
 }
 function close(){if(busy)return;setMode(null);setPreview(null);setReviewed(false);requestAnimationFrame(()=>createTrigger.current?.focus());}
 async function create(selected:Choice[],source:SourceView){
  if(lock.current||!canWrite||!selected.length)return;lock.current=true;setBusy(true);setError("");
  const selectionKey=JSON.stringify({kind,version:source.version,items:selected});
  if(!requestId.current||requestSelection.current!==selectionKey){requestId.current=crypto.randomUUID();requestSelection.current=selectionKey;}
  try{
   const value=await request("/api/artifacts",{clientRequestId:requestId.current,research:{sourceId:resultId,selection:{kind,version:source.version,items:selected}}});
   requestId.current=null;setMode(null);router.push(value.href);
  }catch(cause){if(!(cause instanceof DOMException&&cause.name==="AbortError"))setError(cause instanceof Error?cause.message:"没有创建成功，研究仍保留。");}
  finally{lock.current=false;setBusy(false);}
 }
 async function useStructure(){
  if(lock.current||!canWrite)return;setError("");
  try{const value=await load(),structures=value.blocks.flatMap(block=>block.type==="text"&&block.id.startsWith("structure-")?[{id:block.id,text:block.text}]:[]);
   if(structures.length){await create(structures,value);}else{setItems([]);setMode("select");}
  }catch(cause){setError(cause instanceof Error?cause.message:"参考无法读取。");}
 }
 async function open(mode:"select"|"share"){
  if(lock.current)return;setMode(mode);setError("");setPreview(null);setReviewed(false);
  try{await load();}catch(cause){setError(cause instanceof Error?cause.message:"参考无法读取。");}
 }
 useEffect(()=>{
  function choose(event:Event){
   const value=(event as CustomEvent<{resultId:string;kind:string;blockId:string}>).detail;
   if(!value||value.resultId!==resultId||value.kind!==kind||lock.current||!canWrite)return;
   guardedArtifactNavigation(()=>{void load().then(source=>{const block=source.blocks.find(item=>item.id===value.blockId&&item.type==="text");if(block?.type==="text")return create([{id:block.id,text:block.text}],source);setError("该结论已变化，请重新查看。");}).catch(cause=>setError(cause.message));});
  }
  window.addEventListener("research:select-finding",choose);return()=>window.removeEventListener("research:select-finding",choose);
 },[resultId,kind,canWrite]);
 function toggle(block:Extract<ResearchBlock,{type:"text"}>,checked:boolean){requestId.current=null;setPreview(null);setReviewed(false);setItems(current=>checked?[...current,{id:block.id,text:block.text}]:current.filter(item=>item.id!==block.id));}
 const selection:ResearchSelection={kind,version:data?.version||1,items};
 async function prepareShare(){
  if(!data||!projectId||!items.length||busy)return;setBusy(true);setError("");
  try{const value=await request("/api/research/creation",{mode:"preview",projectId,resultId,selection});setPreview(value.preview);setExistingArtifact(value.existingArtifact?.artifactId||"");setReviewed(false);}catch(cause){setError(cause instanceof Error?cause.message:"共享预览无法读取。");}finally{setBusy(false);}
 }
 async function share(){
  if(!preview||!reviewed||!canWrite||busy)return;setBusy(true);setError("");
  try{if(existingArtifact){setMode(null);guardedArtifactNavigation(()=>router.push("/dashboard?project="+encodeURIComponent(projectId)+"&node=artifact:"+encodeURIComponent(existingArtifact)));return;}
   const value=await request(kind==="run"?"/api/research/results/"+resultId+"/share":"/api/research/results/study/"+resultId+"/share",{projectId,selection});
   setExistingArtifact(value.artifactId);setNotice(value.alreadyShared?"选中的研究已分享过，原成果保留。":"选中的结论已分享，私人研究聊天没有共享。");setReviewed(false);
  }catch(cause){setError(cause instanceof Error?cause.message:"分享未完成。");}finally{setBusy(false);}
 }
 async function saveResearch(){
  if(!data?.sessionId||data.saved||busy||!canWrite)return;setBusy(true);
  try{await request("/api/research/sessions/"+data.sessionId+"/runs/"+resultId,{});const updated={...data,saved:true};sourceRef.current=updated;setData(updated);setNotice("研究已保存，仍仅你可见。");}catch(cause){setError(cause instanceof Error?cause.message:"研究未保存。");}finally{setBusy(false);}
 }
 return <section id="share-result" className="research-use-findings" aria-label="使用研究发现" data-testid="research-use-findings" data-ready={ready} inert={!ready}>
  <div className="research-use-actions">{!hidePrimary?<button ref={createTrigger} type="button" className="research-button research-primary" disabled={!canWrite||busy||loading} onClick={()=>guardedArtifactNavigation(()=>{if(sourceOutline)void useStructure();else void open("select");})}>{busy?"正在打开自己的稿件…":wholeLabel??(sourceOutline?"采用整份结构，开始自己的稿件":"选用结论，开始自己的稿件")}</button>:null}{compactActions?<details className="research-use-more"><summary>更多</summary><div>{hidePrimary&&sourceOutline?<button type="button" disabled={!canWrite||busy||loading} onClick={()=>guardedArtifactNavigation(()=>void useStructure())}>采用整份结构开始写</button>:null}{sourceOutline?<button type="button" className="research-button" disabled={busy} onClick={()=>void open("select")}>挑选部分结论</button>:null}<button type="button" className="research-button" disabled={busy} onClick={()=>void open("share")}>保存 / 分享研究成果</button>{extraActions}</div></details>:<>{sourceOutline?<button type="button" className="research-button" disabled={busy} onClick={()=>void open("select")}>挑选部分结论</button>:null}<button type="button" className="research-button" disabled={busy} onClick={()=>void open("share")}>保存 / 分享研究成果</button></>}</div>
  {sourceOutline&&!sourceCurrent?<p className="research-caption">当前采用的是第{sourceVersion}版历史参考，原证据已变化；稿件会保存这份参考快照。</p>:null}
  {error&&!mode?<p role="alert" className="research-error">{error}</p>:null}
  <dialog ref={dialog} className="research-selection-dialog" aria-label={mode==="share"?"保存与分享研究":"选择要用的参考"} onCancel={event=>{event.preventDefault();close();}}>
   <header><div><h3>{mode==="share"?"保存或分享选中的研究":"挑选这次想借鉴的内容"}</h3><p>{mode==="share"?"共享前预览实际内容。私人研究会话不会自动共享。":"选中内容会保存在独立稿件旁边。无需先选项目或填写定位。"}</p></div><button type="button" onClick={close} disabled={busy} aria-label="关闭参考选择">关闭</button></header>
   {loading?<p role="status">正在读取这版研究…</p>:null}
   {data?<><fieldset disabled={busy}>{data.blocks.filter((block):block is Extract<ResearchBlock,{type:"text"}>=>block.type==="text").map(block=><div className="research-choice-item" key={block.id}><label><input type="checkbox" checked={items.some(item=>item.id===block.id)} onChange={event=>toggle(block,event.target.checked)}/><strong>{block.title}</strong></label><p>{block.text.slice(0,180)}{block.text.length>180?"…":""}</p>{items.some(item=>item.id===block.id)?<details><summary>按需要调整引用内容</summary><textarea aria-label={"调整所选内容："+block.id} rows={3} maxLength={12000} value={items.find(item=>item.id===block.id)?.text||""} onChange={event=>{requestId.current=null;setPreview(null);setReviewed(false);setItems(current=>current.map(item=>item.id===block.id?{...item,text:event.target.value}:item));}}/></details>:null}{block.limitation?<small>{block.limitation}</small>:null}</div>)}</fieldset>
    {mode==="share"?<section className="research-share-controls">{data.sessionId?<button type="button" disabled={busy||data.saved||!canWrite} onClick={()=>void saveResearch()}>{data.saved?"研究已保存在本人档案":"只保存研究（仅本人）"}</button>:null}<label>分享到项目<select aria-label="研究使用项目" value={projectId} onChange={event=>{setProjectId(event.target.value);setPreview(null);setReviewed(false);}}><option value="">请选择共享项目</option>{data.projects.map(project=><option value={project.id} key={project.id}>{project.title}</option>)}</select></label><button type="button" disabled={!projectId||!items.length||busy} onClick={()=>void prepareShare()}>预览实际共享内容</button>{preview?<><pre>{preview.body}</pre><label><input type="checkbox" checked={reviewed} onChange={event=>setReviewed(event.target.checked)}/>已核对共享范围和内容</label><button type="button" className="research-primary" disabled={!reviewed||busy||!canWrite} onClick={()=>void share()}>{existingArtifact?"打开已有共享成果":"明确分享选中结论"}</button></>:null}</section>:<footer><span>已选 {items.length} 项</span><button type="button" className="research-button research-primary" disabled={!items.length||!canWrite||busy} onClick={()=>guardedArtifactNavigation(()=>void create(items,data))}>用所选参考开始写</button></footer>}
   </>:null}
   {error?<p role="alert" className="research-error">{error}</p>:null}{notice?<p role="status">{notice}</p>:null}
  </dialog>
 </section>;
}
