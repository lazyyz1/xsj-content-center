import Link from "next/link";

export function LibrarySubnav({ current }: { current: "sources" | "methods" }) {
  return <nav aria-label="素材库分区" className="mb-5 flex gap-1 border-b border-[var(--border)]"><Link href="/library" aria-current={current === "sources" ? "page" : undefined} className={`border-b-2 px-3 py-2 text-sm ${current === "sources" ? "border-[var(--accent)] font-medium text-[var(--text-primary)]" : "border-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)]"}`}>内容素材</Link><Link href="/library/methods" aria-current={current === "methods" ? "page" : undefined} className={`border-b-2 px-3 py-2 text-sm ${current === "methods" ? "border-[var(--accent)] font-medium text-[var(--text-primary)]" : "border-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)]"}`}>我的方法</Link></nav>;
}
