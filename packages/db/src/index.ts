import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as { contentCenterDb?: PrismaClient };

export const db = globalForPrisma.contentCenterDb ?? new PrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.contentCenterDb = db;
}

export * from "./workspaces";
