# W1 开始/继续入口与成果找回交付 — 2026-10-05

STATUS：首批实际改码与定向验收完成，READY_TO_STAGE。不是新版工作台全部改造完成。当前最值得改的三项仍为开始/继续语义、研究上下文交接、共享成果编辑与找回；本批只完成第一项的确定文案/旧工作入口和第三项的当前成果搜索。

## 实际改变

- 首页原“选择项目”更正为“选择项目文件夹”，弹窗标题、搜索和无效提示同时纠正；实际请求仍是folderId，不把已有项目伪装成文件夹。
- 增加“打开已有项目”通往现有项目列表，明确发送会开始新工作；新建提交中拒绝此链接误跳转。没有把首页草稿/附件自动送入旧项目，也没改原创建和clientRequestId幂等逻辑，因此不声称已解决所有重复项目来源。资料页“基于资料对话”现有创建行为留后续卡。
- 全局搜索新增“成果”分类，按Artifact稿名检索，显示所属项目和当前V版本；沿用dashboard?project=...&node=artifact:...打开现有成果。ALL/PROJECT/资料类型区分保持，搜索不返回成果正文，不假冒完整历史版本检索。
- 新查询复用getApiWorkspaceContext，不扩大权限。只返回本workspace、启用成员/用户/空间、未归档项目且未删除branch的成果；VIEWER按既有规则可读共享项目成果。不改成作者独占，也未引入Brand/Client权限或私人研究搜索。

## 精确范围

五源码/测试路径：components/home-composer.tsx、workbench-start.tsx、global-search.tsx、app/api/search/route.ts、tests/global-artifact-search.test.ts（前缀apps/web）。本批未新增Service/Model/DTO/Hook/CSS系统，未改Prompt/模型路由/研究ABC/Skill算法/编辑器存储/兼容组件。PRODUCT等四份权威文件保持。

快照、task.diff、diff-ledger.json与final-manifest.json在本地忽略output/workbench-iteration-20261005/W1，从本批开工前逐文件生成，保护ae3ff087已有未提交成果。不git add/commit/push或切分支，不整树覆盖。

## 本轮验证

- 55436硬隔离：新HTTP GET handler直接调用+真实DB查询10/10。鉴权上下文由测试mock，不是本人登录后的真实浏览器测试。覆盖稿名/项目/当前版本、ALL与资料分类、跨workspace、归档/删除、启用VIEWER、匿名401、无成员、停用成员/用户/空间；查询返回无正文。
- 假fixture仅本隔离库创建，用户0、空间0，关联项目/资料/branch/成果级联清理；没有真实模型/邮件/采集调用，Worker禁用。
- 最终Web typecheck和五文件lint通过。三客户端入口esbuild浏览器编译7输入、0server输入；五路径精确diff检查通过。提交中链接保护补改后重跑类型/lint/客户端编译；搜索route/test未再变，不机械重跑同一DB测试。
- 日常只读live/login/原MinIO200，新/api/search匿名401。原3000仍PID74600、9000/9001回环；3017/3020/3030/56381无监听。未重启/切换正式服务、未读写55432业务或改变本人密码/26停用账号/资料归属。
- 此前production产物release-20261005T095244Z-9fc96386因本批源码变化已正确拒绝（RELEASE_SOURCE_CHANGED_REBUILD_REQUIRED）。本批V1未再跑完整build，不能把此前build或smoke当W1当前证明。
- 未做：真实登录浏览器布局/E2E、移动/无障碍实际交互、历史版本找回、付费模型与真实业务质量、邮件投递、正式部署/负载。没有靠改编译配置或关鉴权过测试。

## 后续最小批次与遗漏

优先下一卡：完整成果编辑/导出共用能力，复用现有saveTextArtifact/expectedVersion，覆盖手工编辑、旧版保留、冲突不丢草稿、未保存离开、VIEWER和AI继续修改；保留研究面板现有能力，不先移除。随后独立研究→项目交接卡：携带run/version、资料、受众和借鉴选择，明确项目可见内容；先沿既有权限，不自动分享完整私人会话。

临时工作可继续论证Project作底层兼容容器，UI无需先填项目表单；但默认个人/团队可见、归档语义尚须明确。品牌/客户复用先列范围及持久化方案，未认定已有Brand模型、不新增平行存储或schema。跨客户上下文可见/可调不能替代服务端隔离。

一个月交付还缺实际采集平台/媒体支持矩阵、转写/画面读取范围、模型质量成本和失败验收、0/多Skill能力、邮件/正式运行、备份含后续写入、Git版本交付、移动/无障碍，以及桌面商业交付范围确认。最新实施表见workbench-iteration-plan-20261005.md。旧研究大改、R2和完整经营闭环保持暂缓，不因本卡列出而抢跑。

代码回退只精确反向处理本批hunk，先核对后续改动；无schema/正式数据变化，不恢复旧库或删除历史成果。
