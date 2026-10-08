# 整合工作区 API 清单

只证明端点及直接导出方法存在，不能据此推断端点已通过权限或外部服务验收。

| API | 导出方法 | 本地源码 |
| --- | --- | --- |
| `/api/account/invitation` | POST | `apps/web/app/api/account/invitation/route.ts` |
| `/api/account/recovery` | PATCH, POST | `apps/web/app/api/account/recovery/route.ts` |
| `/api/account/verification` | PATCH, POST | `apps/web/app/api/account/verification/route.ts` |
| `/api/admin/system/providers/[provider]` | GET, PUT | `apps/web/app/api/admin/system/providers/[provider]/route.ts` |
| `/api/admin/system` | GET | `apps/web/app/api/admin/system/route.ts` |
| `/api/admin/usage` | GET | `apps/web/app/api/admin/usage/route.ts` |
| `/api/admin/users/[id]` | PATCH | `apps/web/app/api/admin/users/[id]/route.ts` |
| `/api/admin/users` | GET, POST | `apps/web/app/api/admin/users/route.ts` |
| `/api/admin/workspaces` | GET, POST | `apps/web/app/api/admin/workspaces/route.ts` |
| `/api/artifacts/[id]/assistant` | GET, POST | `apps/web/app/api/artifacts/[id]/assistant/route.ts` |
| `/api/artifacts/[id]/classification` | PATCH | `apps/web/app/api/artifacts/[id]/classification/route.ts` |
| `/api/artifacts/[id]/context` | PUT | `apps/web/app/api/artifacts/[id]/context/route.ts` |
| `/api/artifacts/[id]/draft` | PUT | `apps/web/app/api/artifacts/[id]/draft/route.ts` |
| `/api/artifacts/[id]` | GET | `apps/web/app/api/artifacts/[id]/route.ts` |
| `/api/artifacts/[id]/suggestions/apply` | POST | `apps/web/app/api/artifacts/[id]/suggestions/apply/route.ts` |
| `/api/artifacts/[id]/versions` | GET, POST | `apps/web/app/api/artifacts/[id]/versions/route.ts` |
| `/api/artifacts` | GET, POST | `apps/web/app/api/artifacts/route.ts` |
| `/api/auth/[...all]` | POST | `apps/web/app/api/auth/[...all]/route.ts` |
| `/api/benchmark-topics/[runId]/select` | POST | `apps/web/app/api/benchmark-topics/[runId]/select/route.ts` |
| `/api/benchmark-topics` | POST | `apps/web/app/api/benchmark-topics/route.ts` |
| `/api/collections` | GET, POST | `apps/web/app/api/collections/route.ts` |
| `/api/creation/models` | GET | `apps/web/app/api/creation/models/route.ts` |
| `/api/creation/sources` | POST | `apps/web/app/api/creation/sources/route.ts` |
| `/api/creator-profile` | GET, PUT | `apps/web/app/api/creator-profile/route.ts` |
| `/api/creator-profile/suggestions/[suggestionId]` | PATCH | `apps/web/app/api/creator-profile/suggestions/[suggestionId]/route.ts` |
| `/api/creator-profile/suggestions` | GET, POST | `apps/web/app/api/creator-profile/suggestions/route.ts` |
| `/api/dev/runtime-health` | GET | `apps/web/app/api/dev/runtime-health/route.ts` |
| `/api/discovery/benchmarks/[id]/collection-runs/[runId]` | GET | `apps/web/app/api/discovery/benchmarks/[id]/collection-runs/[runId]/route.ts` |
| `/api/discovery/benchmarks/[id]/collection-runs` | GET, POST | `apps/web/app/api/discovery/benchmarks/[id]/collection-runs/route.ts` |
| `/api/discovery/benchmarks/[id]/comments/analyze` | POST | `apps/web/app/api/discovery/benchmarks/[id]/comments/analyze/route.ts` |
| `/api/discovery/benchmarks/[id]/comments/collect` | POST | `apps/web/app/api/discovery/benchmarks/[id]/comments/collect/route.ts` |
| `/api/discovery/benchmarks/[id]/inputs` | GET, POST | `apps/web/app/api/discovery/benchmarks/[id]/inputs/route.ts` |
| `/api/discovery/benchmarks/[id]/method-suggestions/[suggestionId]` | PATCH | `apps/web/app/api/discovery/benchmarks/[id]/method-suggestions/[suggestionId]/route.ts` |
| `/api/discovery/benchmarks/[id]/method-suggestions` | GET, POST | `apps/web/app/api/discovery/benchmarks/[id]/method-suggestions/route.ts` |
| `/api/discovery/benchmarks/[id]/organization` | PATCH | `apps/web/app/api/discovery/benchmarks/[id]/organization/route.ts` |
| `/api/discovery/benchmarks/[id]/report` | GET | `apps/web/app/api/discovery/benchmarks/[id]/report/route.ts` |
| `/api/discovery/benchmarks/[id]` | DELETE, GET | `apps/web/app/api/discovery/benchmarks/[id]/route.ts` |
| `/api/discovery/benchmarks/[id]/studies` | GET, POST | `apps/web/app/api/discovery/benchmarks/[id]/studies/route.ts` |
| `/api/discovery/benchmarks` | GET, POST | `apps/web/app/api/discovery/benchmarks/route.ts` |
| `/api/discovery/collect` | POST | `apps/web/app/api/discovery/collect/route.ts` |
| `/api/discovery/ideas/[id]/references` | POST | `apps/web/app/api/discovery/ideas/[id]/references/route.ts` |
| `/api/discovery/ideas/[id]` | GET, PATCH | `apps/web/app/api/discovery/ideas/[id]/route.ts` |
| `/api/discovery/ideas/[id]/start` | POST | `apps/web/app/api/discovery/ideas/[id]/start/route.ts` |
| `/api/discovery/ideas` | GET, POST | `apps/web/app/api/discovery/ideas/route.ts` |
| `/api/discovery/projects` | POST | `apps/web/app/api/discovery/projects/route.ts` |
| `/api/discovery/recommendations/[id]` | GET, POST | `apps/web/app/api/discovery/recommendations/[id]/route.ts` |
| `/api/discovery/recommendations` | GET, POST | `apps/web/app/api/discovery/recommendations/route.ts` |
| `/api/discovery/search` | POST | `apps/web/app/api/discovery/search/route.ts` |
| `/api/discovery/trends/[key]/ideas` | POST | `apps/web/app/api/discovery/trends/[key]/ideas/route.ts` |
| `/api/discovery/trends/[key]/related` | POST | `apps/web/app/api/discovery/trends/[key]/related/route.ts` |
| `/api/discovery/trends/[key]/topics` | POST | `apps/web/app/api/discovery/trends/[key]/topics/route.ts` |
| `/api/discovery/trends` | GET, POST | `apps/web/app/api/discovery/trends/route.ts` |
| `/api/experience/start` | POST | `apps/web/app/api/experience/start/route.ts` |
| `/api/health/live` | GET, HEAD | `apps/web/app/api/health/live/route.ts` |
| `/api/health/ready` | GET, HEAD | `apps/web/app/api/health/ready/route.ts` |
| `/api/ingest-jobs/[id]/cancel` | POST | `apps/web/app/api/ingest-jobs/[id]/cancel/route.ts` |
| `/api/ingest-jobs/[id]/retry` | POST | `apps/web/app/api/ingest-jobs/[id]/retry/route.ts` |
| `/api/ingest-jobs/[id]/review` | POST | `apps/web/app/api/ingest-jobs/[id]/review/route.ts` |
| `/api/ingest-jobs/[id]` | GET | `apps/web/app/api/ingest-jobs/[id]/route.ts` |
| `/api/integrations/[provider]/disable` | POST | `apps/web/app/api/integrations/[provider]/disable/route.ts` |
| `/api/integrations/[provider]/enable` | POST | `apps/web/app/api/integrations/[provider]/enable/route.ts` |
| `/api/integrations/[provider]` | DELETE, GET, PUT | `apps/web/app/api/integrations/[provider]/route.ts` |
| `/api/integrations/[provider]/test` | POST | `apps/web/app/api/integrations/[provider]/test/route.ts` |
| `/api/integrations/LLM/models` | GET | `apps/web/app/api/integrations/LLM/models/route.ts` |
| `/api/integrations` | GET | `apps/web/app/api/integrations/route.ts` |
| `/api/internal/media-storage/[assetId]` | GET | `apps/web/app/api/internal/media-storage/[assetId]/route.ts` |
| `/api/internal-signup` | POST | `apps/web/app/api/internal-signup/route.ts` |
| `/api/local-asr/models/initialize` | POST | `apps/web/app/api/local-asr/models/initialize/route.ts` |
| `/api/local-asr/status` | GET | `apps/web/app/api/local-asr/status/route.ts` |
| `/api/media/[token]` | GET | `apps/web/app/api/media/[token]/route.ts` |
| `/api/methods/[id]` | DELETE, GET, PATCH, PUT | `apps/web/app/api/methods/[id]/route.ts` |
| `/api/methods/default` | GET, PATCH, POST, PUT | `apps/web/app/api/methods/default/route.ts` |
| `/api/methods/import` | POST | `apps/web/app/api/methods/import/route.ts` |
| `/api/methods` | GET, POST | `apps/web/app/api/methods/route.ts` |
| `/api/projects/[id]/ai/run` | POST | `apps/web/app/api/projects/[id]/ai/run/route.ts` |
| `/api/projects/[id]/ai/runs/[runId]/apply` | POST | `apps/web/app/api/projects/[id]/ai/runs/[runId]/apply/route.ts` |
| `/api/projects/[id]/ai/runs/[runId]/discard` | POST | `apps/web/app/api/projects/[id]/ai/runs/[runId]/discard/route.ts` |
| `/api/projects/[id]/artifacts/[artifactId]/revisions` | POST | `apps/web/app/api/projects/[id]/artifacts/[artifactId]/revisions/route.ts` |
| `/api/projects/[id]/artifacts/[artifactId]` | GET, PUT | `apps/web/app/api/projects/[id]/artifacts/[artifactId]/route.ts` |
| `/api/projects/[id]/artifacts` | GET, POST | `apps/web/app/api/projects/[id]/artifacts/route.ts` |
| `/api/projects/[id]/assistant/messages/[messageId]/save` | POST | `apps/web/app/api/projects/[id]/assistant/messages/[messageId]/save/route.ts` |
| `/api/projects/[id]/assistant/models` | GET | `apps/web/app/api/projects/[id]/assistant/models/route.ts` |
| `/api/projects/[id]/assistant/references` | GET | `apps/web/app/api/projects/[id]/assistant/references/route.ts` |
| `/api/projects/[id]/assistant` | GET, POST | `apps/web/app/api/projects/[id]/assistant/route.ts` |
| `/api/projects/[id]/brief` | PUT | `apps/web/app/api/projects/[id]/brief/route.ts` |
| `/api/projects/[id]/canvas/objects/[objectId]/assistant` | GET, POST | `apps/web/app/api/projects/[id]/canvas/objects/[objectId]/assistant/route.ts` |
| `/api/projects/[id]/canvas/objects/[objectId]/restore` | POST | `apps/web/app/api/projects/[id]/canvas/objects/[objectId]/restore/route.ts` |
| `/api/projects/[id]/canvas/objects/[objectId]` | DELETE, PATCH | `apps/web/app/api/projects/[id]/canvas/objects/[objectId]/route.ts` |
| `/api/projects/[id]/canvas/objects` | GET, POST | `apps/web/app/api/projects/[id]/canvas/objects/route.ts` |
| `/api/projects/[id]/creative-basis` | POST | `apps/web/app/api/projects/[id]/creative-basis/route.ts` |
| `/api/projects/[id]/deep-content-package/apply` | POST | `apps/web/app/api/projects/[id]/deep-content-package/apply/route.ts` |
| `/api/projects/[id]/deep-content-package/generate` | POST | `apps/web/app/api/projects/[id]/deep-content-package/generate/route.ts` |
| `/api/projects/[id]/deep-content-package` | GET, PUT | `apps/web/app/api/projects/[id]/deep-content-package/route.ts` |
| `/api/projects/[id]/drafts/[draftId]/checkpoint` | POST | `apps/web/app/api/projects/[id]/drafts/[draftId]/checkpoint/route.ts` |
| `/api/projects/[id]/drafts/[draftId]/confirm` | POST | `apps/web/app/api/projects/[id]/drafts/[draftId]/confirm/route.ts` |
| `/api/projects/[id]/drafts/[draftId]/history` | GET | `apps/web/app/api/projects/[id]/drafts/[draftId]/history/route.ts` |
| `/api/projects/[id]/drafts/[draftId]/primary` | POST | `apps/web/app/api/projects/[id]/drafts/[draftId]/primary/route.ts` |
| `/api/projects/[id]/drafts/[draftId]` | DELETE, GET, PATCH, PUT | `apps/web/app/api/projects/[id]/drafts/[draftId]/route.ts` |
| `/api/projects/[id]/drafts` | GET, POST | `apps/web/app/api/projects/[id]/drafts/route.ts` |
| `/api/projects/[id]/evidence/[evidenceId]` | DELETE, PATCH | `apps/web/app/api/projects/[id]/evidence/[evidenceId]/route.ts` |
| `/api/projects/[id]/evidence` | POST | `apps/web/app/api/projects/[id]/evidence/route.ts` |
| `/api/projects/[id]/feedback` | GET, PUT | `apps/web/app/api/projects/[id]/feedback/route.ts` |
| `/api/projects/[id]/gpt-task-package/copied` | POST | `apps/web/app/api/projects/[id]/gpt-task-package/copied/route.ts` |
| `/api/projects/[id]/gpt-task-package` | GET | `apps/web/app/api/projects/[id]/gpt-task-package/route.ts` |
| `/api/projects/[id]/import-gpt-draft` | POST | `apps/web/app/api/projects/[id]/import-gpt-draft/route.ts` |
| `/api/projects/[id]/methods` | GET, PUT | `apps/web/app/api/projects/[id]/methods/route.ts` |
| `/api/projects/[id]/mother-content/confirm` | POST | `apps/web/app/api/projects/[id]/mother-content/confirm/route.ts` |
| `/api/projects/[id]/mother-content/confirmation` | PUT | `apps/web/app/api/projects/[id]/mother-content/confirmation/route.ts` |
| `/api/projects/[id]/mother-content` | GET, PUT | `apps/web/app/api/projects/[id]/mother-content/route.ts` |
| `/api/projects/[id]/mother-content/warnings` | POST | `apps/web/app/api/projects/[id]/mother-content/warnings/route.ts` |
| `/api/projects/[id]/platform-variants/[platform]/apply` | POST | `apps/web/app/api/projects/[id]/platform-variants/[platform]/apply/route.ts` |
| `/api/projects/[id]/platform-variants/[platform]/review/ai` | POST | `apps/web/app/api/projects/[id]/platform-variants/[platform]/review/ai/route.ts` |
| `/api/projects/[id]/platform-variants/[platform]/review/approve` | POST | `apps/web/app/api/projects/[id]/platform-variants/[platform]/review/approve/route.ts` |
| `/api/projects/[id]/platform-variants/[platform]/review/reject` | POST | `apps/web/app/api/projects/[id]/platform-variants/[platform]/review/reject/route.ts` |
| `/api/projects/[id]/platform-variants/[platform]/review/request-changes` | POST | `apps/web/app/api/projects/[id]/platform-variants/[platform]/review/request-changes/route.ts` |
| `/api/projects/[id]/platform-variants/[platform]/review/submit` | POST | `apps/web/app/api/projects/[id]/platform-variants/[platform]/review/submit/route.ts` |
| `/api/projects/[id]/platform-variants/[platform]/reviews` | GET | `apps/web/app/api/projects/[id]/platform-variants/[platform]/reviews/route.ts` |
| `/api/projects/[id]/platform-variants/[platform]` | GET, PUT | `apps/web/app/api/projects/[id]/platform-variants/[platform]/route.ts` |
| `/api/projects/[id]/platform-variants/generate` | POST | `apps/web/app/api/projects/[id]/platform-variants/generate/route.ts` |
| `/api/projects/[id]/platform-variants` | GET | `apps/web/app/api/projects/[id]/platform-variants/route.ts` |
| `/api/projects/[id]/restore` | POST | `apps/web/app/api/projects/[id]/restore/route.ts` |
| `/api/projects/[id]` | DELETE, GET, PATCH | `apps/web/app/api/projects/[id]/route.ts` |
| `/api/projects/[id]/sources/[sourceId]` | DELETE | `apps/web/app/api/projects/[id]/sources/[sourceId]/route.ts` |
| `/api/projects/[id]/sources` | POST | `apps/web/app/api/projects/[id]/sources/route.ts` |
| `/api/projects/[id]/transition` | POST | `apps/web/app/api/projects/[id]/transition/route.ts` |
| `/api/projects` | GET, POST | `apps/web/app/api/projects/route.ts` |
| `/api/publish-tasks/[id]/cancel` | POST | `apps/web/app/api/publish-tasks/[id]/cancel/route.ts` |
| `/api/publish-tasks/[id]/failed` | POST | `apps/web/app/api/publish-tasks/[id]/failed/route.ts` |
| `/api/publish-tasks/[id]/package/copied` | POST | `apps/web/app/api/publish-tasks/[id]/package/copied/route.ts` |
| `/api/publish-tasks/[id]/package` | GET | `apps/web/app/api/publish-tasks/[id]/package/route.ts` |
| `/api/publish-tasks/[id]/published` | POST | `apps/web/app/api/publish-tasks/[id]/published/route.ts` |
| `/api/publish-tasks/[id]` | GET, PATCH | `apps/web/app/api/publish-tasks/[id]/route.ts` |
| `/api/publish-tasks/[id]/schedule` | POST | `apps/web/app/api/publish-tasks/[id]/schedule/route.ts` |
| `/api/publish-tasks` | GET, POST | `apps/web/app/api/publish-tasks/route.ts` |
| `/api/research/benchmarks/[id]/research` | POST | `apps/web/app/api/research/benchmarks/[id]/research/route.ts` |
| `/api/research/benchmarks/[id]/research-v2` | POST | `apps/web/app/api/research/benchmarks/[id]/research-v2/route.ts` |
| `/api/research/benchmarks/[id]/sync` | GET, POST | `apps/web/app/api/research/benchmarks/[id]/sync/route.ts` |
| `/api/research/benchmarks/[id]/works/[workId]/analysis/[runId]/export` | GET | `apps/web/app/api/research/benchmarks/[id]/works/[workId]/analysis/[runId]/export/route.ts` |
| `/api/research/benchmarks/[id]/works/[workId]/analysis/[runId]/pool` | POST | `apps/web/app/api/research/benchmarks/[id]/works/[workId]/analysis/[runId]/pool/route.ts` |
| `/api/research/benchmarks/[id]/works/[workId]/analysis/[runId]/prepare-creation` | POST | `apps/web/app/api/research/benchmarks/[id]/works/[workId]/analysis/[runId]/prepare-creation/route.ts` |
| `/api/research/benchmarks/[id]/works/[workId]/analysis` | POST | `apps/web/app/api/research/benchmarks/[id]/works/[workId]/analysis/route.ts` |
| `/api/research/benchmarks/[id]/works/[workId]/collect` | POST | `apps/web/app/api/research/benchmarks/[id]/works/[workId]/collect/route.ts` |
| `/api/research/benchmarks/[id]/works/[workId]/media` | GET | `apps/web/app/api/research/benchmarks/[id]/works/[workId]/media/route.ts` |
| `/api/research/benchmarks/[id]/works/[workId]` | GET | `apps/web/app/api/research/benchmarks/[id]/works/[workId]/route.ts` |
| `/api/research/benchmarks/[id]/works/[workId]/source` | POST | `apps/web/app/api/research/benchmarks/[id]/works/[workId]/source/route.ts` |
| `/api/research/benchmarks/import` | POST | `apps/web/app/api/research/benchmarks/import/route.ts` |
| `/api/research/benchmarks/resolve` | POST | `apps/web/app/api/research/benchmarks/resolve/route.ts` |
| `/api/research/creation` | GET, POST | `apps/web/app/api/research/creation/route.ts` |
| `/api/research/focus-v2` | POST | `apps/web/app/api/research/focus-v2/route.ts` |
| `/api/research/materials` | GET | `apps/web/app/api/research/materials/route.ts` |
| `/api/research/news` | GET, POST | `apps/web/app/api/research/news/route.ts` |
| `/api/research/object-sessions` | GET, POST | `apps/web/app/api/research/object-sessions/route.ts` |
| `/api/research/preferences` | POST | `apps/web/app/api/research/preferences/route.ts` |
| `/api/research/reports/import` | POST | `apps/web/app/api/research/reports/import/route.ts` |
| `/api/research/results/[runId]/share` | POST | `apps/web/app/api/research/results/[runId]/share/route.ts` |
| `/api/research/results/study/[studyId]/share` | POST | `apps/web/app/api/research/results/study/[studyId]/share/route.ts` |
| `/api/research/sessions/[id]` | GET | `apps/web/app/api/research/sessions/[id]/route.ts` |
| `/api/research/sessions/[id]/runs/[runId]` | GET, POST | `apps/web/app/api/research/sessions/[id]/runs/[runId]/route.ts` |
| `/api/research/sessions/[id]/runs` | POST | `apps/web/app/api/research/sessions/[id]/runs/route.ts` |
| `/api/research/sessions` | GET, POST | `apps/web/app/api/research/sessions/route.ts` |
| `/api/research/sources/[id]/clippings` | POST | `apps/web/app/api/research/sources/[id]/clippings/route.ts` |
| `/api/research/sources/[id]/topic` | POST | `apps/web/app/api/research/sources/[id]/topic/route.ts` |
| `/api/research/trends/[stableKey]/opportunity-v2` | POST | `apps/web/app/api/research/trends/[stableKey]/opportunity-v2/route.ts` |
| `/api/research/trends/[stableKey]/related` | POST | `apps/web/app/api/research/trends/[stableKey]/related/route.ts` |
| `/api/search` | GET | `apps/web/app/api/search/route.ts` |
| `/api/settings/diagnostics` | GET | `apps/web/app/api/settings/diagnostics/route.ts` |
| `/api/settings/invitations` | DELETE, GET, POST | `apps/web/app/api/settings/invitations/route.ts` |
| `/api/settings/members/[id]` | 需核对重导出 | `apps/web/app/api/settings/members/[id]/route.ts` |
| `/api/settings/members` | GET, POST | `apps/web/app/api/settings/members/route.ts` |
| `/api/settings/owner` | POST | `apps/web/app/api/settings/owner/route.ts` |
| `/api/settings/sessions` | DELETE, GET | `apps/web/app/api/settings/sessions/route.ts` |
| `/api/settings/storage` | GET, POST | `apps/web/app/api/settings/storage/route.ts` |
| `/api/settings/workspace` | PATCH, POST | `apps/web/app/api/settings/workspace/route.ts` |
| `/api/sidebar/folders/[folderId]` | DELETE, PATCH | `apps/web/app/api/sidebar/folders/[folderId]/route.ts` |
| `/api/sidebar/folders` | POST | `apps/web/app/api/sidebar/folders/route.ts` |
| `/api/sidebar/projects/[projectId]/opened` | POST | `apps/web/app/api/sidebar/projects/[projectId]/opened/route.ts` |
| `/api/sidebar/projects/[projectId]/preference` | PATCH | `apps/web/app/api/sidebar/projects/[projectId]/preference/route.ts` |
| `/api/sidebar/projects` | POST | `apps/web/app/api/sidebar/projects/route.ts` |
| `/api/sidebar` | GET | `apps/web/app/api/sidebar/route.ts` |
| `/api/source-items/[id]/assets/[assetId]/access` | GET | `apps/web/app/api/source-items/[id]/assets/[assetId]/access/route.ts` |
| `/api/source-items/[id]/assets/[assetId]/preview` | GET | `apps/web/app/api/source-items/[id]/assets/[assetId]/preview/route.ts` |
| `/api/source-items/[id]/collections` | DELETE, POST | `apps/web/app/api/source-items/[id]/collections/route.ts` |
| `/api/source-items/[id]/distillation` | GET, POST | `apps/web/app/api/source-items/[id]/distillation/route.ts` |
| `/api/source-items/[id]/knowledge/candidates/[candidateId]` | PATCH | `apps/web/app/api/source-items/[id]/knowledge/candidates/[candidateId]/route.ts` |
| `/api/source-items/[id]/knowledge` | GET, POST | `apps/web/app/api/source-items/[id]/knowledge/route.ts` |
| `/api/source-items/[id]/material-analysis/[analysisId]` | PUT | `apps/web/app/api/source-items/[id]/material-analysis/[analysisId]/route.ts` |
| `/api/source-items/[id]/material-analysis/project` | POST | `apps/web/app/api/source-items/[id]/material-analysis/project/route.ts` |
| `/api/source-items/[id]/material-analysis` | GET, POST | `apps/web/app/api/source-items/[id]/material-analysis/route.ts` |
| `/api/source-items/[id]/metadata/refresh` | POST | `apps/web/app/api/source-items/[id]/metadata/refresh/route.ts` |
| `/api/source-items/[id]/processing` | GET | `apps/web/app/api/source-items/[id]/processing/route.ts` |
| `/api/source-items/[id]` | DELETE, GET, PATCH | `apps/web/app/api/source-items/[id]/route.ts` |
| `/api/source-items/[id]/tags` | DELETE, POST | `apps/web/app/api/source-items/[id]/tags/route.ts` |
| `/api/source-items/[id]/transcribe` | POST | `apps/web/app/api/source-items/[id]/transcribe/route.ts` |
| `/api/source-items/[id]/transcript` | PUT | `apps/web/app/api/source-items/[id]/transcript/route.ts` |
| `/api/source-items/[id]/understanding` | POST | `apps/web/app/api/source-items/[id]/understanding/route.ts` |
| `/api/source-items` | GET, POST | `apps/web/app/api/source-items/route.ts` |
| `/api/source-items/upload` | POST | `apps/web/app/api/source-items/upload/route.ts` |
| `/api/system/health/queue` | POST | `apps/web/app/api/system/health/queue/route.ts` |
| `/api/tags` | GET, POST | `apps/web/app/api/tags/route.ts` |
| `/api/workspaces/[workspaceId]` | GET | `apps/web/app/api/workspaces/[workspaceId]/route.ts` |
