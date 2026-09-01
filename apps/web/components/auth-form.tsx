"use client";

import { Button, Input } from "@content-center/ui";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { authClient } from "@/lib/auth-client";

export function AuthForm({ mode }: { mode: "login" | "register" }) {
  const router = useRouter();
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError("");
    const form = new FormData(event.currentTarget);
    const email = String(form.get("email"));
    const password = String(form.get("password"));
    const result = mode === "register"
      ? await authClient.signUp.email({ name: String(form.get("name")), email, password })
      : await authClient.signIn.email({ email, password });

    if (result.error) {
      setError(result.error.message ?? "请求失败，请重试。");
      setPending(false);
      return;
    }

    router.push(mode === "register" ? "/onboarding" : "/dashboard");
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
        <span>邮箱</span>
        <Input name="email" type="email" autoComplete="email" required />
      </label>
      <label className="block space-y-2 text-sm font-medium">
        <span>密码</span>
        <Input name="password" type="password" autoComplete={isRegister ? "new-password" : "current-password"} minLength={8} required />
      </label>
      {error ? <p role="alert" className="text-sm text-[var(--danger)]">{error}</p> : null}
      <Button className="w-full" disabled={pending}>
        {pending ? "处理中…" : isRegister ? "创建账号" : "登录"}
      </Button>
      <p className="text-center text-sm text-[var(--text-secondary)]">
        {isRegister ? "已有账号？" : "还没有账号？"}{" "}
        <Link className="font-medium text-[var(--accent)]" href={isRegister ? "/login" : "/register"}>
          {isRegister ? "去登录" : "注册"}
        </Link>
      </p>
    </form>
  );
}
