import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
import { db } from "@content-center/db";
import { MockLLMProvider } from "@content-center/providers";
import { createPersonalContent, getPersonalContent, savePersonalDraft, updatePersonalContext } from "../server/artifacts/personal";
import { applyPersonalContentSuggestion, buildPersonalContentContext, getPersonalContentThread, runPersonalContentAssistant } from "../server/assistant/personal-content";
import type { AssistantStreamEvent } from "../lib/contracts/assistant";
const suffix = randomUUID(), userId = "content-assistant-" + suffix, peerId = "content-peer-" + suffix;
let workspaceId = "", captured = "", calls = 0;
const actor = () => ({ workspaceId, userId });
const provider = new MockLLMProvider(({ prompt }) => { captured = prompt; calls++; return "这是自己的表达。保留观点，先讲清一件事。"; });
const runtime = { provider, providerName: "KIMI", model: "kimi-k2.6", requestedModel: "kimi-k2.6", mode: "REAL" as const };
describe("content-scoped assistant and explicit application", () => {
 beforeAll(async () => {
  await db.user.createMany({ data: [userId,peerId].map(id => ({ id, name:id, email:id+"@example.test" })) });
  workspaceId = (await db.workspace.create({ data:{ name:"Content assistant", slug:"ca-"+suffix, members:{ create:[{userId,role:"OWNER"},{userId:peerId,role:"ADMIN"}] } } })).id;
 });
 afterAll(async () => { if(workspaceId) await db.workspace.delete({where:{id:workspaceId}}); await db.user.deleteMany({where:{id:{in:[userId,peerId]}}}); await db.$disconnect(); });
 it("keeps each document's chat isolated and does not overwrite while generating", async () => {
  const first = await createPersonalContent(actor(), { clientRequestId:randomUUID(), body:"第一条稿件的原始内容。", ownAngle:"我想表达个人观点" });
  const second = await createPersonalContent(actor(), { clientRequestId:randomUUID(), body:"第二条的秘密内容。" });
  const events: AssistantStreamEvent[] = [];
  const reply = await runPersonalContentAssistant({...actor(), artifactId:first.artifactId, content:"短一点", mode:"rewrite", requestId:randomUUID(), expectedVersion:first.version, expectedContextVersion:first.contextVersion}, event => events.push(event), {runtime});
  expect(reply.status).toBe("COMPLETED"); expect(reply.structuredResult).toMatchObject({type:"REWRITE",aiVersion:expect.any(String)});
  expect(captured).toContain("第一条稿件的原始内容"); expect(captured).not.toContain("第二条的秘密内容");
  expect((await getPersonalContent(actor(),first.artifactId)).content).toBe(first.content);
  expect((await getPersonalContentThread(actor(),second.artifactId)).messages).toEqual([]);
  expect(events.some(event=>event.type==="delta")).toBe(true);
  const applied = await applyPersonalContentSuggestion(actor(),first.artifactId,{messageId:reply.id,expectedVersion:first.version,expectedContextVersion:first.contextVersion});
  expect(applied.content).toContain("自己的表达"); expect(applied.version).toBeGreaterThan(first.version);
  await expect(applyPersonalContentSuggestion(actor(),second.artifactId,{messageId:reply.id,expectedVersion:second.version,expectedContextVersion:second.contextVersion})).rejects.toMatchObject({status:404});
 });
 it("rejects a late suggestion after manual changes, preserving both versions", async () => {
  const first = await createPersonalContent(actor(),{clientRequestId:randomUUID(),body:"原稿"});
  const reply = await runPersonalContentAssistant({...actor(),artifactId:first.artifactId,content:"改写稿件",mode:"rewrite",requestId:randomUUID(),expectedVersion:first.version,expectedContextVersion:first.contextVersion},()=>undefined,{runtime});
  const newer = await savePersonalDraft(actor(),first.artifactId,{expectedVersion:first.version,title:first.title,body:"我手动改过的正文"});
  await expect(applyPersonalContentSuggestion(actor(),first.artifactId,{messageId:reply.id,expectedVersion:newer.version,expectedContextVersion:newer.contextVersion})).rejects.toMatchObject({status:409});
  expect((await getPersonalContent(actor(),first.artifactId)).content).toBe("我手动改过的正文");
  expect((await getPersonalContentThread(actor(),first.artifactId)).messages.some(message=>message.id===reply.id)).toBe(true);
 });
 it("keeps the manuscript title separate when a rewrite repeats it ahead of the existing first paragraph",async()=>{
  const first=await createPersonalContent(actor(),{clientRequestId:randomUUID(),title:"稿件标题",body:"保留第一段。\n\n改得更自然的第二段。\n\n保留最后一段。"});
  const rewriting=new MockLLMProvider(()=>"# 稿件标题\n\n保留第一段。\n\n说得更自然一点。\n\n保留最后一段。");
  const reply=await runPersonalContentAssistant({...actor(),artifactId:first.artifactId,content:"只润色第二段，保留首尾",mode:"rewrite",requestId:randomUUID(),expectedVersion:first.version,expectedContextVersion:first.contextVersion},()=>undefined,{runtime:{...runtime,provider:rewriting}});
  expect(reply.content.startsWith("保留第一段。")).toBe(true);
  expect(reply.content.endsWith("保留最后一段。")).toBe(true);
  const applied=await applyPersonalContentSuggestion(actor(),first.artifactId,{messageId:reply.id,expectedVersion:first.version,expectedContextVersion:first.contextVersion});
  expect(applied.title).toBe("稿件标题");expect(applied.content).not.toContain("稿件标题");
 });
 it("preserves truncated output as an incomplete reply and cannot apply it over the manuscript", async () => {
  const first = await createPersonalContent(actor(), {clientRequestId:randomUUID(),body:"这份完整原稿不能被半份回复覆盖。"});
  const incomplete = new MockLLMProvider(() => "只返回了开头的一部分");
  const stream = incomplete.streamText.bind(incomplete);
  incomplete.streamText = async (input,options) => {
   const result = await stream(input,options);
   return {...result,data:{...result.data,finishReason:"length"}};
  };
  const events: AssistantStreamEvent[]=[];
  const reply = await runPersonalContentAssistant({...actor(),artifactId:first.artifactId,content:"改写稿件",mode:"rewrite",requestId:randomUUID(),expectedVersion:first.version,expectedContextVersion:first.contextVersion},event=>events.push(event),{runtime:{...runtime,provider:incomplete}});
  expect(reply.status).toBe("FAILED");
  expect(events).toContainEqual(expect.objectContaining({type:"error",code:"INVALID_OUTPUT"}));
  expect(reply.content).toContain("只返回了开头");
  expect((await getPersonalContent(actor(),first.artifactId)).content).toBe(first.content);
  await expect(applyPersonalContentSuggestion(actor(),first.artifactId,{messageId:reply.id,expectedVersion:first.version,expectedContextVersion:first.contextVersion})).rejects.toMatchObject({status:404});
 });
 it("rejects stale reference state and duplicate requests before another model call", async () => {
  const first = await createPersonalContent(actor(),{clientRequestId:randomUUID(),body:"原稿"}), requestId=randomUUID();
  const input={...actor(),artifactId:first.artifactId,content:"检查稿件",mode:"chat" as const,requestId,expectedVersion:first.version,expectedContextVersion:first.contextVersion};
  await runPersonalContentAssistant(input,()=>undefined,{runtime}); const before=calls;
  await expect(runPersonalContentAssistant(input,()=>undefined,{runtime})).rejects.toMatchObject({status:409}); expect(calls).toBe(before);
  await updatePersonalContext(actor(),first.artifactId,{expectedContextVersion:first.contextVersion,ownAngle:"新的角度"});
  await expect(runPersonalContentAssistant({...input,requestId:randomUUID()},()=>undefined,{runtime})).rejects.toMatchObject({status:409}); expect(calls).toBe(before);
 });
 it("does not infer company context from classification and forbids another member's conversation", async () => {
  const project=await db.contentProject.create({data:{workspaceId,createdById:userId,title:"Company secret",description:"未主动选择的公司内容"}});
  const first=await createPersonalContent(actor(),{clientRequestId:randomUUID(),projectId:project.id,body:"只写自己的内容"});
  const row=await import("../server/artifacts/personal").then(module=>module.personalContentForUser(actor(),first.artifactId));
  const context=await buildPersonalContentContext(actor(),row,{content:"看看稿件",mode:"chat"});
  expect(context.manifest.project.id).toBeNull(); expect(JSON.stringify(context.context)).not.toContain("Company secret"); expect(context.defaultMethod).toBeNull();
  await expect(getPersonalContentThread({workspaceId,userId:peerId},first.artifactId)).rejects.toMatchObject({status:404});
 });
});
