# 转录 → 单作品研究 → 明确创作交接验收（2026-10-07）

STATUS: READY_TO_REVIEW。实现与隔离验收完成；未合并到日常工作目录，未暂存、提交或推送。

## 授权边界与副本

- 本轮仅完善已批准的转录、同作品原件补充、报告内页与明确创作交接。
- 工作树：E:/codex1/2026-10-04/task-4/transcription-research-worktree
- 分支：feat/transcription-research-local-20261007；基准提交：3386c55ecccd0546aa81830d46f219f10f91732b。
- 日常原目录 HEAD 为 ae3ff0879029394cec99ccb2f00d012e1e8a52ed。在隔离工作树覆盖复制原目录当前相关源码后，记录了 1,165 个文件的任务开始基线。25 个继承的当前源码差异属于基线，不应算作本轮新改动。
- 外部基线：E:/codex1/2026-10-04/task-4/transcription-source-baseline.json。
- 原目录内容经行尾归一化逐个核对，1,165 个文件无差异；原暂存区为空。旧 model-defaults-worktree 的七个改动未接续、修改或合并。
- PRODUCT.md、ARCHITECTURE.md、LEGACY.md、AGENTS.md 未修改；本任务不是 Governance Update。

## 实现结果

### 原件与转录

复用现有上传、SourceItem、转录请求、BullMQ、ASR Provider、MinIO 和研究服务。支持在同一作品内关联已保存原件、上传合法本地文件或补充核对后的文字；保存关联时保留原作品平台身份与已有原件，不把上传材料改写成平台采集身份。文字补充使用 requestKey 保证并发重放只保存一份，改变同一请求的正文返回冲突。

显式读取支持的平台链接与单作品原文采集使用现有自动转录能力。配置缺失、原件缺失或环境关闭调用时保留原件并给出下一步，不自动开启付费回退。确认上传成功但关联响应丢失时，重试复用已保存 SourceItem。

手动模型与 AUTO 的页面就绪判断和执行选择统一；只有明确配置允许的付费回退才视为可用。派生音频缓存必须对应选定父媒体。Recording File 2.0 不把不可达私有 URL 悄悄降级为不支持的二进制请求。

FFmpeg 子进程有 120 秒默认期限与终止处理；转录执行锁事务期限 45 分钟，覆盖既有 30 分钟 ASR 期限及前后处理。处理前重新检查有效成员，禁用成员不执行。Provider 错误正文不直接回显可能含秘密的任意上游文本。

超时或云端响应结果不确定时保存 ASR_RESULT_UNCERTAIN，不自动重试，也不覆盖已有文字稿。Owner/Admin 必须明确确认没有可恢复结果并填写核对依据，才将其标记为已核对；记录审计，不自动排队。资料页核对入口查询所有未确认转录记录，不依赖最新一条任务。

轮询请求 12 秒超时，失败和超时显示断线提示；恢复联网继续读取状态，终态刷新。取消等待不会删除已保存资料。

### 证据、报告与创作

研究读取显式关联原件，继续执行服务端 workspace、成员与研究本人隔离。快照仍为 12,000 字、最多 120 片段；只纳入能在快照正文中按顺序定位的完整片段，并标记截断。版本指纹仍覆盖完整正文、片段和媒体身份。

时间码只能来自真实片段边界，支持跨相邻 ASR 句子的真实引用，拒绝句内估算或引用其他时段的时间码。手动编辑正文移除旧时间片段；旧报告不可变、保存原快照，页面明确标记原证据变化。旧报告引用链接指向该版本保存的来源，过期报告不会定位到新的媒体。

保留 A 的工作台外壳、导航和视觉，仅完善报告内页：作品/账号身份与真实指标、按真实时长比例的结构条、段落原文展开、机制假设及限制、可迁移方法与自身证据要求。无时间码时显示顺序段落导航，不估算时间或镜头。

创作前展示参考结构和自身角度并排比较，核对所选结论、来源版本、目标项目与自己的意图后，明确点击带入本人项目待审阅。交接不自动发送 AssistantMessage、不生成或覆盖 Artifact。原有分享仍使用实际共享预览和明确确认。

## 隔离验收

所有新数据库写入、合成媒体、测试会话及队列均在独立环境。正式数据库没有写入测试；真实付费 ASR、RedFox、LLM 均未调用。浏览器禁止外部来源请求。

| 检查 | 当前结果 |
| --- | --- |
| 研究、资料关联、可用性、FFmpeg、ASR 响应安全等 9 个文件 | 35/35 通过 |
| 断线、超时、联网恢复、真实结构比例、无时间码导航 | 5/5 通过 |
| Edge 真实 HTTP 桌面/390px 手机与创作、编辑、上传重试、核对 API | 5/5 通过 |
| FFmpeg → 独立 MinIO → 队列 → 本地 HTTP 模拟 ASR → Transcript | 7/7 通过 |
| 崩溃恢复、重复投递、撤销权限、不确定外部结果等恢复集成测试 | 21/21 通过 |
| providers、worker、web TypeScript | 通过 |
| 本轮 TS/TSX 与专用客户端测试配置 ESLint，零警告 | 通过 |
| Next 16.3.4 webpack 生产构建、类型检查、106 个静态页面生成 | 通过 |
| 原 3000、3030 与测试 3047 登录页 HTTP | 全部 200 |
| 原目录 1,165 个源码文件内容与暂存区 | 无内容差异；暂存区为空 |

浏览器五项覆盖：报告重开/原文/缺失指标、明确私人创作交接且无消息或成果写入、版本编辑和时间片段移除、上传响应丢失后复用一份原件与补文/取消/Viewer 拒绝、管理员核对的 401/403/400/404/200/409 与唯一审计且无自动重试。

截图与机器证据：
E:/codex1/2026-10-04/task-4/transcription-acceptance/report-desktop.png
E:/codex1/2026-10-04/task-4/transcription-acceptance/report-mobile.png
E:/codex1/2026-10-04/task-4/transcription-acceptance/creation-review.png
E:/codex1/2026-10-04/task-4/transcription-acceptance/browser-evidence.json
E:/codex1/2026-10-04/task-4/transcription-acceptance/original-preservation.json
E:/codex1/2026-10-04/task-4/transcription-acceptance/own-files.json
E:/codex1/2026-10-04/task-4/transcription-acceptance/changes-only.patch

补丁已在原目录通过 git apply --check --ignore-space-change 只读检查；未应用补丁。共 35 个本轮文件。

客户端测试使用 apps/web/vitest.transcription.config.ts，避免 Next 的 JSX preserve 设置影响 Vitest 的组件转译；不改变全仓 Vitest 配置。Mock-only ASR 客户端测试仅注入假 fetch，不开启环境的外部调用开关。

## 环境与运行边界

- 仅测试预览：http://localhost:3047；绑定 127.0.0.1；EXTERNAL_CALLS_DISABLED=true。
- 独立 PostgreSQL 55433、Redis 6380、MinIO 9002。测试容器名分别为 cc-transcription-test-pg-20261007、cc-transcription-test-redis-20261007、cc-transcription-test-minio-20261007。
- 新空测试数据库仅应用现有 62 项 migration；本轮 schema/migration 新增为 0，未对正式数据库执行 migration/reset/seed。
- 队列使用 cc-transcription-20261007 与独立恢复测试前缀。测试会话与业务样例已清理。测试对象存储仅含合法合成固定内容。
- 原 PostgreSQL 55432、MinIO 9000、日常 3000、原 review 3030 未切换、停用或覆盖。
- E 工作树复用 D 依赖的 Next 路径问题已通过隔离驱动器上的真实 Next package 副本解决。原 package 与原服务未改；其余包只读复用现有依赖。
- 构建产物与备份/测试数据不加入 Git。Next 自动生成的 next-env.d.ts 恢复本轮开始基线，不纳入交付差异。

## 实际限制与后续

CURRENT IMPLEMENTATION GAP：尚未验证真实授权平台链接、真实收费 ASR/LLM 的质量、时延及计费；这些调用仍按未批准范围关闭。不得把本次本地模拟链路通过解释为线上收费服务已验证。

研究执行仍复用现有 after/版本/过期门禁；本轮没有另建研究队列或承诺浏览器长任务具有新的持久化执行语义。超时后的人工核对要求服务端没有可恢复结果，不能仅凭页面失败盲目解锁。

文件上传响应本身丢失且浏览器没有收到 SourceItem id 时，应先在资料库核对已保存文件再关联；本轮新增复用覆盖的是上传已确认、关联响应丢失，不宣称任意文件上传具有全局幂等键。

日常用户账号和密码没有用于测试，也未改变；3047 是隔离验收入口，不能用正式密码登录该空测试环境。无正式数据切换，无 Git 合并或云端部署。
