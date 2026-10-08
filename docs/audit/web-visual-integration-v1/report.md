# AI 内容工作台 Web 视觉整合 V1 架构审计与页面映射

日期：2026-10-08，Asia/Singapore。状态：检查点 1 审计交付，尚未进入视觉开发与产品验收。

建议采用同一 Next.js 项目中的隔离视觉展示入口，从已核对的最新本地业务代码接续。新视觉原创重新设计；既有行星贴图实验不作为设计基础。待首页、Dock、侧栏和 Visual Lab 完成浏览器评审后，再逐页将已验证的视觉外壳接入现有业务。此方案不要求合并第二套数据库、重写后端或覆盖当前 3000 服务。

## 本次审计基线

| 工作区 | 分支与提交 | 当前作用与观察 |
| --- | --- | --- |
| `D:/Documents/ChatGPT/内容生产中心` | `feat/production-readiness-v1b` / `883dd84c` | 旧开发工作区，41 个页面文件、151 个 API 文件；有 187 项 Git 状态记录。不能作为最新整合前端的唯一依据。 |
| `D:/Documents/ChatGPT/内容生产中心-integration` | `feat/web-integration-release` / `ae3ff087` | 本轮主要源码基线；75 个页面文件、65 个独立普通路由、200 个 API 文件。170 项 tracked 修改、290 项 untracked 状态记录，共 460 项。 |
| `E:/codex1/2026-10-08/https-www-douyin-com-video-7638373803566861619/work/xsj-cosmos-integration` | `codex/cosmos-workbench-ui-20261008` / `ae3ff087` | 另一工作区的视觉候选；76 个页面文件、66 个独立普通路由、200 个 API 文件。只读核对，未修改。 |
| `D:/Documents/ChatGPT/内容生产中心-visual-audit-20261008` | `codex/web-visual-audit-v1-20261008` / `ae3ff087` | 本轮新建的独立审计文档工作树。未复制整合工作区 WIP，不能把它当已包含最新业务源码的施工快照。 |

以上数量以 `inventory.json` 的采集时点为准。75 个页面文件包含 9 个设置拦截页与 1 个并行插槽兜底，因此不能直接宣称有 75 个独立 URL。API 文件存在只证明源码入口存在，不表示每项功能已经真实验收。

本机端口 3000 的 Next.js 进程启动路径指向整合工作区。浏览器已实际打开 `/dashboard`、`/research`、`/content`，并看到当前创作输入、研究日报、私人稿件列表。源码指纹与运行产物身份仍分开记录：本轮没有对正在运行的构建产物做逐文件一致性证明。

## GitHub 与本地的关系

远程仓库为 [xsj-content-center](https://github.com/lazyyz1/xsj-content-center)。本次通过 GitHub CLI 读取当前分支信息，没有执行 fetch、pull、merge、push 或远端写入。

| 远端分支 | 当前读取的提交 | 判断 |
| --- | --- | --- |
| 默认 `audit/pre-launch-snapshot-20260903` | `3c147c9b` | 9 月 3 日审计快照；直接打开默认仓库页会看到旧版本。 |
| `codex/web-experience-candidate` | `ae3ff087` | 与整合工作区已提交 HEAD 相同，但不包含其全部未提交改动。 |
| `codex/web-experience-stable` | `101da458` | 历史体验版本，不能代替当前本地功能。 |
| `feat/production-readiness-v1b` | `4116748f` | 与本地同名分支 HEAD `883dd84c` 不同；同名不等于同步。 |
| `handoff/content-workbench-20261007` | `3386c55e` | 较新的远端交接分支，本轮进一步与它比较本地源码。 |

对整合工作区白名单源码目录逐文件比较：818 个同内容文件、41 个本地独有文件、75 个内容不同文件、3 个远端独有文件。比较允许 CRLF/LF 差异，原始 SHA256 另外保存。完整清单见 [本地与 GitHub 差异](local-github-diff.md)。这不是全仓同步结论；env、附件、数据库、构建产物和依赖缓存不属于比较范围。

后续跟进以整合工作区的实际源码为主，每批任务记录工作区、分支、HEAD、未提交状态及源码 manifest。不能只按一个 Git 提交号重建当前业务；也不能用旧 GitHub 默认分支覆盖本地新文件。进入代码阶段前，将所选完整源码及必要未跟踪文件复制到独立施工快照并校验 manifest，凭据与运行数据另行保持隔离。

## 页面与新旧映射

完整三个本地工作区的页面清单见 [routes.md](routes.md)，整合 API 清单见 [apis.md](apis.md)。下表是产品映射，不是已完成的重定向或新路由。

| 新界面 | 当前实际入口 | 保留能力与拟接入方式 |
| --- | --- | --- |
| 沉浸首页 | `/dashboard`；根 `/` 有入口路由 | 保留 `WorkbenchStart`、`HomeComposer` 的创建项目、资料、Skill、模型选择与请求幂等逻辑。替换视觉容器，保留真实失败及草稿恢复。 |
| 项目 AI 创作 | `/dashboard?project=:id`，含 `node`、`start`、`skill` 参数；`/projects/:id`、`/projects/:id/studio` 为兼容重定向 | 复用 `StudioShell`、工作区数据加载、对话、稿件分支、Artifact、版本、资料与高级 Canvas。已有深链和启动行为不得丢失。 |
| 私人 AI 创作 | `/content/:id` | 复用 `PersonalContentEditor` 与 `/api/artifacts/*`。保留独立私人 thread、编辑与显式应用建议、版本与草稿；不强迫先建项目。 |
| 内容资产库 | `/content` 私人稿件；`/projects` 项目库；项目内 Artifact 与旧稿件分支 | 以现有不同权限的数据源组织网格/列表，不将所有人私稿聚合成公共团队资产。关联 IP、待拍/已拍状态先显示明确缺口或演示。 |
| 研究日报 | `/research` | 保留 `ResearchNews` 的来源、日期、阅读、收藏、筛选与缓存状态。该来源目前仍有指定身份权限，不因重做页面而放开。 |
| 对标与作品 | `/research/benchmarks`、`/:id`、`/:id/works/:workId`、`/:id/analysis`、`/research/works` | 保留对象解析、作品读取、采集状态、单条研究、来源与证据。采集可产生外调/费用；审计不触发。 |
| 单条与专项研究 | `/research/new`、`/research/session/:id`、`/research/focus`、`/research/focus/:runId` | 保留私人研究会话、运行、超时/失败、结果、对象助手及显式采用。 |
| 趋势与选题 | `/research/trends`、`/:stableKey`、`/research/pool` | 保留已有趋势和选题池。不能凭按钮存在宣称所有外部数据已验证。 |
| 研究来源与结论 | `/research/sources`、`/:id`、`/research/results`、`/:kind/:id` | 保留来源库、结果、版本、分享 scope、选中发现与采用流程；不自动拷贝私人备注或发送 AI。 |
| 旧研究兼容 | `/discovery` 及 benchmarks、trends、ideas、recommendations 深链 | 兼容入口保留；根据实际页面重定向和调用关系适配，不在视觉阶段删除底层 Discovery 服务。 |
| 资料与知识 | `/library`、`/library/:id` | 保留上传、原始预览、转写、正文、处理状态、专注阅读和资料管理。资料详情的单屏内部滚动约束继续有效。 |
| Skill | `/library/methods`、`/:id`；`/projects/methods` 兼容 | 保留可选/多个/跳过 Skill、导入、版本和状态；不恢复通用创作必选 Default Method 的旧语义。 |
| 发布管理 | `/calendar`、`/calendar/tasks/:id` | 保留已审核内容快照、排期、发布包、人工真实发布确认。已有平台审核 `/projects/:id/review/:platform` 继续可达。 |
| 数据复盘 | 当前没有完整表现数据复盘入口 | 旧 `ReviewRecord` 与平台审核不等于 MetricSnapshot/表现复盘。隔离演示先表现交互；业务写入后续明确任务接入。 |
| 老板驾驶舱 | 当前没有完整经营驾驶舱；`/admin/usage` 为系统用量，`server/dashboard.ts` 为局部计数 | 演示入口独立；真实模式展示已验证口径、权限及未接入状态，不能把平台用量冒充内容经营数据。 |
| 账号与管理 | `/settings/*`、`/admin/*`、`/platform/accounts`、`/platform/spaces`、登录/恢复/邀请/验证、体验入口 | 全部保留。设置还有 `@settings/(.)settings/*` 拦截弹窗与独立页面双入口，不能只保留其中一种。 |

五项 Dock 的业务导航建议：Home→现有首页；Research→现有研究；Create→按当前项目/私人稿件上下文进入对应创作，空上下文进入开始工作；Content→保留私人稿件/项目成果分区的内容库；Review→明确标识的复盘演示或未接入视图。老板入口位于顶部，不占第六个 Dock 项。

## 当前功能与 API 完成度

完成度分为“源码已有接线”“本轮浏览器已读取”“本轮局部检查通过”“仍待真实验收”，不使用未经证实的百分比。

| 模块 | 本地现有代码与 API | 本轮核验及缺口 |
| --- | --- | --- |
| 登录、Workspace、权限 | better-auth；`access.ts`、`api-access.ts`、`workspace-context.ts`；auth/admin/workspaces API | 最新整合逻辑选择有效会话的 workspace，已不同于旧目录的最早成员选择。匿名项目/稿件/管理员 API 均返回 401。未重新执行跨工作区、跨用户完整用例。 |
| 首页与项目组织 | `app-shell.tsx`、`sidebar-foundation.tsx`、`sidebar-state.ts`；`/api/sidebar`、folders/projects/preferences/opened、`/api/projects` | 浏览器首页可读；已有悬停/固定/触屏状态机、文件夹、最近/置顶和创建。首页首次默认收起与工作页首次展开仍需扩展偏好语义；不能直接替换状态机。 |
| 项目对话与编辑 | `StudioShell`、`ProjectAssistantPanel`、`MotherContentEditor`、`ArtifactWindow`、共享 Artifact Editor；assistant、drafts、artifacts API | 源码接线完整，局部客户端边界检查覆盖相应入口。已有保存失败、版本与切稿保护；双栏可调、全局导航离开保护仍需逐项实测。 |
| 私人稿件与建议 | `components/content`、`server/artifacts/personal.ts` 与 personal-api；`/api/artifacts`、draft/context/versions/assistant/suggestions/apply/classification | 浏览器 `/content` 实际读到当前账号私稿。源码创建私人 Artifact、独立 thread，并按 workspace/user 校验。尚未重跑实际写入、建议、并发与外调测试。 |
| 研究 | `server/research`、news、对象/作品/单条服务；research sessions/runs/results/benchmarks/focus/news/preferences API | 日报页面实际读取成功；源码有独立研究与显式采用。源站、模型、采集、转录、费用与授权各有验证边界，不把历史成功数算成本轮结果。 |
| 资料与 Skill | source-items/ingest-jobs/transcript/transcribe/understanding/knowledge；methods/import API | 保留现有处理与版本能力；本轮未上传、转录、调用 Provider 或重新验证全部资料格式。 |
| 发布与审核 | publish-tasks/package/schedule/published/failed/cancel；platform-variants/review API | 具备人工确认的发布管理基础，不等于自动发布、表现快照或完整经营闭环。 |
| 视觉系统 | 正式整合源码没有 Three/R3F/GSAP 依赖 | 新视觉尚未开发；Visual Lab、预设保存/恢复/导入导出、正式高级视觉权限、固定五项 Dock 均待做。 |
| IP、表现复盘与经营看板 | CreatorProfile、对标账号、局部计数与 ReviewRecord 等基础 | 没有查到完整 CreatorAccount/PublishedWork/MetricSnapshot 模型闭环。不能把产品登录账号当创作者平台身份，不能从局部数据伪造经营指标。 |

## 复用与重新设计

| 能力 | 决策 | 原因与实施边界 |
| --- | --- | --- |
| `AppShell` 与 `SidebarFoundation` | 复用交互与数据契约，重新设计视觉 | 保留 cookie、菜单/搜索/弹窗锁、键盘和触屏处理，以及现有项目列表数据。 |
| `WorkbenchStart` 与 `HomeComposer` | 复用业务逻辑，重做首页呈现 | 保留资料、Skill、模型、创建、幂等请求与本地草稿，不让视觉层重新实现业务提交。 |
| `StudioShell`、项目/私人编辑器与共享 Artifact Editor | 按任务适配布局，复用保存/版本与权限 | 不能把视觉演示编辑器换入真实业务而丢掉失败、冲突、未保存保护。 |
| 研究各页面与 `ResearchShell` | 逐页外壳适配 | 已有日报、对象、作品、结果等布局与状态；避免新 Shell 与研究内部导航、滚动、助手重叠。 |
| 资料 `SourceWorkspace`、Canvas、Skill Picker、全局搜索、设置窗口 | 保留行为与可达性 | 既有单屏契约、缩放/媒体、导入、上下文和弹窗焦点应回归检查。 |
| `packages/ui` 的 Button/Card/Badge/PageHeader | 保留通用行为，评估 token 与局部样式 | 不新增第二套组件库，不一次性覆盖所有全局样式。 |
| 3D 场景、Dock、Visual Lab 与视觉预设 | 原创新实现或扩展可验证的底层能力 | 不以现有视觉实验为设计基础；新系统应有独立数据模式及权限契约。 |

已有候选 `components/cosmos` 仅是审计证据：它引入 Three/R3F/Drei，有暂停、后台降帧、减少动态与错误兜底处理；但主星球使用纹理和 `meshStandardMaterial`，粗糙度 0.95、金属度 0，尚未实现锁定的烟熏光学玻璃。其导航为项目/资料/研究/Skill/成果，与用户指定五项 Dock 不一致；参数多为临时 state，未发现完整视觉预设存储与导入导出。该候选不算验收通过，也不直接修改其生成设计。

## 依赖评估与建议结构

主要本地依赖：Next 16.3.4、React 19.2.8、TypeScript 6.0.3、Tailwind 4.3.3、lucide-react 1.38.0、@xyflow/react 12.11.6、better-auth 1.7.2、zod 4.5.4。继续保留当前图标与 UI 基础，不同时引入另一个设计系统。

正式整合源码未声明 Three.js、R3F、Drei 或 GSAP。宇宙候选声明了 `three 0.180.0`、`@react-three/fiber 9.0.0`、`@react-three/drei 10.0.0` 与 `@types/three 0.180.0`，这只证明候选配置存在，不代表新视觉阶段已经完成兼容性、锁文件、包体、许可证和运行验收。下一任务先评价 Three+R3F 的必要性；按功能需要选用 Drei；普通控件优先保留 CSS/React 行为，复杂镜头确有需要时再评价 GSAP。

建议扩展现有组件目录，新增职责保持小而明确：

```text
apps/web
  app/visual-preview/page.tsx      隔离评审入口，服务端管理权限保护
  components/app-shell.tsx        现有 Shell 逐步适配
  components/sidebar-state.ts    原状态机与偏好语义扩展
  components/visual/              原创 3D、静态兜底、场景参数
  components/navigation/         五项 Dock、顶部驾驶舱入口
  components/appearance/         简易外观与高级 Visual Lab
  lib/visual-preferences/         参数验证、本地个人/公司草案预设
  lib/contracts/                 复用已有纯前端契约
  demo/visual/                   显式演示 fixtures，与真实读取分离
  server/access.ts               复用身份/管理权限，不新增身份体系
  server/artifacts / research    保留现有业务服务
```

具体文件名在开工时再次搜索等价能力。新预览入口可以利用当前服务器登录与管理权限；展示内容使用固定演示数据，并明确身份访问校验不等于演示业务数据来自真实用户。

## 主要风险与规避

| 风险 | 影响 | 规避方式 |
| --- | --- | --- |
| 本地 WIP 不在已提交 HEAD/GitHub 默认页中 | Checkout 或取旧代码会丢失新功能基础 | 完整本地源码快照与 manifest 后再施工；不 reset/stash/clean/覆盖现有工作区。 |
| 原目录、整合、候选同时存在 | 启动、依赖、截图、测试来自不同版本 | 每批报告明确路径、分支、HEAD、源码指纹、端口与运行身份；指定唯一施工工作区。 |
| 直接改全局 CSS 与根 Shell | 研究、资料单屏、编辑器、设置拦截弹窗均受影响 | 隔离入口先验证；局部 token 与样式作用域；逐页替换并回归。 |
| 首页和项目工作台共用 `/dashboard` | 会误把有 project/node 的页面变成宇宙首页 | 严格区分无项目 Home 与带 project 的业务工作区；保留所有兼容参数。 |
| 私稿与项目成果混合 | 内容可见范围扩大或私人对话泄漏 | 复用 existing personal actor/scope；团队看板不聚合私人正文；真实模式服务端检查。 |
| Dock 与抽屉触发离开 | 丢失正在编辑内容、流式结果或版本冲突 | 复用保存 drain/flush、未保存对话框与导航保护；失败则取消离开，不先显示成功。 |
| 高级视觉只靠隐藏按钮 | URL/本地参数绕过访问控制 | 服务端 `requireSystemAdmin` 或后续明确 capability；公司发布服务端另行实现。 |
| 演示失败自动切假数据 | 虚假保存、指标和 AI 成功 | 显式 demo/real 数据源；真实错误保持失败，fixtures 不进入真实服务兜底。 |
| 行星贴图替代玻璃材质 | 目标视觉被降级，无法评审产品方向 | 新设计从原创光学材质、层次、星轨与镜头反馈开始，视觉实测单独通过。 |
| 3D 每帧驱动业务 React 树或遮挡控件 | 编辑卡顿、CPU/GPU 负担、不可访问 | 场景为独立客户端叶子；限制分辨率/粒子，暂停与降质，静态原创替代，键盘/减少动态。 |
| 复盘与驾驶舱指标尚无正式口径 | 越权或将局部计数冒充经营数据 | 演示明确标识；真实模式只显示已验证口径，未接入项明确为空缺，后端任务分开。 |
| 日报当前受指定身份限制 | 用统一导航误判为全团队可用 | 读取现有服务权限状态，403 显示无访问权限；视觉任务不放宽权限。 |
| `pnpm dev:up` 会部署迁移并启动服务 | 仅视觉工作却改数据库或重启业务 | 使用独立只启动 Web 的评审入口；不运行 dev:up、migration deploy 或 reset。 |

此轮没有修改生产源码，因而没有新增业务行为风险；这不等于对未来 Shell 改造作出“必然无回归”的保证。

## 当次验证与浏览器记录

| 验证 | 当次结果 | 实际覆盖范围 |
| --- | --- | --- |
| 整合工作区 TypeScript | `pnpm exec tsc -p tsconfig.json --noEmit --incremental false`，退出码 0 | 当前本地 Web 类型检查；不证明外部 Provider、所有权限或视觉效果。 |
| 客户端服务端边界 | `node --test scripts/check-client-boundaries.test.mjs`，3/3 通过 | 纯契约与脚本指定业务客户端打包输入，无服务端敏感输入；不是全站逐组件安全审计。 |
| 匿名 HTTP 读取 | `/api/projects`、`/api/artifacts`、`/api/admin/users` 均 401，3/3 符合预期 | 当前运行服务的未登录读取边界；不覆盖已登录角色、跨用户或跨 workspace。 |
| 真实浏览器首页 | 1920×1080、1440×900 实际打开，截图已保存 | 当前旧视觉/业务基线，可达与布局观察；不代表原创玻璃首页完成。 |
| 真实浏览器研究日报 | 1440×900，实际导航并读到内容与来源/日期/状态 | 读取基线；未点击同步、收藏、暂停或启动外部采集。 |
| 真实浏览器我的稿件 | 1440×900，实际读到列表与分类筛选 | 读取基线；未创建、修改、保存或删除真实内容。 |

本轮没有运行数据库测试、全仓 E2E、重新构建/切换运行版本、AI 外调、采集或转录；现有历史交付中的通过数量没有列作本轮结果。

证据：[类型检查记录](evidence/typecheck.txt)、[边界测试输出](evidence/client-boundaries.txt)、[匿名 API 检查](evidence/anonymous-api.json)。页面截图：[首页 1920](evidence/current-home-1920.jpg)、[首页 1440](evidence/current-home-1440.jpg)、[研究 1440](evidence/current-research-1440.jpg)、[我的稿件 1440](evidence/current-content-1440.jpg)。

## 分阶段实施顺序与未完成项

1. **本轮检查点 1**：交付产品基线、完整路由/API 清单、新旧映射、依赖与组件审计、风险、实际局部检查、浏览器现状及本地/GitHub 差异。
2. **检查点 2**：按 [第一开发阶段任务单](../../product/web-visual-phase-one-task.md) 原创重做隔离首页、导航、侧栏和 Visual Lab；只用明确演示数据，保护现有服务；浏览器动态操作达到材质与空间目标。
3. **检查点 3**：将可验证外壳接入项目与私人创作双栏/专注模式，制作驾驶舱演示与真实未接入模式，保留原保存和权限逻辑。
4. **第三、第四开发阶段与检查点 4**：逐个统一研究、内容、复盘并接已验证接口，完成连续演示、跨角色与未保存回归，产品负责人分别验收。

未完成：原创玻璃星球、固定五项 Dock、统一 Shell、新 Visual Lab 与预设、正式高级视觉 capability、创作新双栏/专注交互、双模式驾驶舱、完整内容经营/表现数据复盘、联合演示、正式运行/发布地址。当前 `http://localhost:3000` 是既有业务基线，不是本轮新视觉交付。

## Git 与交接

本轮只新增审计/需求/任务单及证据。创建独立审计分支，不切换原工作区、不提交、不暂存、不推送。负责人查看报告后，可明确下发第一开发阶段任务，无需继续细碎风格选择。

后续以本轮本地 inventory 为核对入口；代码发生变化则重采集差异，不能复用旧计数或测试。当前已生成源码指纹清单，而非包含全部私有数据的完整恢复备份。
