"use client";

import { Button, Input } from "@content-center/ui";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { authClient } from "@/lib/auth-client";

export function AuthForm({ mode, allowRegistration = false }: { mode: "login" | "register"; allowRegistration?: boolean }) {
  const router = useRouter();
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError("");
    const form = new FormData(event.currentTarget);
    const identifier = String(form.get("email")).trim();
    const email = mode === "login" && identifier.toLowerCase() === "xsj666" ? "xsj666@experience.invalid" : identifier;
    const password = String(form.get("password"));
    if (mode === "register") {
      const response = await fetch("/api/internal-signup", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ name: String(form.get("name")), email, password, inviteCode: String(form.get("inviteCode")) }),
      });
      if (!response.ok) {
        const result = await response.json().catch(() => null) as { message?: string } | null;
        setError(result?.message ?? "注册失败，请检查公司邀请码后重试。");
        setPending(false);
        return;
      }
      router.push("/dashboard");
      router.refresh();
      return;
    }

    const result = await authClient.signIn.email({ email, password }).catch(() => ({ error: { message: "网络连接失败，请稍后重试。" } }));

    if (result.error) {
      setError("登录失败，请检查账号和密码；若账号已停用，请联系管理员。");
      setPending(false);
      return;
    }

    router.push("/dashboard");
    router.refresh();
  }

  const isRegister = mode === "register";
  return (
    <form onSubmit={submit} className="space-y-4">
      {isRegister ? (
        <label className="block space-y-2 text-sm font-medium">
          <span>姓名</span>
          <Input name="name" autoComplete="name" minLength={2} required />
        </label>
      ) : null}
      <label className="block space-y-2 text-sm font-medium">
        <span>{isRegister ? "邮箱" : "账号或邮箱"}</span>
        <Input name="email" type={isRegister ? "email" : "text"} autoComplete="username" required />
      </label>
      <label className="block space-y-2 text-sm font-medium">
        <span>密码</span>
        <Input name="password" type="password" autoComplete={isRegister ? "new-password" : "current-password"} minLength={isRegister ? 8 : 1} required />
      </label>
      {isRegister ? (
        <label className="block space-y-2 text-sm font-medium">
          <span>公司邀请码</span>
          <Input name="inviteCode" type="password" autoComplete="off" required />
        </label>
      ) : null}
      {error ? <p role="alert" className="text-sm text-[var(--danger)]">{error}</p> : null}
      <Button className="w-full" disabled={pending}>
        {pending ? "处理中…" : isRegister ? "注册并进入" : "登录"}
      </Button>
      {isRegister || allowRegistration ? <p className="text-center text-sm text-[var(--text-secondary)]">
        {isRegister ? "已有账号？" : "还没有账号？"}{" "}
        <Link className="font-medium text-[var(--accent)]" href={isRegister ? "/login" : "/register"}>
          {isRegister ? "去登录" : "注册"}
        </Link>
      </p> : null}
    </form>
  );
}
