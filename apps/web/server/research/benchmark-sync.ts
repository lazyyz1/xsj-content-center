import "server-only";
import {db,type Prisma} from "@content-center/db";
import {isLocalReviewOffline} from "@content-center/providers";
import {z} from "zod";
import {getBenchmarkWorks} from "../discovery/service";
import {researchMember,ResearchError,type ResearchActor} from "./access";
const schema=z.object({continueRunId:z.string().min(1).max(100).optional()}).strict();
const json=(value:unknown)=>JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
function metadata(value:unknown){return value&&typeof value==="object"&&!Array.isArray(value)?value as Record<string,unknown>:{};}
function dto(run:{id:string;status:string;pageCount:number;seenCount:number;undatedCount:number;nextOffset:number;stopReason:string|null;errorMessage:string|null;profileSnapshot:unknown;createdAt:Date;startedAt?:Date|null;completedAt:Date|null}){
 const profile=metadata(run.profileSnapshot);
 const interrupted=["QUEUED","RUNNING"].includes(run.status)&&(run.startedAt??run.createdAt).getTime()<Date.now()-300000;
 return {id:run.id,status:interrupted?"FAILED":run.status,pageCount:run.pageCount,seenCount:run.seenCount,undatedCount:run.undatedCount,added:typeof profile.added==="number"?profile.added:0,updated:typeof profile.updated==="number"?profile.updated:0,nextOffset:typeof profile.nextOffset==="number"?profile.nextOffset:null,coverage:run.stopReason,errorMessage:interrupted?"上次同步已中断，已有数据保留，可重新同步。":run.errorMessage,createdAt:run.createdAt.toISOString(),completedAt:run.completedAt?.toISOString()??null,provider:"REDFOX",cached:profile.cached===true};
}
export async function manualBenchmarkSyncStatus(actor:ResearchActor,accountId:string){
 await researchMember(actor);
 const account=await db.benchmarkAccount.findFirst({where:{id:accountId,workspaceId:actor.workspaceId,enabled:true},select:{id:true}});
 if(!account)throw new ResearchError("NOT_FOUND","账号不存在或不可访问。",404);
 const run=await db.benchmarkCollectionRun.findFirst({where:{workspaceId:actor.workspaceId,benchmarkAccountId:accountId,profileSnapshot:{path:["mode"],equals:"MANUAL_PAGE"}},orderBy:[{createdAt:"desc"},{id:"desc"}]});
 return {run:run?dto(run):null};
}
export async function startManualBenchmarkSync(actor:ResearchActor,accountId:string,value:unknown={}){
 await researchMember(actor,true);const input=schema.parse(value);
 if(isLocalReviewOffline("RESEARCH_COLLECTION"))throw new ResearchError("BENCHMARK_INTEGRATION_PENDING","当前环境没有启用研究采集。",409);
 const account=await db.benchmarkAccount.findFirst({where:{id:accountId,workspaceId:actor.workspaceId,enabled:true},select:{id:true,platform:true}});
 if(!account)throw new ResearchError("NOT_FOUND","账号不存在或不可访问。",404);
 if(account.platform!=="DOUYIN"&&account.platform!=="XIAOHONGSHU")throw new ResearchError("UNSUPPORTED_PLATFORM","本轮仅接入抖音与小红书账号采集。",409);
 let offset=0;
 if(input.continueRunId){
  const previous=await db.benchmarkCollectionRun.findFirst({where:{id:input.continueRunId,workspaceId:actor.workspaceId,benchmarkAccountId:accountId,status:"COMPLETED"}});
  const profile=metadata(previous?.profileSnapshot);
  if(!previous||profile.mode!=="MANUAL_PAGE"||typeof profile.nextOffset!=="number"||!Number.isSafeInteger(profile.nextOffset)||profile.nextOffset<=Number(profile.requestOffset??0))throw new ResearchError("PAGINATION_UNAVAILABLE","没有已核实的下一页；已有作品保留。",409);
  offset=profile.nextOffset;
 }
 if(offset>=200)throw new ResearchError("COLLECTION_LIMIT","近期采集已到 200 条分页范围；已有作品保留。",409);
 const run=await db.$transaction(async tx=>{
  await tx.$executeRawUnsafe("SELECT pg_advisory_xact_lock(hashtextextended($1,0))",actor.workspaceId+":manual-sync:"+accountId);
  const cutoff=new Date(Date.now()-300000);
  await tx.benchmarkCollectionRun.updateMany({where:{workspaceId:actor.workspaceId,benchmarkAccountId:accountId,status:{in:["QUEUED","RUNNING"]},profileSnapshot:{path:["mode"],equals:"MANUAL_PAGE"},OR:[{startedAt:{lt:cutoff}},{startedAt:null,createdAt:{lt:cutoff}}]},data:{status:"FAILED",completedAt:new Date(),stopReason:"STALE_MANUAL_SYNC",errorMessage:"上次同步已中断，已有数据保留。"}});
  const active=await tx.benchmarkCollectionRun.findFirst({where:{workspaceId:actor.workspaceId,benchmarkAccountId:accountId,status:{in:["QUEUED","RUNNING"]}}});
  if(active)throw new ResearchError("COLLECTION_ALREADY_RUNNING","这个账号已有采集任务正在运行。",409);
  return tx.benchmarkCollectionRun.create({data:{workspaceId:actor.workspaceId,benchmarkAccountId:accountId,requestedById:actor.userId,status:"QUEUED",rangeStart:new Date(0),rangeEnd:new Date(),nextOffset:offset,profileSnapshot:json({mode:"MANUAL_PAGE",requestOffset:offset,nextOffset:null,provider:"REDFOX"})}});
 });
 return {run:dto(run)};
}
export async function executeManualBenchmarkSync(actor:ResearchActor,accountId:string,runId:string){
 const run=await db.benchmarkCollectionRun.findFirst({where:{id:runId,workspaceId:actor.workspaceId,benchmarkAccountId:accountId,requestedById:actor.userId,status:"QUEUED"}});
 if(!run)return;
 const offset=Number(metadata(run.profileSnapshot).requestOffset??0);
 const claimed=await db.benchmarkCollectionRun.updateMany({where:{id:runId,status:"QUEUED"},data:{status:"RUNNING",startedAt:new Date()}});
 if(!claimed.count)return;
 try{
  await researchMember(actor,true);
  const page=await getBenchmarkWorks({...actor,benchmarkId:accountId,sort:"LATEST",offset,purpose:"RESEARCH_COLLECTION"});
  await db.benchmarkCollectionRun.updateMany({where:{id:runId,status:"RUNNING"},data:{status:"COMPLETED",completedAt:new Date(),pageCount:1,seenCount:page.items.length,inRangeCount:page.items.filter(item=>item.publishedAt).length,undatedCount:page.items.filter(item=>!item.publishedAt).length,nextOffset:page.nextOffset??offset,stopReason:page.coverage,profileSnapshot:json({mode:"MANUAL_PAGE",requestOffset:offset,nextOffset:page.nextOffset,added:page.added,updated:page.updated,cached:page.cached,provider:"REDFOX",providerRequestId:page.providerRequestId??null,coverage:page.coverage})}});
 }catch(error){
  const code=(error as {code?:string}).code;
  const message=code==="REDFOX_QUOTA_EXCEEDED"?"红狐积分余额不足；已有账号、作品和报告保留。":code==="REDFOX_AUTH_FAILED"?"红狐密钥不可用，请在集成设置中核对。":error instanceof ResearchError?error.message:"平台同步未完成，已有数据保留，可以稍后重试。";
  await db.benchmarkCollectionRun.updateMany({where:{id:runId,status:"RUNNING"},data:{status:"FAILED",completedAt:new Date(),errorMessage:message,stopReason:code??"COLLECTION_FAILED"}});
 }
}
