"use client";
import Link from "next/link";
import {useEffect,useRef,useState} from "react";
import {useRouter} from "next/navigation";
export function BenchmarkAccountFocus({id,children}:{id:string;children:React.ReactNode}){
 return <button type="button" className="research-account-focus" onClick={()=>{window.dispatchEvent(new CustomEvent("research:filter-account",{detail:{id}}));window.dispatchEvent(new CustomEvent("research:focus-object",{detail:{object:{kind:"ACCOUNT",id},open:false}}));document.getElementById("works")?.scrollIntoView({block:"start"});}}>{children}</button>;
}
export function BenchmarkPurpose({id,purpose}:{id:string;purpose:string}){
 const router=useRouter(),lock=useRef(false),controller=useRef<AbortController|null>(null);const[error,setError]=useState(""),[busy,setBusy]=useState(false);
 useEffect(()=>()=>controller.current?.abort(),[]);
 async function choose(value:string){if(lock.current)return;lock.current=true;setBusy(true);setError("");const aborter=new AbortController();controller.current=aborter;
 try{const response=await fetch("/api/research/preferences",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({kind:value==="teacher"?"BENCHMARK_TEACHER":"BENCHMARK_REFERENCE",key:id,action:"FOLLOW"}),signal:aborter.signal});const body=await response.json();if(!response.ok)throw Error(body.message||"学习目的未保存。");if(!aborter.signal.aborted)router.refresh();}
 catch(cause){if(!aborter.signal.aborted)setError(cause instanceof Error?cause.message:"网络暂时不可用。");}finally{lock.current=false;if(!aborter.signal.aborted)setBusy(false);}}
 return <div><label className="teacher-purpose">学习目的<select aria-label="学习目的" value={purpose} disabled={busy} onChange={e=>void choose(e.target.value)}><option value="unset" disabled>待选择目的</option><option value="teacher">老师 · 学方法</option><option value="reference">对标 · 学题材</option></select></label>{error?<p role="alert">{error}</p>:null}</div>;
}
type ManualSyncView={id:string;status:string;pageCount:number;seenCount:number;undatedCount:number;added:number;updated:number;nextOffset:number|null;coverage:string|null;errorMessage:string|null;cached:boolean};
export function BenchmarkSync({ids,canWrite,externalAvailable=true}:{ids:string[];canWrite:boolean;externalAvailable?:boolean}){
 const router=useRouter(),lock=useRef(false),controller=useRef<AbortController|null>(null);const[busy,setBusy]=useState(false),[message,setMessage]=useState(""),[run,setRun]=useState<ManualSyncView|null>(null);
 useEffect(()=>()=>controller.current?.abort(),[]);
 async function status(id:string,signal?:AbortSignal){const response=await fetch("/api/research/benchmarks/"+id+"/sync",{signal,cache:"no-store"});const body=await response.json();if(!response.ok)throw Error(body.message||"无法读取同步记录。");setRun(body.run);return body.run as ManualSyncView|null;}
 async function check(){try{await status(ids[0]!);}catch(error){setMessage(error instanceof Error?error.message:"无法读取同步记录。");}}
 async function sync(continuation=false){
  if(lock.current||!canWrite||!externalAvailable)return;lock.current=true;setBusy(true);setMessage("");const aborter=new AbortController();controller.current=aborter;let done=0;
  try{
   for(const id of ids){
    const response=await fetch("/api/research/benchmarks/"+id+"/sync",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify(continuation&&run?{continueRunId:run.id}:{}),signal:aborter.signal});const body=await response.json();
    if(!response.ok)throw Error(body.message||body.error?.message||"同步未完成，旧数据保留。");setRun(body.run);
    let current=body.run as ManualSyncView;
    for(let i=0;i<75&&["QUEUED","RUNNING"].includes(current.status);i++){
     await new Promise<void>(resolve=>setTimeout(resolve,1000));if(aborter.signal.aborted)return;
     current=(await status(id,aborter.signal))??current;
    }
    if(current.status==="FAILED")throw Error(current.errorMessage||"同步未完成，已有数据保留。");
    if(current.status!=="COMPLETED"){setMessage("任务仍在运行，可稍后查看同步记录。");return;}done++;
   }
   setMessage("已完成 "+done+" 个账号的一页同步。");router.refresh();
  }catch(cause){if(!aborter.signal.aborted)setMessage((done?"已完成 "+done+" 个；":"")+(cause instanceof Error?cause.message:"网络暂时不可用，旧数据保留。"));}
  finally{lock.current=false;if(!aborter.signal.aborted)setBusy(false);}
 }
 return <span className="teacher-sync manual-research-sync"><button type="button" className="research-button" disabled={!canWrite||!externalAvailable||busy||!ids.length} onClick={()=>void sync()}>{!externalAvailable?"采集未启用":busy?"正在同步…":"同步近期一页"}</button>{ids.length===1?<button type="button" disabled={busy} onClick={()=>void check()}>查看同步记录</button>:null}{run?<span className="research-sync-receipt" role="status">{run.status==="QUEUED"?"等待执行":run.status==="RUNNING"?"正在获取平台数据":run.status==="FAILED"?run.errorMessage:"本次 "+run.pageCount+" 页 · "+run.seenCount+" 条 · 新增 "+run.added+" / 更新 "+run.updated+(run.undatedCount?" · "+run.undatedCount+" 条日期未提供":"")+(run.cached?" · 复用已取得结果":"")}{run.status==="COMPLETED"&&run.nextOffset!==null?<button type="button" disabled={busy||!canWrite||!externalAvailable} onClick={()=>void sync(true)}>继续获取下一页</button>:null}{run.status==="COMPLETED"&&run.nextOffset===null?<small>{run.coverage==="PROVIDER_EXHAUSTED"?"平台已返回最后一页":"平台未提供可继续的分页范围"}</small>:null}</span>:null}{message?<span role="status">{message}</span>:null}</span>;
}
export function WorkQueueActions({id,accountId,read,dismissed,reportId,returnTo,analysisAvailable=true,followed=false,compact=false}:{id:string;accountId:string;read:boolean;dismissed:boolean;reportId:string|null;returnTo:string;analysisAvailable?:boolean;followed?:boolean;compact?:boolean}){
 const router=useRouter(),lock=useRef(false),controller=useRef<AbortController|null>(null);const[busy,setBusy]=useState(false),[error,setError]=useState("");
 useEffect(()=>()=>controller.current?.abort(),[]);
 async function act(kind:string,action:string){if(lock.current)return;lock.current=true;setBusy(true);setError("");const aborter=new AbortController();controller.current=aborter;
 try{const response=await fetch("/api/research/preferences",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({kind,key:id,action}),signal:aborter.signal});const body=await response.json();if(!response.ok)throw Error(body.message||"状态未保存。");if(!aborter.signal.aborted)router.refresh();}
 catch(cause){if(!aborter.signal.aborted)setError(cause instanceof Error?cause.message:"网络暂时不可用。");}finally{lock.current=false;if(!aborter.signal.aborted)setBusy(false);}}
 const detail="/research/benchmarks/"+accountId+"/works/"+id+"?returnTo="+encodeURIComponent(returnTo);
 if(compact)return <div className="research-work-personal-actions"><button type="button" disabled={busy} aria-pressed={followed} onClick={()=>void act("WORK",followed?"UNFOLLOW":"FOLLOW")}>{followed?"已收藏":"收藏"}</button><details><summary aria-label="更多作品操作">⋯</summary><div><button type="button" disabled={busy} onClick={()=>void act("WORK",read?"UNREAD":"VIEW")}>{read?"恢复未读":"标为已读"}</button><button type="button" disabled={busy} onClick={()=>void act("WORK_DISMISSED",dismissed?"UNFOLLOW":"FOLLOW")}>{dismissed?"恢复作品":"忽略"}</button></div></details>{error?<span role="alert">{error}</span>:null}</div>;
 return <div className="research-source-actions"><button disabled={busy} onClick={()=>void act("WORK",read?"UNREAD":"VIEW")}>{read?"恢复未读":"看过了"}</button>{reportId?<Link className="research-button" href={detail+"#creation-preview"}>想复刻 · 创作预览</Link>:<span className="teacher-tag">复刻需先有拆解</span>}{reportId?<Link className="research-button" href={detail+"#deep-report"}>看拆解</Link>:analysisAvailable?<Link className="research-button" href={detail+"#deep-report"}>拆解 · 先审阅</Link>:<span className="teacher-tag" title="当前未授权新模型调用；可查看作品和已保存的文字。">拆解待接入</span>}<button disabled={busy} onClick={()=>void act("WORK_DISMISSED",dismissed?"UNFOLLOW":"FOLLOW")}>{dismissed?"恢复建议":"忽略建议"}</button>{error?<p role="alert">{error}</p>:null}</div>;
}
export function ReportArchive({id,archived}:{id:string;archived:boolean}){
 const router=useRouter(),lock=useRef(false);const[busy,setBusy]=useState(false),[error,setError]=useState("");
 async function act(){if(lock.current)return;lock.current=true;setBusy(true);try{const response=await fetch("/api/research/preferences",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({kind:"REPORT_ARCHIVED",key:id,action:archived?"UNFOLLOW":"FOLLOW"})});const body=await response.json();if(!response.ok)throw Error(body.message||"报告状态未保存。");router.refresh();}catch(cause){setError(cause instanceof Error?cause.message:"暂时无法保存。");}finally{lock.current=false;setBusy(false);}}
 return <span><button disabled={busy} onClick={()=>void act()}>{archived?"已归档 · 恢复":"看完归档"}</button>{error?<span role="alert">{error}</span>:null}</span>;
}
