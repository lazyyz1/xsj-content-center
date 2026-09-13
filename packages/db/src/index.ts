import { PrismaClient } from "@prisma/client";
export type { Prisma, PromptType, AIRunStatus, Platform, PlatformVariantStatus, DeepContentPackageStatus, MotherContentOrigin, DraftRevisionOrigin, ReviewResult, PublishStatus, RecommendationMode, RecommendationItemStatus, RecommendationEvidenceType, MaterialAnalysis, MaterialDistillation, SystemRole, CanvasObjectType, EvidenceType, EvidenceOwnership, EvidenceStatus, CreatorProfileSuggestionType, MethodSuggestionType } from "@prisma/client";

const globalForPrisma = globalThis as unknown as { contentCenterDb?: PrismaClient };

export const db = globalForPrisma.contentCenterDb ?? new PrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.contentCenterDb = db;
}

export * from "./workspaces";
export * from "./sources";
export * from "./projects";
