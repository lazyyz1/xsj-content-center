# 老师 / 对标与作品展开页（2026-10-06）

STATUS：READY_TO_REVIEW，最终隔离产物及浏览器验收通过。正式 localhost:3000 保持 release-20261006T152431Z-e439c607 / PID 15720；本轮未切正式版本。

## 实际参考与实现

已在本机查看 590 秒原视频的 223、227、245、253、263、265、285 秒实帧。原视频账号趋势与作品榜、新作队列、报告展开为三个层次。账号内部档案不是原视频展示页，本轮明确按本工作台补充设计。

- 主页面顺序为标题说明 / 同步 / 主页导入、筛选、账号趋势卡 grid、下方作品榜。
- 老师学方法、对标学题材共用 BenchmarkAccount。关系存在本人 ResearchObjectPreference 的 BENCHMARK_TEACHER / BENCHMARK_REFERENCE；事务及 advisory lock 确保当前目的互斥，不重建账号或作品。
- 主页仅支持 HTTPS 完整抖音 / 小红书主页，不请求任意输入 URL、不跟短链、不接受作品 URL、凭证 URL 或伪造域名。身份由既有 RedFox accountDetail 返回，随后仅调用 accountWorks 最新一页；已有账号定位不调用第三方。当前外部闸门关闭，新账号明确返回待接入，不能填名字冒充成功。
- 同账号、同平台、同周期点赞中位数作为可解释基准。最少 5 个有效样本，零分母与缺失不给倍数。账号最多 100 个，每号最近 200 条；全部指已保存范围。账号真实粉丝目前不可存储，显示未提供。
- 作品榜周期 7 / 30 / 全部，与新作队列 3 / 7 / 30 天分开。门槛默认 2.5，允许全部 / 超门槛，倍数 / 点赞热度 / 时间排序；数量是当前筛选结果。
- WORK.viewedAt 为明确已读，不因新指标 observedAt 更新重新未读。WORK_DISMISSED 为独立可恢复忽略；不会删除作品、报告或选题。原 WORK 收藏保留。
- 去看为外部原作；看过为个人阅读；想复刻进入已有研究发现的创作审阅预览，不发送聊天；已有拆解只打开已有报告。报告 REPORT_ARCHIVED 独立可恢复，不等于研究 savedAt、选题采用或阅读。
- 报告页窄左作品 / 归档关联列表，当前真实指标及基准，下方动态段落结构 / 表现表达两列。模型段落不套固定 Hook；引用原文在所属段内展开；有存储原片且有时间码才可定位播放，无原片诚实回退。当前原文和历史报告引用保留区别。
- 返回链接限制本地研究列表路径，保留原筛选与作品 anchor；原选题链接指向实际 ContentIdea。

## 验证

第一轮：相关 6 文件 / 39 项通过，Web typecheck 通过。
加入模拟平台身份 / 同步失败契约后：相关 6 文件 / 40 项通过（benchmark-workbench 8、work-research-service 6、research-benchmarks 4、research-api 4、news 14、news-runtime 4）。仅隔离 55436，MockLLM / mock platform，fixture 清理。相关 lint 与当前 Web typecheck 通过。
生产构建、真实 HTTP、桌面 / 手机浏览器验收结果待下方最终记录；不能以此段宣称已验收真实第三方或用户密码。

## CURRENT IMPLEMENTATION GAP / 审批边界

1. 自动审批拒绝“新作队列按钮直接启动 analysis 端点”补丁，原因是端点可能执行付费模型，超出本轮仅模拟集成、不运行真实付费调用边界。拒绝补丁未执行，未绕过。队列暂为“拆解 · 先审阅”，进入原有详情；直接启动仍未完成。
2. 真正 RedFox 身份 / 作品采集、真实模型 / ASR、永久 9:30 自动采集未授权，未启用，不能宣称接入完成。视频未指定时区，不将 9:30 解释为新加坡时间。
3. 原 BenchmarkAccount 无粉丝及身份指标观察字段。最小方案：同一模型增加 profileSnapshot Json? / profileObservedAt DateTime?，仅保存服务端实际返回的公开身份及粉丝，缺失为 null，失败保留旧值并标旧观察日期；无需第二个老师表。Schema + migration + provider ownership 作为另一个单元，需单独批准正式迁移。本轮没有 schema / migration 修改。
4. 作品输入最多 200 / 队列 100 的读取边界，不代表全平台历史或全部覆盖。无播放 / 完播分母不得生成比率。
5. 真正存储原视频的播放 seek 尚待可用隔离附件验收；本轮先验证真实回退、报告段内引用与原列表 anchor，不伪造媒体可读。

## 保留与回退

改前精确文件快照：E:\codex1\2026-10-04\task-4\teacher-workbench-20261006\baseline。
本轮只能按文件 / hunk 回退本次修改，不整树覆盖、不 git reset，不覆盖其他未提交工作。原 HEAD ae3ff087 不变；未 add / commit / push。
正式原库 55432、MinIO9000、现有正式3000、个人服务和旧库卷未修改 / 停用 / 删除。未手动刷新正式 news，父线程独立核对自然整点周期。
本次账号同步成功时间仅在作品事务成功后更新，失败不把未完成同步伪装为成功。

## 最终交付（2026-10-06 17:21 UTC）

STATUS：READY_TO_REVIEW（隔离版本已验收；正式3000未切换；直接启动分析保持未实现）。

- 最终产物：release-20261006T171407Z-0f54c32f；构建 BUILT / exit 0 / networkDenied 0 / liveFilesUnchanged=true / sourceUnchanged=true。
- 隔离预览：http://localhost:3030/research/benchmarks（55436 / 原有 review19000；新闻、外调、Worker 均关闭）。launcher PID 78836，服务 PID 21268，仅 loopback。
- 最新源码相关 6 文件 / 40 项测试通过，4 组真实 HTTP / 桌面 / 手机浏览器测试对最终产物通过，Web typecheck 与定向 lint 通过。
- 浏览器验证：401 未登录、403 跨 Origin、404 外空间资源 API；Next 流式未找到页面可能为 HTTP200，另核页面不含受保护标题。不会用页面 HTTP200 代表权限放行。
- 实际验证切角色不丢作品、读过不因指标刷新重置、忽略可恢复、外部原作 / 阅读 / 复刻预览入口 / 既有拆解不同去向、动态三段引用在段内展开、报告归档不新增运行不删选题、原选题链接、原筛选和作品 anchor 返回、手机无横向溢出、无效主页、取消、双点击仅一请求、真实浏览器网络失败保留输入。
- 浏览器 fixtureCleanupVerified=true、pageErrors=[]、外部请求=0、模型执行请求=0；报告 fixture 使用 MockLLM，未调用真实模型、ASR 或平台。截图中的作品和指标为明确隔离 fixture，不是正式业务表现。
- 截图与验收汇总：E:\codex1\2026-10-04\task-4\teacher-workbench-20261006\browser\evidence.json 及同目录四张 PNG。
- 新增计数分别为当前日期 / 账号筛选、最多100条范围的未读 / 看过 / 忽略数；所有队列作品入口保留原筛选和 anchor；原选题查询独立于阅读、忽略和队列100条上限。

正式 daily 的自然小时同步已只读核对：2026-10-06T17:17:28.520Z。
lastAttempt=17:14:05.002Z，lastSuccess=17:14:07.981Z，nextAttempt=18:14:07.981Z；原 due=17:13:37.530Z。paused=false，failures=0，error=null，公开记录111条。正式PID15720 / startUTC=16:17:04.1129610Z 未变；未手动刷新、未改定时。
证据：同 E 目录 formal-news-natural-readonly.json。

保留所有数据库 / 卷 / 原目录与未提交工作；个人服务4175/4176/18820与3040 PID保持。未 git add / commit / push、未 formal migration、未改密码或权限。仍需本人 / 父线程审阅隔离界面；真实接入与粉丝存储及直接分析动作按上方边界处理，不宣称生产交付或本人密码验证。
