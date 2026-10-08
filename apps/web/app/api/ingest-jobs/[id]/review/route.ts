import { db,findIngestJobForUser } from "@content-center/db";
import {NextResponse} from "next/server";
import {z} from "zod";
import {apiError,getApiWorkspaceContext} from "@/server/api-access";
export async function POST(request:Request,route:{params:Promise<{id:string}>}){
 const context=await getApiWorkspaceContext();if(!context)return apiError("UNAUTHORIZED",401);
 if(!["OWNER","ADMIN"].includes(context.role))return apiError("FORBIDDEN",403);
 const input=z.object({confirmation:z.literal("CONFIRMED_NO_RESULT"),note:z.string().trim().min(6).max(1000)}).strict().safeParse(await request.json().catch(()=>null));
 if(!input.success)return apiError("REVIEW_REQUIRED",400,"请先核对转录服务并填写核对依据。");
 const {id}=await route.params;const job=await findIngestJobForUser(db,{userId:context.session.user.id,workspaceId:context.workspace.id,jobId:id});
 if(!job)return apiError("NOT_FOUND",404);
 const changed=await db.$transaction(async tx=>{
 const updated=await tx.ingestJob.updateMany({where:{id:job.id,workspaceId:context.workspace.id,jobType:"TRANSCRIBE",status:"FAILED",errorCode:"ASR_RESULT_UNCERTAIN"},data:{errorCode:"ASR_CONFIRMED_NO_RESULT",errorMessage:"管理员已确认没有可恢复结果，可以明确重试。"}});
 if(updated.count)await tx.auditLog.create({data:{workspaceId:context.workspace.id,userId:context.session.user.id,action:"transcription.uncertain_reviewed",resourceType:"ingest_job",resourceId:job.id,metadata:{confirmation:input.data.confirmation,note:input.data.note}}});
 return updated.count;
 });
 if(!changed)return apiError("JOB_NOT_REVIEWABLE",409,"此任务已核对或状态已变化。");
 return NextResponse.json({status:"REVIEWED",message:"已记录核对依据。不会自动重试，请明确重新发起转录。"});
}
