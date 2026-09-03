import { db, ensurePersonalWorkspaceForUser } from "@content-center/db";
import { auth } from "../lib/auth";
import { bootstrapSystemAdmin } from "../server/admin/bootstrap";

async function main() {
  const email = process.env.BOOTSTRAP_ADMIN_EMAIL?.trim().toLowerCase();
  const password = process.env.BOOTSTRAP_ADMIN_PASSWORD;
  const result = await bootstrapSystemAdmin({ email: email ?? "", password }, {
    findUserByEmail: async (value) => db.user.findUnique({ where: { email: value }, select: { id: true, systemRole: true } }),
    promoteUser: async (userId) => { await db.user.update({ where: { id: userId }, data: { systemRole: "SYSTEM_ADMIN" } }); },
    createUser: async (input) => {
      const created = await auth.api.signUpEmail({ body: { name: "System Admin", ...input } });
      return { id: created.user.id };
    },
    ensurePersonalWorkspace: async (userId) => { await ensurePersonalWorkspaceForUser(db, { userId }); },
  });
  console.info(result.status);
}

main().catch((error) => {
  const code = error instanceof Error && error.message === "BOOTSTRAP_ADMIN_EMAIL_REQUIRED"
    ? error.message
    : error instanceof Error && error.message === "BOOTSTRAP_ADMIN_PASSWORD_REQUIRED_FOR_NEW_USER"
      ? error.message
      : "BOOTSTRAP_FAILED";
  console.error(code);
  process.exitCode = 1;
}).finally(() => db.$disconnect());
