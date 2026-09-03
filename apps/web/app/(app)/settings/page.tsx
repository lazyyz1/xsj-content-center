import { canManageWorkspace } from "@content-center/core";
import { db } from "@content-center/db";
import { systemManagedProvidersEnabled } from "@content-center/integrations";
import { Card } from "@content-center/ui";
import Link from "next/link";
import { PageHeader } from "@/components/page";
import { requireWorkspace } from "@/server/access";

export default async function SettingsPage() {
  const { role, session } = await requireWorkspace();
  const user = await db.user.findUnique({ where: { id: session.user.id }, select: { systemRole: true } });
  const systemManaged = systemManagedProvidersEnabled();
  const links = [
    { href: "/settings/creator-profile", title: "个人与创作画像", description: "告诉系统你写给谁、表达什么，以及哪些风格和词语需要避开。" },
    ...(!systemManaged ? [{ href: "/settings/integrations", title: "AI 与外部服务", description: "查看采集、转写和 AI 服务是否可用；密钥始终只保存在服务端。" }] : []),
    ...(canManageWorkspace(role)
      ? [{ href: "/settings/members", title: "团队与权限", description: "查看当前内容空间的成员和权限。" }]
      : []),
    ...(user?.systemRole === "SYSTEM_ADMIN" ? [
      { href: "/admin/users", title: "用户管理", description: "创建内部账号并查看用户 Workspace。" },
      { href: "/admin/system", title: "系统服务", description: "查看系统统一 Provider 与基础服务状态。" },
      { href: "/admin/usage", title: "用量中心", description: "查看用户、AI、采集与转写用量归属。" },
    ] : []),
  ];

  return (
    <>
      <PageHeader title="设置" description="管理个人创作偏好、外部服务和团队权限。" />
      <div className="grid gap-4 md:grid-cols-2">
        {links.map((item) => (
          <Link key={item.href} href={item.href}>
            <Card className="h-full p-6 transition-colors hover:bg-[var(--surface-elevated)]">
              <h2 className="font-semibold">{item.title}</h2>
              <p className="mt-2 text-sm leading-6 text-[var(--text-secondary)]">{item.description}</p>
            </Card>
          </Link>
        ))}
      </div>
    </>
  );
}
