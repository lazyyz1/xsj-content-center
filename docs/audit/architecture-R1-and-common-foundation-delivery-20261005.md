# R1 研究排队止损与共同技术底座收口 — 2026-10-05

STATUS：已按当前人工批准实施 R1，READY_TO_STAGE。A、B、C1 与本轮 R1 的有界交付完成；不是全部架构改造完成或正式生产发布。本轮唯一写入者，无 Git 暂存/提交/推送、迁移、正式库批量维护、付费调用、Worker 启动或运行切换。

## R1 实际行为

- 沿用既有 createdAt 超过15分钟政策。仅仍为 QUEUED 且 startedAt、finishedAt、aiRunId 全部为 null 的行能持久结算 FAILED/INTERRUPTED；保留原 ID、requestKey、问题、scope 和历史版本。标记不一致的 QUEUED 不推断为“未开始”。
- 私人 session 读取、单 run 状态读取、同 key 重放以及已有新请求 reserve 路径使用限定 actor/session/run 的条件 updateMany；检查 workspace、session owner、请求者及成员/用户/空间启用状态。读取前仍保留原权限检查。该用户触发的读取结算已获批准；没有扫描原55432历史数据，没有后台定时结算。
- 条件更新与执行器条件 claim 防止竞争覆盖：runner 已变 RUNNING 后，等待中的结算重新检查行条件，不会把运行中行改成失败。新请求仍由现有 session 事务锁和活跃任务约束控制。
- 同 key 只返回原行、created=false，不登记 after、不隐式重发。用户主动提交新 key 才按既有语义建立下一版本；既有有效结果指纹复用规则保留，不保证每一个新 key 都强制新调用。
- RUNNING 不结算、不回放，持久状态和 finishedAt 保持。过期时通用 session/status 提示“研究执行结果尚未确认，请先核查，避免重复调用”；界面不为 RUNNING 附加重新发送提示，活跃任务仍阻止重复提交。这不证明模型尚未计费，也未新增人工确认/强制重试流程。
- 四个专门研究 overview 为共享过期判定仅补取 startedAt/aiRunId，RUNNING 不再被该判定当成过期失败。它们没有增加批量持久结算；持久结算触发范围是上述核心服务路径，不声称所有列表页都会结算。

## 精确范围与保护

九个源码/测试路径在 output/architecture-upgrade-20261005/R1/scope.json；从本轮开始前逐文件快照生成 task.diff 与 diff-ledger.json，不以 HEAD 大 diff 混入已有成果。五服务 template literal AST 比对保持；四共享调用方字节比较确认只有两个 select 字段增加。Prompt、模型选择、研究输入/输出、成果保存、默认方法和新旧业务方向没有调整。原 Next 配置与 pre-A 快照一致，本轮未改 tsconfig、Vitest 配置或四份权威文档。原未提交成果和各旧目录/数据保留。

## 本轮实际验证

- 55436 隔离 review：10个直接相关 Vitest 文件 50/50，其中 R1 新增12项覆盖过期/新鲜 QUEUED、三种终态、执行标记异常、同 key HTTP 不调度、新 key 调度、RUNNING 禁止重复、跨 owner/workspace、停用成员/用户/空间、真实行锁竞争及并发读取/重放。假 Provider 调用0、fixture ApiUsage0；after 仅计数，不运行回调。
- Web typecheck 通过；九个精确文件 lint 通过；Node 客户端边界3/3。九个受影响入口浏览器打包47个输入、0服务端输入；四份纯契约边界保持。
- 测试 fixture 用户0、空间0，级联清理研究记录。测试 Redis 保持停止，不启动真实消费者。
- 新增的两个组件 SSR 测试曾因 Vitest 不转换 JSX preserve 而无法收集，已撤下并保留失败日志；最终50项是撤下后重跑结果。没有更改编译配置来消除失败。未执行浏览器视觉/E2E、真实杀 Next/付费链路/负载测试，不把服务状态用例当全部 UI 行为验收。
- 旧 production 产物 release-20261005T084221Z-3b7a2b71 在 R1 改码后 check review 正确退出1：RELEASE_SOURCE_CHANGED_REBUILD_REQUIRED。历史 A+B+C1 的 production build/73+19项结果仍是当时证据，不能作为当前 R1 源码 production build 证明。本轮未再跑完整 production build 或启动候选。
- 日常只读：3000 live200、/login200、匿名 /api/projects401、原 MinIO live200；/auth/login307 为非标准路径重定向。3000 PID74600与原MinIO回环监听保持，3017/3020/3030/56381无监听。无本人登录或密码验证，无服务重启/切换。开发服务器可正常加载已批准源码，不能称已切换为生产构建。

## 共同底座完成、保留与暂缓

已完成：A 的离线隔离构建及显式 daily/review 配置、候选启动拒绝/就绪监督；B 代表 IngestJob 的持久意图、补投/执行收据、作用域与 Worker 模式控制；C1 四份纯类型契约、八个客户端类型依赖整理和研究首页既有只读服务收口；R1 以上排队止损。此次只补确定问题，未发现需要扩大范围的共同底座回归。

保留：旧研究兼容链、历史版本与成果、Canvas/MotherContentEditor兼容入口、原主树独有未提交 UI/测试/工具、默认方法现状、模型与API设置及私人/工作空间权限。没有合并、隐藏或删除旧业务，也不采用已撤回六板块方案。

暂缓 / CURRENT IMPLEMENTATION GAP：研究后续业务重构及 R2 持久消费者/快照/heartbeat；BenchmarkStudy/CollectionRun 旧执行链未纳入 B；autoTranscribe 前置成功至后续意图窗口、全前端 nonce 覆盖、长时未知外部效果与 Provider exactly-once；C1 不是全项目领域分层完成。R1 保留 RUNNING 未知结果人工核查，不解决进程崩溃后的自动恢复。本人登录、真实模型业务、生产切换、HTTPS/负载/跨机灾备另按明确任务验收。

## 回退和证据

task.diff、before、diff-ledger.json、semantic-check.json、final-manifest.json、test/web/lint/fixture-latest.log、test-render-harness-fail.log、daily-readonly-http.json 位于本地 Git 忽略 output/architecture-upgrade-20261005/R1，不上传。本轮代码回退只能精确反向处理 R1 hunk并先核对后续改动；不能整文件覆盖或 git reset。R1 已结算的历史记录须保留，不能恢复旧库/倒回状态来伪造回退。

原正式切换备份与原库/MinIO卷仍保留，本轮不使用它们覆盖任何后续数据。无数据删除或不可逆运行切换。GIT：未暂存、未提交、未推送。

## 当前源码生产构建补验已完成

后续明确批准的安全补验已完成：release-20261005T095244Z-9fc96386隔离production构建成功，3030匿名smoke及占用拒绝通过，候选退出0/锁移除；3000原进程保持。当前1136源hash/1462产物hash与测试复用证据已关联，不再仅引用pre-R1旧build。本页此前“未重建”是R1初次交付时状态，现由 architecture-current-production-evidence-20261005.md 补充更新。没有重新执行此前55→62迁移，Git保持未暂存/未提交。
