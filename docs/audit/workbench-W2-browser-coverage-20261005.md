# W2 实际浏览器覆盖核对 — 2026-10-05

W2原始“16项”是3项实际浏览器测试 + 3项Artifact服务测试 + 10项搜索route handler/真实隔离数据库测试。不是16个浏览器流程，也不是16个端到端测试。搜索handler测试模拟认证上下文；实际HTTP搜索定位另在浏览器项目流程中验证。生成仅mock SSE/MockProvider，Artifact GET/POST/PUT、版本冲突和HTTP鉴权是真实Next API。

本次收尾后串行复跑6文件31项全部通过：以上16项 + 收尾测试文件4项（2组实际浏览器UI流程、2组真实HTTP/服务验证） + 既有ProjectAssistant6项（含2项静态合同/代码断言） + CanvasNodeAI5项服务测试。实际有5组浏览器UI测试，不能把31项统称浏览器验收。浏览器是Windows Edge headless。

| 实际路径/场景 | W2实际证据 | 收尾新增证据 / 未测范围 |
| --- | --- | --- |
| 项目手改保存、版本保持 | 浏览器真实PUT v1→v2；旧revision内容不变；双DOM点击只一次PUT，干净按钮禁用 | 服务回归通过；不是强并发/网络重发压力测试 |
| 成果切换 | 项目窗口A→B；未保存取消仍在A；409后放弃再切到B，正文独立 | 未测“成功保存并继续后直接切另一成果”；研究面板不同成果间切换也未单独测 |
| 项目切换 | 研究下拉切项目取消/放弃；全局搜索切另一项目取消/放弃 | 收尾新增输入框直接Ctrl+K，搜索另一项目保存并继续，真实PUT原成果后进入目标项目；跨workspace请求拒绝另测 |
| 关闭 | 项目X按钮未保存取消；B成功保存并关闭；冲突时保存并关闭失败仍留弹窗/正文 | 未测点击backdrop或Escape关闭成果窗口；不是关闭浏览器/OS强制退出 |
| 刷新 | 项目页reload触发原生beforeunload，dismiss取消后当前手稿保留 | 未测接受离开后自动恢复未保存正文；没有实现/承诺本地持久草稿恢复 |
| 返回/前进 | 研究同一文档pushState hash → history.back取消恢复；再次back保存双击只一次PUT；forward可回原项，history.length不变 | 未测跨文档原生浏览器Back/Forward离开、BFCache/多tab历史或浏览器重启 |
| 真冲突保留 | 另一个真实HTTP PUT把v2推进v3；本地PUT真实409，正文不变；弹窗保存仍失败并保留；数据库仍远端v3 | 未测自动合并或一键刷新后重放草稿；这些能力未实现 |
| 已保存导出 | 当前本地保存v2与未保存编辑并存时，确认仅导出v2，文件正文不含编辑或远端v3 | 未测全部文件格式/OS下载权限 |
| 研究与项目同成果 | 研究真实GET打开项目同一Artifact；保存v4；项目页VIEWER读取该v4 | 未测多人同时在两界面编辑的完整交互（真409通过HTTP并发版本制造） |
| 首次生成后手改保存 | 生成SSE mock一轮；手改后真实POST+PUT，一成果v2，重复点击不重复创建 | 未测真实AI生成质量/费用、POST成功而后续PUT网络中断、脏稿时再次生成的完整浏览器路径 |
| W1搜索稿名找回 | 实际HTTP搜索、成果scope、所属项目与node定位、打开准确正文 | 只查当前标题/版本；历史版本检索未实现 |
| VIEWER / 跨客户 | 字段、保存、AI继续禁用；真实Artifact PUT403；跨workspace GET/PUT404；他人私研究404 | 收尾新增Assistant GET200空列表无他人内容、发送403明确提示；VIEWER已有个人历史仍200，Mock建议预览允许，保存候选拒绝；禁用成员拒绝 |
| 手机 | 390×844 VIEWER截图；正文右边界及内部横向宽度不溢出 | 不是手机Safari/触摸键盘/全面无障碍验收 |
| 编辑与搜索快捷键 | W2只在Tab移出输入框后打开搜索 | 收尾真实Ctrl+K直接在textarea打开/关闭搜索；编辑/Backspace/原生undo保留；模拟isComposing、Ctrl+Alt+K不打开搜索；未测真实系统中文IME、macOS Cmd+K和其他浏览器 |
| 认证/模型 | 隔离可丢弃账号、真实API cookie；清理全部夹具 | 未验证本人密码、真实邮件/模型/采集；不写正式业务库 |

历史证据修正：F1监督器曾复写W2的review-server.log/runtime/stopped。本阶段首轮全回归因旧测试固定输出路径，又复写W2/F1的browser-evidence.json及固定名截图。上述被复写文件不能再当作原批次可复核证据。原执行日志、task.diff、production receipt未因这两次事故覆盖。准确范围见最终独立目录historical-evidence-caveat.json。旧截图/汇总只保留为本次首轮回归副本，不冒充原证据。

构建边界：W2产物release-20261005T121559Z-f9a985ab是W2阶段历史通过；本收尾改变源码后check review明确RELEASE_SOURCE_CHANGED_REBUILD_REQUIRED。本批未重build，不把W2旧产物称当前生产验收。


## 最终阶段补验（独立证据）

7文件34项重新串行通过，实际浏览器UI为8组（W2 3 + F1 2 + 本阶段3），其他为HTTP/服务/合同验证。新增真实Escape、外部点击关闭、跨文档原生Back/Forward的beforeunload取消与保存后继续；保存后返回读取最新版本。修复Escape提示重复打开及历史返回旧正文。旧表格“未测”属于此前阶段，以上已补验。强退恢复、接受离开后未保存正文恢复、多tab、真实系统中文IME/macOS仍未验收。

当前完整证据：output/workbench-final-acceptance-20261005/acceptance-20261005T130049Z-a66a94fa：test-20261005T132753679Z-b9c462d6.log、browser-evidence-20261005T132728203Z-be3265a6.json、W2-regression-20261005T132636243Z-fde5e8cf、F1-regression-20261005T132705322Z-adf418c9。最终重跑使用独立目录，新旧浏览器测试均以时间/随机ID分目录，没有继续覆盖旧证据。最终构建见workbench-stage-final-acceptance-20261005.md。
