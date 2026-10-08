"use client";
import {useEffect,useRef,useState,type FormEvent} from "react";
import {useRouter} from "next/navigation";
import {researchCount} from "@/lib/research-presentation";
type Preview={resolutionId:string;existing:boolean;account:{id:string|null;platform:string;name:string;avatarUrl:string|null;originalUrl:string|null;followers:number|null};basis:string;worksCount:number|null};
export function BenchmarkAccountAdd({canManage,externalAvailable=true}:{canManage:boolean;externalAvailable?:boolean}){
 const router=useRouter(),lock=useRef(false),aborter=useRef<AbortController|null>(null),trigger=useRef<HTMLButtonElement>(null),dialog=useRef<HTMLDialogElement>(null);
 const [input,setInput]=useState(""),[hint,setHint]=useState(""),[platform,setPlatform]=useState("DOUYIN"),[purpose,setPurpose]=useState(""),[preview,setPreview]=useState<Preview|null>(null),[busy,setBusy]=useState(false),[error,setError]=useState(""),[notice,setNotice]=useState("");
 useEffect(()=>()=>aborter.current?.abort(),[]);
 function close(){if(busy)return;dialog.current?.close();trigger.current?.focus();}
 async function submit(event:FormEvent){
  event.preventDefault();if(lock.current||!canManage)return;lock.current=true;setBusy(true);setError("");
  const controller=new AbortController();aborter.current=controller;
  try{
   const body=preview?{resolutionId:preview.resolutionId,...(purpose?{purpose}:{})}:{url:input.trim(),platform,...(hint.trim()?{accountId:hint.trim()}:{})};
   const response=await fetch("/api/research/benchmarks/"+(preview?"import":"resolve"),{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify(body),signal:controller.signal});
   const result=await response.json();if(!response.ok)throw Error(result.message||result.error?.message||"识别未完成，请重试。");
   if(controller.signal.aborted)return;
   if(!preview){setPreview(result);return;}
   if(result.sync==="PENDING"&&externalAvailable){
    const sync=await fetch("/api/research/benchmarks/"+result.item.id+"/sync",{method:"POST",headers:{"content-type":"application/json"},body:"{}",signal:controller.signal});
    if(!sync.ok){const failure=await sync.json();setNotice("账号已加入，作品同步未完成："+(failure.message||"可在账号菜单中重试。"));}
    else setNotice("账号已加入，正在同步近期一页。");
   }else setNotice(result.existing?"已定位已有账号，作品和阅读状态保留。":result.sync==="FAILED"?result.message:"已加入账号并保存近期作品。");
   dialog.current?.close();setPreview(null);setInput("");router.push("/research/benchmarks?accountId="+encodeURIComponent(result.item.id)+"#works");router.refresh();
  }catch(cause){if(!controller.signal.aborted){setError(cause instanceof Error?cause.message:"网络暂时不可用，输入已保留。");}}
  finally{lock.current=false;if(!controller.signal.aborted)setBusy(false);}
 }
 if(!canManage)return null;
 return <div className="teacher-add"><button ref={trigger} className="research-button" onClick={()=>dialog.current?.showModal()}>＋ 添加账号</button>{notice?<p role="status">{notice}</p>:null}
 <dialog ref={dialog} className="teacher-import-dialog" aria-labelledby="benchmark-add-title" onCancel={event=>{if(busy)event.preventDefault();}} onClose={()=>trigger.current?.focus()}><form onSubmit={event=>void submit(event)}>
 <h2 id="benchmark-add-title">{preview?"确认这个账号":"添加想学习的账号"}</h2>
 <p className="research-caption">{preview?"确认身份后加入，不会自动转录或生成拆解。":"粘贴抖音 / 小红书完整主页，也可以输入抖音号或 uid。"}</p>
 {!preview?<><label>账号主页 / 平台 ID<input autoFocus required maxLength={2000} value={input} onChange={event=>{setInput(event.target.value);setError("");}} placeholder="https://www.douyin.com/user/…" disabled={busy}/></label><label>平台<select value={platform} onChange={event=>setPlatform(event.target.value)} disabled={busy}><option value="DOUYIN">抖音</option><option value="XIAOHONGSHU">小红书</option></select></label>{input.includes("/user/MS4w")?<label>补充抖音号 / uid（识别需要时填写）<input value={hint} onChange={event=>setHint(event.target.value)} disabled={busy} maxLength={300}/></label>:null}{!externalAvailable?<p className="research-caption">当前仅可定位已保存账号，新账号采集未启用。</p>:<p className="research-caption">识别会读取必要的平台信息，按当前供应商接口计费；不会购买订阅或自动回溯。</p>}</>:<><div className="research-account-preview"><span className="research-account-monogram">{preview.account.name.slice(0,1)}</span><div><strong>{preview.account.name}</strong><p>{preview.account.platform==="DOUYIN"?"抖音":"小红书"} · 粉丝 {researchCount(preview.account.followers)}</p></div></div><p className="research-caption">匹配依据：{preview.basis}</p>{preview.account.originalUrl?<a href={preview.account.originalUrl} target="_blank" rel="noopener noreferrer">核对原主页 ↗</a>:null}{preview.worksCount!==null?<p className="research-caption">已核对 {preview.worksCount} 条作品，确认后复用本次结果。</p>:null}<label>学习分类（可选）<select value={purpose} onChange={event=>setPurpose(event.target.value)} disabled={busy}><option value="">稍后再分</option><option value="teacher">学方法</option><option value="reference">找题材</option></select></label><button type="button" disabled={busy} onClick={()=>{setPreview(null);setError("");}}>返回修改输入</button></>}
 {error?<p role="alert" className="research-error">{error}</p>:null}
 <div className="research-source-actions"><button type="button" onClick={close} disabled={busy}>取消</button><button className="research-button" disabled={busy||(!preview&&!input.trim())}>{busy?(preview?"正在加入…":"正在识别…"):preview?(preview.existing?"定位已有账号":"确认加入"):"识别账号"}</button></div>
 </form></dialog></div>;
}
