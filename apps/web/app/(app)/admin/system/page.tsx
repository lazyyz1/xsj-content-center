import { Card } from "@content-center/ui";
import { PageHeader } from "@/components/page";
import { requireSystemAdmin } from "@/server/access";
import { getSystemServiceStatuses } from "@/server/admin/system-services";

export default async function AdminSystemPage() {
  await requireSystemAdmin();
  const services = await getSystemServiceStatuses();
  const rows = [
    ["Kimi 2.6", services.kimi], ["RedFox", services.redfox], ["豆包录音文件识别 2.0", services.doubao], ["本地 FunASR", services.localFunAsr], ["Storage", services.storage],
  ];
  return <>
    <PageHeader title="系统服务" description={`Provider 策略：${services.policy}。密钥由服务端环境变量管理，不在页面显示。`} />
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{rows.map(([name, status]) => <Card key={name} className="p-5"><p className="font-semibold">{name}</p><p className="mt-2 text-sm text-[var(--text-secondary)]">{status}</p></Card>)}</div>
    <Card className="mt-6 p-5 text-sm leading-7"><p>Production Primary：豆包录音文件识别 2.0</p><p>Development / Optional：本地 FunASR</p></Card>
  </>;
}
