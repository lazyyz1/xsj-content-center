import { Badge, Card } from "@content-center/ui";
import { db } from "@content-center/db";
import { PageHeader } from "@/components/page";
import { requireWorkspaceRole } from "@/server/access";

export default async function MembersPage() {
  const { workspace } = await requireWorkspaceRole(["OWNER", "ADMIN"]);
  const members = await db.workspaceMember.findMany({
    where: { workspaceId: workspace.id },
    include: { user: true },
    orderBy: { createdAt: "asc" },
  });

  return (
    <>
      <PageHeader title="Workspace 成员" description="阶段 1 只提供成员列表，不开放邀请或角色编辑。" />
      <Card className="divide-y divide-[var(--border)] overflow-hidden">
        {members.map((member) => (
          <div key={member.id} className="flex items-center justify-between gap-4 p-5">
            <div className="min-w-0">
              <p className="truncate font-medium">{member.user.name}</p>
              <p className="truncate text-sm text-[var(--text-secondary)]">{member.user.email}</p>
            </div>
            <Badge>{member.role}</Badge>
          </div>
        ))}
      </Card>
    </>
  );
}
