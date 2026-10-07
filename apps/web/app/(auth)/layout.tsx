import { Card } from "@content-center/ui";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <main className="grid min-h-screen place-items-center p-5">
      <Card className="w-full max-w-md p-7 sm:p-9">
        <div className="mb-7">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--accent)]">AI Content Center</p>
          <h1 className="mt-3 text-2xl font-semibold tracking-tight">AI 内容生产中心</h1>
          <p className="mt-2 text-sm leading-6 text-[var(--text-secondary)]">登录后进入你的团队内容工作台。</p>
        </div>
        {process.env.ENVIRONMENT_ID === "LOCAL_REVIEW" ? <p role="status" className="mb-4 text-sm">升级验收副本 · 保留原账号与资料的本地副本。此处修改不会同步原环境；模型和外部服务已关闭。</p> : <p className="mb-4 text-xs text-[var(--text-secondary)]">请确认当前网址与账号所属环境一致。</p>}
        {children}
      </Card>
    </main>
  );
}
