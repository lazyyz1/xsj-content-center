import { prismaAdapter } from "@better-auth/prisma-adapter";
import { db } from "@content-center/db";
import { betterAuth } from "better-auth";

function trustedAuthOrigins(configuredUrl: string | undefined) {
  if (!configuredUrl) return [];
  try {
    const configured = new URL(configuredUrl);
    const origins = new Set([configured.origin]);
    if (configured.hostname === "localhost" || configured.hostname === "127.0.0.1") {
      const alternate = new URL(configured);
      alternate.hostname = configured.hostname === "localhost" ? "127.0.0.1" : "localhost";
      origins.add(alternate.origin);
    }
    return [...origins];
  } catch {
    return [configuredUrl];
  }
}

export const auth = betterAuth({
  advanced: { cookiePrefix: process.env.AUTH_COOKIE_PREFIX || "better-auth" },
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
  trustedOrigins: trustedAuthOrigins(process.env.APP_URL),
});
