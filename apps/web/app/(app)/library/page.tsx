import { EmptyState, PageHeader } from "@/components/page";

export default function LibraryPage() {
  return (
    <>
      <PageHeader title="素材库" description="统一管理进入系统的内容素材。" />
      <EmptyState title="素材库为空" description="内容采集与个人素材库尚未实现。本页不会展示假数据或不可用的采集按钮。" />
    </>
  );
}
