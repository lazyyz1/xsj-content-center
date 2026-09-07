import { Badge, Card } from "@content-center/ui";
import Link from "next/link";
import { LibrarySubnav } from "@/components/library/library-subnav";
import { methodStatusLabels } from "@/lib/content-labels";
import { requireWorkspace } from "@/server/access";
import { listMethods, methodStatusSchema } from "@/server/methods/service";

const statusOptions = ["", "SAVED", "TRIAL", "CORE", "DISABLED"] as const;

export default async function MethodsPage({ searchParams }: { searchParams: Promise<{ status?: string }> }) {
  const { session, workspace } = await requireWorkspace();
  const query = await searchParams;
  const status = methodStatusSchema.safeParse(query.status).success ? query.status as "SAVED" | "TRIAL" | "CORE" | "DISABLED" : undefined;
  const methods = await listMethods({ workspaceId: workspace.id, ownerUserId: session.user.id, status });
  return <>
    <LibrarySubnav current="methods" />
    <header className="mb-6"><h1 className="text-3xl font-semibold tracking-tight">我的方法</h1><p className="mt-2 text-sm text-[var(--text-secondary)]">保存你确认过、以后想继续尝试的内容方法。</p></header>
    <Card className="mb-5 p-4"><form method="get" className="flex flex-wrap items-center gap-3"><label className="text-sm font-medium" htmlFor="method-status">筛选状态</label><select id="method-status" name="status" defaultValue={query.status && statusOptions.includes(query.status as typeof statusOptions[number]) ? query.status : ""} className="h-10 rounded-[var(--radius)] border bg-[var(--surface)] px-3 text-sm">{statusOptions.map((value) => <option key={value || "ALL"} value={value}>{value ? methodStatusLabels[value] : "全部"}</option>)}</select><button className="h-10 rounded-[var(--radius)] bg-[var(--text-primary)] px-4 text-sm text-white">筛选</button><span className="text-xs text-[var(--text-secondary)]">共 {methods.length} 项</span></form></Card>
    {methods.length ? <section aria-label="我的方法列表" className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{methods.map((method) => <Link key={method.id} href={`/library/methods/${method.id}`} className={`block rounded-2xl border bg-[var(--surface)] p-5 transition-colors hover:border-[var(--accent)] ${method.status === "DISABLED" ? "opacity-65" : ""}`}><div className="flex items-start justify-between gap-3"><h2 className="line-clamp-2 font-semibold">{method.current.title}</h2><Badge>{methodStatusLabels[method.status]}</Badge></div><p className="mt-3 line-clamp-2 text-sm leading-6 text-[var(--text-secondary)]">{method.current.steps[0] || "已保存的方法内容"}</p><p className="mt-4 line-clamp-1 text-xs text-[var(--text-secondary)]">来源：{method.current.source.title}</p><p className="mt-2 text-xs text-[var(--text-secondary)]">最近修改：{new Date(method.updatedAt).toLocaleDateString("zh-CN")}</p></Link>)}</section> : <Card className="grid min-h-64 place-items-center p-8 text-center"><div><h2 className="font-semibold">还没有保存的方法</h2><p className="mt-2 text-sm text-[var(--text-secondary)]">在内容拆解中看到值得尝试的做法后，可以保存到这里。</p><Link href="/library" className="mt-4 inline-flex text-sm font-medium text-[var(--accent)]">去看看内容素材</Link></div></Card>}
  </>;
}
