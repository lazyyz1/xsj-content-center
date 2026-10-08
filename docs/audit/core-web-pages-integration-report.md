# Core Web 页面与遗漏候选补齐

STATUS: CORE_INTEGRATION_READY_FOR_POLISH

日期：2026-09-28。工位：内容生产中心-integration；分支 feat/web-integration-release；Web http://localhost:3017。

## 本轮结论

上轮完成真实数据链，但遗漏了若干在主工位已实现的页面候选及公共样式。本轮按实际入口与依赖补齐 60 个页面/配套候选文件，并对冲突文件做语义适配。所有变更仍未暂存、未提交。

| 页面/入口 | 当前采用版本与验收 |
| --- | --- |
| /dashboard | 主工位的新首页与 HomeComposer；本机附件、资料选择、当前公司模型、单个可选 Skill、项目分组；真实 PDF 首轮请求已进入冻结版 Agent |
| /projects | 主工位项目库/文件夹/全部创作/归档视图及既有生命周期操作；相关服务排序、过滤、幂等创建和恢复补丁已纳入 |
| /library | 主工位实际使用的稳定资料库，公共样式已对齐；资料仍使用同一 SourceItem/Transcript/Storage |
| /library/:id | 主工位实际使用的 SourceWorkspace，不把未接入路由的 material-detail-page.tsx 原型冒充最新入口；音频资产/下载名称相关补丁已纳入。真实 MP4 预览 readyState=4、duration=62.366667、无媒体错误，转录正文可见 |
| /library/methods 与详情 | 主工位的 Skill 列表、分类、详情、导入入口；保留现有 Skill 业务，不扩展多 Skill 执行 |
| 全局搜索 | 新组件原本未挂到当前侧栏；已接入 Account SidebarFoundation，保留 SEARCH 交互锁，真实 PDF 分类搜索与跳转通过 |
| 项目树 | 使用当前 Project 的真实资料和 TEXT Artifact；修正旧母稿/平台稿被误当作 Artifact ID 的链接；资料链接打开真实资料页，旧 source: 节点地址兼容跳转 |
| /research | 保留上轮已验收的新版候选及真实调用/证据修复；旧 /discovery 入口导航到统一研究入口 |
| /settings/* | Account 工位主版本保留；未用主工位旧 Settings 页面覆盖 |
| Agent / Artifact | 保留冻结聊天布局、预算、隔离、Streaming、Retry/Cancel、引用与成果保存。只补首页首轮请求的衔接，不接回主工位旧 DISCOVERY/口播专用 Agent 分支 |

## 本轮修复的整合问题

1. 首页原代码创建项目后依赖另一套旧 Agent 的 initialRequest。现改为将首轮内容、资料、模型和单个 Skill 交给现有 Agent；只在空对话且首次进入时启动，刷新不重复调用。
2. 首页资料检查原先自己读取 Transcript/rawText，已改为 getMaterialReadableContent；已归档资料不能通过该适配器重新进入新创作。图片须在资料页完成识读后再引用，未另建图片 Agent 流程。
3. 首页模型目录支持 Account 已有的 CUSTOM 配置，保持 workspace Credential 和 ModelRouter 一致。
4. 主工位候选允许最多三个 Skill，本轮按既定边界只保留零个或一个，不引入多 Skill。
5. 当前侧栏原先仍使用旧 SidebarSearch。已实际挂载新搜索，而不只是复制闲置组件文件。
6. 项目树原先使用旧母稿/平台稿 ID 构造 Artifact 链接，冻结版 Agent 无法读取。现在消费真实 ArtifactSummary；资料打开实际详情。
7. VIEWER 不展示 Skill 导入入口，服务端原有权限仍保留。
8. 数据库只执行已审查的三项 nullable 字段新增及一项唯一索引 SQL。先保存了独立数据库备份；没有 accept-data-loss、没有生产 migration deploy，也没有改写或删除既有数据。

## 未纳入的冲突与草稿

- 主工位旧 assistant/service、studio-shell、studio-default-method 中的 DISCOVERY/ORAL_SCRIPT 专用分支，与本次冻结 Agent 主版本冲突，不整文件覆盖。
- 未接入主工位实际路由的 Material V4 独立原型不作为运行入口；其中还缺少当前 SourceWorkspace 已有的完整手动转录/识读交互，不用它替换稳定资料主链。
- 旧 Sidebar 删除、Legacy Cleanup、独立旧 Discovery 工作台和 Canvas 改版不带入。
- Account 设置、新 Research 与本轮 Provider/权限修复保持主版本，不因同步主工位页面而回退。

## 验证证据

- 8 个包 typecheck 全部通过；最后一次 Web typecheck 通过。
- 本轮 16 个定向测试文件、77 个测试通过：Project、Creation Composer、Material、上传、Sidebar、Skill、Agent、Account、Research、Artifact。
- 12 个真实登录页面冷启动 HTTP 检查均为 200，无服务端错误。
- 新首页浏览器真实选 PDF → 创建项目 → DeepSeek 回复 → 来源引用通过。项目 cmukrphsy0001q9swvihwfxpo；恢复后两条消息、一次 AIRun，未重复计费。
- 浏览器实际查看新项目库、Skill、新全局搜索、真实 MP4 资料详情；视频已实际加载而非仅页面 200。
- 原项目的 10 条消息、两个 TEXT Artifact 均保留。退出后旧会话 401；重登恢复正常。
- Research 相同证据检查返回 unchanged=true，沿用完成的第 7 版，新增模型调用为 0。
- 开发热更新过程中出现过一次 Research 503。已保留旧编译缓存，冷启动后重新执行上述检查，未复现；冷启动返回 200。
- git diff --check 通过；未 add/commit/push/reset/clean/stash。

证据与备份：output/remaining-integration/{before.patch,main.patch,imported.json,file-status.json,before-schema.dump,page-check.json,final-tests.log,cold-recovery.log,cold-pages.log}。这些临时证据位于忽略目录。

当前没有阻断本轮核心入口与主链的已知问题。RedFox 仍如实显示实际返回样本的 PARTIAL 覆盖；不把未知数据补成零或宣称全量。未宣称生产发布、未做生产构建验收。

CORE_INTEGRATION_READY_FOR_POLISH
