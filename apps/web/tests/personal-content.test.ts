import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
import { db, type Prisma } from "@content-center/db";
import { createPersonalContent, getPersonalContent, savePersonalDraft, checkpointPersonalContent, classifyPersonalContent, updatePersonalContext, listPersonalContents, personalContentForUser } from "../server/artifacts/personal";
import { buildPersonalContentContext, getPersonalContentThread } from "../server/assistant/personal-content";
import type { ContentContextSnapshot } from "../lib/contracts/content";
import { getArtifactForUser, listArtifacts } from "../server/artifacts/service";
const suffix = randomUUID(), ownerId = "personal-owner-" + suffix, peerId = "personal-peer-" + suffix, foreignId = "personal-foreign-" + suffix;
let workspaceId = "", foreignWorkspaceId = "", projectId = "", reportId = "", sessionId = "";
const owner = () => ({ workspaceId, userId: ownerId }), peer = () => ({ workspaceId, userId: peerId });
describe("persistent private content without a project", () => {
 beforeAll(async () => {
  await db.user.createMany({ data: [ownerId, peerId, foreignId].map(id => ({ id, name: id, email: id + "@example.test" })) });
  workspaceId = (await db.workspace.create({ data: { name: "Private content fixture", slug: "pc-" + suffix, members: { create: [{ userId: ownerId, role: "OWNER" }, { userId: peerId, role: "ADMIN" }] } } })).id;
  foreignWorkspaceId = (await db.workspace.create({ data: { name: "Foreign fixture", slug: "foreign-" + suffix, members: { create: { userId: foreignId, role: "OWNER" } } } })).id;
  projectId = (await db.contentProject.create({ data: { workspaceId, createdById: ownerId, title: "Long-term project" } })).id;
  sessionId = (await db.researchSession.create({ data: { workspaceId, createdById: ownerId, title: "Source research", requestKey: randomUUID() } })).id;
  const source = await db.sourceItem.create({data:{workspaceId,createdById:ownerId,sourceType:"TEXT",status:"READY",title:"完整参考资料",rawText:"从具体的问题进入内容。未主动选中的完整原文秘密段落。"}});
  const sourceRef = {ref:"M1",kind:"MATERIAL",objectId:source.id,title:"完整参考资料",href:"/library/"+source.id,capturedAt:new Date().toISOString(),publishedAt:null,eventAt:null,contentOrigin:"ORIGINAL",locator:"全文",excerpt:source.rawText!,version:"1"};
  const blocks = [
   { id: "structure-0", type: "text", title: "提出问题", text: "从具体的问题进入内容", provenance: "AI_INTERPRETATION", sourceRefs: ["M1"], limitation: "单个样本" },
   { id: "structure-1", type: "text", title: "展示过程", text: "给出实际操作步骤", provenance: "AI_INTERPRETATION", sourceRefs: [], limitation: null },
   { id: "other-finding", type: "text", title: "其他观察", text: "不应自动采用的另一项发现", provenance: "AI_INTERPRETATION", sourceRefs: [], limitation: null },
   { id: "sources", type: "sources", title: "来源", sourceRefs:["M1"],provenance:"REAL_DATA",limitation:null,refs:[sourceRef] },
  ];
  reportId = (await db.researchRun.create({ data: { workspaceId, sessionId, requestedById: ownerId, requestKey: randomUUID(), requestHash: "fixture", question: "How is this written?", version: 1, status: "COMPLETED", inputScope: {}, blocks, sourceRefs: [sourceRef] } })).id;
 });
 afterAll(async () => {
  if (workspaceId) await db.workspace.deleteMany({ where: { id: workspaceId } });
  if (foreignWorkspaceId) await db.workspace.deleteMany({ where: { id: foreignWorkspaceId } });
  await db.user.deleteMany({ where: { id: { in: [ownerId, peerId, foreignId] } } }); await db.$disconnect();
 });
 it("creates an empty persistent editor and makes duplicate clicks idempotent", async () => {
  const request = { clientRequestId: randomUUID() };
  const first = await createPersonalContent(owner(), request), again = await createPersonalContent(owner(), request);
  expect(first.projectId).toBeNull(); expect(first.visibility).toBe("PRIVATE"); expect(first.content).toBe(""); expect(first.threadId).toBeTruthy(); expect(again.artifactId).toBe(first.artifactId);
  const reopened = await getPersonalContent(owner(), first.artifactId); expect(reopened.threadId).toBe(first.threadId);
  await expect(createPersonalContent(owner(), { ...request, title: "Changed" })).rejects.toMatchObject({ status: 409 });
 });
 it("persists selected research only, without saving or sharing its source", async () => {
  const source = await db.researchRun.findUniqueOrThrow({ where: { id: reportId } });
  const blocks = source.blocks as unknown as Array<{ id: string; type: string; text?: string }>, chosen = blocks.find(block => block.type === "text" && block.id.startsWith("structure-"))!;
  const request = { clientRequestId: randomUUID(), research: { sourceId: reportId, selection: { kind: "run", version: 1, items: [{ id: chosen.id, text: chosen.text }] } } };
  const first = await createPersonalContent(owner(), request), second = await createPersonalContent(owner(), { ...request, clientRequestId: randomUUID() });
  expect(first.threadId).not.toBe(second.threadId); expect(first.references[0]!.blocks.filter(block => block.type === "text").map(block => block.id)).toEqual([chosen.id]);
  expect(JSON.stringify(first.references)).not.toContain("未主动选中的完整原文秘密段落");
  expect(JSON.stringify(first.references)).toContain("完整参考资料");
  const context=await buildPersonalContentContext(owner(),await personalContentForUser(owner(),first.artifactId),{content:"借用选中结构",mode:"chat"});
  expect(JSON.stringify(context.context)).not.toContain("未主动选中的完整原文秘密段落");
  expect(JSON.stringify(context.context)).toContain("从具体的问题进入内容");
  expect(JSON.stringify((await db.researchRun.findUniqueOrThrow({where:{id:reportId}})).sourceRefs)).toContain("未主动选中的完整原文秘密段落");
  const stored=await personalContentForUser(owner(),first.artifactId),legacy=structuredClone(stored.conversation!.contextSnapshot) as unknown as ContentContextSnapshot;
  const sourceBlock=legacy.adoptedResearch[0]!.blocks.find(block=>block.type==="sources");
  if(sourceBlock?.type!=="sources")throw Error("SOURCE_CITATION_FIXTURE_REQUIRED");
  sourceBlock.refs[0]!.excerpt="未主动选中的完整原文秘密段落";
  await db.assistantThread.update({where:{id:first.threadId},data:{contextSnapshot:legacy as unknown as Prisma.InputJsonValue}});
  await db.assistantMessage.create({data:{threadId:first.threadId,artifactId:first.artifactId,role:"ASSISTANT",content:"未主动选中的完整原文秘密段落",status:"COMPLETED",metadata:{contextPolicyVersion:1}}});
  const compatible=await buildPersonalContentContext(owner(),await personalContentForUser(owner(),first.artifactId),{content:"继续写自己的内容",mode:"chat"});
  expect(JSON.stringify(compatible.context)).not.toContain("未主动选中的完整原文秘密段落");
  expect((await getPersonalContentThread(owner(),first.artifactId)).messages).toHaveLength(1);
  expect((await db.researchRun.findUniqueOrThrow({ where: { id: reportId } })).savedAt).toBeNull();
  expect(await db.artifact.count({ where: { sourceResearchRunId: reportId } })).toBe(0);
  await db.researchRun.update({ where: { id: reportId }, data: { blocks: [] } });
  expect((await getPersonalContent(owner(), first.artifactId)).references[0]!.blocks).toEqual(first.references[0]!.blocks);
  await db.researchRun.update({ where: { id: reportId }, data: { blocks: source.blocks as Prisma.InputJsonValue } });
 });
 it("saves working drafts, checkpoints versions and restores as a new revision", async () => {
  let content = await createPersonalContent(owner(), { clientRequestId: randomUUID(), title: "My draft" });
  const base = content.version, initialRevisions = content.revisions.length;
  content = await savePersonalDraft(owner(), content.artifactId, { expectedVersion: content.version, title: content.title, body: "My first statement." });
  expect(content.revisions).toHaveLength(initialRevisions);
  await expect(savePersonalDraft(owner(), content.artifactId, { expectedVersion: base, title: content.title, body: "stale" })).rejects.toMatchObject({ status: 409 });
  content = await checkpointPersonalContent(owner(), content.artifactId, { expectedVersion: content.version }); const saved = content.revisions[0]!;
  content = await savePersonalDraft(owner(), content.artifactId, { expectedVersion: content.version, title: content.title, body: "My second statement." });
  content = await checkpointPersonalContent(owner(), content.artifactId, { expectedVersion: content.version });
  content = await checkpointPersonalContent(owner(), content.artifactId, { expectedVersion: content.version, restoreRevisionId: saved.id });
  expect(content.content).toBe("My first statement."); expect(content.revisions[0]!.revision).toBeGreaterThan(saved.revision);
 });
 it("classification does not move drafts or expose them to project administrators", async () => {
  const original = await createPersonalContent(owner(), { clientRequestId: randomUUID(), body: "private words" });
  const classified = await classifyPersonalContent(owner(), original.artifactId, projectId);
  expect(classified.projectId).toBe(projectId); expect(classified.visibility).toBe("PRIVATE"); expect(classified.threadId).toBe(original.threadId); expect(classified.version).toBe(original.version);
  await expect(getPersonalContent(peer(), original.artifactId)).rejects.toMatchObject({ status: 404 });
  await expect(getArtifactForUser({ ...peer(), projectId, artifactId: original.artifactId })).rejects.toMatchObject({ code: "ARTIFACT_NOT_FOUND" });
  expect(await listArtifacts({ ...peer(), projectId })).toEqual([]);
  expect((await listPersonalContents(owner(), { projectId })).some(item => item.artifactId === original.artifactId)).toBe(true);
  const branch = await db.draftBranch.findFirstOrThrow({ where: { artifact: { id: original.artifactId } } }); expect(branch.projectId).toBeNull();
 });
 it("rejects other workspace, forged selection and stale context", async () => {
  const content = await createPersonalContent(owner(), { clientRequestId: randomUUID() });
  await expect(getPersonalContent({ workspaceId: foreignWorkspaceId, userId: foreignId }, content.artifactId)).rejects.toMatchObject({ status: 404 });
  await expect(createPersonalContent(peer(), { clientRequestId: randomUUID(), research: { sourceId: reportId, selection: { kind: "run", version: 1, items: [{ id: "forged", text: "invented" }] } } })).rejects.toMatchObject({ status: 404 });
  const updated = await updatePersonalContext(owner(), content.artifactId, { expectedContextVersion: content.contextVersion, ownAngle: "My own experience" });
  expect(updated.ownAngle).toBe("My own experience");
  await expect(updatePersonalContext(owner(), content.artifactId, { expectedContextVersion: content.contextVersion, ownAngle: "late" })).rejects.toMatchObject({ status: 409 });
 });
 it("keeps unclassified content when a classified project is deleted", async () => {
  const project = await db.contentProject.create({ data: { workspaceId, createdById: ownerId, title: "Temporary classification" } });
  const content = await createPersonalContent(owner(), { clientRequestId: randomUUID(), projectId: project.id, body: "keep this" });
  await db.contentProject.delete({ where: { id: project.id } });
  const reopened = await getPersonalContent(owner(), content.artifactId); expect(reopened.projectId).toBeNull(); expect(reopened.content).toBe("keep this"); expect(reopened.threadId).toBe(content.threadId);
 });
});
