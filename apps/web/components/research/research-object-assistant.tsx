"use client";
import Link from "next/link";
import {useEffect,useRef,useState} from "react";
import type {ObjectResearchView,ResearchObject} from "@/lib/contracts/research-object";
import {ResearchUseFindings} from "./research-use-findings";
export function ResearchObjectAssistant({object,canWrite,active=true}:{object:ResearchObject;canWrite:boolean;active?:boolean}){
 const [view,setView]=useState<ObjectResearchView|null>(null),[question,setQuestion]=useState(""),[error,setError]=useState(""),[loading,setLoading]=useState(false),[busy,setBusy]=useState(false);
 const epoch=useRef(0),live=useRef(true),pending=useRef<{question:string;key:string}|null>(null),list=useRef<HTMLDivElement>(null);
 const identity=JSON.stringify(object),objectRef=useRef(object);objectRef.current=object;
 const previousIdentity=useRef(identity);
 useEffect(()=>{
  if(!active)return;
  setBusy(false);
  live.current=true;const generation=++epoch.current,controller=new AbortController();
  if(previousIdentity.current!==identity){pending.current=null;setBusy(false);setQuestion("");setError("");setView(null);previousIdentity.current=identity;}
  setLoading(true);
  const refresh=async()=>{try{const response=await fetch("/api/research/object-sessions?object="+encodeURIComponent(identity),{cache:"no-store",signal:controller.signal}),data=await response.json();if(!response.ok)throw Error(data.message||"这份研究暂时无法读取。");if(live.current&&epoch.current===generation){setView(data);setError("");}}catch(cause){if(!controller.signal.aborted&&epoch.current===generation)setError(cause instanceof Error?cause.message:"研究连接中断。");}finally{if(epoch.current===generation)setLoading(false);}};
  void refresh();const timer=setInterval(()=>void refresh(),2500);
  return()=>{controller.abort();clearInterval(timer);};
 },[identity,active]);
 useEffect(()=>()=>{live.current=false;epoch.current++;},[]);
 useEffect(()=>{list.current?.scrollIntoView({block:"nearest"});},[view?.runs.length]);
 async function send(event:React.FormEvent){
  event.preventDefault();if(busy||!canWrite||!question.trim())return;setBusy(true);setError("");
  const generation=epoch.current,body=question.trim();if(pending.current?.question!==body)pending.current={question:body,key:crypto.randomUUID()};
  try{const response=await fetch("/api/research/object-sessions",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({object:objectRef.current,question:body,requestKey:pending.current!.key}),signal:AbortSignal.timeout(15000)}),data=await response.json();
   if(!response.ok)throw Error(data.message||"研究没有开始，已有内容保留。");
   if(generation===epoch.current){setQuestion("");pending.current=null;const update=await fetch("/api/research/object-sessions?object="+encodeURIComponent(identity),{cache:"no-store"});if(update.ok)setView(await update.json());}
  }catch(cause){if(generation===epoch.current)setError(cause instanceof Error?cause.message:"提交未完成，可以重试同一请求。");}finally{if(generation===epoch.current)setBusy(false);}
 }
 const running=view?.runs.some(run=>run.status==="QUEUED"||run.status==="RUNNING");
 return <div className="research-object-assistant" data-testid="research-object-assistant"><header><span>当前研究对象</span><h3>{view?.title||"正在读取对象…"}</h3><p>这份会话单独保存。这里只研究，采用后才带到自己的稿件。</p></header>
  {loading&&!view?<p role="status">正在找回这份研究…</p>:null}
  <div className="research-object-dialogue">{view&&!view.runs.length?<p className="research-object-empty">问一个你关心的问题。可以核对论证、比较表达，也可以追问某个段落。</p>:null}
   {view?.runs.map(run=><article key={run.id}><div className="research-object-question"><strong>我</strong><p>{run.question}</p></div><div className="research-object-answer"><strong>研究助手</strong>{run.status==="QUEUED"||run.status==="RUNNING"?<p role="status">{run.status==="QUEUED"?"研究已保存，正在等待执行…":"正在依据当前内容研究…"}</p>:run.status==="FAILED"?<p role="alert">{run.errorMessage||"这次研究没有完成，原内容保留。重新追问不会覆盖历史。"}</p>:<>{run.blocks.filter(block=>block.type==="text"&&block.provenance==="AI_INTERPRETATION").map(block=><section key={block.id}><h4>{block.title}</h4>{block.type==="text"?<p>{block.text}</p>:null}{block.limitation?<small>{block.limitation}</small>:null}</section>)}{run.status==="COMPLETED"?<ResearchUseFindings resultId={run.id} canWrite={canWrite}/>:null}</>}</div></article>)}<div ref={list}/></div>
  {error?<p role="alert" className="research-error">{error}</p>:null}
  <form onSubmit={event=>void send(event)}><label>围绕当前内容追问<textarea aria-label="围绕当前对象研究" value={question} onChange={event=>setQuestion(event.target.value)} maxLength={10000} rows={3} placeholder="比如：这一段如何支撑主观点？有哪些判断还缺依据？" disabled={!canWrite||busy}/></label><button type="submit" className="research-button research-primary" disabled={!canWrite||busy||running||!question.trim()}>{busy?"正在保存问题…":running?"正在研究这份内容":"发送问题"}</button></form>
  {view?.sessionId?<Link className="research-object-history-link" href={"/research/session/"+view.sessionId}>查看这份完整研究历史 →</Link>:null}
 </div>;
}
