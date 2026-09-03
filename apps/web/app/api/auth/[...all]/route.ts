import { toNextJsHandler } from "better-auth/next-js";
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";

const handlers = toNextJsHandler(auth);
export const GET = handlers.GET;

export function POST(request: Request) {
  const isPublicSignup = new URL(request.url).pathname.endsWith("/sign-up/email");
  if (isPublicSignup && process.env.ALLOW_PUBLIC_SIGNUP !== "true") {
    return NextResponse.json({ code: "PUBLIC_SIGNUP_DISABLED", message: "公开注册已关闭，请联系系统管理员。" }, { status: 403 });
  }
  return handlers.POST(request);
}
