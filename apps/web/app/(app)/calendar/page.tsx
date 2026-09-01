import { EmptyState, PageHeader } from "@/components/page";

export default function CalendarPage() {
  return (
    <>
      <PageHeader title="发布日历" description="查看已批准的未来发布安排。" />
      <EmptyState title="暂无发布安排" description="Publishing 尚未接入，日历不会伪造排期。" />
    </>
  );
}
