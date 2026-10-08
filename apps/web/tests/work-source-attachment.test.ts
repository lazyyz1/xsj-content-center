import {randomUUID} from "node:crypto";
import {beforeAll,afterAll,describe,expect,it,vi} from "vitest";
vi.mock("server-only",()=>({}));
import {db} from "@content-center/db";
import {attachWorkSource,workResearchOverview} from "../server/research/work-research-service";
import {collectWorkResearchEvidence} from "../server/research/work-research-evidence";
import {requestSourceTranscription} from "@content-center/worker/transcription";
import {withIngestExecution} from "@content-center/worker/job-recovery";
import type {Job} from "bullmq";
import type {ContentIngestPayload} from "@content-center/worker/queue-producer";
describe("explicit source recovery and worker authorization",()=>{
 let workspaceId="",foreignSpace="",owner="",viewer="",disabled="",accountId="",workId="",sourceId="",foreignSource="";
 beforeAll(async()=>{
 const key=randomUUID();owner="attach-owner-"+key;viewer="attach-viewer-"+key;disabled="attach-disabled-"+key;
 await db.user.createMany({data:[owner,viewer,disabled].map(id=>({id,name:id,email:id+"@example.test"}))});
 workspaceId=(await db.workspace.create({data:{name:"Attachment fixture",slug:key,members:{create:[{userId:owner,role:"OWNER"},{userId:viewer,role:"VIEWER"},{userId:disabled,role:"EDITOR",disabledAt:new Date()}]}}})).id;
 foreignSpace=(await db.workspace.create({data:{name:"Foreign fixture",slug:key+"-foreign",members:{create:{userId:owner,role:"OWNER"}}}})).id;
 accountId=(await db.benchmarkAccount.create({data:{workspaceId,createdById:owner,platform:"DOUYIN",externalAccountId:key,name:"Fixture author"}})).id;
 workId=(await db.benchmarkContentSnapshot.create({data:{workspaceId,benchmarkAccountId:accountId,platform:"DOUYIN",externalId:key,title:"Fixture work",url:"https://example.test/work",metadata:{}}})).id;
 sourceId=(await db.sourceItem.create({data:{workspaceId,createdById:owner,sourceType:"VIDEO",sourcePlatform:"GENERIC",sourceProvider:"LOCAL_UPLOAD",status:"READY",rawText:"Verified uploaded source."}})).id;
 foreignSource=(await db.sourceItem.create({data:{workspaceId:foreignSpace,createdById:owner,sourceType:"TEXT",status:"READY",rawText:"Foreign"}})).id;
 });
 afterAll(async()=>{await db.workspace.deleteMany({where:{id:{in:[workspaceId,foreignSpace]}}});await db.user.deleteMany({where:{id:{in:[owner,viewer,disabled]}}});await db.$disconnect();});
 const actor=()=>({workspaceId,userId:owner});
 it("links a generic upload without relabelling it and reads it in the work report",async()=>{
 expect((await attachWorkSource(actor(),accountId,workId,{sourceItemId:sourceId})).sourceItemId).toBe(sourceId);
 const view=await workResearchOverview(actor(),accountId,workId);expect(view.current.sourceItemId).toBe(sourceId);expect(view.current.contentText).toBe("Verified uploaded source.");
 expect((await db.sourceItem.findUniqueOrThrow({where:{id:sourceId}})).sourcePlatform).toBe("GENERIC");
 });
 it("rejects foreign sources, foreign works, viewers and disabled memberships",async()=>{
 await expect(attachWorkSource(actor(),accountId,workId,{sourceItemId:foreignSource})).rejects.toMatchObject({code:"SOURCE_NOT_READY"});
 await expect(attachWorkSource(actor(),"foreign",workId,{sourceItemId:sourceId})).rejects.toMatchObject({code:"NOT_FOUND"});
 for(const userId of [viewer,disabled])await expect(attachWorkSource({workspaceId,userId},accountId,workId,{sourceItemId:sourceId})).rejects.toMatchObject({status:403});
 });
 it("persists one supplemented text on replay and rejects changed text with the same request key",async()=>{
 const requestKey=randomUUID(),input={text:"New verified source text.",requestKey};
 const [a,b]=await Promise.all([attachWorkSource(actor(),accountId,workId,input),attachWorkSource(actor(),accountId,workId,input)]);
 expect(a.sourceItemId).toBe(b.sourceItemId);await expect(attachWorkSource(actor(),accountId,workId,{...input,text:"Changed"})).rejects.toMatchObject({code:"REQUEST_CONFLICT"});
 });
 it("preserves the association when external calls are blocked, without creating a transcription job",async()=>{
 process.env.EXTERNAL_CALLS_DISABLED="true";
 try{expect(await attachWorkSource(actor(),accountId,workId,{sourceItemId:sourceId,autoTranscribe:true})).toMatchObject({transcriptionStatus:"BLOCKED"});
 expect(await db.ingestJob.count({where:{workspaceId,sourceItemId:sourceId,jobType:"TRANSCRIBE"}})).toBe(0);}finally{delete process.env.EXTERNAL_CALLS_DISABLED;}
 });
 it("refuses execution after a membership is disabled",async()=>{
 const job=await db.ingestJob.create({data:{workspaceId,sourceItemId:sourceId,requestedById:disabled,jobType:"TRANSCRIBE",provider:"LOCAL_FUNASR",providerMode:"REAL",status:"QUEUED"}});
 const execute=vi.fn();const queueJob={name:"TRANSCRIBE_SOURCE",data:{jobId:job.id,workspaceId,sourceItemId:sourceId,requestedById:disabled}} as Job<ContentIngestPayload>;
 expect(await withIngestExecution(queueJob,execute)).toEqual({status:"authorization-revoked"});expect(execute).not.toHaveBeenCalled();
 expect((await db.ingestJob.findUniqueOrThrow({where:{id:job.id}})).errorCode).toBe("TASK_AUTHORIZATION_REVOKED");
 });

it("requires review before another ASR request without consulting the provider",async()=>{
 const job=await db.ingestJob.create({data:{workspaceId,sourceItemId:sourceId,requestedById:owner,jobType:"TRANSCRIBE",provider:"LOCAL_FUNASR",providerMode:"REAL",status:"FAILED",errorCode:"ASR_RESULT_UNCERTAIN"}});
 await expect(requestSourceTranscription({workspaceId,sourceItemId:sourceId,requestedById:owner})).rejects.toMatchObject({retryable:false});
 expect(await db.ingestJob.count({where:{sourceItemId:sourceId,jobType:"TRANSCRIBE"}})).toBe(2);
 await db.ingestJob.delete({where:{id:job.id}});
});
it("bounds the snapshot and excludes repeated later segments from its timecodes",async()=>{
 const text="先展示真实问题。"+"甲".repeat(12000)+"未进入快照的结尾。先展示真实问题。";
 const source=await db.sourceItem.create({data:{workspaceId,createdById:owner,sourceType:"VIDEO",status:"READY",transcript:{create:{workspaceId,provider:"FIXTURE",providerMode:"REAL",fullText:text,segments:[{startMs:0,endMs:1000,text:"先展示真实问题。"},{startMs:1000,endMs:2000,text:"未进入快照的结尾。"},{startMs:2000,endMs:3000,text:"先展示真实问题。"}]}}}});
 await attachWorkSource(actor(),accountId,workId,{sourceItemId:source.id});
 const evidence=await collectWorkResearchEvidence(actor(),accountId,workId);
 expect(evidence.contentText).toHaveLength(12000);expect(evidence.truncated).toBe(true);expect(evidence.segments).toEqual([{startMs:0,endMs:1000,text:"先展示真实问题。"}]);
});
});
