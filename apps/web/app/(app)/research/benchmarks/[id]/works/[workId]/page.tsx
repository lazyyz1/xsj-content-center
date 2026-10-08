import Link from "next/link";
import {notFound,redirect} from "next/navigation";
import {isLocalReviewOffline} from "@content-center/providers";
import {requireWorkspace} from "@/server/access";
import {ResearchError} from "@/server/research/access";
import {workCreationChoices,workResearchOverview} from "@/server/research/work-research-service";
import {safeResearchReturn} from "@/server/research/benchmark-workbench-math";
import {WorkOriginalMedia,WorkResearchControls} from "@/components/research/work-research-controls";
import {WorkSourceRecovery} from "@/components/research/work-source-recovery";
import {SourceProcessingPoller} from "@/components/library/source-processing-poller";
import {researchTitle} from "@/lib/research-presentation";
import "@/components/research/benchmark-dossier.css";
import "@/components/research/benchmark-workbench.css";
export default async function WorkResearchPage({params,searchParams}:{params:Promise<{id:string;workId:string}>;searchParams:Promise<{returnTo?:string;report?:string}>}){
 const {workspace,session,role}=await requireWorkspace(),{id,workId}=await params,search=await searchParams;
 const actor={workspaceId:workspace.id,userId:session.user.id},returnTo=safeResearchReturn(search.returnTo);
 try{
  const view=await workResearchOverview(actor,id,workId,{runId:search.report}),{current,latest}=view;
  if(latest)redirect("/research/results?report="+encodeURIComponent(latest.id)+"&returnTo="+encodeURIComponent(returnTo));
  const choices=await workCreationChoices(actor);
  return <article className="research-work-page"><Link href={returnTo}>← 返回作品列表</Link><header className="work-research-hero"><small>{view.account.name} · 作品资料准备</small><h1>{researchTitle(current.title)}</h1><p>{current.contentText?"原文已保存，可以据此生成拆解报告。":"先准备可读原文，再生成作品拆解。"}完成后进入报告页阅读。</p></header>
  {view.sourceJob&&current.sourceItemId?<><SourceProcessingPoller sourceId={current.sourceItemId} active={["QUEUED","RUNNING"].includes(view.sourceJob.status)}/>{view.sourceJob.errorMessage?<p role="status">{view.sourceJob.errorMessage}</p>:null}</>:null}
  <section className="work-research-section"><WorkResearchControls accountId={id} workId={workId} view={view} canWrite={role!=="VIEWER"} externalAvailable={!isLocalReviewOffline("LLM")} collectionAvailable={!isLocalReviewOffline("RESEARCH_COLLECTION")}/><details><summary>原文与原视频 · {current.contentLength} 字</summary>{current.mediaAssetId&&current.sourceItemId?<WorkOriginalMedia accountId={id} workId={workId} sourceItemId={current.sourceItemId} originalUrl={current.url}/>:null}<p style={{whiteSpace:"pre-wrap"}}>{current.contentText||"暂无可读原文。"}</p>{current.sourceItemId?<Link href={"/library/"+current.sourceItemId}>打开来源资料 →</Link>:null}</details><WorkSourceRecovery accountId={id} workId={workId} sources={choices.materials} canWrite={role!=="VIEWER"}/></section></article>;
 }catch(error){if(error instanceof ResearchError&&error.status===404)notFound();throw error;}
}
