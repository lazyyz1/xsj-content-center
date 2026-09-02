# Studio 产品收敛

## 四个核心概念

Studio 阶段一只向普通创作者长期展示四个产品概念：

1. **参考素材**：本次创作参考的本地素材，以及转录和智能整理状态。
2. **创作方案**：用户确认的主题、受众、核心问题、素材核心观点、切入角度、结构、表达方向和风险边界。
3. **核心母稿**：方案确认后出现的正式写作区域。
4. **AI 创作助手**：只说明当前做到哪一步、建议下一步，以及是否需要运行或更新一次统一分析。

桌面端由“内容主区 + AI 助手区”组成；窄屏按单列顺序展示，不强行维持三栏后台布局。阶段二 Deep Content Package 和阶段三平台内容、审核流程不在本轮重做范围内。

## 连续创作路径

```text
参考素材
→ 创作方案
→ 确认并开始创作
→ 核心母稿
```

准备阶段不渲染大面积空白母稿编辑器。已有母稿或项目已进入 `WRITING`、`IN_REVIEW`、`APPROVED` 时，Studio 直接进入母稿阶段，并通过“查看创作方案”回看 Brief。

## 确定性预填与不覆盖

`CreativeBriefPrefillService` 集中组合已保存的 `MaterialAnalysis`、`UnifiedCreativeAnalysis` 和现有 `CreativeBrief`：

- 已有 Brief 的非空字段始终优先。
- MaterialAnalysis 提供主题、受众、核心问题、参考摘要、素材核心观点和关键要点。
- UnifiedCreativeAnalysis 提供建议切入角度、建议结构、表达方向、风险提醒和标题参考。
- 预填只形成页面上的待确认创作方案，不在页面加载时写数据库。
- 只有用户保存或点击“确认并开始创作”时才写入 CreativeBrief。

因此打开 Studio、读取已有分析和预填方案均不会调用 Kimi 或 RedFox，也不会静默覆盖用户已有 Brief。

## 为什么内部对象不长期占主界面

Evidence、AI Run、Prompt、素材分析步骤和技术状态是可靠运行所需的后台对象，但不是创作者的主要任务。它们仍完整保留：

- 素材原文、Transcript、MaterialAnalysis 和相关统一分析依据进入素材详情 Drawer。
- Evidence 进入“查看素材依据” Drawer，人工仍可确认、编辑、新增和删除。
- UnifiedCreativeAnalysis 完整结构进入“查看完整分析” Drawer，分类显示为“来源依据 / AI 理解 / AI 建议 / 我的输入”。
- 项目状态和管理动作进入折叠的高级区域。

主界面只保留内容本身与下一步，避免要求用户先理解内部 Pipeline。

## 单一 AI 分析入口

普通用户只有一个分析动作：无结果时为“开始 AI 分析”，输入变化后为“更新分析”。页面加载、刷新、展示已有结果和创作方案预填都不会自动运行分析。相同 Input Fingerprint 继续复用已有成功结果，不新增 AIRun 或 ApiUsage。

AI 分析只给建议，不等同于 CreativeBrief，也不会确认方案或生成核心母稿。VIEWER 可查看素材、方案、母稿和完整分析，但不能运行 AI 或编辑内容。
