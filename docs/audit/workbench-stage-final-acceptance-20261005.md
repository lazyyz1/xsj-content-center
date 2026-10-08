# 工作台阶段最终验收 — 2026-10-05

STATUS：最终隔离回归及最新生产候选验收通过，READY_TO_STAGE。没有实施研究交接功能，没有切换日常服务，没有 Git 暂存/提交/推送。

## 本批实际修改

范围六个源码/测试路径（精确 before/after 台账与 task.diff 在独立证据目录）：
- ArtifactUnsavedDialog 阻止 cancel 事件传播，修复 Escape 取消提示后外层又重开提示。
- 共享编辑器不接受同一成果的旧版本 props 降级；项目成果窗口在挂载/pageshow 时只读刷新版本，脏稿不被远端覆盖，刷新失败明确提示。
- 增加三组真实浏览器补测：Escape 取消/保存后关闭；外部点击取消/放弃/干净关闭；跨文档原生 Back/Forward 的未保存 beforeunload 取消、保存后继续及最新正文读取。
- 两个既有浏览器测试仅扩展证据输出：FINAL_ACCEPTANCE_OUTPUT 下按时间/随机 ID 新建目录，保留业务用例。

没有修改 schema、迁移、Assistant 权限/归属、真实模型执行、共享默认规则或新增本地持久草稿。

## 当前验证与证据边界

最新 7 文件 34 项全部通过。实际浏览器 UI 是 8 组，其他是 HTTP/服务/合同测试，不能统称 34 个浏览器流程。Web typecheck、15 路径 lint、Node 客户端边界 3 项通过；9 个客户端入口/49 个输入/4 个纯合同，server inputs 0。隔离夹具用户/工作空间残留均为 0。正式库 55432、本人的密码和日常登录均未用于写入测试。

独立目录：output/workbench-final-acceptance-20261005/acceptance-20261005T130049Z-a66a94fa。
- latest test：test-20261005T132753679Z-b9c462d6.log，exit0。
- web：web-20261005T133103496Z-3623847c.log；lint：lint-20261005T133453146Z-fe5b05b1.log。
- 新补测：browser-evidence-20261005T132728203Z-be3265a6.json 及同时间截图。
- 既有完整 UI 重跑：W2-regression-20261005T132636243Z-fde5e8cf、F1-regression-20261005T132705322Z-adf418c9。
- fixture、client-boundaries、client-boundary-tests、review-stopped、path-ledger/task.diff 均为本次独立证据。

证据事故已修正：此前 F1 监督器复写过 W2 的三份 runtime 日志；本阶段首轮全回归又复写旧 W2/F1 固定名截图/JSON。被复写文件不再称作原证据可复核；原执行日志/task.diff/production receipt 未覆盖。首轮副本仅说明本次首轮结果，最终结论来自之后独立重新执行的 34 项证据。准确范围见 historical-evidence-caveat.json。

## 未完成范围

强退后自动恢复未保存正文没有实现，本轮未增加存储。未验收浏览器重启、多 tab、真实系统中文 IME/macOS、模型质量/费用、正式本人登录、负载、云部署或日常 production 切换。之前原库 55→62 及附件恢复属于已完成的正式切换历史，本轮未重复迁移。

研究到创作仅给出讨论建议：[具体交接建议](research-creation-handoff-minimal-proposal-20261005.md)。不新增角色，不共享私人研究全文，不自动发送/调用模型；已批准共享后预填，原输入保护和事务 disabledAt 竞态需下一小批定向实施/验证。


## 本次最终生产结果与服务状态

release-20261005T133106Z-ac691dde：BUILT、exit0，networkDenied=0、sourceUnchanged=true、liveFilesUnchanged=true。构建未使用正式运行凭证，数据库目标不可达回环 port1，未执行正式迁移。

3030候选只连接隔离55436/review19000，绑定127.0.0.1，Worker/外调禁用：live200/31ms；ready200/7ms（configuration/database/storage均true）；login200/71ms；匿名projects401/1288ms；production开发诊断404/10ms。重复预检拒绝占用端口。候选正常退出0、runtime.lock移除；关闭后再次check review通过全部源码/产物与配置校验。

最终3000仍原PID74600，原MinIO9000/9001保持；3017/3020/3030无监听；55432/55435/55436和19000均保留。本轮没有停正式库、覆盖旧集成独有数据或切换日常production。日常匿名live/login200、projects/search401、原MinIO200；开发模式ready503/configuration false仍是已知缺口，不冒充production ready通过。本人密码仍待本人登录验收，本轮没有代输或验证。

STATUS：READY_TO_STAGE；未暂存、提交、推送。最终代码、定向回归及隔离生产候选验收完成，研究交接停在讨论建议。证据：独立目录production/build-summary.json、candidate-smoke.json/log、post-close-check.log、daily-readonly-http.json、final-listeners.json、final-manifest.json。构建原始receipt/build.log保存在output/architecture-upgrade-20261005/releases/release-20261005T133106Z-ac691dde。
