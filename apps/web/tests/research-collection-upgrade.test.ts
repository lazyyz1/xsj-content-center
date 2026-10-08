import {randomUUID} from "node:crypto";
import {afterAll,afterEach,beforeAll,describe,expect,it,vi} from "vitest";
vi.mock("server-only",()=>({}));
import {db} from "@content-center/db";
import * as providers from "@content-center/providers";
import * as discovery from "../server/discovery/service";
import {resolveBenchmarkAccount,importBenchmarkHomepage} from "../server/research/benchmark-import";
import {startManualBenchmarkSync,executeManualBenchmarkSync,manualBenchmarkSyncStatus} from "../server/research/benchmark-sync";
import {researchObjectAction} from "../server/research/preferences";
import {completedWorkReports} from "../server/research/read-model";
import {createResearchSession} from "../server/research/service";
import {sampleAnswer,sampleBody} from "./work-research-fixture";
import {collectWorkResearchEvidence} from "../server/research/work-research-evidence";
import {workResearchOverview,addWorkReportToPool,personalReportPool,attachWorkSource,importWorkForReport,workReportPoolStatus} from "../server/research/work-research-service";
import {renderWorkResearchBlocks} from "../server/research/work-research-run";
import {savePersonalDraft} from "../server/artifacts/personal";
describe("Research account preview, identity and bounded manual pages",()=>{
 const suffix=randomUUID(),userId="collection-"+suffix,outsider="collection-other-"+suffix;let workspaceId="",accountId="",workId="";
 const actor=()=>({workspaceId,userId});
 beforeAll(async()=>{await db.user.createMany({data:[userId,outsider].map(id=>({id,name:id,email:id+"@example.test"}))});workspaceId=(await db.workspace.create({data:{name:"Collection fixture",slug:suffix,members:{create:{userId,role:"OWNER"}}}})).id;});
 afterEach(()=>vi.restoreAllMocks());
 afterAll(async()=>{await db.workspace.delete({where:{id:workspaceId}});await db.user.deleteMany({where:{id:{in:[userId,outsider]}}});await db.$disconnect();});
 function page(sec:string,uid:string){return {cached:false,items:[{externalId:suffix+"-work",platform:"DOUYIN" as const,contentType:"VIDEO" as const,title:"真实案例 #话题",description:"真实案例",authorId:sec,authorName:"平台作者",authorAvatarUrl:null,coverUrl:null,originalUrl:"https://www.douyin.com/video/123",publishedAt:null,metrics:{views:null,likes:20,comments:2,favorites:null,shares:null},durationMs:15000,sourceProvider:"REDFOX" as const,rawProviderMetadata:{secUid:sec,authorId:uid}}],hasMore:true,total:2,nextOffset:20};}
 it("resolves a homepage from matching authors and reuses the page on confirmation",async()=>{
  vi.spyOn(providers,"isLocalReviewOffline").mockReturnValue(false);const sec="MS4w-"+suffix,uid="uid-"+suffix;
  const works=vi.spyOn(discovery,"researchAccountWorksPreview").mockResolvedValue(page(sec,uid));
  const detail=vi.spyOn(discovery,"researchAccountIdentity").mockResolvedValue({cached:false,item:{externalId:uid,platform:"DOUYIN",name:"平台作者",avatarUrl:null,bio:null,followers:42,likes:null,originalUrl:null,sourceProvider:"REDFOX",rawProviderMetadata:{uid,secUid:sec}}});
  const result=await resolveBenchmarkAccount(actor(),{url:"https://www.douyin.com/user/"+sec});expect(result.account.name).toBe("平台作者");expect(result.worksCount).toBe(1);expect(await db.benchmarkAccount.count({where:{workspaceId}})).toBe(0);
  const imported=await importBenchmarkHomepage(actor(),{resolutionId:result.resolutionId});accountId=imported.item.id;workId=(await db.benchmarkContentSnapshot.findFirstOrThrow({where:{benchmarkAccountId:accountId}})).id;
  expect(imported.sync).toBe("LATEST_PAGE");expect(works).toHaveBeenCalledOnce();expect(detail).toHaveBeenCalledWith(expect.objectContaining({accountId:uid}));
  expect((await db.benchmarkAccount.findUniqueOrThrow({where:{id:accountId}})).identitySnapshot).toMatchObject({aliases:expect.arrayContaining([sec,uid])});
  expect(await db.researchObjectPreference.count({where:{...actor(),objectKey:accountId}})).toBe(0);
  expect((await importBenchmarkHomepage(actor(),{resolutionId:result.resolutionId})).existing).toBe(true);expect(await db.benchmarkMetricObservation.count({where:{snapshotId:workId}})).toBe(1);
  const duplicate=await resolveBenchmarkAccount(actor(),{url:uid,platform:"DOUYIN"});expect(duplicate.existing).toBe(true);expect(works).toHaveBeenCalledOnce();
 });
 it("rejects forged owners, mismatched author identities, empty accounts and arbitrary URLs before creation",async()=>{
  vi.spyOn(providers,"isLocalReviewOffline").mockReturnValue(false);
  await expect(resolveBenchmarkAccount({workspaceId,userId:outsider},{url:"https://www.douyin.com/user/foreign"})).rejects.toMatchObject({status:403});
  await expect(resolveBenchmarkAccount(actor(),{url:"https://127.0.0.1/user/a"})).rejects.toMatchObject({code:"INVALID_HOMEPAGE"});
  const works=vi.spyOn(discovery,"researchAccountWorksPreview").mockResolvedValue(page("MS4w-different","wrong"));
  await expect(resolveBenchmarkAccount(actor(),{url:"https://www.douyin.com/user/MS4w-new"})).rejects.toMatchObject({code:"ACCOUNT_IDENTITY_MISMATCH"});
  works.mockResolvedValue({cached:false,items:[],total:0,hasMore:false,nextOffset:null});
  await expect(resolveBenchmarkAccount(actor(),{url:"https://www.douyin.com/user/MS4w-empty"})).rejects.toMatchObject({code:"ACCOUNT_IDENTITY_NEEDS_HINT"});
  expect(await db.benchmarkAccount.count({where:{workspaceId}})).toBe(1);
 });
 it("keeps preview ownership on the server",async()=>{
  const preview=await resolveBenchmarkAccount(actor(),{url:"https://www.douyin.com/user/MS4w-"+suffix});
  const other=(await db.workspace.create({data:{name:"Other fixture",slug:"other-"+suffix,members:{create:{userId:outsider,role:"OWNER"}}}})).id;
  try{await expect(importBenchmarkHomepage({workspaceId:other,userId:outsider},{resolutionId:preview.resolutionId})).rejects.toMatchObject({code:"ACCOUNT_PREVIEW_EXPIRED"});}finally{await db.workspace.delete({where:{id:other}});}
 });
 it("serializes manual sync, persists page state and preserves reading preferences",async()=>{
  vi.spyOn(providers,"isLocalReviewOffline").mockReturnValue(false);await researchObjectAction(actor(),{kind:"WORK",key:workId,action:"VIEW"});
  const started=await startManualBenchmarkSync(actor(),accountId,{});
  await expect(startManualBenchmarkSync(actor(),accountId,{})).rejects.toMatchObject({code:"COLLECTION_ALREADY_RUNNING"});
  vi.spyOn(discovery,"getBenchmarkWorks").mockResolvedValue({added:0,updated:1,items:[{...page("MS4w-"+suffix,"uid").items[0]!,sourceItemId:null,inIdea:false}],cached:false,hasMore:true,nextOffset:20,coverage:"MORE_AVAILABLE",providerRequestId:"fixture-request"});
  await executeManualBenchmarkSync(actor(),accountId,started.run.id);const status=await manualBenchmarkSyncStatus(actor(),accountId);
  expect(status.run).toMatchObject({status:"COMPLETED",nextOffset:20,undatedCount:1,updated:1});
  expect(await db.researchObjectPreference.count({where:{...actor(),objectKey:workId,viewedAt:{not:null}}})).toBe(1);
  const continued=await startManualBenchmarkSync(actor(),accountId,{continueRunId:started.run.id});expect((await db.benchmarkCollectionRun.findUniqueOrThrow({where:{id:continued.run.id}})).nextOffset).toBe(20);
  await executeManualBenchmarkSync(actor(),accountId,continued.run.id);
 });
 it("records a quota failure without replacing saved works or reports",async()=>{
  vi.spyOn(providers,"isLocalReviewOffline").mockReturnValue(false);const started=await startManualBenchmarkSync(actor(),accountId,{});
  vi.spyOn(discovery,"getBenchmarkWorks").mockRejectedValue(Object.assign(new Error("fixture quota"),{code:"REDFOX_QUOTA_EXCEEDED"}));
  await executeManualBenchmarkSync(actor(),accountId,started.run.id);expect((await manualBenchmarkSyncStatus(actor(),accountId)).run).toMatchObject({status:"FAILED",coverage:"REDFOX_QUOTA_EXCEEDED"});
  expect(await db.benchmarkContentSnapshot.count({where:{benchmarkAccountId:accountId}})).toBe(1);
 });
 it("lists completed unsaved reports privately and chooses the latest version per work",async()=>{
  const evidence=await collectWorkResearchEvidence(actor(),accountId,workId),session=await createResearchSession(actor(),{title:"fixture",entryTemplate:"BENCHMARK",requestKey:randomUUID()});
  await db.researchRun.createMany({data:[1,2].map(version=>({workspaceId,requestedById:userId,sessionId:session.id,requestKey:randomUUID(),requestHash:"fixture-"+version,version,question:"fixture",status:"COMPLETED",stage:"completed",inputScope:{benchmarkWorkId:workId},coverage:{workResearch:{schemaVersion:"work-research-v1",depth:"DEEP",evidence,answer:sampleAnswer()}},createdAt:new Date(Date.now()+version*1000)}))});
  const reports=await completedWorkReports(actor());expect(reports.count).toBe(1);expect(reports.items[0]?.version).toBe(2);
  const latest=reports.items[0]!.id,old=(await db.researchRun.findFirstOrThrow({where:{sessionId:session.id,version:1}})).id;
  expect((await completedWorkReports(actor(),{report:old,q:"not-a-match"})).selected?.id).toBe(old);
  expect((await workResearchOverview(actor(),accountId,workId,{runId:old})).latest?.version).toBe(1);
  await researchObjectAction(actor(),{kind:"REPORT_ARCHIVED",key:latest,action:"FOLLOW"});
  const active=await completedWorkReports(actor());expect(active.count).toBe(0);expect(active.selected).toBeNull();expect(active.archivedCount).toBe(1);
  expect((await completedWorkReports(actor(),{status:"archived"})).selected?.id).toBe(latest);
  await researchObjectAction(actor(),{kind:"REPORT_ARCHIVED",key:old,action:"FOLLOW"});
  expect((await completedWorkReports(actor(),{status:"archived"})).count).toBe(2);
  await researchObjectAction(actor(),{kind:"REPORT_ARCHIVED",key:latest,action:"UNFOLLOW"});
  expect((await completedWorkReports(actor())).selected?.id).toBe(latest);
  await expect(completedWorkReports(actor(),{report:"missing-report"})).rejects.toMatchObject({status:404});
  await expect(completedWorkReports({workspaceId,userId:outsider})).rejects.toMatchObject({status:403});
  const other=(await db.workspace.create({data:{name:"Report scope fixture",slug:"report-other-"+suffix,members:{create:{userId:outsider,role:"OWNER"}}}})).id;
  try{await expect(completedWorkReports({workspaceId:other,userId:outsider},{report:latest})).rejects.toMatchObject({status:404});}finally{await db.workspace.delete({where:{id:other}});}
 });
 it("recovers only stale manual pages after a server restart",async()=>{
  vi.spyOn(providers,"isLocalReviewOffline").mockReturnValue(false);
  const stale=await db.benchmarkCollectionRun.create({data:{workspaceId,benchmarkAccountId:accountId,requestedById:userId,status:"RUNNING",rangeStart:new Date(0),rangeEnd:new Date(),startedAt:new Date(Date.now()-600000),profileSnapshot:{mode:"MANUAL_PAGE",requestOffset:0,nextOffset:null}}});
  expect((await manualBenchmarkSyncStatus(actor(),accountId)).run?.status).toBe("FAILED");
  const next=await startManualBenchmarkSync(actor(),accountId,{});expect(next.run.status).toBe("QUEUED");
  expect((await db.benchmarkCollectionRun.findUniqueOrThrow({where:{id:stale.id}})).stopReason).toBe("STALE_MANUAL_SYNC");
  await db.benchmarkCollectionRun.update({where:{id:next.run.id},data:{status:"FAILED",completedAt:new Date()}});
 });
 it("queues a report as one private topic with its exact version and keeps it after report archive",async()=>{
  await attachWorkSource(actor(),accountId,workId,{text:sampleBody,requestKey:randomUUID()});
  const evidence=await collectWorkResearchEvidence(actor(),accountId,workId),answer=sampleAnswer();answer.structureBlocks.forEach(block=>{block.startMs=null;block.endMs=null;});
  const state={schemaVersion:"work-research-v1" as const,depth:"DEEP" as const,evidence,answer};
  const session=await createResearchSession(actor(),{title:"Private topic fixture",entryTemplate:"BENCHMARK",requestKey:randomUUID()});
  const run=await db.researchRun.create({data:{workspaceId,requestedById:userId,sessionId:session.id,requestKey:randomUUID(),requestHash:"private-topic",version:1,question:"topic",status:"COMPLETED",stage:"completed",inputScope:{benchmarkWorkId:workId},coverage:{workResearch:state},blocks:renderWorkResearchBlocks(state),createdAt:new Date()}});
  const [first,second]=await Promise.all([addWorkReportToPool(actor(),accountId,workId,run.id),addWorkReportToPool(actor(),accountId,workId,run.id)]);
  expect(first.artifactId).toBe(second.artifactId);expect(first.href).toContain("/research/pool?topic=");
  const artifact=await db.artifact.findUniqueOrThrow({where:{id:first.artifactId},include:{conversation:true,draftBranch:true}});
  expect(artifact.visibility).toBe("PRIVATE");expect(artifact.projectId).toBeNull();expect(artifact.draftBranch.workingBody).toBe("");
  expect(artifact.conversation!.contextSnapshot).toMatchObject({poolResearchRunId:run.id,adoptedResearch:[{sourceId:run.id,version:1}]});
  await researchObjectAction(actor(),{kind:"REPORT_ARCHIVED",key:run.id,action:"FOLLOW"});expect((await personalReportPool(actor())).some(item=>item.artifactId===first.artifactId)).toBe(true);
  expect((await workReportPoolStatus(actor(),run.id))?.artifactId).toBe(first.artifactId);
  const listed=vi.spyOn(db.assistantThread,"findMany").mockResolvedValue([]);
  expect((await personalReportPool(actor(),{selectedId:first.artifactId}))[0]?.artifactId).toBe(first.artifactId);listed.mockRestore();
  await savePersonalDraft(actor(),first.artifactId,{expectedVersion:artifact.draftBranch.version,title:artifact.title,body:"这是我自己的角度。"});expect((await personalReportPool(actor())).find(item=>item.artifactId===first.artifactId)?.started).toBe(true);
  await expect(addWorkReportToPool({workspaceId,userId:outsider},accountId,workId,run.id)).rejects.toMatchObject({status:403});
 });
 it("imports one public work from a pasted link and reuses saved identity without another external request",async()=>{
  const id=String(Date.now()),item={...page("MS4w-"+suffix,"uid-"+suffix).items[0]!,externalId:id,authorId:"uid-"+suffix,originalUrl:"https://www.douyin.com/video/"+id,sourceItemId:null};
  const detail=vi.spyOn(discovery,"getDiscoveryContentDetail").mockResolvedValue({items:[item],cached:false});
  const first=await importWorkForReport(actor(),{shareText:item.originalUrl});expect(first.href).toContain("/works/");expect(detail).toHaveBeenCalledWith(expect.objectContaining({purpose:"RESEARCH_COLLECTION",url:item.originalUrl}));
  const second=await importWorkForReport(actor(),{shareText:item.originalUrl});expect(second.workId).toBe(first.workId);expect(second.existing).toBe(true);expect(detail).toHaveBeenCalledOnce();
  await expect(importWorkForReport(actor(),{shareText:"https://127.0.0.1/private"})).rejects.toMatchObject({code:"INVALID_WORK_LINK"});
  await expect(importWorkForReport({workspaceId,userId:outsider},{shareText:item.originalUrl})).rejects.toMatchObject({status:403});
  detail.mockResolvedValue({items:[{...item,externalId:"wrong-work"}],cached:false});await expect(importWorkForReport(actor(),{shareText:"https://www.douyin.com/video/999999999999"})).rejects.toMatchObject({code:"WORK_IDENTITY_MISMATCH"});
 });
});
