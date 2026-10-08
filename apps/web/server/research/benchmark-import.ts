import "server-only";
import {randomUUID} from "node:crypto";
import {db,type Prisma} from "@content-center/db";
import {isLocalReviewOffline,type ExternalAccount,type ExternalContent,type ExternalResultPage} from "@content-center/providers";
import {z} from "zod";
import {getBenchmarkWorks,researchAccountIdentity,researchAccountWorksPreview,saveBenchmarkWorksPage} from "../discovery/service";
import {researchMember,ResearchError,type ResearchActor} from "./access";
import {parseBenchmarkHomepage} from "./benchmark-workbench-math";
import {researchObjectAction} from "./preferences";
const schema=z.object({url:z.string().trim().min(1).max(2000).optional(),accountId:z.string().trim().min(1).max(300).optional(),platform:z.enum(["DOUYIN","XIAOHONGSHU"]).optional(),purpose:z.enum(["teacher","reference"]).nullable().optional(),resolutionId:z.string().uuid().optional()}).strict();
type Page=ExternalResultPage<ExternalContent>&{cached:boolean};
type Identity={platform:"DOUYIN"|"XIAOHONGSHU";externalId:string;originalUrl:string|null;aliases:string[];verifiedAt:string;basis:string;followers:number|null;worksAccountId?:string};
type Resolution={actor:ResearchActor;expiresAt:number;account:ExternalAccount;identity:Identity;page?:Page;existingId?:string};
// Next route bundles can load separate module instances; keep one bounded server cache.
const serverCache=globalThis as typeof globalThis&{__researchAccountResolutions?:Map<string,Resolution>};
const resolutions=serverCache.__researchAccountResolutions??=new Map<string,Resolution>();
const json=(value:unknown)=>JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
function aliases(raw:Record<string,unknown>|undefined){
 if(!raw)return [];
 const records=[raw,...["user","author","userInfo","authorInfo","account"].map(key=>raw[key]).filter(value=>value&&typeof value==="object"&&!Array.isArray(value)) as Record<string,unknown>[]];
 return [...new Set(records.flatMap(record=>["secUid","sec_uid","sec_user_id","authorSecUid","uid","userId","authorUid","uniqueId","unique_id","authorUniqueId","accountId","displayId","redId","authorId"].map(key=>record[key])).filter(value=>typeof value==="string"&&value.trim()||typeof value==="number").map(value=>String(value).trim()))];
}
const secIds=(raw:Record<string,unknown>|undefined)=>aliases(raw).filter(value=>value.startsWith("MS4w"));
async function existingAccount(actor:ResearchActor,platform:"DOUYIN"|"XIAOHONGSHU",ids:string[],originalUrl:string|null){
 return db.benchmarkAccount.findFirst({where:{workspaceId:actor.workspaceId,platform,OR:[{externalAccountId:{in:ids}},...(originalUrl?[{originalUrl}]:[]),...ids.map(id=>({identitySnapshot:{path:["aliases"],array_contains:[id]}}))]},select:{id:true,name:true,enabled:true,externalAccountId:true,originalUrl:true,avatarUrl:true,bio:true,identitySnapshot:true}});
}
function dto(id:string,value:Resolution){return {resolutionId:id,expiresAt:new Date(value.expiresAt).toISOString(),existing:Boolean(value.existingId),account:{id:value.existingId??null,platform:value.account.platform,name:value.account.name,avatarUrl:value.account.avatarUrl,originalUrl:value.identity.originalUrl,followers:value.identity.followers},basis:value.identity.basis,worksCount:value.page?.items.length??null,provider:"REDFOX"};}
function put(value:Resolution){
 for(const [key,item] of resolutions)if(item.expiresAt<Date.now())resolutions.delete(key);
 if(resolutions.size>=128)resolutions.delete(resolutions.keys().next().value!);
 value.account={...value.account,rawProviderMetadata:undefined};
 if(value.page)value.page={...value.page,items:value.page.items.map(item=>({...item,rawProviderMetadata:undefined}))};
 const id=randomUUID();resolutions.set(id,value);return dto(id,value);
}
function getResolution(actor:ResearchActor,id:string){
 const value=resolutions.get(id);
 if(!value||value.expiresAt<Date.now()||value.actor.workspaceId!==actor.workspaceId||value.actor.userId!==actor.userId)throw new ResearchError("ACCOUNT_PREVIEW_EXPIRED","账号预览已过期，请重新识别。",409);
 return value;
}
export async function resolveBenchmarkAccount(actor:ResearchActor,value:unknown){
 await researchMember(actor,true);const input=schema.parse(value);
 if(input.resolutionId)return dto(input.resolutionId,getResolution(actor,input.resolutionId));
 if(!input.url&&!input.accountId)throw new ResearchError("INVALID_HOMEPAGE","请输入账号主页或抖音号 / uid。",400);
 let platform:"DOUYIN"|"XIAOHONGSHU",externalId:string,originalUrl:string|null=null;
 if(input.url?.startsWith("https://")){
  try{const parsed=parseBenchmarkHomepage(input.url);platform=parsed.platform;externalId=parsed.externalId;originalUrl=parsed.originalUrl;}
  catch(error){throw new ResearchError("INVALID_HOMEPAGE",error instanceof Error?error.message:"主页无效",400);}
 }else{platform=input.platform??"DOUYIN";externalId=input.accountId??input.url!;if(!/^[A-Za-z0-9_-]{1,300}$/.test(externalId))throw new ResearchError("INVALID_ACCOUNT_ID","请输入完整主页或有效的平台账号 ID。",400);}
 const existing=await existingAccount(actor,platform,[externalId],originalUrl);
 if(existing){
  if(!existing.enabled)throw new ResearchError("ACCOUNT_DISABLED","该账号已停用，未创建重复记录。",409);
  const snapshot=existing.identitySnapshot&&typeof existing.identitySnapshot==="object"&&!Array.isArray(existing.identitySnapshot)?existing.identitySnapshot as Record<string,unknown>:{};
  const followers=typeof snapshot.followers==="number"?snapshot.followers:null;
  return put({actor,expiresAt:Date.now()+600000,existingId:existing.id,account:{platform,externalId:existing.externalAccountId,name:existing.name,avatarUrl:existing.avatarUrl,bio:existing.bio,followers,likes:null,originalUrl:existing.originalUrl,sourceProvider:"REDFOX"},identity:{platform,externalId:existing.externalAccountId,originalUrl:existing.originalUrl,aliases:[externalId,existing.externalAccountId],followers,verifiedAt:new Date().toISOString(),basis:"匹配工作空间已保存账号"}});
 }
 if(isLocalReviewOffline("RESEARCH_COLLECTION"))throw new ResearchError("BENCHMARK_INTEGRATION_PENDING","当前未启用平台采集，已保存账号仍可查看。",409);
 let account:ExternalAccount,page:Page|undefined,basis="平台账号信息匹配";
 if(platform==="DOUYIN"&&externalId.startsWith("MS4w")){
  page=await researchAccountWorksPreview({...actor,platform,accountId:externalId});
  if(!page.items.length)throw new ResearchError("ACCOUNT_IDENTITY_NEEDS_HINT","该主页没有返回可核对的作品，请补充抖音号或 uid 后识别。",409);
  const rows=page.items.map(item=>({aliases:aliases(item.rawProviderMetadata),secs:secIds(item.rawProviderMetadata)}));
  if(rows.some(row=>row.secs.length&&!row.secs.includes(externalId)))throw new ResearchError("ACCOUNT_IDENTITY_MISMATCH","返回作品的作者与主页不一致，未添加账号。",409);
  const common=rows[0]!.aliases.filter(id=>rows.every(row=>row.aliases.includes(id)));
  const hint=input.accountId??common.find(id=>!id.startsWith("MS4w"));
  if(!hint||!common.includes(hint))throw new ResearchError("ACCOUNT_IDENTITY_NEEDS_HINT","作品没有提供可核对的抖音号 / uid，请补充后重试。",409);
  account=(await researchAccountIdentity({...actor,platform,accountId:hint})).item;
  if(!aliases(account.rawProviderMetadata).some(id=>common.includes(id))||secIds(account.rawProviderMetadata).some(id=>id!==externalId))throw new ResearchError("ACCOUNT_IDENTITY_MISMATCH","账号身份与作品作者不一致，未添加账号。",409);
  basis="主页作品作者一致，抖音号 / uid 与平台账号信息交叉核对";
 }else{
  account=(await researchAccountIdentity({...actor,platform,accountId:externalId})).item;
  if(![account.externalId,...aliases(account.rawProviderMetadata)].includes(externalId))throw new ResearchError("ACCOUNT_IDENTITY_MISMATCH","平台返回的账号身份不一致，未添加账号。",409);
 }
 if(account.platform!==platform||!account.name.trim())throw new ResearchError("ACCOUNT_IDENTITY_MISMATCH","平台返回的账号无效。",409);
 const ids=[...new Set([externalId,account.externalId,...aliases(account.rawProviderMetadata),...(page?.items.flatMap(item=>aliases(item.rawProviderMetadata))??[])])];
 const rawUid=account.rawProviderMetadata?.uid;
 const canonical=platform==="DOUYIN"&&(typeof rawUid==="string"||typeof rawUid==="number")?String(rawUid):account.externalId;
 const identity:Identity={platform,externalId:canonical,worksAccountId:platform==="DOUYIN"&&externalId.startsWith("MS4w")?externalId:account.externalId,originalUrl:originalUrl??account.originalUrl,aliases:ids,followers:account.followers,verifiedAt:new Date().toISOString(),basis};
 const duplicate=await existingAccount(actor,platform,ids,identity.originalUrl);
 if(duplicate&&!duplicate.enabled)throw new ResearchError("ACCOUNT_DISABLED","已保存账号已停用，未创建重复记录。",409);
 return put({actor,expiresAt:Date.now()+600000,account,identity,page,existingId:duplicate?.id});
}
export async function importBenchmarkHomepage(actor:ResearchActor,value:unknown){
 await researchMember(actor,true);const input=schema.parse(value);
 const preview=input.resolutionId?dto(input.resolutionId,getResolution(actor,input.resolutionId)):await resolveBenchmarkAccount(actor,input);
 const resolved=getResolution(actor,preview.resolutionId);
 const imported=await db.$transaction(async tx=>{
  await tx.$executeRawUnsafe("SELECT pg_advisory_xact_lock(hashtextextended($1,0))",actor.workspaceId+":"+resolved.identity.platform+":"+resolved.identity.externalId);
  const existing=await tx.benchmarkAccount.findFirst({where:{workspaceId:actor.workspaceId,platform:resolved.identity.platform,OR:[{externalAccountId:{in:resolved.identity.aliases}},...resolved.identity.aliases.map(id=>({identitySnapshot:{path:["aliases"],array_contains:[id]}}))]}});
  if(existing){if(!existing.enabled)throw new ResearchError("ACCOUNT_DISABLED","该账号已停用。",409);return {item:existing,created:false};}
  const item=await tx.benchmarkAccount.create({data:{workspaceId:actor.workspaceId,createdById:actor.userId,platform:resolved.identity.platform,externalAccountId:resolved.identity.externalId,name:resolved.account.name,avatarUrl:resolved.account.avatarUrl,bio:resolved.account.bio,originalUrl:resolved.identity.originalUrl,identitySnapshot:json({...resolved.identity,provider:"REDFOX"})}});
  return {item,created:true};
 });
 const {item,created}=imported;
 if(input.purpose)await researchObjectAction(actor,{kind:input.purpose==="teacher"?"BENCHMARK_TEACHER":"BENCHMARK_REFERENCE",key:item.id,action:"FOLLOW"});
 if(!created)return {item:{id:item.id,name:item.name},existing:true,sync:"UNCHANGED"};
 if(resolved.page){
  const saved=await saveBenchmarkWorksPage(actor,item,resolved.page,0);
  await db.benchmarkCollectionRun.create({data:{workspaceId:actor.workspaceId,benchmarkAccountId:item.id,requestedById:actor.userId,status:"COMPLETED",rangeStart:new Date(0),rangeEnd:new Date(),pageCount:1,seenCount:saved.items.length,inRangeCount:saved.items.filter(work=>work.publishedAt).length,undatedCount:saved.items.filter(work=>!work.publishedAt).length,nextOffset:saved.nextOffset??0,startedAt:new Date(),completedAt:new Date(),stopReason:saved.coverage,profileSnapshot:json({mode:"MANUAL_PAGE",requestOffset:0,nextOffset:saved.nextOffset,added:saved.added,updated:saved.updated,provider:"REDFOX",coverage:saved.coverage,identity:resolved.identity})}});
  return {item:{id:item.id,name:item.name},existing:false,sync:"LATEST_PAGE",count:saved.items.length,coverage:saved.coverage};
 }
 try {
  const saved=await getBenchmarkWorks({...actor,benchmarkId:item.id,sort:"LATEST",offset:0,purpose:"RESEARCH_COLLECTION"});
  await db.benchmarkCollectionRun.create({data:{workspaceId:actor.workspaceId,benchmarkAccountId:item.id,requestedById:actor.userId,status:"COMPLETED",rangeStart:new Date(0),rangeEnd:new Date(),pageCount:1,seenCount:saved.items.length,inRangeCount:saved.items.filter(work=>work.publishedAt).length,undatedCount:saved.items.filter(work=>!work.publishedAt).length,nextOffset:saved.nextOffset??0,completedAt:new Date(),stopReason:saved.coverage,profileSnapshot:json({mode:"MANUAL_PAGE",requestOffset:0,nextOffset:saved.nextOffset,added:saved.added,updated:saved.updated,provider:"REDFOX",coverage:saved.coverage})}});
  return {item:{id:item.id,name:item.name},existing:false,sync:"LATEST_PAGE",count:saved.items.length,coverage:saved.coverage};
 }catch(error){
  const code=(error as {code?:string}).code;
  const message=code==="REDFOX_QUOTA_EXCEEDED"?"账号身份已保存；红狐积分余额不足，作品同步未完成。":"账号身份已保存；近期作品同步失败，可以稍后单独重试。";
  await db.benchmarkCollectionRun.create({data:{workspaceId:actor.workspaceId,benchmarkAccountId:item.id,requestedById:actor.userId,status:"FAILED",rangeStart:new Date(0),rangeEnd:new Date(),completedAt:new Date(),stopReason:code??"COLLECTION_FAILED",errorMessage:message,profileSnapshot:json({mode:"MANUAL_PAGE",requestOffset:0,nextOffset:null,provider:"REDFOX"})}});
  return {item:{id:item.id,name:item.name},existing:false,sync:"FAILED",message};
 }
}
