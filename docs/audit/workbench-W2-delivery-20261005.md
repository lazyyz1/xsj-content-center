# W2 共享成果编辑器交付 — 2026-10-05

> 后续F1已修复输入Ctrl+K与VIEWER列表500；本W2产物因F1源码变化现为历史失效产物。实际16项浏览器覆盖见workbench-W2-browser-coverage-20261005.md，当前收尾见workbench-W2-followup-delivery-20261005.md。W2三份review运行记录被收尾监督器复写，不能当原日志使用；其他证据保留。

STATUS：共享编辑器小批已完成定向验收，READY_TO_STAGE。研究交接批尚未开始。本批不是 Governance Update。包含W1/W2的当前生产产物已重建并完成候选烟测；旧产物只作历史记录。

CHANGED：项目 ArtifactWindow 与研究 WorkCreationAction 共用 ArtifactEditor/useArtifactEditor，复用现有 Artifact GET/POST/PUT、expectedVersion 与旧版本保存机制。项目窗口新增手编、保存、导出已保存版本；研究原入口、生成流程、引用内容、Prompt、模型选择和私研究权限保持。保存失败/真实409保留本地正文，保存/首次创建锁阻止重复点击；首次生成保存后的手改写为新版本。离开可保存并继续、放弃或取消；刷新使用原生保护；返回/前进恢复已有历史项，不追加假历史。全局搜索按钮路由也经过共用草稿保护，W1成果node定位保留。手机成果窗口网格最小宽度修正，正文不再在窗口内部裁切。

BOUNDARY：八个代码/测试路径，精确 before、task.diff、path-ledger 在 output/workbench-iteration-20261005/W2。新Hook是从研究现有保存/导航能力抽取，非另建数据引擎。studio-shell只有editableProject向窗口传入；global-search只增加导航保护，保留W1改动。不改后端服务/schema/迁移/归属/共享默认值，不移除研究/Canvas/旧母稿，不改权威文档、不调用真实模型或Worker、不切正式运行。

VERIFICATION：最终串行运行3文件16测试全部通过（共享编辑器真实浏览器3、Artifact服务3、搜索真实API10）；Web typecheck、七个TS/TSX路径lint --max-warnings=0通过；九入口客户端检查49输入/4纯合同/0服务端输入，本批三入口含全局搜索8输入/0服务端输入。git diff --check通过。真实浏览器用可丢弃账号和原Next 3020 API，只有生成SSE受控模拟，成果GET/POST/PUT未模拟：
- 项目手改v1→v2、旧修订保持、重复点击只一次PUT；另一窗口真实PUT到v3后本地保存真实409，正文及未保存弹窗保留，导出明确为本地已保存v2而非未保存正文或远端v3。
- 成果切换、取消关闭、成功保存后关闭、刷新取消、W1搜索node准确；带草稿搜索另一项目取消仍在原项目，放弃后进入目标成果。
- 研究重新打开同成果、项目切换取消/放弃、返回取消/保存/前进且history长度不变；新生成后手改再首次保存真实POST+PUT，仅一成果、两版本。
- VIEWER编辑/保存/AI按钮禁用、真实PUT403；跨workspace GET/PUT404；他人私人研究API拒绝。390×844截图及正文右边界/内部横向不溢出断言通过。
- 所有浏览器和服务fixture最终删除，独立55436核对users=0/workspaces=0；未使用本人密码。3020监督器已按专属信号退出，3017/3020不监听，3000仍原PID74600、原MinIO9000健康200。日常只读匿名live/login200、projects/search401。daily开发运行ready503是既有配置校验边界，不冒称生产ready通过。

RISKS / CURRENT IMPLEMENTATION GAP：历史版本查看/恢复、研究上下文交接、品牌/临时工作模型及真实AI质量未在本批实现。原AppShell对输入中的单字符窗口快捷键做隔离，包含Ctrl+K；测试按Tab离开输入后打开搜索，未改该模块。VIEWER打开项目时旧Assistant列表读取在隔离日志出现500，但Artifact读取/403边界正常；该旧链问题只报告不越界修复。并行测试一次触发既有Serializable数据库写冲突，已保留原失败日志并按单文件写入顺序最终16项通过，未改服务事务策略。首次编译超时、夹具线程复用错误及即时React状态断言的原失败日志保留，最终证据不可混用。新UI能力不会等同于已验收付费模型、邮件、真实附件或全部无障碍质量。

GIT：HEAD ae3ff087，未add/commit/push、未切分支/覆盖整树。八路径的先前未提交hunk在before中保存，本批独立diff与前后hash可审阅。备份、运行配置、日志与fixture脚本在Git忽略output中，不上传。撤回仅按本批独立diff审阅，不restore/reset整文件。

## 当前生产产物
当前artifact：release-20261005T121559Z-f9a985ab，BUILT/exit0；1140源码与1464产物哈希记录，networkDenied=0、sourceUnchanged=true、liveFilesUnchanged=true。离线构建使用不可达loopback数据库和网络保护，不读取日常运行凭证或执行migration。review生产候选3030匿名live32ms/ready7ms/login67ms均200，projects401(1123ms)、dev诊断404(15ms)，重复启动端口检查拒绝。候选正常退出0且运行锁删除，关闭后local-release check review再次逐文件校验通过；最终3030/3020/3017不监听，3000原PID74600保持。证据在本批production/candidate-smoke.json及releases/release-20261005T121559Z-f9a985ab/receipt.json。Node客户端边界3项亦通过。未切换3000为此生产产物，未验证本人密码。
