import "server-only";
import {createHash} from "node:crypto";
import {z} from "zod";
import {db} from "@content-center/db";
import type {ResearchObject,ObjectResearchView} from "@/lib/contracts/research-object";
import {researchMember,ResearchError,type ResearchActor} from "./access";
import {researchScopeSchema,researchBlocksSchema,type ResearchScope} from "./contracts";
import {getResearchSession,reserveResearchRun} from "./service";
import {collectWorkResearchEvidence} from "./work-research-evidence";
import {getResearchResult} from "./read-model";
import {newsReadModel} from "./news/service";
import {parseTrendStableKey} from "./trends";
const id=z.string().trim().min(1).max(2000);
export const researchObjectSchema=z.discriminatedUnion("kind",[
 z.object({kind:z.enum(["WORK","ACCOUNT","MATERIAL","NEWS","TREND"]),id,reportId:z.string().min(1).max(200).optional()}).strict(),
 z.object({kind:z.literal("COMPARE"),ids:z.array(z.string().min(1).max(200)).min(2).max(3)}).strict(),
 z.object({kind:z.literal("TOPIC"),key:z.string().uuid()}).strict(),
]);
export function objectResearchRequestKey(actor:ResearchActor,object:ResearchObject){
 const identity=object.kind==="COMPARE"?{kind:object.kind,ids:[...new Set(object.ids)].sort()}:object.kind==="TOPIC"?{kind:object.kind,key:object.key}:{kind:object.kind,id:object.id};
 const hex=createHash("sha256").update(JSON.stringify({workspaceId:actor.workspaceId,userId:actor.userId,identity})).digest("hex").slice(0,32);
 return hex.slice(0,8)+"-"+hex.slice(8,12)+"-5"+hex.slice(13,16)+"-a"+hex.slice(17,20)+"-"+hex.slice(20);
}
async function resolveObject(actor:ResearchActor,value:unknown){
 await researchMember(actor);const object=researchObjectSchema.parse(value) as ResearchObject;
 let title="主题研究",scope:ResearchScope=researchScopeSchema.parse({});
 if(object.kind==="WORK"){
  const work=await db.benchmarkContentSnapshot.findFirst({where:{id:object.id,workspaceId:actor.workspaceId,benchmarkAccount:{enabled:true}},select:{title:true,benchmarkAccountId:true}});
  if(!work)throw new ResearchError("RESEARCH_OBJECT_NOT_FOUND","这条作品不存在或不可访问。",404);
  const evidence=await collectWorkResearchEvidence(actor,work.benchmarkAccountId,object.id);
  scope=researchScopeSchema.parse({benchmarkAccountIds:[work.benchmarkAccountId],benchmarkWorkId:object.id,materialIds:evidence.sourceItemId?[evidence.sourceItemId]:[]});
  title=work.title;
  if(object.reportId){
   const report=await getResearchResult(actor,object.reportId,{includeUnsaved:true});
   if(researchScopeSchema.parse(report.inputScope).benchmarkWorkId!==object.id)throw new ResearchError("RESEARCH_OBJECT_MISMATCH","这版报告不属于当前作品。",404);
   scope.researchRunIds=[report.id];
  }
 }else if(object.kind==="ACCOUNT"||object.kind==="COMPARE"){
  const ids=object.kind==="COMPARE"?[...new Set(object.ids)].sort():[object.id];
  if(object.kind==="COMPARE"&&ids.length<2)throw new ResearchError("INVALID_COMPARISON","请选择至少两个不同账号。",400);
  const accounts=await db.benchmarkAccount.findMany({where:{id:{in:ids},workspaceId:actor.workspaceId,enabled:true},select:{id:true,name:true}});
  if(accounts.length!==ids.length)throw new ResearchError("RESEARCH_OBJECT_NOT_FOUND","部分账号不存在或不可访问。",404);
  scope.benchmarkAccountIds=ids;title=accounts.map(account=>account.name).join(" / ");
 }else if(object.kind==="MATERIAL"){
  const material=await db.sourceItem.findFirst({where:{id:object.id,workspaceId:actor.workspaceId,status:{not:"ARCHIVED"}},select:{title:true}});
  if(!material)throw new ResearchError("RESEARCH_OBJECT_NOT_FOUND","资料不存在或不可访问。",404);
  scope.materialIds=[object.id];title=material.title||"所选资料";
 }else if(object.kind==="NEWS"){
  const news=await newsReadModel(actor),item=news.items.find(item=>item.id===object.id);
  if(!item)throw new ResearchError("RESEARCH_OBJECT_NOT_FOUND","这条资讯不在已有缓存中。",404);
  scope.newsItemIds=[object.id];title=item.title;
 }else if(object.kind==="TREND"){
  const identity=parseTrendStableKey(object.id),trend=await db.trendSnapshot.findFirst({where:{workspaceId:actor.workspaceId,...identity},select:{title:true}});
  if(!trend)throw new ResearchError("RESEARCH_OBJECT_NOT_FOUND","所选趋势不存在。",404);
  scope.trendKeys=[object.id];title=trend.title;
 }
 return {object,title:title.slice(0,200),scope,requestKey:objectResearchRequestKey(actor,object)};
}
export async function getObjectResearch(actor:ResearchActor,value:unknown):Promise<ObjectResearchView>{
 const subject=await resolveObject(actor,value),session=await db.researchSession.findUnique({where:{workspaceId_createdById_requestKey:{workspaceId:actor.workspaceId,createdById:actor.userId,requestKey:subject.requestKey}},select:{id:true}});
 if(!session)return {object:subject.object,title:subject.title,sessionId:null,runs:[]};
 const stored=await getResearchSession(actor,session.id);
 return {object:subject.object,title:subject.title,sessionId:session.id,runs:stored.runs.map(run=>({id:run.id,version:run.version,question:run.question,status:run.status,stage:run.stage,errorMessage:run.errorMessage,blocks:researchBlocksSchema.parse(run.blocks),createdAt:run.createdAt.toISOString()}))};
}
export async function startObjectResearch(actor:ResearchActor,value:unknown){
 await researchMember(actor,true);const input=z.object({object:researchObjectSchema,question:z.string().trim().min(1).max(10000),requestKey:z.string().uuid()}).strict().parse(value),subject=await resolveObject(actor,input.object);
 const identity={workspaceId_createdById_requestKey:{workspaceId:actor.workspaceId,createdById:actor.userId,requestKey:subject.requestKey}};
 const session=await db.researchSession.upsert({where:identity,create:{workspaceId:actor.workspaceId,createdById:actor.userId,title:subject.title,entryTemplate:"DIRECT",requestKey:subject.requestKey},update:{title:subject.title}});
 const reserved=await reserveResearchRun(actor,session.id,{question:input.question,requestKey:input.requestKey,scope:subject.scope});
 return {sessionId:session.id,runId:reserved.run.id,created:reserved.created};
}
