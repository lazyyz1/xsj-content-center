import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { db, findCollectionForUser, findIngestJobForUser, findSourceAssetForUser, findSourceForUser, findTagForUser } from "./index";

describe("source domain workspace isolation", () => {
  const runId = randomUUID();
  const userAId = `source-a-${runId}`;
  const userBId = `source-b-${runId}`;
  let workspaceAId = "";
  let workspaceBId = "";
  let sourceBId = "";
  let jobBId = "";
  let tagBId = "";
  let collectionBId = "";
  let assetBId = "";

  beforeAll(async () => {
    await db.user.createMany({ data: [
      { id: userAId, name: "Source User A", email: `${userAId}@example.test` },
      { id: userBId, name: "Source User B", email: `${userBId}@example.test` },
    ] });
    const [workspaceA, workspaceB] = await Promise.all([
      db.workspace.create({ data: { name: "Source A", slug: `source-a-${runId}`, members: { create: { userId: userAId, role: "OWNER" } } } }),
      db.workspace.create({ data: { name: "Source B", slug: `source-b-${runId}`, members: { create: { userId: userBId, role: "OWNER" } } } }),
    ]);
    workspaceAId = workspaceA.id;
    workspaceBId = workspaceB.id;
    const sourceB = await db.sourceItem.create({ data: { workspaceId: workspaceB.id, createdById: userBId, sourceType: "TEXT", sourcePlatform: "GENERIC", rawText: "B only", status: "PENDING" } });
    sourceBId = sourceB.id;
    const [jobB, tagB, collectionB, assetB] = await Promise.all([
      db.ingestJob.create({ data: { workspaceId: workspaceB.id, sourceItemId: sourceB.id, requestedById: userBId, jobType: "EXTRACT_TEXT", provider: "MANUAL", providerMode: "REAL" } }),
      db.contentTag.create({ data: { workspaceId: workspaceB.id, name: "Private B", slug: `private-b-${runId}` } }),
      db.collection.create({ data: { workspaceId: workspaceB.id, createdById: userBId, name: `Private B ${runId}` } }),
      db.sourceAsset.create({ data: { workspaceId: workspaceB.id, sourceItemId: sourceB.id, assetType: "VIDEO", sourceProvider: "REDFOX", remoteUrl: "https://media.example/private.mp4" } }),
    ]);
    jobBId = jobB.id;
    tagBId = tagB.id;
    collectionBId = collectionB.id;
    assetBId = assetB.id;
  });

  afterAll(async () => {
    await db.workspace.deleteMany({ where: { id: { in: [workspaceAId, workspaceBId] } } });
    await db.user.deleteMany({ where: { id: { in: [userAId, userBId] } } });
    await db.$disconnect();
  });

  it("does not expose another workspace source, job, tag or collection", async () => {
    await expect(findSourceForUser(db, { userId: userAId, workspaceId: workspaceAId, sourceItemId: sourceBId })).resolves.toBeNull();
    await expect(findIngestJobForUser(db, { userId: userAId, workspaceId: workspaceAId, jobId: jobBId })).resolves.toBeNull();
    await expect(findTagForUser(db, { userId: userAId, workspaceId: workspaceAId, tagId: tagBId })).resolves.toBeNull();
    await expect(findCollectionForUser(db, { userId: userAId, workspaceId: workspaceAId, collectionId: collectionBId })).resolves.toBeNull();
    await expect(findSourceAssetForUser(db, { userId: userAId, workspaceId: workspaceAId, sourceAssetId: assetBId })).resolves.toBeNull();
  });

  it("enforces collection item uniqueness", async () => {
    await db.collectionItem.create({ data: { collectionId: collectionBId, sourceItemId: sourceBId } });
    await expect(db.collectionItem.create({ data: { collectionId: collectionBId, sourceItemId: sourceBId } })).rejects.toMatchObject({ code: "P2002" });
  });
});
