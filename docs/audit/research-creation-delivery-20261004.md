# 研究创作交付记录（2026-10-04）

STATUS：本地实施完成，定向 V2 验证通过，未暂存或提交。本批针对 ae3ff087 加既有未提交代码；不是正式环境交付。此前 account-environment-upgrade-20261004.md 的“未修改研究 UI”只描述账号首批，不适用于本批。

## 产品行为与实际变化

ABC 全部保留：A 拆解单作品、B 持续研究账号、C 自由主题。目标是让创作者和运营看懂别人怎样组织内容，找到可用角度，选择借鉴部分，再形成自己的版本。

- 单作品默认显示选题切入、内容推进、具体写法与可迁移创作起点。结构和写法按结果数组呈现，取消机制数量截断；删除重复后果链与观众变化展示。主张/证明报告保留在完整研究折叠区，原文与来源按需打开。
- 账号保留内容地图、实际方法、变化与借鉴步骤；相关作品、表现比较和反例按需打开。“方法候选审批”前台文案改为选用写法，未新增 Skill 审批流程。
- 已保存结果及主题会话复用 ResearchBlocks：证明块、统计、范围与来源细节折叠，动态文字结论优先。没有改研究契约或统一成固定段数/角度数。
- 编辑器切换项目、创建并切换项目、打开成果、重新生成与页面链接离开前，可保存并继续、取消保留或明确放弃。保存错误/版本冲突时保留正文与标题，阻止后续动作。
- 刷新/关闭用浏览器原生未保存提示；历史返回用当前文档保护入口。多个编辑器离开时逐一处理，不共用正文缓存。草稿正文只在各编辑器内存中，未放入 localStorage/sessionStorage/history.state。
- 生成后可先手改再首次保存。继续复用现有 Artifact API 和版本冲突保护；首次保存原生成版本后，如已手改，再保存对应修改版本。重新生成失败保留原编辑。
- 导出始终使用已保存 Artifact 的标题与正文。有未保存修改时明确确认只导出已保存版本，当前编辑继续保留。

## 修改文件（仅本批增量）

| 文件 | 变化 |
| --- | --- |
| apps/web/components/research/work-decision-view.tsx | 创作导向结果、动态写法、折叠证明，删除重复展示 |
| apps/web/components/research/work-creation-action.tsx | 保存/取消保护、首次保存前手改、导出确认、项目请求隔离 |
| apps/web/components/research/account-v2-panel.tsx | 创作步骤与折叠详情、初始化可交互保护 |
| apps/web/components/research/work-research-controls.tsx | 初始化可交互保护 |
| apps/web/components/research/research-blocks.tsx | 已保存结果/主题的按需分析详情 |
| apps/web/components/research/research.css | 原生编辑保护对话框及生成后正文输入样式 |
| apps/web/tests/research-abc-flow.test.ts | 新增 ABC 真实服务链路与安全 runtime 测试 |
| apps/web/tests/research-account-fixture.ts | 从既有账号测试提取明确 fixture；不是新业务服务 |
| apps/web/tests/research-creation-browser.test.ts | 从 ABC 提交起点执行受控浏览器链路与草稿/导出验收 |
| scripts/local-web.mjs | 明确列入本轮可运行的隔离研究测试名单 |
| 本记录 | 研究批交付说明，未改旧账号报告 |

没有新增业务 Service、Model、Schema 或 migration。AGENTS/PRODUCT/ARCHITECTURE/LEGACY 未修改；共享业务服务沿用此前实现。

## 当前验证

- 隔离模块回归：7 文件 / 27 项通过。research-abc-flow 3、work-research-service 6、research-session 7、account-v2-service 2、artifacts 3、research-api 4、research-sharing 2。
- 浏览器：1 文件 / 2 项通过，实际覆盖 C 输入提交与重复点击、A 单作品提交、B 账号综合提交、结果页面、创作引用、真实保存 API、刷新后重新打开。
- 浏览器额外核对：打开成果/重新生成/链接离开时取消不丢正文；刷新取消；保存冲突保留；切项目取消与保存后继续；历史返回取消；首次保存前手改保留；导出文件 UTF-8 内容逐字等于已保存标题与正文，未保存修改不进入文件；陈旧版本拒绝与跨空间修改拒绝。
- ABC 服务测试通过真实 runProjectAssistant 的研究上下文读取与引用来源，再写版本化 Artifact 并重新读取。A/B/C 重复提交、B 失败后重试、空正文拒绝；相关会话/作品回归另覆盖失败、权限与历史结果保留。
- Web typecheck、上述改动 TS/TSX 定向 ESLint 通过。Node local-profile 防误连 5 项通过。没有执行全仓 build、全仓 E2E 或正式 V3 验收。

可复跑：

```text
node scripts/local-web.mjs review check
node scripts/local-web.mjs review test research-abc-flow work-research-service research-session account-v2-service artifacts research-api research-sharing
node scripts/local-web.mjs review test research-creation-browser
node --test scripts/local-profile.test.mjs
```

## 验证真实性与环境边界

所有写入测试只运行于 LOCAL_REVIEW / 55436 / content_center_upgrade_review；网页 localhost:3020。Worker 关闭、付费模型/平台采集/ASR 外调保护保留。本批未连接或迁移 55432 原库，未更改原卷、账号权限或真实凭据，未读密码恢复终端。

服务测试注入 MockLLMProvider，浏览器对研究提交使用明确安全测试适配：调用真实研究服务预留/执行，模型为 fixture；创作流式端点在浏览器拦截，真实 Artifact API 不拦截（冲突个案除外）。C 创建会话为实际 HTTP。它们证明产品链路和权限/持久化行为，不证明真实模型生成质量或实际采集能力，也没有声称读取视频画面。使用临时 fixture 用户及临时密码，未使用本人密码。测试清理验证 workspace/user 无残留。

本机私有证据（不上传）：
- output/account-upgrade-private/research-browser-evidence.json：ABC 完成标记、提交/生成拦截数与身份清理。
- research-work-creation-view.png、research-account-creation-view.png、research-creation-reopened.png：仅 fixture 页面。
- research-20261004-baseline：修改前源码快照，不含 env/密码；回退须逐文件/逐 hunk 核对，不整树覆盖。

## 剩余与已知限制

- 真实 AI/视频/平台质量、本人真实登录、正式库切换仍未验收；不在本轮授权范围。
- 浏览器的历史保护入口可能使已保存后的 Back 先停留同页一步；每个编辑器实例复用入口，避免每次键入增加历史。没有后台自动长期保存敏感草稿。
- 浏览器强制结束进程不能保证未保存内存恢复；正常刷新/离开提供提示，明确保存的成果可重开。
- CURRENT IMPLEMENTATION GAP：本批没有完成通用 Research Runtime 或所有旧产品中心的治理迁移，保留既有兼容服务与历史数据。

GIT：READY_TO_STAGE；未 git add / commit / push / pull / merge / reset / stash，未部署。已有本地修改保持原状。


## 有界体验修复与只读复核收口

STATUS：本轮代码与相关验证完成，仍未暂存/提交。本节对应导航修复及其后的三项展示复核，不将上一批验证当作本轮结果。

CHANGED：
- work-creation-action.tsx：移除草稿 guard 的 pushState 插入。现有历史条目只增加数字位置标记，草稿不进入 history.state；取消通过 history.go 恢复原位置，保存/放弃沿原目标遍历一次，保留 Forward。同步请求锁与待确认动作锁保护保存、生成、打开成果及连续确认；保存失败保留当前内容和动作。原生 input 捕获仅在当前编辑器内存记录正在编辑的字段，避免路由恢复过渡时 React 尚未提交输入而漏过离开保护。显式保存/加载/切换项目清理这份临时输入；没有浏览器长期草稿存储。
- server/research/work-research-run.ts：新保存的正文保留理解、动态结构、写法与迁移建议，原文引用留在来源；作品主张/证明另存细节块，默认折叠，创作引用仍能读取。没有更改 schema、模型输出合同或覆盖历史版本。
- server/research/account-v2-run.ts：新保存结果按已有内容输出可选写法维度，动态方法/变化/借鉴项保留；不再把方法候选审批作为创作前台流程。缺失维度不补齐。
- research-blocks.tsx：旧结果中的原句、主张、证明按行折叠；旧综合分析、历史报告、变化和补充写法按需查看。只转换展示，不覆盖旧数据。借鉴建议与写法正文可见。
- benchmark-dossier.tsx：旧统计、旧研究判断、样本比较、规律和模板收进“账号观察与历史研究”；移除重复的旧研究启动控件。账号观察、原文、历史研究、作品池、导出和资料更新继续可用。
- work-decision.css / research.css：将已有创作表单样式移到研究公共样式，修复成果页重开后输入挤在一行；复用研究按钮，手机宽度单列。
- tests/research-creation-browser.test.ts、research-abc-flow.test.ts、work-research-service.test.ts：补充最终行为验证；服务测试从旧标题断言改为核对实际迁移内容。

VERIFICATION：
- 最终业务代码：8 个模块/服务/API 文件合计 29 项通过（research-creation 2、research-abc-flow 3、work-research-service 6、research-session 7、account-v2-service 2、artifacts 3、research-api 4、research-sharing 2）。这些结果来自本轮运行与受影响测试修正后的定向重跑。
- 最终 UI/样式代码：research-creation-browser 最新一次 2 项通过。覆盖 ABC 输入与安全 fixture 执行、研究保存页重开、创作引用与成果保存重开；导航取消原位置和正文不丢、保存确认重复点击只 PUT 一次、放弃不写库、历史长度不增加、前进/后退和保存后真实页面返回；生成/首次保存/打开成果同步连续点击；版本冲突保留编辑；导出字节等于明确保存版本。旧历史 fixture 展示前后 blocks 完全相等，默认折叠且展开后可读。
- Web typecheck、上述相关 TS/TSX ESLint 通过。local-profile 5 项通过。未执行全仓 build、全仓 E2E 或 V3；未验证真实 AI 质量或视频画面。
- 测试过程中曾发现历史导航竞态并修复；两个新增断言曾因 fixture 文案/按钮匹配不正确失败，另一个静态 TSX 导入受当前 Vitest jsx-preserve 配置限制，已改成真实浏览器兼容验收；旧服务标题断言同步调整为实际内容核对。没有把失败运行记录为通过。

视觉验收：最新截图等待可见的实际分析与结构后生成，已人工通过图像工具读取检查。单作品与账号页均为实际 fixture 结果，保存 A/B 页表单为公共样式，390px 宽度无横向溢出。research-work-creation-view.png 现在是完整结果，取代之前骨架截图；research-account-creation-view.png 为新结论与闭合历史详情；research-saved-A/B-view.png 和 research-saved-A/B-mobile.png 为最终保存结果。源文件与图片 SHA-256 在 research-followup-manifest.json，对应本轮最终代码；仅保存在私有输出目录，未上传。

BOUNDARY：写入测试仅 LOCAL_REVIEW / 55436 / localhost:3020。外部模型/采集被 fixture 替换，paidModelCalls=0，fixtureCleanupVerified=true。没有触碰原 55432、原卷、账户权限、真实密码/恢复终端、凭证、worker 或部署。此前未提交修改继续保留，新增只读复核涉及的 4 个源文件施工前快照在 research-followup-baseline，均不含 env/秘密。

RISKS：真实用户登录/密码恢复与正式库切换仍需本人；真实 AI/平台采集/视频质量、浏览器兼容矩阵和进程被强制关闭后的未保存内存恢复尚未验收。历史数据未批量重写。GIT：READY_TO_STAGE，未 git add/commit/push。
