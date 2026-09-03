import { db, ensurePersonalWorkspaceForUser } from "@content-center/db";
import { auth } from "../lib/auth";

async function main() {
  const email = process.env.BOOTSTRAP_ADMIN_EMAIL?.trim().toLowerCase();
  const password = process.env.BOOTSTRAP_ADMIN_PASSWORD;
  if (!email || !password || password.length < 8) {
    throw new Error("BOOTSTRAP_ADMIN_EMAIL and a password of at least 8 characters are required");
  }

  let user = await db.user.findUnique({ where: { email } });
  const created = !user;
  if (!user) {
    const result = await auth.api.signUpEmail({
      body: { name: "System Admin", email, password },
    });
    user = await db.user.findUniqueOrThrow({ where: { id: result.user.id } });
  }
  await db.user.update({ where: { id: user.id }, data: { systemRole: "SYSTEM_ADMIN" } });
  await ensurePersonalWorkspaceForUser(db, { userId: user.id });
  console.info(created ? "ADMIN_CREATED" : "ADMIN_EXISTS");
}

main().catch((error) => {
  console.error("ADMIN_BOOTSTRAP_FAILED", error instanceof Error ? error.message : "Unknown error");
  process.exitCode = 1;
}).finally(() => db.$disconnect());
