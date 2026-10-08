"use client";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { ArrowLeft, BookOpen, Check, ChevronDown, Download, History, MessageSquare, Send, Square } from "lucide-react";
import type { PersonalContentView } from "@/lib/contracts/content";
import type { AssistantMessageDTO, AssistantThreadDTO, AssistantStreamEvent } from "@/lib/contracts/assistant";
import { useArtifactEditor } from "../projects/use-artifact-editor";
import { ArtifactUnsavedDialog } from "../projects/artifact-editor";
type Props = { initial: PersonalContentView; thread: AssistantThreadDTO; canWrite: boolean; projects: Array<{id:string;title:string}>; materials: Array<{id:string;title:string|null}>; skills: Array<{id:string;title:string;version:number}>; model: {configured:boolean;defaultLabel:string;models:Array<{provider:"KIMI"|"DEEPSEEK"|"CUSTOM";modelId:string;label:string}>} };
async function request(url:string,method:string,value?:unknown) {
 const response=await fetch(url,{method,cache:"no-store",headers:value?{"content-type":"application/json"}:undefined,body:value?JSON.stringify(value):undefined,signal:AbortSignal.timeout(15000)});
 const body=await response.json().catch(()=>({})); if(!response.ok) throw Error(body.message||"操作未完成，当前内容仍保留。"); return body;
}
function Text({children}:{children:string}) {
 return <ReactMarkdown skipHtml remarkPlugins={[remarkGfm]} components={{
  img:({alt})=><span>{alt||"图片引用"}</span>,
  a:({href,children})=>href&&(href.startsWith("https://")||href.startsWith("http://")||(href.startsWith("/")&&!href.startsWith("//")))?<a href={href} target={href.startsWith("http")?"_blank":undefined} rel="noopener noreferrer">{children}</a>:<span>{children}</span>,
 }}>{children}</ReactMarkdown>;
}
export function PersonalContentEditor({initial,thread,canWrite,projects,materials,skills,model}:Props) {
 const [current,setCurrent]=useState(initial), row=useRef(initial);
 const [contextForm,setContextForm]=useState({ownAngle:initial.ownAngle,sourceItemIds:initial.sourceItemIds,skillVersionIds:initial.skillVersionIds}), form=useRef(contextForm); form.current=contextForm;
 const [contextError,setContextError]=useState(""), [notice,setNotice]=useState(""), [operationBusy,setOperationBusy]=useState(false);
 const contextPending=useRef<Promise<boolean>|null>(null);
 const [pane,setPane]=useState<"reference"|"assistant">("reference"), [mobileView,setMobileView]=useState<"draft"|"reference"|"assistant">("draft"), [preview,setPreview]=useState(false), [versions,setVersions]=useState(false);
 const [messages,setMessages]=useState(thread.messages), [question,setQuestion]=useState(""), [assistantBusy,setAssistantBusy]=useState(false), [assistantError,setAssistantError]=useState("");
 const assistantAbort=useRef<AbortController|null>(null), live=useRef(true), chatEnd=useRef<HTMLDivElement>(null);
 const [modelId,setModelId]=useState("");
 const [conflict,setConflict]=useState<PersonalContentView|null>(null), conflictDialog=useRef<HTMLDialogElement>(null);
 function accept(value:PersonalContentView,lane:"draft"|"context"|"all"="all") {
  const before=row.current;
  const next=lane==="draft"?{...before,title:value.title,content:value.content,version:value.version,revisions:value.revisions,updatedAt:value.updatedAt}:lane==="context"?{...before,ownAngle:value.ownAngle,sourceItemIds:value.sourceItemIds,skillVersionIds:value.skillVersionIds,contextVersion:value.contextVersion,references:value.references,updatedAt:value.updatedAt}:value;
  row.current=next;setCurrent(next);
 }
 const contextDirty=useCallback(()=>{const value=form.current,saved=row.current;return value.ownAngle!==saved.ownAngle||JSON.stringify(value.sourceItemIds)!==JSON.stringify(saved.sourceItemIds)||JSON.stringify(value.skillVersionIds)!==JSON.stringify(saved.skillVersionIds);},[]);
 const flushContext=useCallback(async():Promise<boolean>=>{
  if(contextPending.current&&!await contextPending.current)return false;
  for(let attempt=0;attempt<3&&contextDirty();attempt++){
   const saved=row.current,fields={...form.current};
   const pending=(async()=>{try{const value=await request("/api/artifacts/"+saved.artifactId+"/context","PUT",{expectedContextVersion:saved.contextVersion,...fields}) as PersonalContentView;accept(value,"context");setContextError("");return true;}catch(cause){setContextError(cause instanceof Error?cause.message:"自己的角度没有保存成功。");return false;}})();
   contextPending.current=pending;const ok=await pending;contextPending.current=null;if(!ok)return false;
  }
  return !contextDirty();
 },[contextDirty]);
 const editor=useArtifactEditor({contentId:initial.artifactId,canWrite,initialArtifact:current,additionalDirty:contextDirty,beforeSave:flushContext,onSaved:value=>accept({...row.current,...value} as PersonalContentView,"draft")});
 useEffect(()=>{if(!canWrite||!editor.dirty||editor.busy||editor.error||contextError)return;const timer=setTimeout(()=>void editor.save(),1000);return()=>clearTimeout(timer);},[editor.title,editor.body,contextForm,editor.dirty,editor.busy,editor.error,contextError,canWrite]);
 useEffect(()=>{live.current=true;return()=>{live.current=false;assistantAbort.current?.abort();};},[]);
 useEffect(()=>{chatEnd.current?.scrollIntoView({block:"nearest"});},[messages,pane]);
 useEffect(()=>{if(conflict&&!conflictDialog.current?.open)conflictDialog.current?.showModal();if(!conflict&&conflictDialog.current?.open)conflictDialog.current.close();},[conflict]);
 function chooseContext(field:"sourceItemIds"|"skillVersionIds",id:string,checked:boolean){setContextError("");setContextForm(value=>({...value,[field]:checked?[...value[field],id]:value[field].filter(item=>item!==id)}));}
 async function saveVersion(restoreRevisionId?:string){
  if(operationBusy||!await editor.save())return;setOperationBusy(true);setNotice("");
  try{const value=await request("/api/artifacts/"+row.current.artifactId+"/versions","POST",{expectedVersion:row.current.version,...(restoreRevisionId?{restoreRevisionId}:{})}) as PersonalContentView;accept(value);editor.showArtifact(value);setNotice(restoreRevisionId?"已恢复为新版本，后续版本仍保留。":"当前稿件版本已保存。");}
  catch(cause){setNotice(cause instanceof Error?cause.message:"版本未保存。");}finally{setOperationBusy(false);}
 }
 async function classify(projectId:string){if(operationBusy||!await editor.save())return;setOperationBusy(true);try{const value=await request("/api/artifacts/"+row.current.artifactId+"/classification","PATCH",{projectId:projectId||null}) as PersonalContentView;accept(value);setNotice("整理位置已更新，稿件和聊天仍只你可见。");}catch(cause){setNotice(cause instanceof Error?cause.message:"归类未完成。");}finally{setOperationBusy(false);}}
 function putMessage(value:AssistantMessageDTO){setMessages(items=>{const found=items.some(item=>item.id===value.id);return found?items.map(item=>item.id===value.id?value:item):[...items,value];});}
 async function refreshMessages(){try{const value=await request("/api/artifacts/"+initial.artifactId+"/assistant","GET") as AssistantThreadDTO;if(live.current)setMessages(value.messages);}catch{/* Current messages remain visible. */}}
 async function send(content:string,mode:"chat"|"rewrite",retryUserMessageId?:string){
  if(assistantBusy||!canWrite||!content.trim()||!await editor.save())return;
  setPane("assistant");setMobileView("assistant");setAssistantError("");setAssistantBusy(true);
  const aborter=new AbortController();assistantAbort.current=aborter;
  try{
   const saved=row.current,selected=model.models.find(item=>item.modelId===modelId);
   const response=await fetch("/api/artifacts/"+saved.artifactId+"/assistant",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({content,mode,requestId:crypto.randomUUID(),expectedVersion:saved.version,expectedContextVersion:saved.contextVersion,...(retryUserMessageId?{retryUserMessageId}:{}),...(selected?{modelSelection:{provider:selected.provider,modelId:selected.modelId}}:{})}),signal:aborter.signal});
   if(!response.ok){const value=await response.json().catch(()=>({}));throw Error(value.message||"助手暂时不可用。");}
   if(!response.body)throw Error("没有收到回复流，请重试。");
   setQuestion("");const reader=response.body.getReader(),decoder=new TextDecoder();let pending="";
   while(true){const {value,done}=await reader.read();if(done)break;pending+=decoder.decode(value,{stream:true});let boundary;
    while((boundary=pending.indexOf("\n\n"))>=0){const frame=pending.slice(0,boundary);pending=pending.slice(boundary+2);const data=frame.split("\n").filter(line=>line.startsWith("data: ")).map(line=>line.slice(6)).join("\n");if(!data)continue;const event=JSON.parse(data) as AssistantStreamEvent;
     if(event.type==="start"){putMessage(event.userMessage);putMessage(event.assistantMessage);}
     else if(event.type==="delta")setMessages(items=>items.map(item=>item.id===event.messageId?{...item,status:"STREAMING",content:item.content+event.delta}:item));
     else if(event.type==="done"||event.type==="stopped")putMessage(event.message);
     else if(event.type==="error"){setAssistantError(event.message);setMessages(items=>items.map(item=>item.id===event.messageId?{...item,status:"FAILED"}:item));}
    }
   }
  }catch(cause){if(!aborter.signal.aborted)setAssistantError(cause instanceof Error?cause.message:"连接中断，稿件和已收到的回复保留。");}
  finally{if(live.current){setAssistantBusy(false);await refreshMessages();}assistantAbort.current=null;}
 }
 async function apply(message:AssistantMessageDTO){
  if(operationBusy||!await editor.save())return;setOperationBusy(true);setNotice("");
  try{const value=await request("/api/artifacts/"+row.current.artifactId+"/suggestions/apply","POST",{messageId:message.id,expectedVersion:row.current.version,expectedContextVersion:row.current.contextVersion}) as PersonalContentView;accept(value);editor.showArtifact(value);setMobileView("draft");setNotice("已采用建议，原稿已经保留为历史版本。");}
  catch(cause){setAssistantError(cause instanceof Error?cause.message:"建议未应用。");}finally{setOperationBusy(false);}
 }
 async function loadLatest(){try{setConflict(await request("/api/artifacts/"+initial.artifactId,"GET"));}catch(cause){setNotice(cause instanceof Error?cause.message:"暂时无法读取最新稿件。");}}
 async function resolveConflict(keepMine:boolean){
  if(!conflict)return;const title=editor.title,body=editor.body,local={...form.current};
  if(keepMine){
   try{const checkpoint=await request("/api/artifacts/"+conflict.artifactId+"/versions","POST",{expectedVersion:conflict.version}) as PersonalContentView;accept(checkpoint);editor.showArtifact(checkpoint);editor.editTitle(title);editor.editBody(body);setContextForm(local);setContextError("");setConflict(null);setNotice("另一处的稿件已保留为版本，你的编辑仍保留，请对照后保存。");}
   catch(cause){setNotice(cause instanceof Error?cause.message:"最新稿件又有变化，请重新核对。");}
  }
  else{accept(conflict);editor.showArtifact(conflict);setContextError("");setContextForm({ownAngle:conflict.ownAngle,sourceItemIds:conflict.sourceItemIds,skillVersionIds:conflict.skillVersionIds});setConflict(null);}
 }
 const referencePanel=<section className="content-reference-panel"><header><span>为这条内容选用的参考</span><h2>借结构，写自己的表达</h2></header>{current.references.length?current.references.map(reference=><article className="content-adopted-reference" key={reference.kind+reference.sourceId}><div><strong>{reference.title}</strong><small>所选第{reference.version}版 · 已保存参考快照</small></div>{reference.blocks.filter(block=>block.type==="text").map(block=><section key={block.id}><h3>{block.title}</h3>{block.type==="text"?<Text>{block.text}</Text>:null}{block.limitation?<small>{block.limitation}</small>:null}</section>)}<Link href={"/research/results/"+reference.kind+"/"+reference.sourceId}>回到原研究 →</Link></article>):<div className="content-reference-empty"><BookOpen size={23}/><p>没有选用研究也可以直接写。</p><Link href="/research">按需要找参考 →</Link></div>}
  <details className="content-optional-context"><summary>按需使用资料 <span>{contextForm.sourceItemIds.length}</span></summary>{materials.length?materials.map(item=><label key={item.id}><input type="checkbox" checked={contextForm.sourceItemIds.includes(item.id)} disabled={!canWrite||(!contextForm.sourceItemIds.includes(item.id)&&contextForm.sourceItemIds.length>=8)} onChange={event=>chooseContext("sourceItemIds",item.id,event.target.checked)}/><span>{item.title||"未命名资料"}</span></label>):<p>可先到资料库添加自己的资料。</p>}</details>
  <details className="content-optional-context"><summary>可选 Skill <span>{contextForm.skillVersionIds.length}</span></summary>{skills.length?skills.map(item=><label key={item.id}><input type="checkbox" checked={contextForm.skillVersionIds.includes(item.id)} disabled={!canWrite||(!contextForm.skillVersionIds.includes(item.id)&&contextForm.skillVersionIds.length>=5)} onChange={event=>chooseContext("skillVersionIds",item.id,event.target.checked)}/><span>{item.title}<small>V{item.version}</small></span></label>):<p>不选择Skill，也能正常写作。</p>}</details></section>;
 const assistantPanel=<section className="content-assistant-panel"><header><div><h2>这条稿件的助手</h2><p>只使用当前稿件和你主动选择的参考。</p></div></header>
  <div className="content-chat-messages">{!messages.length?<p className="content-chat-empty">说说想怎么写，或让助手调整某一段。建议会先留在这里，采用后才改稿。</p>:messages.map((message,index)=><article key={message.id} className={"content-chat-message "+(message.role==="USER"?"from-user":"from-assistant")}><header>{message.role==="USER"?"我":"助手"}{message.status==="STREAMING"?<span>正在回复…</span>:null}</header><div className="assistant-markdown"><Text>{message.content||"正在组织表达…"}</Text></div>{message.warnings.length?<details><summary>核对提醒</summary>{message.warnings.map((warning,i)=><p key={i}>{warning}</p>)}</details>:null}
   {message.status==="COMPLETED"&&message.structuredResult?.type==="REWRITE"?<div className="content-suggestion-actions"><details><summary>对照修改前的稿件</summary><pre>{message.structuredResult.original||"此前为一份空白稿件。"}</pre></details>{message.baseVersion!==current.version||message.baseContextVersion!==current.contextVersion?<p>稿件或参考已经变化，这项建议请重新核对。</p>:null}<button type="button" disabled={!canWrite||operationBusy||assistantBusy||message.baseVersion!==current.version||message.baseContextVersion!==current.contextVersion} onClick={()=>void apply(message)}>采用到稿件 <Check size={14}/></button></div>:null}
   {(message.status==="FAILED"||message.status==="STOPPED")&&message.role==="ASSISTANT"?<button type="button" disabled={assistantBusy} onClick={()=>{const user=messages.slice(0,index).reverse().find(item=>item.role==="USER");if(user)void send(user.content,message.resultType==="REWRITE"?"rewrite":"chat",user.id);}}>按这次上下文重试</button>:null}</article>)}<div ref={chatEnd}/></div>
  {assistantError?<p role="alert" className="content-operation-error">{assistantError}</p>:null}
  <form className="content-chat-composer" onSubmit={event=>{event.preventDefault();void send(question,"chat");}}><textarea aria-label="和这条稿件的助手讨论" rows={3} value={question} onChange={event=>setQuestion(event.target.value)} maxLength={4000} placeholder="比如：这段太绕了，保持观点，写得更口语一点…" disabled={!canWrite||assistantBusy}/><div>{model.models.length?<select aria-label="创作模型" value={modelId} onChange={event=>setModelId(event.target.value)}><option value="">工作区默认模型</option>{model.models.map(item=><option key={item.provider+item.modelId} value={item.modelId}>{item.label}</option>)}</select>:<span>{model.defaultLabel}</span>}{assistantBusy?<button type="button" onClick={()=>assistantAbort.current?.abort()}><Square size={14}/>停止</button>:<button type="submit" disabled={!canWrite||!question.trim()}><Send size={14}/>发送</button>}</div></form></section>;
 return <article className="personal-content-desk" data-testid="personal-content-editor">
  <header className="content-desk-toolbar"><Link href="/content"><ArrowLeft size={15}/>我的稿件</Link><span className="content-private-badge">仅我可见</span><details className="content-classification"><summary>{current.projectTitle||"未归类"}<ChevronDown size={13}/></summary><label>整理到项目<select aria-label="稿件归类" value={current.projectId||""} disabled={!canWrite||operationBusy} onChange={event=>void classify(event.target.value)}><option value="">未归类 · 个人日常</option>{projects.map(project=><option key={project.id} value={project.id}>{project.title}</option>)}</select></label><p>归类不会分享稿件或私人聊天。</p></details><span className={"content-save-status"+(editor.dirty?" is-dirty":"")}>{editor.error||contextError?"保存未完成":editor.busy?"正在保存":editor.dirty?"有待保存编辑":"工作草稿已保存"}</span></header>
  <nav className="content-mobile-views" aria-label="稿件工作区域">{([["draft","稿件"],["reference","参考"],["assistant","助手"]] as const).map(([value,label])=><button key={value} type="button" aria-current={mobileView===value?"page":undefined} onClick={()=>{setMobileView(value);if(value!=="draft")setPane(value);}}>{label}</button>)}</nav>
  <div className="content-desk-layout" data-mobile-view={mobileView}>
   <main className="content-writing-pane" ref={editor.editorRef}>
    <input className="content-title-input" aria-label="成果名称" value={editor.title==="未命名内容"?"":editor.title} onChange={event=>editor.editTitle(event.target.value)} maxLength={200} placeholder="给这条内容起个名字，也可以稍后再写" disabled={!canWrite}/>
    <section className="content-own-angle"><label>我的角度<textarea aria-label="我的角度" value={contextForm.ownAngle} onChange={event=>{setContextError("");setContextForm(value=>({...value,ownAngle:event.target.value}));}} rows={2} maxLength={4000} placeholder="我真正想说什么？也可以直接在下面写，不必先填完。" disabled={!canWrite}/></label></section>
    <div className="content-manuscript-toolbar"><nav aria-label="稿件阅读模式"><button type="button" aria-pressed={!preview} onClick={()=>setPreview(false)}>写稿</button><button type="button" aria-pressed={preview} onClick={()=>setPreview(true)}>预览</button></nav><button type="button" disabled={!canWrite||assistantBusy||operationBusy} onClick={()=>void send("根据我自己的角度与主动采用的参考，给一版可修改的稿件。保留已有稿件未要求修改的内容，不借用参考作者的经历或数字。","rewrite")}>给一版草稿 <MessageSquare size={14}/></button></div>
    {preview?<div className="content-manuscript-preview assistant-markdown"><Text>{editor.body||"稿件还没有正文。回到写稿，先写一句自己的表达。"}</Text></div>:<textarea className="content-manuscript-input" aria-label="成果正文" value={editor.body} onChange={event=>editor.editBody(event.target.value)} maxLength={1_000_000} placeholder="从一句自己的表达开始。可以写日常、观点、故事，也可以参考左边的方法。" disabled={!canWrite}/>}
    <footer className="content-manuscript-footer"><span>{editor.body.length.toLocaleString()} 字 · 已存 {current.revisions.length} 个版本</span><div><button type="button" disabled={!canWrite||operationBusy} onClick={()=>void saveVersion()}>存为一版</button><button type="button" aria-expanded={versions} onClick={()=>setVersions(!versions)}><History size={14}/>历史</button><button type="button" onClick={()=>{void editor.save().then(saved=>{if(saved)editor.download();});}}><Download size={14}/>导出</button></div></footer>
    {versions?<section className="content-version-history"><h2>稿件版本</h2>{current.revisions.map(revision=><details key={revision.id}><summary><span>V{revision.revision} · {revision.origin==="AI"?"采用助手建议":"自己的编辑"}</span><time>{new Date(revision.createdAt).toLocaleString("zh-CN",{timeZone:"Asia/Singapore"})}</time></summary><pre>{revision.body||"这是一份空白起稿。"}</pre><button type="button" disabled={!canWrite||operationBusy||revision.current} onClick={()=>void saveVersion(revision.id)}>{revision.current?"当前保存版本":"恢复为新版本"}</button></details>)}</section>:null}
    {editor.error||contextError?<div className="content-operation-error" role="alert"><p>{editor.error||contextError}</p><button type="button" onClick={()=>void editor.save()}>重试保存</button><button type="button" onClick={()=>void loadLatest()}>核对最新稿件</button></div>:null}{notice?<p role="status" className="content-notice">{notice}</p>:null}
   </main>
   <aside className="content-assistance-pane"><nav aria-label="稿件辅助区域"><button type="button" aria-current={pane==="reference"?"page":undefined} onClick={()=>setPane("reference")}><BookOpen size={15}/>参考</button><button type="button" aria-current={pane==="assistant"?"page":undefined} onClick={()=>setPane("assistant")}><MessageSquare size={15}/>助手</button></nav>{pane==="reference"?referencePanel:assistantPanel}</aside>
  </div>
  <ArtifactUnsavedDialog editor={editor} canWrite={canWrite}/>
  <dialog className="content-conflict-dialog" ref={conflictDialog} aria-label="核对最新稿件" onCancel={event=>{event.preventDefault();setConflict(null);}}>{conflict?<><h2>这条内容在另一处有更新</h2><p>当前输入仍保留。对照后选择继续编辑哪一份。</p><div><section><h3>我的编辑</h3><pre>{editor.body}</pre></section><section><h3>最新保存</h3><pre>{conflict.content}</pre></section></div><footer><button type="button" onClick={()=>void resolveConflict(true)}>保留我的编辑，继续核对</button><button type="button" onClick={()=>void resolveConflict(false)}>使用最新保存稿</button><button type="button" onClick={()=>setConflict(null)}>取消</button></footer></>:null}</dialog>
 </article>;
}
