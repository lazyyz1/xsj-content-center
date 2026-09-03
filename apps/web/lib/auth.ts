import { prismaAdapter } from "@better-auth/prisma-adapter";
import { db } from "@content-center/db";
import { betterAuth } from "better-auth";

export const auth = betterAuth({
  appName: "AI 内容生产中心",
  baseURL: process.env.APP_URL,
  secret: process.env.AUTH_SECRET,
  database: prismaAdapter(db, { provider: "postgresql" }),
  emailAndPassword: { enabled: true },
  databaseHooks: {
    session: {
      create: {
        before: async (session) => {
          const user = await db.user.findUnique({ where: { id: session.userId }, select: { disabledAt: true } });
          if (user?.disabledAt) return false;
        },
      },
    },
  },
  trustedOrigins: process.env.APP_URL ? [process.env.APP_URL] : [],
});
