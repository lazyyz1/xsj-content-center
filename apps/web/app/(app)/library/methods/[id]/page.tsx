import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { MethodDetail } from "@/components/library/method-detail";
import { requireWorkspace } from "@/server/access";
import { getMethod } from "@/server/methods/service";

export default async function MethodDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { session, workspace, role } = await requireWorkspace();
  const { id } = await params;
  const method = await getMethod({ workspaceId: workspace.id, ownerUserId: session.user.id, methodId: id });
  if (!method) notFound();
  return <><Link href="/library/methods" className="mb-5 inline-flex min-h-11 items-center gap-2 text-sm text-[var(--text-secondary)]"><ArrowLeft size={16} />返回方法中心</Link><MethodDetail initial={method} editable={role !== "VIEWER"} /></>;
}
