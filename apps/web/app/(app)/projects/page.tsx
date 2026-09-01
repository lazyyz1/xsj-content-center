import { EmptyState, PageHeader } from "@/components/page";

export default function ProjectsPage() {
  return (
    <>
      <PageHeader title="内容项目" description="组织母稿、审核与平台适配。" />
      <EmptyState title="内容项目尚未开放" description="ContentProject 不属于阶段 1，本页仅提供真实导航入口。" />
    </>
  );
}
