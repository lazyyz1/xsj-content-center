import { expect, it, vi } from "vitest";
const { accountFind, preferenceFind, member } = vi.hoisted(() => ({ accountFind: vi.fn(async () => []), preferenceFind: vi.fn(async () => []), member: vi.fn(async () => undefined) }));
vi.mock("server-only", () => ({}));
vi.mock("@content-center/db", () => ({ db: { benchmarkAccount: { findMany: accountFind }, researchObjectPreference: { findMany: preferenceFind } } }));
vi.mock("../server/research/access", () => ({ researchMember: member }));
import { benchmarkWorkbench } from "../server/research/benchmark-workbench";
it("does not hide historical saved works by default, and keeps workspace scope", async () => {
 const result = await benchmarkWorkbench({ workspaceId: "fixture-workspace", userId: "fixture-user" }, {});
 expect(result.days).toBeNull();
 expect(accountFind).toHaveBeenLastCalledWith(expect.objectContaining({ where: expect.objectContaining({ workspaceId: "fixture-workspace" }), select: expect.objectContaining({ contentSnapshots: expect.objectContaining({ where: {} }) }) }));
 expect(member).toHaveBeenCalledWith({ workspaceId: "fixture-workspace", userId: "fixture-user" });
});
it("applies a recent window only when the reader explicitly chooses it", async () => {
 const result = await benchmarkWorkbench({ workspaceId: "fixture-workspace", userId: "fixture-user" }, { period: "30" });
 expect(result.days).toBe(30);
 expect(accountFind).toHaveBeenLastCalledWith(expect.objectContaining({ select: expect.objectContaining({ contentSnapshots: expect.objectContaining({ where: { publishedAt: { gte: expect.any(Date), lte: expect.any(Date) } } }) }) }));
});
