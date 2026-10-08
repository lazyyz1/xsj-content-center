# W2 收尾 F1：快捷键与VIEWER对话读取 — 2026-10-05

STATUS：两项收尾完成，READY_TO_STAGE；研究交接仅V0建议，未实施。七代码/测试路径有before、独立task.diff和hash；不改角色、schema、migration、数据归属、Prompt/执行引擎，不暂存提交推送。

CHANGED：
- AppShell此前在input/textarea内阻止所有单字符keydown/keyup冒泡，Ctrl+K也被拦。现在只放行非组合输入、无Alt的Ctrl/Meta+K给原全局搜索；其他编辑隔离保持。
- getProjectAssistantThread此前调用defaultThread，按createdById查找并创建；数据库已应用部分唯一索引只允许每项目一个默认线程，其他成员访问即P2002→500。现读取是SELECT-only，无线程返回空列表；他人线程返回空内容和unavailableReason，不返回其ID/正文/来源。发送前scope/线程校验返回明确403；内部defaultThread按项目锁并拒绝占用他人线程，防止竞态绕过前置校验。
- Assistant UI展示线程不可用原因并禁用该线程发送；既有只读获准内容和禁止上传/保存候选的说明保留。VIEWER拥有已有个人线程时允许建议预览的原策略保持，保存候选仍拒绝。节点Assistant旧共享读取语义未改。

VERIFICATION：最终6文件31项串行通过；包含W2原16项、收尾4项、ProjectAssistant6项和CanvasNodeAI5项。实际浏览器覆盖细分见workbench-W2-browser-coverage-20261005.md，不能将31項统称E2E。最终Web typecheck、七路径lint零warning、九客户端入口49输入/4纯合同/0服务端输入、git diff --check通过。Assistant执行/Prompt/保存/Node函数整段字节与本批before相同，W2八路径hash未变。
- 真实VIEWER GET200空其他人历史、POST403清晰原因且不新建thread/message；Artifact读取200、修改403；跨workspace Assistant GET/POST404；disabled成员拒绝。已有VIEWER自己历史仍可读，MockProvider建议生成允许，候选保存拒绝。
- 实际输入Ctrl+K无需Tab；搜索取消保留正文/项目，保存再搜索切项目真实PUT成功；Backspace/原生undo保持，合成composition/Alt键不触发搜索（不是全面系统IME验收）。
- 仅55436/3020可丢弃用户。fixture独立核对users=0/workspaces=0，3020监督器已退出；正式3000原PID74600、原MinIO保持，未以本人凭证登录或写正式业务数据。真实模型、采集、邮件、Worker均未执行。

CURRENT IMPLEMENTATION GAP：现有每项目一个默认线程与未来多成员各有Conversation不一致；本批只安全拒绝使用他人线程，未修改索引、共享其对话或迁移旧记录。若需要多人独立协作，必须另提数据归属/索引方案。已有私研究完整引用到团队成果仍需另定服务端披露边界。研究交接建议见research-creation-handoff-minimal-proposal-20261005.md。

证据质量：监督器首次复制漏改output目录导致W2三份运行日志被复写，已记supervisor-copy-error.json；W2测试结果、截图、fixture日志、独立diff和生产receipt未变，复写运行日志不再引用为W2原证据。首次收尾测试错把默认成果排序当固定选择而失败，已精确选择成果并完整31项复跑；原失败日志保留。本批旧production check返回RELEASE_SOURCE_CHANGED_REBUILD_REQUIRED，W2产物已标历史；本次未重production build/烟测，不把旧结果冒充当前通过。

GIT / 回退：HEAD ae3ff087，未add/commit/push/reset/restore。只审阅本批七路径独立diff撤回，不覆盖含其他工作的大文件。本批不存在数据库回退或正式运行切换。下一步仅决定上述交接建议，不展开新模型。
