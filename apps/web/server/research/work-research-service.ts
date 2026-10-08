import "server-only";
import { z } from "zod";
import {createHash} from "node:crypto";
import { db } from "@content-center/db";
import { buildBenchmarkPerformance } from "../discovery/benchmark-performance";
import { collectExternalContent } from "../discovery/service";
import { externalContentSchema } from "../discovery/schemas";
import { isLocalReviewOffline,extractRedFoxContentUrl } from "@content-center/providers";
import {getDiscoveryContentDetail,saveBenchmarkWorksPage} from "../discovery/service";
import { requestSourceTranscription, TranscriptionAlreadyRunningError } from "@content-center/worker/transcription";
import { SourceServiceError } from "../source-service";
import { getMaterialReadableContent } from "../material-detail/readable-content";
import { ResearchError, researchMember, type ResearchActor } from "./access";
import { createResearchSession, reserveResearchRun, researchRunExpired } from "./service";
import { collectWorkResearchEvidence } from "./work-research-evidence";
import { parseWorkResearchState,sameWorkEvidence } from "./work-research-contract";
import { workResearchSessionKey as sessionKey } from "./work-research-identity";
import { WORK_DEEP_QUESTION } from "./work-research-run";
import {getResearchResult} from "./read-model";
import {createPersonalContent} from "../artifacts/personal";
import {researchTitle} from "@/lib/research-presentation";

const requestSchema = z.object({ requestKey: z.string().uuid(), force: z.boolean().optional() }).strict();
/** Collect only the server-scoped saved work; the browser never supplies a URL or external ID. */
export async function collectWorkSourceForResearch(actor: ResearchActor, accountId: string, workId: string) {
  await researchMember(actor, true);
  const work = await db.benchmarkContentSnapshot.findFirst({ where: { id: workId, workspaceId: actor.workspaceId, benchmarkAccountId: accountId, benchmarkAccount: { workspaceId: actor.workspaceId, enabled: true } },
    select: { id: true, platform: true, externalId: true, title: true, url: true, authorName: true, coverUrl: true, publishedAt: true, metadata: true,
      observedAt: true, observations: { orderBy: [{ observedAt: "desc" }, { id: "desc" }], take: 1, select: { observedAt: true, metrics: true } } } });
  if (!work) throw new ResearchError("NOT_FOUND", "作品不存在或不可访问。", 404);
  if (work.platform !== "DOUYIN" && work.platform !== "XIAOHONGSHU") throw new ResearchError("UNSUPPORTED_PLATFORM", "当前平台作品还不能从这里自动收录，请到资料页导入原件。", 409);
  const metric = buildBenchmarkPerformance([work]).items[0]!;
  const url = /^https:\/\//i.test(work.url) ? work.url : null;
  if (!url) throw new ResearchError("MISSING_WORK_URL", "这条作品没有可用的原链接，请到资料页上传原件。", 409);
  const metadata = work.metadata && typeof work.metadata === "object" && !Array.isArray(work.metadata) ? work.metadata as Record<string, unknown> : {};
  const declaredType = typeof metadata.contentType === "string" ? metadata.contentType : "VIDEO";
  const content = externalContentSchema.parse({ externalId: work.externalId, platform: work.platform,
    contentType: ["VIDEO", "IMAGE", "ARTICLE", "UNKNOWN"].includes(declaredType) ? declaredType : "VIDEO",
    title: work.title.slice(0, 500), description: null, authorId: null, authorName: work.authorName?.slice(0, 300) ?? null,
    authorAvatarUrl: null, coverUrl: work.coverUrl && /^https:\/\//i.test(work.coverUrl) ? work.coverUrl.slice(0, 2000) : null,
    originalUrl: url, publishedAt: work.publishedAt?.toISOString() ?? null,
    metrics: { views: metric.views, ...metric.counts }, durationMs: metric.durationMs, sourceProvider: "REDFOX" });
  try {
    const result = await collectExternalContent({ ...actor, content, autoTranscribe: false });
    if (result.sourceItem.status === "ARCHIVED") throw new ResearchError("SOURCE_ARCHIVED", "这条作品的资料已归档，请先在资料库恢复。", 409);
    return { sourceItemId: result.sourceItem.id, created: result.created, status: result.sourceItem.status };
  } catch (error) {
    if (error instanceof SourceServiceError) throw new ResearchError(error.code, error.code === "REDFOX_DISABLED" ? "内容服务已禁用，请到设置中启用后再试。" : "内容服务尚未配置，请到设置中连接 RedFox。", 409);
    throw error;
  }
}
async function findSession(actor: ResearchActor, accountId: string, workId: string) {
  return db.researchSession.findUnique({ where: { workspaceId_createdById_requestKey: { workspaceId: actor.workspaceId, createdById: actor.userId, requestKey: sessionKey(actor, accountId, workId) } } });
}
export async function startWorkDeepResearch(actor: ResearchActor, accountId: string, workId: string, value: unknown) {
  await researchMember(actor, true);
  const input = requestSchema.parse(value);
  const evidence = await collectWorkResearchEvidence(actor, accountId, workId);
  if (!evidence.contentText) throw new ResearchError("NO_READABLE_CONTENT", "这条作品目前没有可读正文。请先到资料页主动转录或补充文字。", 409);
  const existing = await findSession(actor, accountId, workId);
  const session = existing ?? await createResearchSession(actor, { title: `${evidence.title.slice(0, 165)} · 作品研究`, entryTemplate: "BENCHMARK", requestKey: sessionKey(actor, accountId, workId) });
  const reserved = await reserveResearchRun(actor, session.id, { question: WORK_DEEP_QUESTION, requestKey: input.requestKey, scope: {
    materialIds: [], benchmarkAccountIds: [accountId], benchmarkWorkId: workId, researchProfile: "WORK_DEEP", researchDepth: "DEEP", forceReanalysis: Boolean(input.force),
    trendKeys: [], notes: "", useOwnArtifacts: false, useCreatorProfile: false,
  } });
  return { sessionId: session.id, runId: reserved.run.id, version: reserved.run.version, status: researchRunExpired(reserved.run) ? "FAILED" : reserved.run.status, created: reserved.created, unchanged: reserved.unchanged };
}

export async function workResearchOverview(actor: ResearchActor, accountId: string, workId: string, options: {runId?:string} = {}) {
  await researchMember(actor);
  const [evidence, account, session] = await Promise.all([
    collectWorkResearchEvidence(actor, accountId, workId),
    db.benchmarkAccount.findFirst({ where: { id: accountId, workspaceId: actor.workspaceId, enabled: true }, select: { name: true, platform: true } }),
    findSession(actor, accountId, workId),
  ]);
  if (!account) throw new ResearchError("NOT_FOUND", "账号不存在或不可访问。", 404);
  const runs = session ? await db.researchRun.findMany({ where: { sessionId: session.id, workspaceId: actor.workspaceId, requestedById: actor.userId }, orderBy: { version: "desc" }, take: 30,
    select: { id: true, sessionId: true, version: true, status: true, stage: true, createdAt: true, startedAt: true, aiRunId: true, finishedAt: true, savedAt: true, coverage: true, errorMessage: true, aiRun: { select: { provider: true, model: true } } } }) : [];
  const sourceJob=evidence.sourceItemId?await db.ingestJob.findFirst({where:{workspaceId:actor.workspaceId,sourceItemId:evidence.sourceItemId,jobType:"TRANSCRIBE"},orderBy:{createdAt:"desc"},select:{id:true,status:true,errorMessage:true}}):null;
  const completed=runs.filter(run=>run.status==="COMPLETED"&&parseWorkResearchState(run.coverage)?.answer);
  let latest=(options.runId?completed.find(run=>run.id===options.runId):completed[0])??null;
  if(options.runId&&!latest){
    const older=await db.researchRun.findFirst({where:{id:options.runId,workspaceId:actor.workspaceId,requestedById:actor.userId,status:"COMPLETED",session:{workspaceId:actor.workspaceId,createdById:actor.userId}},select:{id:true,sessionId:true,version:true,status:true,stage:true,createdAt:true,startedAt:true,aiRunId:true,finishedAt:true,savedAt:true,coverage:true,errorMessage:true,aiRun:{select:{provider:true,model:true}}}});
    const snapshot=older?parseWorkResearchState(older.coverage):null;
    if(older&&snapshot?.answer&&snapshot.evidence.accountId===accountId&&snapshot.evidence.workId===workId){latest=older;runs.push(older);}
  }
  if(options.runId&&!latest)throw new ResearchError("NOT_FOUND","报告不存在或不属于这条作品。",404);
  const state = latest ? parseWorkResearchState(latest.coverage) : null;
  const active = runs.find(run => ["QUEUED", "RUNNING"].includes(run.status) && !researchRunExpired(run)) ?? null;
  return { account, current: evidence, sourceJob, sessionId: session?.id ?? null,
    latest: latest ? { id: latest.id, sessionId: latest.sessionId, version: latest.version, saved: Boolean(latest.savedAt), schemaVersion: state!.schemaVersion,
      finishedAt: latest.finishedAt?.toISOString() ?? latest.createdAt.toISOString(), model: latest.aiRun ? `${latest.aiRun.provider} / ${latest.aiRun.model}` : null,
      evidence: state!.evidence, answer: state!.answer!, currentEvidence:sameWorkEvidence(state!.evidence,evidence),
      currentContent:state!.evidence.sourceItemId===evidence.sourceItemId&&state!.evidence.mediaAssetId===evidence.mediaAssetId&&state!.evidence.contentHash===evidence.contentHash&&state!.evidence.contentVersion===evidence.contentVersion&&JSON.stringify(state!.evidence.segments)===JSON.stringify(evidence.segments) } : null,
    active: active ? { id: active.id, sessionId: active.sessionId, status: active.status, stage: active.stage } : null,
    failure: runs[0] && runs[0].status === "FAILED" ? runs[0].errorMessage : null,
    history: runs.filter(run => run.status === "COMPLETED").map(run => { const snapshot = parseWorkResearchState(run.coverage); return { id: run.id, sessionId: run.sessionId, version: run.version, saved: Boolean(run.savedAt), date: run.finishedAt?.toISOString() ?? run.createdAt.toISOString(), fingerprint: snapshot?.evidence.fingerprint ?? null }; }) };
}
export type WorkResearchView = Awaited<ReturnType<typeof workResearchOverview>>;
export async function importWorkForReport(actor:ResearchActor,value:unknown){
 await researchMember(actor,true);
 const input=z.object({shareText:z.string().trim().min(1).max(6000)}).strict().parse(value);
 let url:string;try{url=extractRedFoxContentUrl(input.shareText).url;const parsed=new URL(url);if(parsed.protocol!=="https:"||parsed.username||parsed.password||parsed.port||!["douyin.com","www.douyin.com","v.douyin.com","iesdouyin.com","www.iesdouyin.com"].includes(parsed.hostname))throw Error("platform");}catch{throw new ResearchError("INVALID_WORK_LINK","请粘贴抖音作品链接或分享文字。",400);}
 const parsed=new URL(url),videoId=/\/(?:share\/)?video\/(\d+)/.exec(parsed.pathname)?.[1]??parsed.searchParams.get("modal_id");
 const saved=videoId?await db.benchmarkContentSnapshot.findFirst({where:{workspaceId:actor.workspaceId,platform:"DOUYIN",externalId:videoId,benchmarkAccount:{enabled:true}},select:{id:true,benchmarkAccountId:true}}):null;
 if(saved)return {workId:saved.id,accountId:saved.benchmarkAccountId,existing:true,href:"/research/benchmarks/"+saved.benchmarkAccountId+"/works/"+saved.id+"?returnTo=%2Fresearch%2Fresults"};
 const page=await getDiscoveryContentDetail({...actor,url,platform:"DOUYIN",purpose:"RESEARCH_COLLECTION"}),item=page.items[0];
 if(!item||item.platform!=="DOUYIN"||!item.externalId||(videoId&&item.externalId!==videoId))throw new ResearchError("WORK_IDENTITY_MISMATCH","未取得与链接一致的作品身份。",409);
 const result=await db.$transaction(async tx=>{
  await tx.$executeRawUnsafe("SELECT pg_advisory_xact_lock(hashtextextended($1,0))",JSON.stringify(["report-link",actor.workspaceId,item.platform,item.externalId]));
  const work=await tx.benchmarkContentSnapshot.findUnique({where:{workspaceId_platform_externalId:{workspaceId:actor.workspaceId,platform:item.platform,externalId:item.externalId}},select:{id:true,benchmarkAccountId:true,benchmarkAccount:{select:{enabled:true}}}});
  if(work){if(!work.benchmarkAccount.enabled)throw new ResearchError("ACCOUNT_DISABLED","作品作者已停用，请先恢复账号。",409);return {accountId:work.benchmarkAccountId,existing:true};}
  if(!item.authorId)throw new ResearchError("AUTHOR_IDENTITY_MISSING","作品数据未提供作者身份，不能猜测账号；可先从账号作品列表导入。",409);
  const account=await tx.benchmarkAccount.findFirst({where:{workspaceId:actor.workspaceId,platform:item.platform,OR:[{externalAccountId:item.authorId},{identitySnapshot:{path:["aliases"],array_contains:[item.authorId]}}]},select:{id:true,enabled:true}});
  if(account&&!account.enabled)throw new ResearchError("ACCOUNT_DISABLED","作品作者已停用，请先恢复账号。",409);
  const author=account??await tx.benchmarkAccount.upsert({where:{workspaceId_platform_externalAccountId:{workspaceId:actor.workspaceId,platform:item.platform,externalAccountId:item.authorId}},update:{},create:{workspaceId:actor.workspaceId,createdById:actor.userId,platform:item.platform,externalAccountId:item.authorId,name:item.authorName||"作者名称未提供",identitySnapshot:{aliases:[item.authorId],origin:"REPORT_WORK_LINK",verifiedAt:new Date().toISOString()}},select:{id:true,enabled:true}});
  return {accountId:author.id,existing:false};
 });
 await saveBenchmarkWorksPage(actor,{id:result.accountId},{items:[item],cached:page.cached,total:1,hasMore:false,nextOffset:null},0);
 const work=await db.benchmarkContentSnapshot.findUniqueOrThrow({where:{workspaceId_platform_externalId:{workspaceId:actor.workspaceId,platform:item.platform,externalId:item.externalId}},select:{id:true}});
 return {workId:work.id,accountId:result.accountId,existing:result.existing,href:"/research/benchmarks/"+result.accountId+"/works/"+work.id+"?returnTo=%2Fresearch%2Fresults"};
}
export async function addWorkReportToPool(actor:ResearchActor,accountId:string,workId:string,runId:string){
 await researchMember(actor,true);
 const report=await getWorkResearchForExport(actor,accountId,workId,runId),run=await getResearchResult(actor,runId,{includeUnsaved:true});
 const items=run.blocks.flatMap(block=>block.type==="text"&&block.id.startsWith("structure-")?[{id:block.id,text:block.text}]:[]);
 if(!items.length)throw new ResearchError("REPORT_STRUCTURE_MISSING","本版没有可采用的结构，请先补齐报告。",409);
 const digest=createHash("sha256").update(JSON.stringify(["report-topic-pool",actor.workspaceId,actor.userId,runId])).digest("hex");
 const clientRequestId=digest.slice(0,8)+"-"+digest.slice(8,12)+"-5"+digest.slice(13,16)+"-a"+digest.slice(17,20)+"-"+digest.slice(20,32);
 const content=await createPersonalContent(actor,{clientRequestId,title:researchTitle(report.evidence.title).slice(0,200),poolResearchRunId:runId,research:{sourceId:runId,selection:{kind:"run",version:report.version,items}}});
 return {artifactId:content.artifactId,href:"/research/pool?topic="+encodeURIComponent(content.artifactId)+"#topic-"+content.artifactId,writeHref:"/content/"+content.artifactId};
}
export async function workReportPoolStatus(actor:ResearchActor,runId:string){
 await researchMember(actor);
 const row=await db.assistantThread.findFirst({where:{workspaceId:actor.workspaceId,createdById:actor.userId,projectId:null,contextSnapshot:{path:["poolResearchRunId"],equals:runId},artifact:{workspaceId:actor.workspaceId,createdById:actor.userId,visibility:"PRIVATE",draftBranch:{deletedAt:null}}},select:{artifactId:true}});
 return row?.artifactId?{artifactId:row.artifactId,href:"/research/pool?topic="+encodeURIComponent(row.artifactId)+"#topic-"+row.artifactId}:null;
}
export async function personalReportPool(actor:ResearchActor,input:{selectedId?:string}={}){
 await researchMember(actor);
 const rows=await db.assistantThread.findMany({where:{workspaceId:actor.workspaceId,createdById:actor.userId,projectId:null,contextSnapshot:{path:["poolResearchRunId"],string_starts_with:""},artifact:{workspaceId:actor.workspaceId,createdById:actor.userId,visibility:"PRIVATE",draftBranch:{deletedAt:null}}},orderBy:{updatedAt:"desc"},take:100,select:{contextSnapshot:true,artifact:{select:{id:true,title:true,updatedAt:true,draftBranch:{select:{workingBody:true}}}}}});
 if(input.selectedId&&!rows.some(row=>row.artifact?.id===input.selectedId)){
  if(input.selectedId.length>200)throw new ResearchError("NOT_FOUND","选题不存在或不可访问。",404);
  const selected=await db.assistantThread.findFirst({where:{workspaceId:actor.workspaceId,createdById:actor.userId,projectId:null,contextSnapshot:{path:["poolResearchRunId"],string_starts_with:""},artifact:{id:input.selectedId,workspaceId:actor.workspaceId,createdById:actor.userId,visibility:"PRIVATE",draftBranch:{deletedAt:null}}},select:{contextSnapshot:true,artifact:{select:{id:true,title:true,updatedAt:true,draftBranch:{select:{workingBody:true}}}}}});
  if(!selected)throw new ResearchError("NOT_FOUND","选题不存在或不可访问。",404);rows.unshift(selected);
 }
 return rows.flatMap(row=>{const context=row.contextSnapshot as {poolResearchRunId?:unknown};return row.artifact&&typeof context.poolResearchRunId==="string"?[{artifactId:row.artifact.id,title:row.artifact.title,reportId:context.poolResearchRunId,updatedAt:row.artifact.updatedAt.toISOString(),started:row.artifact.draftBranch.workingBody.trim().length>0}]:[];});
}

/** Scoped choices for the Research → Project Agent creation handoff. */
export async function workCreationChoices(actor: ResearchActor) {
  await researchMember(actor);
  const [projects, materials] = await Promise.all([
    db.contentProject.findMany({ where: { workspaceId: actor.workspaceId, status: { not: "ARCHIVED" } },
      select: { id: true, title: true, audience: true, sources: { select: { sourceItemId: true } } }, orderBy: { updatedAt: "desc" }, take: 100 }),
    db.sourceItem.findMany({ where: { workspaceId: actor.workspaceId, status: { not: "ARCHIVED" } },
      select: { id: true, title: true, sourceType: true }, orderBy: { updatedAt: "desc" }, take: 150 }),
  ]);
  return { projects: projects.map(project => ({ id: project.id, title: project.title, audience: project.audience,
    sourceItemIds: project.sources.map(source => source.sourceItemId) })),
    materials: materials.map(source => ({ id: source.id, title: source.title || "未命名资料", sourceType: source.sourceType })) };
}

/** Reject missing or unreadable own evidence before the Agent is asked to write. */
export async function prepareWorkCreation(actor: ResearchActor, accountId: string, workId: string, runId: string,
  input: { projectId: string; materialIds: string[] }) {
  await researchMember(actor, true);
  const report = await getWorkResearchForExport(actor, accountId, workId, runId);
  if (!("decision" in report.answer)) throw new ResearchError("WORK_DECISION_REQUIRED", "请先升级为新版作品研究，再创作自己的版本。", 409);
  const project = await db.contentProject.findFirst({ where: { id: input.projectId, workspaceId: actor.workspaceId, status: { not: "ARCHIVED" } }, select: { id: true } });
  if (!project) throw new ResearchError("PROJECT_NOT_FOUND", "所选项目不可访问。", 404);
  const ids = [...new Set(input.materialIds)];
  if (ids.length > 8) throw new ResearchError("MATERIAL_REQUIRED", "一次最多选择八条自己的资料。", 400);
  const materials = await db.sourceItem.findMany({ where: { id: { in: ids }, workspaceId: actor.workspaceId, status: { not: "ARCHIVED" } }, select: { id: true, title: true } });
  if (materials.length !== ids.length) throw new ResearchError("MATERIAL_NOT_FOUND", "有资料不存在或不属于当前工作区。", 404);
  const readings = await Promise.all(materials.map(item => getMaterialReadableContent({ ...actor, sourceItemId: item.id })));
  const unreadable = materials.filter((_, index) => !readings[index]?.contentText.trim());
  if (unreadable.length) throw new ResearchError("MATERIAL_UNREADABLE", `${unreadable[0]!.title || "所选资料"}还没有可读正文，请先到资料页完成读取。`, 409);
  return { projectId: project.id, materialIds: ids, researchRunId: report.runId };
}

export async function getWorkResearchForExport(actor: ResearchActor, accountId: string, workId: string, runId: string) {
  await researchMember(actor);
  const run = await db.researchRun.findFirst({ where: { id: runId, workspaceId: actor.workspaceId, requestedById: actor.userId, status: "COMPLETED", session: { workspaceId: actor.workspaceId, createdById: actor.userId } },
    select: { id: true, sessionId: true, version: true, finishedAt: true, createdAt: true, savedAt: true, coverage: true, aiRun: { select: { provider: true, model: true } } } });
  const state = parseWorkResearchState(run?.coverage);
  if (!run || !state?.answer || state.evidence.accountId !== accountId || state.evidence.workId !== workId) throw new ResearchError("NOT_FOUND", "作品研究版本不存在或不可访问。", 404);
  const account = await db.benchmarkAccount.findFirst({ where: { id: accountId, workspaceId: actor.workspaceId, enabled: true }, select: { name: true } });
  if (!account) throw new ResearchError("NOT_FOUND", "账号不存在或不可访问。", 404);
  return { runId: run.id, sessionId: run.sessionId, version: run.version, saved: Boolean(run.savedAt), finishedAt: (run.finishedAt ?? run.createdAt).toISOString(),
    model: run.aiRun ? `${run.aiRun.provider} / ${run.aiRun.model}` : null, accountName: account.name, evidence: state.evidence, answer: state.answer };
}

/** One scoped lookup for the work library; historical deep runs stay visible as such. */
export async function deepResearchedWorkIds(actor: ResearchActor, accountId: string, workIds: string[]) {
  if (!workIds.length) return new Set<string>();
  const identities = new Map(workIds.map(workId => [sessionKey(actor, accountId, workId), workId]));
  const sessions = await db.researchSession.findMany({ where: { workspaceId: actor.workspaceId, createdById: actor.userId, requestKey: { in: [...identities.keys()] } },
    select: { requestKey: true, runs: { where: { workspaceId: actor.workspaceId, requestedById: actor.userId, status: "COMPLETED" }, orderBy: { version: "desc" }, take: 1, select: { coverage: true } } } });
  return new Set(sessions.flatMap(session => {
    const workId = identities.get(session.requestKey);
    const state = parseWorkResearchState(session.runs[0]?.coverage);
    return workId && state?.answer && state.evidence.accountId === accountId && state.evidence.workId === workId ? [workId] : [];
  }));
}

/** Explicit work-to-material attachment. Identity remains server-owned; uploaded sources are never relabelled. */
export async function attachWorkSource(actor:ResearchActor,accountId:string,workId:string,value:unknown) {
 await researchMember(actor,true);
 const input=z.object({sourceItemId:z.string().min(1).optional(),text:z.string().trim().min(1).max(500000).optional(),autoTranscribe:z.boolean().default(false),requestKey:z.string().uuid().optional()}).strict()
 .refine(data=>Boolean(data.sourceItemId)!==Boolean(data.text),"Select exactly one source").parse(value);
 if(input.text&&!input.requestKey)throw new ResearchError("REQUEST_KEY_REQUIRED","请重新提交补充文字。",400);
 const source=await db.$transaction(async tx=>{
  if(input.text)await tx.$executeRawUnsafe("SELECT pg_advisory_xact_lock(hashtextextended($1,0))",JSON.stringify(["work-text",actor.workspaceId,actor.userId,input.requestKey]));
  const previous=input.text?await tx.sourceItem.findFirst({where:{workspaceId:actor.workspaceId,createdById:actor.userId,metadata:{path:["workTextRequestKey"],equals:input.requestKey}},select:{id:true,sourceType:true,rawText:true,metadata:true}}):null;
  if(previous&&(previous.rawText!==input.text||!previous.metadata||typeof previous.metadata!=="object"||Array.isArray(previous.metadata)||previous.metadata.workId!==workId))throw new ResearchError("REQUEST_CONFLICT","请求标识已用于其他内容。",409);
  await tx.$queryRawUnsafe('SELECT "id" FROM "BenchmarkContentSnapshot" WHERE "id"=$1 AND "workspaceId"=$2 FOR UPDATE',workId,actor.workspaceId);
  const work=await tx.benchmarkContentSnapshot.findFirst({where:{id:workId,workspaceId:actor.workspaceId,benchmarkAccountId:accountId,benchmarkAccount:{workspaceId:actor.workspaceId,enabled:true}},select:{id:true,title:true,metadata:true}});
  if(!work)throw new ResearchError("NOT_FOUND","作品不存在或不可访问。",404);
  const material=input.sourceItemId?await tx.sourceItem.findFirst({where:{id:input.sourceItemId,workspaceId:actor.workspaceId,status:"READY"},select:{id:true,sourceType:true}})
   :previous??await tx.sourceItem.create({data:{workspaceId:actor.workspaceId,createdById:actor.userId,sourceType:"TEXT",sourceProvider:"MANUAL",status:"READY",title:work.title,rawText:input.text,metadata:{workTextRequestKey:input.requestKey!,workId}},select:{id:true,sourceType:true}});
  if(!material)throw new ResearchError("SOURCE_NOT_READY","资料不存在、未保存完成或不属于当前空间。",409);
  const metadata=work.metadata&&typeof work.metadata==="object"&&!Array.isArray(work.metadata)?work.metadata:{};
  await tx.benchmarkContentSnapshot.update({where:{id:work.id},data:{metadata:{...metadata,linkedSourceItemId:material.id}}});
  await tx.auditLog.create({data:{workspaceId:actor.workspaceId,userId:actor.userId,action:"research.work_source_attached",resourceType:"benchmark_work",resourceId:work.id,metadata:{sourceItemId:material.id}}});
  return material;
 });
 if(!input.autoTranscribe||!["VIDEO","AUDIO"].includes(source.sourceType))return {sourceItemId:source.id,message:"已保存原文并关联当前作品，可以开始拆解。"};
 if(isLocalReviewOffline())return {sourceItemId:source.id,message:"原件已关联；当前环境关闭外部转录，可补充文字继续研究。",transcriptionStatus:"BLOCKED"};
 const saved=await db.transcript.findUnique({where:{sourceItemId:source.id},select:{id:true}});
 if(saved)return {sourceItemId:source.id,message:"资料已有文字稿，已关联当前作品。",transcriptionStatus:"SUCCEEDED"};
 try{
  const result=await requestSourceTranscription({workspaceId:actor.workspaceId,requestedById:actor.userId,sourceItemId:source.id});
  return {sourceItemId:source.id,jobId:result.job.id,message:"原件已关联，已提交转录；完成后可开始拆解。",transcriptionStatus:result.job.status};
 }catch(error){
  if(error instanceof TranscriptionAlreadyRunningError)return {sourceItemId:source.id,jobId:error.jobId,message:"原件已关联，转录任务正在进行。",transcriptionStatus:"RUNNING"};
  return {sourceItemId:source.id,message:"原件已关联，转录未启动。请到资料页检查服务状态，或补充文字继续研究。",transcriptionStatus:"FAILED"};
 }
}
