# 素材智能整理

## 目的

素材智能整理位于语音转写与内容项目之间。它把来源平台元数据和 Transcript 整理为一份可阅读、可编辑、可版本追踪的素材理解结果，不生成 Hook、内容结构、平台稿或母稿。

## 输入

- `SourceItem` 及标准化 RedFox metadata：原始标题、描述、平台、作者、发布时间、原始 topics 和互动指标。
- 当前 `Transcript.fullText`。

互动指标只作为市场表现信号；Transcript 中的陈述只代表来源内容，不能自动视为已验证事实。CreatorProfile 不参与本阶段分析。

## 输出

统一由 `MaterialAnalysisDTO` 暴露：

- `suggestedTitle`
- `summary`
- `topic`
- `tags`
- `keywords`
- `contentType`
- `targetAudience`
- `coreViewpoint`
- `keyPoints`
- `coreQuestion`

服务端使用严格 schema 校验字段、长度、数组数量和未知字段。原始 AI JSON 不作为后续业务接口。

## 原始数据与 AI 结果

`MaterialAnalysis` 是独立业务对象。生成、编辑或重新整理都不会覆盖 SourceItem 的原始标题、描述、metadata 或 Transcript。重新整理创建新的 version，历史结果保留；人工保存把当前版本标记为 `HUMAN` 来源。

## Transcript stale

每个版本记录 `transcriptUpdatedAtAtAnalysis`。当前 Transcript 的 `updatedAt` 更新后，DTO 返回 `stale: true`，页面提示转写已更新，但不会自动调用 Kimi。RedFox 互动指标刷新不会触发 stale。

## 标签行为

AI tags 首先只保存在 `MaterialAnalysis`。用户明确保存编辑结果时，标签经过 NFKC、trim、大小写与分隔符归一化、去重并限制最多 8 个，然后只追加到 `ContentTag` / `SourceItemTag`；已有人工标签不会删除。

## RBAC

- VIEWER：只能读取已保存结果。
- EDITOR / ADMIN / OWNER：可以发起整理、重新整理、编辑、保存，并基于素材创建内容项目。

全部读写按 Workspace 和 SourceItem 双重约束。相同 SourceItem 存在 `PROCESSING` 版本时拒绝重复调用。

## Kimi 2.6

运行时统一经过 Workspace LLM Adapter、`AIRun` 和 `ApiUsage`，并保持 `KIMI_2_6_ONLY`。前端不能传模型。未配置时页面明确显示未配置状态；产品环境不会用 fixture 或 deterministic 文本冒充 AI 结果。

## 后续 Structure Analysis

未来结构分析只能读取已校验的 `MaterialAnalysisDTO` 和明确的来源数据，使用新的业务对象与 PromptType；不得把 Hook、结构、CTA 或二创方案回填进本对象。
