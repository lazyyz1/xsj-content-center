import Link from "next/link";

export function LibrarySubnav({ current }: { current: "sources" | "methods" }) {
  return <nav aria-label="资料分区" className="mb-5 flex gap-1 border-b border-[var(--border)]"><Link href="/library" aria-current={current === "sources" ? "page" : undefined} className={`inline-flex min-h-11 items-center border-b-2 px-3 text-sm ${current === "sources" ? "border-[var(--accent)] font-medium text-[var(--text-primary)]" : "border-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)]"}`}>全部资料</Link><Link href="/library/methods" aria-current={current === "methods" ? "page" : undefined} className={`inline-flex min-h-11 items-center border-b-2 px-3 text-sm ${current === "methods" ? "border-[var(--accent)] font-medium text-[var(--text-primary)]" : "border-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)]"}`}>方法</Link></nav>;
}
