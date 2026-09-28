import { createLocalAccountIssuer } from "@better-auth/core/db";
import { db, type Prisma } from "@content-center/db";
import { hashPassword } from "better-auth/crypto";
import { z } from "zod";

export const memberInput = z.object({
  name: z.string().trim().min(2).max(80),
  email: z.string().trim().toLowerCase().email().max(320),
  password: z.string().min(12).max(128),
  role: z.enum(["ADMIN", "EDITOR", "VIEWER"]),
}).strict();
export const memberChange = z.union([
  z.object({ role: z.enum(["ADMIN", "EDITOR", "VIEWER"]) }).strict(),
  z.object({ disabled: z.boolean() }).strict(),
]);
export class AccountSpaceError extends Error {
  constructor(readonly status: number, message: string) { super(message); }
}
async function manager(tx: Prisma.TransactionClient, workspaceId: string, userId: string) {
  // Serialize governance mutations within a company, including concurrent role changes.
  await tx.$queryRaw`SELECT id FROM "Workspace" WHERE id = ${workspaceId} FOR UPDATE`;
  const actor = await tx.workspaceMember.findFirst({ where: { workspaceId, userId, disabledAt: null, user: { disabledAt: null }, workspace: { disabledAt: null } } });
  if (!actor || !["OWNER", "ADMIN"].includes(actor.role)) throw new AccountSpaceError(403, "你没有权限修改这个设置。");
  return actor;
}
export async function createMember(workspaceId: string, userId: string, input: unknown) {
  const data = memberInput.parse(input);
  const password = await hashPassword(data.password);
  return db.$transaction(async (tx) => {
    const actor = await manager(tx, workspaceId, userId);
    if (actor.role !== "OWNER" && data.role === "ADMIN") throw new AccountSpaceError(403, "只有所有者可以管理管理员。");
    // Never attach or reset an existing account by guessing its email.
    if (await tx.user.findUnique({ where: { email: data.email }, select: { id: true } })) throw new AccountSpaceError(409, "该账号无法直接创建。请使用新的登录邮箱，已有账号暂不支持直接加入。");
    const user = await tx.user.create({ data: { name: data.name, email: data.email } });
    await tx.account.create({ data: { userId: user.id, accountId: user.id, providerId: "credential", issuer: createLocalAccountIssuer("credential"), password } });
    const member = await tx.workspaceMember.create({ data: { workspaceId, userId: user.id, role: data.role } });
    await tx.auditLog.create({ data: { workspaceId, userId, action: "member.created", resourceType: "workspace_member", resourceId: member.id, metadata: { role: data.role } } });
    return { id: member.id };
  });
}
export async function changeMember(workspaceId: string, userId: string, memberId: string, input: unknown, remove = false) {
  const change = remove ? null : memberChange.parse(input);
  return db.$transaction(async (tx) => {
    const actor = await manager(tx, workspaceId, userId);
    const target = await tx.workspaceMember.findFirst({ where: { id: memberId, workspaceId } });
    if (!target) throw new AccountSpaceError(404, "成员不存在或已被移除。");
    if (target.userId === userId || target.role === "OWNER") throw new AccountSpaceError(403, "不能修改自己或所有者的成员权限。");
    if (actor.role !== "OWNER" && (target.role === "ADMIN" || (change && "role" in change && change.role === "ADMIN"))) throw new AccountSpaceError(403, "只有所有者可以管理管理员。");
    if (remove) await tx.workspaceMember.delete({ where: { id: target.id } });
    else await tx.workspaceMember.update({ where: { id: target.id }, data: change && "role" in change ? { role: change.role } : { disabledAt: change && "disabled" in change && change.disabled ? new Date() : null } });
    await tx.auditLog.create({ data: { workspaceId, userId, action: remove ? "member.removed" : "member.updated", resourceType: "workspace_member", resourceId: target.id, metadata: change ?? {} } });
    return { ok: true };
  });
}
