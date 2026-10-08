import {randomUUID} from "node:crypto";
import {afterAll,beforeAll,expect,it,vi} from "vitest";
vi.mock("server-only",()=>({}));
import {db} from "@content-center/db";
import {getObjectResearch,startObjectResearch,objectResearchRequestKey} from "../server/research/object-sessions";
import {resolveResearchInputs} from "../server/research/inputs";
import {researchScopeSchema} from "../server/research/contracts";
let workspaceId="",accountId="",workA="",workB="";
const suffix=randomUUID(),userId="object-owner-"+suffix,peerId="object-peer-"+suffix;
const actor=()=>({workspaceId,userId});
beforeAll(async()=>{
 await db.user.createMany({data:[userId,peerId].map(id=>({id,name:id,email:id+"@example.test"}))});
 workspaceId=(await db.workspace.create({data:{name:"Object research fixture",slug:suffix,members:{create:[{userId,role:"OWNER"},{userId:peerId,role:"ADMIN"}]}}})).id;
 accountId=(await db.benchmarkAccount.create({data:{workspaceId,createdById:userId,name:"Fixture account",platform:"DOUYIN",externalAccountId:suffix}})).id;
 for(const [index,body]of["只有第一条作品的正文。","不能自动读取的第二条作品内容。"].entries()){
  const externalId=suffix+"-"+index,work=await db.benchmarkContentSnapshot.create({data:{workspaceId,benchmarkAccountId:accountId,platform:"DOUYIN",externalId,title:"Work "+index,url:"https://example.test/"+index,metadata:{}}});
  await db.sourceItem.create({data:{workspaceId,createdById:userId,title:"Source "+index,sourcePlatform:"DOUYIN",externalId,sourceType:"TEXT",rawText:body,status:"READY"}});
  if(index===0)workA=work.id;else workB=work.id;
 }
});
afterAll(async()=>{if(workspaceId)await db.workspace.delete({where:{id:workspaceId}});await db.user.deleteMany({where:{id:{in:[userId,peerId]}}});await db.$disconnect();});
it("reading a subject does not create a session; sending persists one isolated subject",async()=>{
 expect((await getObjectResearch(actor(),{kind:"WORK",id:workA})).sessionId).toBeNull();expect(await db.researchSession.count({where:{workspaceId}})).toBe(0);
 const first=await startObjectResearch(actor(),{object:{kind:"WORK",id:workA},question:"这条内容的论证如何？",requestKey:randomUUID()});
 await db.researchRun.update({where:{id:first.runId},data:{status:"COMPLETED",finishedAt:new Date(),blocks:[]}});
 const second=await startObjectResearch(actor(),{object:{kind:"WORK",id:workA},question:"再看一下表达。",requestKey:randomUUID()});
 expect(second.sessionId).toBe(first.sessionId);
 const other=await startObjectResearch(actor(),{object:{kind:"WORK",id:workB},question:"第二条怎么写？",requestKey:randomUUID()});expect(other.sessionId).not.toBe(first.sessionId);
 const peer=await getObjectResearch({workspaceId,userId:peerId},{kind:"WORK",id:workA});expect(peer.sessionId).toBeNull();expect(peer.runs).toEqual([]);
});
it("keeps comparison identity independent from account order and current report version",()=>{
 expect(objectResearchRequestKey(actor(),{kind:"COMPARE",ids:["a","b"]})).toBe(objectResearchRequestKey(actor(),{kind:"COMPARE",ids:["b","a"]}));
 expect(objectResearchRequestKey(actor(),{kind:"WORK",id:"a",reportId:"r1"})).toBe(objectResearchRequestKey(actor(),{kind:"WORK",id:"a",reportId:"r2"}));
 expect(objectResearchRequestKey(actor(),{kind:"WORK",id:"a"})).not.toBe(objectResearchRequestKey({workspaceId,userId:peerId},{kind:"WORK",id:"a"}));
});
it("limits work-level inputs to the selected work instead of all account works",async()=>{
 const result=await resolveResearchInputs(actor(),"核对这条作品",researchScopeSchema.parse({benchmarkAccountIds:[accountId],benchmarkWorkId:workA}));
 expect(result.sourceRefs.filter(ref=>ref.kind==="BENCHMARK_WORK").map(ref=>ref.objectId)).toEqual([workA]);
 expect(JSON.stringify(result.context)).toContain("只有第一条");expect(JSON.stringify(result.context)).not.toContain("第二条作品内容");
});
it("keeps legacy snapshot counters available to the assistant, matching the work reader",async()=>{
 await db.benchmarkContentSnapshot.update({where:{id:workA},data:{metadata:{metrics:{likes:844,comments:14,favorites:22,shares:7}}}});
 const inputs=await resolveResearchInputs(actor(),"核对已有数据",researchScopeSchema.parse({benchmarkAccountIds:[accountId],benchmarkWorkId:workA}));
 const workSource=inputs.sourceRefs.find(ref=>ref.kind==="BENCHMARK_WORK"&&ref.objectId===workA)!;
 expect(workSource.excerpt).toContain("844");
 expect(workSource.excerpt).toContain("14");
 expect(workSource.excerpt).not.toContain("公开互动计数缺失");
});
it("rejects foreign subject identifiers and another work's report",async()=>{
 await expect(getObjectResearch(actor(),{kind:"WORK",id:"foreign"})).rejects.toMatchObject({status:404});
 const session=await db.researchSession.create({data:{workspaceId,createdById:userId,title:"other report",requestKey:randomUUID()}});
 const run=await db.researchRun.create({data:{workspaceId,sessionId:session.id,requestedById:userId,requestKey:randomUUID(),requestHash:"fixture",question:"other work",version:1,status:"COMPLETED",inputScope:{benchmarkWorkId:workB},blocks:[]}});
 await expect(getObjectResearch(actor(),{kind:"WORK",id:workA,reportId:run.id})).rejects.toMatchObject({status:404});
});
