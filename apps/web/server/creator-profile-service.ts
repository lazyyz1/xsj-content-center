import "server-only";

import { db, type Prisma } from "@content-center/db";

export type CreatorProfileInput = {
  displayName: string;
  positioning: string;
  targetAudience: string;
  tone: string;
  preferredStyle: string;
  forbiddenStyle: string;
  coreTopics: string[];
  personalViews: string[];
  brandTerms: string[];
  forbiddenTerms: string[];
  hookPreferences: string[];
  structurePreferences: string[];
  ctaPreferences: string[];
  examplePhrases: string[];
  notes: string;
};

function json(value: string[]): Prisma.InputJsonValue { return value; }

export function getCreatorProfile(workspaceId: string, userId: string) {
  return db.creatorProfile.findUnique({ where: { workspaceId_userId: { workspaceId, userId } } });
}

export async function saveCreatorProfile(input: { workspaceId: string; userId: string; data: CreatorProfileInput }) {
  const text = (value: string) => value.trim();
  const data = {
    displayName: text(input.data.displayName), positioning: text(input.data.positioning), targetAudience: text(input.data.targetAudience),
    tone: text(input.data.tone), preferredStyle: text(input.data.preferredStyle), forbiddenStyle: text(input.data.forbiddenStyle),
    coreTopics: json(input.data.coreTopics), personalViews: json(input.data.personalViews), brandTerms: json(input.data.brandTerms), forbiddenTerms: json(input.data.forbiddenTerms),
    hookPreferences: json(input.data.hookPreferences), structurePreferences: json(input.data.structurePreferences), ctaPreferences: json(input.data.ctaPreferences), examplePhrases: json(input.data.examplePhrases),
    notes: text(input.data.notes),
  };
  return db.$transaction(async (tx) => {
    const profile = await tx.creatorProfile.upsert({
      where: { workspaceId_userId: { workspaceId: input.workspaceId, userId: input.userId } },
      create: { workspaceId: input.workspaceId, userId: input.userId, ...data },
      update: data,
    });
    await tx.auditLog.create({
      data: {
        workspaceId: input.workspaceId, userId: input.userId, action: "creator_profile.updated", resourceType: "creator_profile", resourceId: profile.id,
        metadata: { resourceId: profile.id, changedFields: Object.keys(data) },
      },
    });
    return profile;
  });
}
