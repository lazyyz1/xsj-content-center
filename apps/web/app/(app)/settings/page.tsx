import { canManageWorkspace } from "@content-center/core";
import { Card } from "@content-center/ui";
import Link from "next/link";
import { PageHeader } from "@/components/page";
import { requireWorkspace } from "@/server/access";

export default async function SettingsPage() {
  const { role } = await requireWorkspace();
  const links = [
    { href: "/settings/creator-profile", title: "个人创作画像", description: "设置定位、表达风格、常用观点和内容偏好。" },
    { href: "/settings/integrations", title: "集成状态", description: "查看 Provider 配置状态，不向浏览器返回密钥。" },
    ...(canManageWorkspace(role)
      ? [{ href: "/settings/members", title: "成员", description: "查看当前 Workspace 成员和角色。" }]
      : []),
  ];

  return (
    <>
      <PageHeader title="设置" description="管理当前 Workspace 的基础配置。" />
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
