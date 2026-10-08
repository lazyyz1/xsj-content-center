# 架构 C1 最小技术边界执行卡 — 2026-10-05

STATUS：当前明确授权实施本卡技术边界；不是Governance Update。

精确路径（既有hunk先快照，测试失败必要补充仅相关边界测试）：
- apps/web/components/projects/artifact-window.tsx
- apps/web/components/projects/assistant-markdown.tsx
- apps/web/components/projects/assistant-result-renderer.tsx
- apps/web/components/projects/canvas-free-node.tsx
- apps/web/components/projects/content-canvas.tsx
- apps/web/components/projects/studio-default-method.tsx
- apps/web/components/projects/studio-shell.tsx
- apps/web/components/research/work-creation-action.tsx
- apps/web/lib/contracts/assistant.ts
- apps/web/lib/contracts/references.ts
- apps/web/lib/contracts/artifacts.ts
- apps/web/lib/contracts/canvas.ts
- apps/web/server/assistant/service.ts
- apps/web/server/assistant/references.ts
- apps/web/server/artifacts/view-model.ts
- apps/web/server/canvas/service.ts
- apps/web/server/ai/control/contracts.ts
- apps/web/server/research/read-model.ts
- apps/web/app/(app)/research/page.tsx
- apps/web/tests/research-home-inputs.test.ts
- scripts/check-client-boundaries.mjs

不变量：DTO字段/联合类型完全不变；server旧类型导出保持兼容；SSE事件、LLM Prompt/Provider/Skill/Artifact版本保存语义不变；Canvas仅类型迁移不改布局；研究首页query参数、4条最近账号排序、启用账号过滤、最多3账号、当前workspace趋势及非ARCHIVED材料选择不变；researchMember在read model验证有效用户/空间/成员，VIEWER仍允许只读。原3000/55432与现有配置不动，无schema/执行方式切换；不合并worktree、不处理默认方法UI或隐藏功能。

验证：55436强制隔离的资料/研究/成果回归与只读输入跨空间/停用验证；Web typecheck、精确lint、client运行时依赖图与实际独立浏览器bundle禁止server/DB/provider模块。类型契约纯type边界必须无runtime实现；旧server出口保持。

ResearchRun：只做诊断/提案，分别记录QUEUED尚未开始和RUNNING外部效果未知；不写自动恢复、不塞IngestJob、不启用Worker/模型。

补充边界检查器的定向负例与浏览器打包测试：scripts/check-client-boundaries.test.mjs。
