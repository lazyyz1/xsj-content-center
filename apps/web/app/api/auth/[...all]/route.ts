import { toNextJsHandler } from "better-auth/next-js";
import { NextResponse } from "next/server";
import { auth } from "../../../../lib/auth";
import { isDirectSignupRequest } from "../../../../server/internal-signup";

const handlers = toNextJsHandler(auth);
export const GET = handlers.GET;

export function POST(request: Request) {
  if (isDirectSignupRequest(request)) {
    return NextResponse.json({ code: "DIRECT_SIGNUP_DISABLED", message: "请通过公司邀请注册入口创建账号。" }, { status: 403 });
  }
  return handlers.POST(request);
}
