import "server-only";
import { db } from "@content-center/db";
import { z } from "zod";
import { researchMember, ResearchError, type ResearchActor } from "./access";
import { parseTrendStableKey, trendStableKey } from "./trends";

const actionSchema = z.object({ kind: z.enum(["TREND", "BENCHMARK"]), key: z.string().min(1).max(2000), action: z.enum(["VIEW", "FOLLOW", "UNFOLLOW"]) }).strict();
export async function researchObjectAction(actor: ResearchActor, value: unknown) {
  await researchMember(actor);
  const input = actionSchema.parse(value);
  let key = input.key;
  let trend: ReturnType<typeof parseTrendStableKey> | null = null;
  if (input.kind === "TREND") {
    trend = parseTrendStableKey(key);
    key = trendStableKey(trend);
    if (!await db.trendSnapshot.findFirst({ where: { workspaceId: actor.workspaceId, ...trend }, select: { id: true } })) throw new ResearchError("NOT_FOUND", "趋势不存在。", 404);
  } else if (!await db.benchmarkAccount.findFirst({ where: { id: key, workspaceId: actor.workspaceId, enabled: true }, select: { id: true } })) throw new ResearchError("NOT_FOUND", "对标账号不存在。", 404);
  const identity = { workspaceId: actor.workspaceId, userId: actor.userId, kind: input.kind, objectKey: key };
  const fields = trend ? { trendProvider: trend.provider, trendPlatform: trend.platform, trendType: trend.trendType, trendExternalKey: trend.externalKey } : {};
  const timestamp = new Date();
  const row = await db.researchObjectPreference.upsert({ where: { workspaceId_userId_kind_objectKey: identity },
    create: { ...identity, ...fields, viewedAt: timestamp, followedAt: input.action === "FOLLOW" ? timestamp : null },
    update: { ...fields, viewedAt: timestamp, ...(input.action === "VIEW" ? {} : { followedAt: input.action === "FOLLOW" ? timestamp : null }) },
    select: { followedAt: true, viewedAt: true } });
  return { followed: row.followedAt !== null, viewedAt: row.viewedAt };
}

export async function researchObjectPreference(actor: ResearchActor, kind: "TREND" | "BENCHMARK", key: string) {
  await researchMember(actor);
  return db.researchObjectPreference.findUnique({ where: { workspaceId_userId_kind_objectKey: { workspaceId: actor.workspaceId, userId: actor.userId, kind, objectKey: key } }, select: { followedAt: true, viewedAt: true } });
}

export async function recentResearchObjects(actor: ResearchActor) {
  await researchMember(actor);
  const rows = await db.researchObjectPreference.findMany({ where: { workspaceId: actor.workspaceId, userId: actor.userId, viewedAt: { not: null } }, orderBy: [{ viewedAt: "desc" }, { id: "desc" }], take: 24,
    select: { kind: true, objectKey: true, viewedAt: true, trendProvider: true, trendPlatform: true, trendType: true, trendExternalKey: true } });
  const accounts = rows.filter(row => row.kind === "BENCHMARK").slice(0, 6);
  const trends = rows.filter(row => row.kind === "TREND").slice(0, 6);
  const accountData = accounts.length ? await db.benchmarkAccount.findMany({ where: { workspaceId: actor.workspaceId, enabled: true, id: { in: accounts.map(row => row.objectKey) } }, select: { id: true, name: true, platform: true } }) : [];
  const recentTrends = await Promise.all(trends.map(async row => {
    if (!row.trendProvider || !row.trendPlatform || !row.trendType || !row.trendExternalKey) return null;
    const latest = await db.trendSnapshot.findFirst({ where: { workspaceId: actor.workspaceId, provider: row.trendProvider, platform: row.trendPlatform, trendType: row.trendType, externalKey: row.trendExternalKey }, orderBy: { observedAt: "desc" }, select: { title: true, observedAt: true } });
    return latest ? { key: row.objectKey, title: latest.title, observedAt: latest.observedAt, viewedAt: row.viewedAt } : null;
  }));
  return { accounts: accounts.flatMap(row => { const account = accountData.find(item => item.id === row.objectKey); return account ? [{ ...account, viewedAt: row.viewedAt }] : []; }), trends: recentTrends.filter((item): item is NonNullable<typeof item> => Boolean(item)) };
}
