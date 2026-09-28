import { isExperienceAccount } from "@/server/experience-account";
import { toNextJsHandler } from "better-auth/next-js";
import { NextResponse } from "next/server";
import { auth } from "../../../../lib/auth";
import { isDirectSignupRequest } from "../../../../server/internal-signup";

const handlers = toNextJsHandler(auth);
export const GET = handlers.GET;

export async function POST(request: Request) {
  const path = new URL(request.url).pathname;
  if (!path.endsWith("/sign-in/email") && !path.endsWith("/sign-out")) {
    const session = await auth.api.getSession({headers:request.headers});
    if (session && isExperienceAccount(session.user)) return NextResponse.json({message:"体验账号不能更改账号设置。"},{status:403});
  }
  if (isDirectSignupRequest(request)) {
    return NextResponse.json({ code: "DIRECT_SIGNUP_DISABLED", message: "请通过公司邀请注册入口创建账号。" }, { status: 403 });
  }
  return handlers.POST(request);
}
