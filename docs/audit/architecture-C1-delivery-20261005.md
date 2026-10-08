# 架构 C1 技术边界交付 — 2026-10-05

STATUS：本卡完成；不表示全架构收口。A/B成果保留，六板块建议不作为业务依据。执行范围见 architecture-C1-card-20261005.md。

CHANGED：
- 将 Assistant/SSE、引用、Artifact、Canvas 的20个原类型定义移到 apps/web/lib/contracts 四个纯type文件；8个组件改用纯契约类型。服务器原type出口保留兼容，Artifact映射器增加server-only。没有新增平行业务DTO定义。
- 研究首页四处只读Prisma查询移入既有 server/research/read-model 的 researchHomeInputs；服务首先校验有效用户/Workspace/member，VIEWER仍可读。原参数解析、最多3账号、启用过滤、4个最近账号排序、当前空间最新趋势、非ARCHIVED资料选择及无效链接警告保持。
- scripts/check-client-boundaries.mjs 提供纯契约静态检查与8个受影响组件的真实独立浏览器bundle检查；UI/core工作区包也纳入，禁止server/DB/Provider/集成秘密模块。其他第三方包保持external。本证据不是整站Next生产构建。
- 定向lint清除两项既有无语义问题：StudioShell未使用activeNode局部绑定（prop类型保留）；Assistant正则多余opening-bracket转义（BMP65536字符逐项等价）。没有修改Prompt、选路、Skill、事实检查或保存业务语义。

VERIFICATION：
- 55436硬校验隔离Vitest：最终4文件13/13，含研究首页范围/停用/VIEWER、Artifact生成/版本保存、研究三入口与可选材料改写，以及两个中断状态诊断。
- Node边界测试3/3；最终浏览器包8入口、32输入、4纯契约、0server输入。脚本命令：node --test scripts/check-client-boundaries.test.mjs；node scripts/check-client-boundaries.mjs。
- Web typecheck与最终精确路径lint通过，git diff --check通过。20类型定义与迁移前原文一致，4服务的全部Prompt/模板原文一致。
- 隔离C fixture剩余User=0、Workspace=0。正式只读HTTP：live/login/MinIO ready200，匿名/api/projects401。3000仍PID74600；9000/9001仍原服务回环；3017/3020/3030/56381没有监听。
- 初轮类型检查发现首页参数警告变量遗漏，随后服务返回原警告输入并通过最终回归；初轮lint发现冗余类型导入等，已修正。忽略目录清理核对脚本曾因workspace包解析失败，改为直接相对模块路径后核对0残留。最终结果不借历史通过。
- 未运行全仓build/Playwright、真实模型、实际杀Next进程、生产负载或正式已认证浏览器验收。现有Vitest配置的Vite未来native-loader提示未通过关闭规则掩盖。

BOUNDARY：
正式3000/55432、密码/账号停用状态/资料归属不动，未重启；Next开发输出目录、next.config、next-env和生产构建配置未修改；没有schema、迁移、新凭证、后台消费者或付费调用。当前兼容/隐藏功能、默认方法UI和其他worktree内容保留。

ResearchRun：
有界诊断证实过期读取返回FAILED但持久行仍QUEUED/RUNNING；同requestKey回放created=false，未重新登记after；新requestKey才结算旧行并创建新版本。参见 research-run-recovery-proposal-20261005.md。本批仅fixture模拟状态，不冒充真实进程崩溃演练。
专属持久执行器或过期结算策略会改变执行方式/状态，应先具体批准；不塞IngestJob、不混BenchmarkStudy/CollectionRun。无新schema可恢复未claim QUEUED意图，但不能证明RUNNING外部效果未知可自动重放，更不能承诺exactly-once。

可以关闭：本卡共享纯DTO落位、8组件运行时服务依赖防线、研究首页直接Prisma收口。
仍待办：ResearchRun恢复策略审批；其他模块类型/纯函数边界逐卡；原目录独有UI评审、兼容入口去留、默认方法面板业务对齐保持原有待确认状态，不在C1决定。

GIT：READY_TO_STAGE。未add/commit/push、merge/reset/整树覆盖。本批任务增量diff为 output/architecture-upgrade-20261005/C/C1-task.diff，依据施工前工作文件快照生成，避免混入旧hunk；source-manifest.json记录22源码/检查路径摘要。证据：semantic-preservation.json、regex-equivalence.json、test-latest.log、web-latest.log、lint-latest.log、fixture-latest.log、daily-readonly-http.json。均本机忽略目录，不上传。回退只按本批diff精确hunk，不能整树恢复before快照覆盖后续用户修改。
