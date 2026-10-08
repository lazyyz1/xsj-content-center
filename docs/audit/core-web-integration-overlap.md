# Core Web integration hunk decisions

Base: 883dd84cd66e4a579b5126b5e317f9c854dd94e5

Worktree: 内容生产中心-integration; branch feat/web-integration-release.

The Research candidate was located in the main worktree, not a separate registered worktree. The original main worktree was read only. Before applying changes, tracked binary diffs, untracked filename inventories, and code snapshots were saved under output/integration-audit/{agent,account,research}. Runtime/output files were excluded from copied snapshots.

Agent: 21 tracked changes at snapshot (includes the first, subsequently relocated integration patches), 25 untracked. Account and Research counts are recorded in the JSON inventories.

| Overlapping file | Candidates | Decision |
| --- | --- | --- |
| apps/web/app/api/projects/[id]/assistant/route.ts | agent, account, research | Agent frozen baseline |
| apps/web/components/integrations/integration-card.tsx | agent, account | Account owns Settings, credentials, scoped access, storage and provider |
| apps/web/components/projects/content-canvas.tsx | agent, research | Agent frozen baseline |
| apps/web/components/projects/studio-default-method.tsx | agent, account, research | Agent chat layout and styles retained; only native window.prompt replaced by existing NameDialog after real in-app browser save failure |
| apps/web/components/projects/studio-shell.tsx | agent, research | Agent frozen baseline |
| apps/web/next-env.d.ts | agent, research | Excluded generated or out-of-scope change |
| apps/web/server/ai/control/ai-control-service.ts | agent, account, research | Agent selection-to-ModelRouter retained; disabled membership/workspace check added |
| apps/web/server/ai/control/context-builder-v2.ts | agent, account, research | Agent budgeted readable Material/Research/Artifact adapters retained; Account legacy manifest rejected |
| apps/web/server/artifacts/service.ts | agent, research | Agent frozen baseline |
| apps/web/server/assistant/service.ts | agent, account, research | Agent private multi-turn/retry/cancel retained; only disabled membership/workspace boundary added |
| apps/web/server/integration-api.ts | agent, account | Account owns Settings, credentials, scoped access, storage and provider |
| apps/web/server/workbench-page-data.ts | agent, research | Agent frozen baseline |
| apps/web/tests/project-assistant.test.ts | agent, research | Agent frozen baseline |
| packages/integrations/src/service.ts | agent, account | Account owns Settings, credentials, scoped access, storage and provider |
| packages/integrations/src/system-provider-policy.test.ts | agent, account | Account owns Settings, credentials, scoped access, storage and provider |
| packages/integrations/src/system-provider-policy.ts | agent, account | Account owns Settings, credentials, scoped access, storage and provider |
| packages/providers/src/index.ts | agent, account | Account owns Settings, credentials, scoped access, storage and provider |
| packages/providers/src/openai-compatible/provider.ts | agent, account | Account owns Settings, credentials, scoped access, storage and provider |
| packages/providers/src/safe-url.ts | agent, account | Account owns Settings, credentials, scoped access, storage and provider |
| apps/web/app/api/integrations/[provider]/test/route.ts | agent, account | Account owns Settings, credentials, scoped access, storage and provider |
| apps/web/server/integration-test.ts | agent, account | Account owns Settings, credentials, scoped access, storage and provider |
| apps/web/tests/connection-failures.test.ts | agent, account | Account owns Settings, credentials, scoped access, storage and provider |
| packages/providers/src/provider-fetch.ts | agent, account | Account owns Settings, credentials, scoped access, storage and provider |
| apps/web/app/(app)/settings/page.tsx | account, research | Account owns Settings, credentials, scoped access, storage and provider |
| apps/web/server/ai/llm-runtime.ts | account, research | Account existing CUSTOM runtime patch retained; unrelated main-workspace draft-generation mock excluded |
| packages/db/prisma/schema.prisma | account, research | Account additive disabledAt/activeWorkspaceId only; Research creation-composer columns excluded as unrelated |

## Integration repairs

- Keep Agent chat layout and CSS unchanged. The CSS hash matches the frozen source. The component has only the necessary Artifact naming-dialog repair; the original Agent worktree remains frozen.
- Reuse Account Provider/credential policy in production instead of silently overriding workspace configuration.
- Preserve Account native local storage; use Windows namespaced paths for relay upload temporary files when the storage root is deep.
- Map real RedFox code 3201 to a non-retryable insufficient-credit result without echoing provider payloads.
- Add a maximum of one corrective model retry for Research schema/evidence failures. Final invalid evidence never becomes a completed Result.
- Validate exact system scope counts as counts of their matching objects; do not globally allow those numbers as arbitrary metrics.
- Put saved Research conclusions before potentially huge snapshots in Agent context, retaining context budgeting.
- Match disabled membership/workspace checks across Agent, Material, Artifact, and Account.
- Explicitly inject or authorize local test transports in existing provider tests; production HTTPS/DNS protections remain.

No visual polish or new product surface was added. The existing NameDialog is reused for Artifact saving because window.prompt is unsupported in the in-app browser. No Knowledge, Voice, Memory, multi-agent, multi-skill, Desktop, License, Canvas V2, or cleanup was introduced. Account owns Settings; Agent owns chat; Research UI is the candidate already supplied, not a visual redesign in this task.

No stage, commit, push, reset, clean, stash, or destructive migration was performed. The new isolated DB uses schema push and the two active-run partial unique indexes from the existing migrations; no existing application DB was migrated.
