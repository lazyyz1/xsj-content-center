"use client";

import { Button, Input } from "@content-center/ui";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";

export function CreateUserForm() {
  const router = useRouter();
  const [message, setMessage] = useState("");
  const [pending, setPending] = useState(false);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setMessage("");
    const form = new FormData(event.currentTarget);
    const response = await fetch("/api/admin/users", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ name: form.get("name"), email: form.get("email"), password: form.get("password") }),
    });
    setPending(false);
    if (!response.ok) {
      const body = await response.json().catch(() => null) as { message?: string } | null;
      setMessage(body?.message ?? "创建失败，请检查输入。");
      return;
    }
    event.currentTarget.reset();
    setMessage("账号已创建，个人内容空间已就绪。");
    router.refresh();
  }
  return (
    <form onSubmit={submit} className="grid gap-3 md:grid-cols-4">
      <Input name="name" placeholder="姓名" minLength={2} required />
      <Input name="email" type="email" placeholder="邮箱" required />
      <Input name="password" type="password" placeholder="初始密码（至少 8 位）" minLength={8} required />
      <Button disabled={pending}>{pending ? "创建中…" : "创建用户"}</Button>
      {message ? <p className="text-sm text-[var(--text-secondary)] md:col-span-4">{message}</p> : null}
    </form>
  );
}
