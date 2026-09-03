import "server-only";

import { db } from "@content-center/db";

export class UserLifecycleError extends Error {
  constructor(readonly code: "USER_NOT_FOUND" | "FORBIDDEN" | "CANNOT_DISABLE_SELF" | "CANNOT_DISABLE_ADMIN", message: string) {
    super(message);
    this.name = "UserLifecycleError";
  }
}

export async function setUserDisabled(input: { adminId: string; userId: string; disabled: boolean }) {
  const [actor, target] = await Promise.all([
    db.user.findUnique({ where: { id: input.adminId }, select: { systemRole: true, disabledAt: true } }),
    db.user.findUnique({ where: { id: input.userId }, select: { id: true, name: true, systemRole: true, disabledAt: true } }),
  ]);
  if (!actor || actor.systemRole !== "SYSTEM_ADMIN" || actor.disabledAt) throw new UserLifecycleError("FORBIDDEN", "只有系统管理员可以修改用户状态。");
  if (!target) throw new UserLifecycleError("USER_NOT_FOUND", "用户不存在。");
  if (input.disabled && target.id === input.adminId) throw new UserLifecycleError("CANNOT_DISABLE_SELF", "不能停用当前登录的管理员账号。");
  if (input.disabled && target.systemRole === "SYSTEM_ADMIN") throw new UserLifecycleError("CANNOT_DISABLE_ADMIN", "不能停用系统管理员账号。");
  const disabledAt = input.disabled ? new Date() : null;
  if (input.disabled === Boolean(target.disabledAt)) return { ...target, disabledAt: target.disabledAt };
  return db.$transaction(async (tx) => {
    const user = await tx.user.update({ where: { id: target.id }, data: { disabledAt } });
    if (input.disabled) await tx.session.deleteMany({ where: { userId: target.id } });
    const workspaceId = (await tx.workspaceMember.findFirst({ where: { userId: target.id }, select: { workspaceId: true } }))?.workspaceId
      ?? (await tx.workspaceMember.findFirst({ where: { userId: input.adminId }, select: { workspaceId: true } }))?.workspaceId;
    if (workspaceId) await tx.auditLog.create({ data: { workspaceId, userId: input.adminId, action: input.disabled ? "user.disabled" : "user.restored", resourceType: "user", resourceId: target.id, metadata: { targetUserId: target.id } } });
    return user;
  });
}
