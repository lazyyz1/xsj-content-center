import Link from "next/link";
import {requireWorkspace} from "@/server/access";
import {personalReportPool} from "@/server/research/work-research-service";
import {ResearchError} from "@/server/research/access";
import {notFound} from "next/navigation";
import "@/components/research/report-desk.css";
export default async function ReportTopicPool({searchParams}:{searchParams:Promise<{topic?:string}>}){
 const {workspace,session}=await requireWorkspace(),query=await searchParams;
 let items:Awaited<ReturnType<typeof personalReportPool>>;
 try{items=await personalReportPool({workspaceId:workspace.id,userId:session.user.id},{selectedId:query.topic});}catch(error){if(error instanceof ResearchError&&error.status===404)notFound();throw error;}
 return <article className="rd-pool"><header><h1>我的选题池</h1><p>主动选用的报告结构保存在这里，写自己的内容时继续使用。仅本人可见。</p><Link href="/research/results">← 返回拆解报告</Link></header>{items.length?<ul>{items.map(item=><li key={item.artifactId} id={"topic-"+item.artifactId}><div><h2>{item.title}</h2><p>{item.started?"已有自己的稿件":"待写 · 已保留参考结构"} · {new Date(item.updatedAt).toLocaleDateString("zh-CN",{timeZone:"Asia/Singapore"})}</p></div><Link href={"/research/results?report="+encodeURIComponent(item.reportId)}>读原报告</Link><Link href={"/content/"+item.artifactId}>{item.started?"继续写":"开始自己的表达"} →</Link></li>)}</ul>:<p>还没有选题。在拆解报告中点“入选题池”后会出现在这里。</p>}</article>;
}
