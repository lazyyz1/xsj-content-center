import { db, type Prisma } from "@content-center/db";

export type LibraryQuery = {
  search?: string;
  sourcePlatform?: string;
  sourceType?: string;
  status?: string;
  tag?: string;
  collection?: string;
  sort?: string;
  page?: string;
  pageSize?: string;
};

const allowedPlatforms = ["GENERIC", "DOUYIN", "XIAOHONGSHU", "WECHAT", "BILIBILI", "YOUTUBE", "TIKTOK", "OTHER"];
const allowedTypes = ["TEXT", "URL", "VIDEO", "AUDIO", "IMAGE", "DOCUMENT"];
const allowedStatuses = ["PENDING", "PROCESSING", "READY", "FAILED", "ARCHIVED"];

export async function listLibrarySources(workspaceId: string, query: LibraryQuery) {
  const page = Math.max(1, Number(query.page) || 1);
  const pageSize = Math.min(50, Math.max(1, Number(query.pageSize) || 12));
  const where: Prisma.SourceItemWhereInput = {
    workspaceId,
    ...(query.search?.trim()
      ? {
          OR: [
            { title: { contains: query.search.trim(), mode: "insensitive" } },
            { author: { contains: query.search.trim(), mode: "insensitive" } },
            { rawText: { contains: query.search.trim(), mode: "insensitive" } },
          ],
        }
      : {}),
    ...(allowedPlatforms.includes(query.sourcePlatform ?? "") ? { sourcePlatform: query.sourcePlatform as never } : {}),
    ...(allowedTypes.includes(query.sourceType ?? "") ? { sourceType: query.sourceType as never } : {}),
    ...(allowedStatuses.includes(query.status ?? "") ? { status: query.status as never } : {}),
    ...(query.tag ? { tags: { some: { tagId: query.tag } } } : {}),
    ...(query.collection ? { collections: { some: { collectionId: query.collection } } } : {}),
  };
  const orderBy: Prisma.SourceItemOrderByWithRelationInput =
    query.sort === "oldest"
      ? { createdAt: "asc" }
      : query.sort === "title"
        ? { title: "asc" }
        : { createdAt: "desc" };
  const [items, total] = await Promise.all([
    db.sourceItem.findMany({
      where,
      select: {
        id: true,
        sourceType: true,
        sourcePlatform: true,
        title: true,
        author: true,
        thumbnailUrl: true,
        status: true,
        createdAt: true,
        tags: { select: { tag: { select: { id: true, name: true } } }, take: 5 },
        ingestJobs: {
          select: { id: true, jobType: true, provider: true, providerMode: true, status: true, errorMessage: true, metadata: true },
          orderBy: { createdAt: "desc" },
          take: 1,
        },
        assets: { select: { assetType: true, status: true } },
        transcript: { select: { providerMode: true } },
        materialAnalyses: { where: { status: "COMPLETED" }, orderBy: { version: "desc" }, take: 1, select: { suggestedTitle: true, summary: true } },
      },
      orderBy,
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    db.sourceItem.count({ where }),
  ]);
  return { items, total, page, pageSize, pages: Math.max(1, Math.ceil(total / pageSize)) };
}
