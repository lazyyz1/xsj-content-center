# Project Agent 前端精修交接

STATUS: PROJECT_AGENT_UI_POLISH_READY_FOR_REVIEW

本轮参考用户提供图片的居中对话、紧凑用户气泡和底部输入区，保留已有项目导航、品牌、画布入口及 Agent 功能。未照搬参考图中的积分卡片、升级入口或其他产品功能。

## 视觉与交互

| 部位 | 本轮调整 |
| --- | --- |
| 顶部 | 项目名 + 右侧原有布局入口；去掉重复品牌、在线状态、当前焦点及零引用计数；分屏时仍可收起对话 |
| 用户消息 | 靠右、自适应宽度，桌面最大 72%、手机最大 85%；浅灰背景，无蓝框；隐藏重复身份和时间行 |
| AI 回答 | 保留 Markdown；正文 15px、1.85 行高，清晰标题/列表/表格/引用；品牌名隐藏，时间仅 hover/focus 弱化显示，停止/失败状态仍可见 |
| 来源 | 默认折叠；展开使用轻量标题、类型、单行摘要/定位；原有正文编号及来源链接逻辑不变 |
| 操作 | 复制、保存成果、重新生成保持原有动作；统一小图标、中文 title 和 aria-label |
| Composer | 默认两行，52px 文本区，自动增高至 180px；轻边框、克制 focus，圆形发送/停止按钮；保留 +、@、Skill、模型和禁用语音 |
| 模型名 | 只读接口增加 defaultModelLabel，从现有公开配置 modelId/model 匹配真实名称；无可读配置则显示“默认模型”，不虚构名称 |
| 空状态 | 一句“今天想先做什么？”和轻量说明，移除推荐按钮组 |
| 宽度 | 阅读容器最大 960px，正文和 Composer 对齐；根据视口扣除顶部空间，避免整个输入框落到屏幕下方 |
| 滚动 | 载入/发送时跟随底部；主动上翻后不强制跟随；提供轻量回到最新消息入口 |

实现位于 `studio-default-method.tsx`、`project-agent.css`、`content-canvas.tsx` 的聊天标题，以及 `assistant/models/route.ts` 的公开模型名称读取。未重做 Canvas。

## 验证

- Agent 最小 Playwright E2E：1 项通过。包括空状态、输入区自动增高、引用搜索与选择、来源默认折叠、连续发送、保存 Artifact、刷新恢复、回到底部。
- 1680 / 1366 / 390：断言无整页横向溢出、短气泡不撑满行、Composer 整体在视口内；截图人工检查完成。
- 相关 Project Assistant 回归：6 项通过。
- Web typecheck、定向 ESLint、git diff --check：通过。
- + 上传、Skill、模型选择仍沿用上一轮调用与请求结构；本轮未额外进行实际文件上传或真实付费模型联调。没有将测试配置伪装成真实模型名称。
- 截图长回答通过独立测试库写入排版样例，目的是验证 Markdown 呈现，不代表真实模型生成质量。

截图位于 `output/playwright/agent-ui-1680.png`、`agent-ui-1366.png`、`agent-ui-390.png`、`agent-ui-empty.png`。

## 后端边界

以本轮开始时文件哈希为基准，`server/assistant`、`server/ai/control`、`server/artifacts` 全部零变化。没有修改 ContextBuilderV2、ModelRouter、Provider、权限、预算、摘要、retry/cancel、并发锁、Source Reference、Skill Resolver、Artifact/Draft 数据模型、Schema 或 Migration。未修改 Material、Research、账号/API 配置模块和其他开发工位。

## Git

- 目录：`D:\Documents\ChatGPT\内容生产中心-agent`
- 分支：`feat/project-agent-core-v1`
- HEAD：`883dd84cd66e4a579b5126b5e317f9c854dd94e5`
- staged：0；modified / untracked 包含上一轮 Core V1 成果和本轮精修，均保留未暂存。
- 本轮源码：3 个前端文件、1 个只读 API 返回字段适配；更新 1 个既有最小 E2E，新增本报告与验收截图。
- commit = NO；push = NO；merge = NO。

PROJECT_AGENT_UI_POLISH_READY_FOR_REVIEW

## 最终收尾与冻结（2026-09-28）

状态：PROJECT_AGENT_UI_FROZEN_WAITING_MODEL_INTEGRATION。

仅完成三处收尾：

1. 顶部半行：实际原因是滚动区自动定位后上边缘落在正文行内，并非标题栏脱离文档流覆盖正文。标题栏继续独立占位，滚动区增加 8px 安全间隔；自动定位、尺寸变化和手动滚动停止后，最多按一行范围微调阅读边缘。主动翻历史不会因此回到底部。
2. 未开放语音：移除 Composer 的禁用麦克风入口。Voice 真正接通前不显示。
3. 间距：消息组间距 28px → 22px；组内 gap 8px → 6px；来源上间距 8px → 4px；操作上间距 4px → 2px；滚动区底部内边距 24px → 12px。

“默认模型”及真实名称回退逻辑没有改动。其余视觉冻结。

最终验证：扩展后的最小 E2E 通过，覆盖首次进入、刷新、其他页面返回、故意滚到正文半行位置后停稳、三种视口的标题栏/滚动区无重叠及无半行截断，同时继续覆盖引用、多轮发送、来源、保存成果和刷新恢复。Web typecheck、定向 ESLint、git diff --check 通过。核心后端目录哈希再次确认零变化。

本次验收使用 3016（3015 被账号工位占用，未停止该服务），独立测试数据库保持 55435。测试配置仅增加 AGENT_TEST_PORT 可选覆盖。最终截图仍为 agent-ui-1680.png / agent-ui-1366.png / agent-ui-390.png，另有 agent-ui-history-edge.png。

未暂存、提交、推送或合并。模块停止视觉迭代，等待用户 API 配置 → 测试连接 → Agent 真模型联调。
