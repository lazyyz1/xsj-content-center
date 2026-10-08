# 2026-10-08 开发交接：当前源码与接手顺序

这是一份开发分支交接，不是已验收的产品发布。请先读根目录 PRODUCT、ARCHITECTURE、LEGACY、AGENTS；本文件不更改治理规则。

主仓：`lazyyz1/xsj-content-center`。交接分支：`codex/handoff-research-20261008`。代码基线为 `ae3ff087`；本分支整合其后研究、私人创作、账号、运行与后台任务的多轮源码改动，不是只替换几张报告页面。旧 `handoff/content-workbench-20261007` 保留，不覆盖默认分支或历史分支。

## 目前最重要的事实

- 报告入口是 `/research/results?report=<runId>`。完成但没有手动保存的作品报告也能阅读；默认按作品选择最新未归档报告。历史版本、归档与个人权限保留。
- 报告页按参考图重建为左报告列表、顶部作品与六项指标、下方结构和解释。结构与分析在各自区域滚动，助手打开时预留宽度并收起列表。
- 页面内容和功能已修改，但这套新布局仍待 1440×900、1280×800、390px 的实际视觉验收。浏览器工具拒绝读取本地页面；单元测试不能替代截图对照。参考图由产品负责人提供，未将本地附件或现场截图上传到公开仓库。
- 一份现有第 9 版报告有 11 段引用、7 项分析及 5 项核心写法，但没有新版逐段概括与主线关系字段。不要把缺失字段补成“跑题 0 秒”，也不要为了展示自动重新收费生成。
- 红狐已完成两个公开抖音账号各两页、共 4 次真实请求的小样本验收。两页本地作品集合没有重复；接口未返回费用金额。小红书验证按用户要求停止。
- 当前本机 3000 是使用原数据库/存储的开发预览，后台 worker 关闭，外部调用经用户授权恢复。旧 release 记录不能当作当前运行版本；本次 Git 交接不部署、不切换正式版本。
- 隔离快照的 Next 构建退出码为 0，但页面收集阶段出现 Windows Prisma Query Engine 定位告警。尚未完成运行打包验收，不能根据退出码直接部署；需在接手环境重新生成客户端并核对引擎与启动。

## 接手时先看这些文件

| 工作 | 页面/组件 | 服务与数据边界 |
| --- | --- | --- |
| 报告阅读 | `apps/web/app/(app)/research/results/page.tsx`、`components/research/report-desk.tsx`、`report-desk.css` | `server/research/read-model.ts`、`work-research-service.ts` |
| 动态段落与解释 | `lib/report-structure.ts` | `work-research-contract.ts`、`work-research-analysis.ts`、`work-research-run.ts` |
| 原文、视频与研究操作 | `work-research-controls.tsx`、`work-source-recovery.tsx` | `work-research-evidence.ts`、`work-research-assets.ts`、作品 source/collect/media/analysis API |
| 手动账号采集 | `benchmark-account-add.tsx`、`benchmark-workbench-actions.tsx` | `benchmark-import.ts`、`benchmark-sync.ts`、`packages/providers/src/redfox` |
| 私人选题与创作 | `/research/pool`、`/content`、`research-use-findings.tsx`、`components/content` | `server/artifacts/personal.ts`、`server/assistant/personal-content.ts`、`lib/contracts/content.ts` |
| 外调及运行隔离 | `scripts/local-profile.mjs`、`local-release-profile.mjs`、`local-web.mjs` | `packages/providers/src/review-policy.ts`、`provider-fetch.ts`、`server/runtime/readiness.ts` |

相对代码路径均位于 `apps/web`，除表中已写完整前缀的项。

## 本轮审查修正与保留边界

1. 研究操作在用户首次打开后保留挂载，关闭弹窗不会丢失已发起任务的状态跟踪；不会因此自动启动模型。
2. 历史报告的证据一致与“最新版本”区分。主动更新若复用服务端已有报告，就进入该版本。
3. 重新拆解失败时保留旧报告，并显示失败；不能因旧报告证据一致就隐藏失败。
4. 报告流程收录原件明确使用 `autoTranscribe:false`。用户到资料页主动开始转录；其他调用方行为不因此改变。
5. 仅指标观察时间更新不强制重复研究；指标变化与原文/原件变化分开判断，同一内容的本地视频仍能阅读。
6. 采用段落、入选题池始终保存选中报告版本与引用。稿件、研究聊天和项目聊天各自保存；归类不自动共享，分享必须明确选择。
7. 分页与指标不得补造：缺日期、缺指标、缺时码分别显示未知；同账号比较需满足样本量，当前比较基线与历史证据快照明确区分。

## 数据库迁移

源码与迁移一起交接，不能只复制页面：

- `20261004143000_research_fk_index_alignment`
- `20261008003000_private_artifact_conversation`
- `20261008110000_research_account_identity`

其中私人创作迁移使项目关系可空，增加 PRIVATE/WORKSPACE 范围及独立对话；身份迁移增加账号身份快照。不要修改已应用迁移。数据库、对象存储、私有聊天、备份和凭据没有随分支传输。

本次交接审查没有对原库执行迁移、reset 或 seed。同事的全新可丢弃数据库可以自行初始化；既有环境应先核对迁移与备份，部署数据库变更另外确认。

## 依赖、运行与测试

需要 Node >=24、pnpm 11.19.0，使用锁文件。安装命令会执行已有的 Prisma Client 生成脚本，不等于应用迁移。首次检出需生成 Next 路由类型，本次不提交本机生成的 `.next/dev` 引用改动。

```bash
git clone --branch codex/handoff-research-20261008 https://github.com/lazyyz1/xsj-content-center.git
cd xsj-content-center
pnpm install --frozen-lockfile
pnpm --filter @content-center/web exec next typegen
pnpm typecheck
pnpm lint
node scripts/check-client-boundaries.mjs
node --test scripts/local-profile.test.mjs scripts/release-profile.test.mjs scripts/check-client-boundaries.test.mjs
```

服务测试只使用独立 LOCAL_TEST：从 `config/environments/local-test.env.example` 创建忽略的 `.env.local-test`，配置自己的测试数据库 55433、Redis 6380、MinIO 9002、认证与加密密钥，并关闭外调/worker。不得拷贝原机私有 env。

```bash
node scripts/runtime-env.mjs LOCAL_TEST .env.local-test node node_modules/vitest/vitest.mjs run apps/web/tests/work-research-analysis.test.ts apps/web/tests/work-research-service.test.ts apps/web/tests/work-research-collect.test.ts apps/web/tests/research-collection-upgrade.test.ts apps/web/tests/personal-content.test.ts apps/web/tests/integration-external-policy.test.ts apps/web/tests/integration-redfox-purpose.test.ts apps/web/tests/release-readiness.test.ts apps/web/tests/report-structure.test.ts --no-file-parallelism
node scripts/runtime-env.mjs LOCAL_TEST .env.local-test node node_modules/vitest/vitest.mjs run --config apps/web/vitest.research-ui.config.ts --no-file-parallelism
```

研究选择/分享的 `research-creation-selection.test.ts` 当前硬性要求 LOCAL_REVIEW、55436。它不能直接放进上述 LOCAL_TEST 命令；不要为测试方便绕过目标库保护。使用自己的隔离 review 配置并关闭外调执行该文件。本机审查只在随机创建的测试 workspace 中写入并清理。

当前 daily/review 启动器仍依赖本地私有 profile 的约定路径；这也是后续可改进的可移植性问题。不要把旧私有路径当作 GitHub 上存在的文件。基础设施、用户和凭据须由接手者自行配置；`dev:up` 可能执行迁移并启动服务，不能当成无副作用的第一步。

## 本次验证记录

- 全仓 `pnpm typecheck`：8 个包通过（其中 3 个未变更包使用缓存）。
- 全仓 `pnpm lint`：8 个包通过。
- 界面测试：6 个文件，37 项通过，含报告切换、弹窗位置、任务跟踪、助手焦点、私人稿件等。
- LOCAL_TEST 定向服务/契约测试：9 个文件，75 项通过；另一个 review 专用文件因环境要求单独核验。
- 运行配置、构建外调保护与客户端边界测试：26 项通过；客户端依赖检查为 9 个入口、52 个模块、0 个服务端模块。
- 当前服务器 ready 检查通过，worker 状态为 disabled。此次验证不等于新的正式版本部署或视觉验收。

LOCAL_REVIEW 的研究选择/分享测试另有 6 项通过；临时启动的隔离 review 数据库已恢复停止。没有真实调用模型、红狐或自动充值。

暂存快照树 `d99eafbe7de18255035e26cdc2a8278741f978de` 的隔离 Next.js 16.3.4 webpack 构建完成编译、TypeScript 与 112 个静态生成任务，退出码 0、网络请求记录 0；使用已有依赖只读复用，没有使用运行凭据或访问真实数据库，没有切换版本。构建的页面收集阶段出现两次 Windows Prisma Client 引擎定位告警，路径涉及快照外的复用依赖；根因尚未完成定位。此结果只作为编译证据，不作为可部署产物或视觉验收。之后的提交仅追加本文的验证说明。

## 同事优先做什么

1. 在自己的检出环境执行安装和 Prisma Client 生成，验证 Windows Prisma 引擎打包与服务器启动；不要忽略上述构建告警。获取产品负责人提供的参考图和当前页面截图，对照报告页的比例、密度与独立滚动；确认手机触控、模态框、前后退和历史版本。
2. 在明确发起的新拆解中检查动态主线、段落概括、主线关系及对应引用；保留观察/假设/限制，不套固定钩子—背景—案例模板。
3. 收口报告页之后，再按已确认的方案处理对标页。用户此前否定的紧凑账号条布局不作为最终设计。
4. 保留待拍/已拍、剪辑交接、成片关联、发布/日历和复盘的后续规划，本交接不宣称这些已经交付；小红书继续暂停。

历史证据可看 `audit/research-report-reference-content-20261008.md`。早期 delivery 文档中的旧 release、迁移数量、截图和完成措辞只覆盖当时版本，不能替代本分支验收。
