"use client";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
type SourceChoice={id:string;title:string;sourceType:string};
export function WorkSourceRecovery({accountId,workId,sources,canWrite}:{accountId:string;workId:string;sources:SourceChoice[];canWrite:boolean}) {
 const textRequest=useRef<{text:string;key:string}|null>(null);
 const uploadedSource=useRef<{file:File;sourceId:string}|null>(null);
 const router=useRouter(),file=useRef<HTMLInputElement>(null),abort=useRef<AbortController|null>(null);
 useEffect(()=>()=>abort.current?.abort(),[]);
 const [open,setOpen]=useState(false),[sourceId,setSourceId]=useState(""),[text,setText]=useState(""),[busy,setBusy]=useState(false),[notice,setNotice]=useState("");
 async function attach(body:unknown){const res=await fetch("/api/research/benchmarks/"+accountId+"/works/"+workId+"/source",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify(body),signal:abort.current?.signal});const data=await res.json();if(!res.ok)throw Error(data.message||"未能关联原件");return data;}
 async function run(operation:()=>Promise<{message?:string}>){if(busy)return;setBusy(true);setNotice("");abort.current=new AbortController();
 try{const result=await operation();setNotice(result.message||"已关联这条作品。");router.refresh();}catch(error){if(!abort.current.signal.aborted)setNotice(error instanceof TypeError?"请求中断，请先核对已保存资料，再重试关联。":error instanceof Error?error.message:"操作未完成，请重试。");}finally{setBusy(false);}}
 async function upload(){const selected=file.current?.files?.[0];if(!selected)return;await run(async()=>{if(uploadedSource.current?.file===selected)return attach({sourceItemId:uploadedSource.current.sourceId,autoTranscribe:true});const body=new FormData();body.append("files",selected);const res=await fetch("/api/source-items/upload",{method:"POST",body,signal:abort.current?.signal});const data=await res.json();const result=data.results?.[0];if(!res.ok||!result?.sourceItemId)throw Error(result?.message||data.message||"上传失败");uploadedSource.current={file:selected,sourceId:result.sourceItemId};return attach({sourceItemId:result.sourceItemId,autoTranscribe:true});});}
 return <section className="work-source-recovery"><button type="button" disabled={!canWrite} onClick={()=>setOpen(!open)}>{open?"收起补充原件":"链接无法读取？上传视频或补充文字"}</button>{open?<div><p>只关联到当前作品；保留已有原件与报告。音视频最多 50 MB，可上传 MP4、MOV、MP3、WAV、M4A。关联音视频后按已配置服务尝试转录；不会启用付费回退。</p>
 <label>上传合法可使用的原件<input ref={file} type="file" accept=".mp4,.mov,.mp3,.wav,.m4a,.txt,.md" disabled={busy} onChange={()=>{uploadedSource.current=null;}}/></label><button disabled={busy||!canWrite} onClick={()=>void upload()}>上传并关联</button>
 <label>或关联已保存资料<select value={sourceId} disabled={busy} onChange={e=>setSourceId(e.target.value)}><option value="">选择资料</option>{sources.map(s=><option key={s.id} value={s.id}>{s.title} · {s.sourceType}</option>)}</select></label><button disabled={busy||!sourceId||!canWrite} onClick={()=>void run(()=>attach({sourceItemId:sourceId,autoTranscribe:true}))}>确认关联资料</button>
 <label>或粘贴核对后的原文<textarea aria-label="补充作品原文" value={text} maxLength={500000} rows={5} disabled={busy} onChange={e=>setText(e.target.value)}/></label><button disabled={busy||!text.trim()||!canWrite} onClick={()=>void run(()=>{if(textRequest.current?.text!==text)textRequest.current={text,key:crypto.randomUUID()};return attach({text,requestKey:textRequest.current.key});})}>保存文字并关联</button>
 <button type="button" onClick={()=>{abort.current?.abort();setOpen(false);setNotice("已取消等待；已保存的资料仍保留。");}}>取消返回</button>{busy?<p role="status">正在保存原件，完成后关联当前作品…</p>:null}</div>:null}{notice?<p role="status">{notice}</p>:null}</section>;
}
