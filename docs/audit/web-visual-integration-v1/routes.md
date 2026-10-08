# 当前本地页面与路由清单

采集时间：2026-10-08T15:56:48.352769+08:00

页面文件数量包含设置拦截页和并行插槽兜底；它们不是新的独立 URL。

## primary

目录：`D:\Documents\ChatGPT\内容生产中心-integration`。页面文件 75；普通独立路由 65；API 文件 200。

| URL 模式 | 文件类型 | 直接重定向 | 本地源码 |
| --- | --- | --- | --- |
| `/settings/about` | intercepted-page | 否 | `apps/web/app/(app)/@settings/(.)settings/about/page.tsx` |
| `/settings/account` | intercepted-page | 否 | `apps/web/app/(app)/@settings/(.)settings/account/page.tsx` |
| `/settings/creator-profile` | intercepted-page | 否 | `apps/web/app/(app)/@settings/(.)settings/creator-profile/page.tsx` |
| `/settings/diagnostics` | intercepted-page | 否 | `apps/web/app/(app)/@settings/(.)settings/diagnostics/page.tsx` |
| `/settings/integrations` | intercepted-page | 否 | `apps/web/app/(app)/@settings/(.)settings/integrations/page.tsx` |
| `/settings/members` | intercepted-page | 否 | `apps/web/app/(app)/@settings/(.)settings/members/page.tsx` |
| `/settings` | intercepted-page | 否 | `apps/web/app/(app)/@settings/(.)settings/page.tsx` |
| `/settings/storage` | intercepted-page | 否 | `apps/web/app/(app)/@settings/(.)settings/storage/page.tsx` |
| `/settings/workspace` | intercepted-page | 否 | `apps/web/app/(app)/@settings/(.)settings/workspace/page.tsx` |
| `/[...catchAll]` | parallel-fallback | 否 | `apps/web/app/(app)/@settings/[...catchAll]/page.tsx` |
| `/admin` | page | 是 | `apps/web/app/(app)/admin/page.tsx` |
| `/admin/system` | page | 否 | `apps/web/app/(app)/admin/system/page.tsx` |
| `/admin/usage` | page | 否 | `apps/web/app/(app)/admin/usage/page.tsx` |
| `/admin/users` | page | 否 | `apps/web/app/(app)/admin/users/page.tsx` |
| `/calendar` | page | 否 | `apps/web/app/(app)/calendar/page.tsx` |
| `/calendar/tasks/[id]` | page | 否 | `apps/web/app/(app)/calendar/tasks/[id]/page.tsx` |
| `/content/[id]` | page | 否 | `apps/web/app/(app)/content/[id]/page.tsx` |
| `/content` | page | 否 | `apps/web/app/(app)/content/page.tsx` |
| `/dashboard` | page | 是 | `apps/web/app/(app)/dashboard/page.tsx` |
| `/discovery/benchmarks/[id]` | page | 是 | `apps/web/app/(app)/discovery/benchmarks/[id]/page.tsx` |
| `/discovery/ideas/[id]` | page | 否 | `apps/web/app/(app)/discovery/ideas/[id]/page.tsx` |
| `/discovery/ideas` | page | 否 | `apps/web/app/(app)/discovery/ideas/page.tsx` |
| `/discovery` | page | 是 | `apps/web/app/(app)/discovery/page.tsx` |
| `/discovery/recommendations/[id]` | page | 否 | `apps/web/app/(app)/discovery/recommendations/[id]/page.tsx` |
| `/discovery/trends/[key]` | page | 否 | `apps/web/app/(app)/discovery/trends/[key]/page.tsx` |
| `/discovery/trends` | page | 否 | `apps/web/app/(app)/discovery/trends/page.tsx` |
| `/library/[id]` | page | 否 | `apps/web/app/(app)/library/[id]/page.tsx` |
| `/library/methods/[id]` | page | 否 | `apps/web/app/(app)/library/methods/[id]/page.tsx` |
| `/library/methods` | page | 否 | `apps/web/app/(app)/library/methods/page.tsx` |
| `/library` | page | 否 | `apps/web/app/(app)/library/page.tsx` |
| `/projects/[id]` | page | 是 | `apps/web/app/(app)/projects/[id]/page.tsx` |
| `/projects/[id]/review/[platform]` | page | 否 | `apps/web/app/(app)/projects/[id]/review/[platform]/page.tsx` |
| `/projects/[id]/studio` | page | 是 | `apps/web/app/(app)/projects/[id]/studio/page.tsx` |
| `/projects/methods` | page | 是 | `apps/web/app/(app)/projects/methods/page.tsx` |
| `/projects/new` | page | 是 | `apps/web/app/(app)/projects/new/page.tsx` |
| `/projects` | page | 否 | `apps/web/app/(app)/projects/page.tsx` |
| `/research/benchmarks/[id]/analysis` | page | 否 | `apps/web/app/(app)/research/benchmarks/[id]/analysis/page.tsx` |
| `/research/benchmarks/[id]` | page | 否 | `apps/web/app/(app)/research/benchmarks/[id]/page.tsx` |
| `/research/benchmarks/[id]/works/[workId]` | page | 是 | `apps/web/app/(app)/research/benchmarks/[id]/works/[workId]/page.tsx` |
| `/research/benchmarks` | page | 否 | `apps/web/app/(app)/research/benchmarks/page.tsx` |
| `/research/focus/[runId]` | page | 否 | `apps/web/app/(app)/research/focus/[runId]/page.tsx` |
| `/research/focus` | page | 否 | `apps/web/app/(app)/research/focus/page.tsx` |
| `/research/new` | page | 否 | `apps/web/app/(app)/research/new/page.tsx` |
| `/research` | page | 是 | `apps/web/app/(app)/research/page.tsx` |
| `/research/pool` | page | 否 | `apps/web/app/(app)/research/pool/page.tsx` |
| `/research/results/[kind]/[id]` | page | 否 | `apps/web/app/(app)/research/results/[kind]/[id]/page.tsx` |
| `/research/results` | page | 否 | `apps/web/app/(app)/research/results/page.tsx` |
| `/research/session/[id]` | page | 否 | `apps/web/app/(app)/research/session/[id]/page.tsx` |
| `/research/sources/[id]` | page | 否 | `apps/web/app/(app)/research/sources/[id]/page.tsx` |
| `/research/sources` | page | 是 | `apps/web/app/(app)/research/sources/page.tsx` |
| `/research/trends/[stableKey]` | page | 否 | `apps/web/app/(app)/research/trends/[stableKey]/page.tsx` |
| `/research/trends` | page | 否 | `apps/web/app/(app)/research/trends/page.tsx` |
| `/research/works` | page | 是 | `apps/web/app/(app)/research/works/page.tsx` |
| `/settings/about` | page | 否 | `apps/web/app/(app)/settings/about/page.tsx` |
| `/settings/account` | page | 否 | `apps/web/app/(app)/settings/account/page.tsx` |
| `/settings/creator-profile` | page | 否 | `apps/web/app/(app)/settings/creator-profile/page.tsx` |
| `/settings/diagnostics` | page | 否 | `apps/web/app/(app)/settings/diagnostics/page.tsx` |
| `/settings/integrations` | page | 否 | `apps/web/app/(app)/settings/integrations/page.tsx` |
| `/settings/members` | page | 否 | `apps/web/app/(app)/settings/members/page.tsx` |
| `/settings` | page | 否 | `apps/web/app/(app)/settings/page.tsx` |
| `/settings/storage` | page | 否 | `apps/web/app/(app)/settings/storage/page.tsx` |
| `/settings/workspace` | page | 否 | `apps/web/app/(app)/settings/workspace/page.tsx` |
| `/account/invite` | page | 否 | `apps/web/app/(auth)/account/invite/page.tsx` |
| `/account/recovery` | page | 否 | `apps/web/app/(auth)/account/recovery/page.tsx` |
| `/account/reset` | page | 否 | `apps/web/app/(auth)/account/reset/page.tsx` |
| `/account/verify` | page | 否 | `apps/web/app/(auth)/account/verify/page.tsx` |
| `/login` | page | 是 | `apps/web/app/(auth)/login/page.tsx` |
| `/register` | page | 是 | `apps/web/app/(auth)/register/page.tsx` |
| `/__runtime` | page | 否 | `apps/web/app/__runtime/page.tsx` |
| `/experience` | page | 否 | `apps/web/app/experience/page.tsx` |
| `/onboarding` | page | 是 | `apps/web/app/onboarding/page.tsx` |
| `/` | page | 是 | `apps/web/app/page.tsx` |
| `/platform/accounts` | page | 否 | `apps/web/app/platform/accounts/page.tsx` |
| `/platform/spaces` | page | 否 | `apps/web/app/platform/spaces/page.tsx` |
| `/workspace-unavailable` | page | 否 | `apps/web/app/workspace-unavailable/page.tsx` |
## original

目录：`D:\Documents\ChatGPT\内容生产中心`。页面文件 41；普通独立路由 41；API 文件 151。

| URL 模式 | 文件类型 | 直接重定向 | 本地源码 |
| --- | --- | --- | --- |
| `/admin` | page | 是 | `apps/web/app/(app)/admin/page.tsx` |
| `/admin/system` | page | 否 | `apps/web/app/(app)/admin/system/page.tsx` |
| `/admin/usage` | page | 否 | `apps/web/app/(app)/admin/usage/page.tsx` |
| `/admin/users` | page | 否 | `apps/web/app/(app)/admin/users/page.tsx` |
| `/calendar` | page | 否 | `apps/web/app/(app)/calendar/page.tsx` |
| `/calendar/tasks/[id]` | page | 否 | `apps/web/app/(app)/calendar/tasks/[id]/page.tsx` |
| `/dashboard` | page | 否 | `apps/web/app/(app)/dashboard/page.tsx` |
| `/discovery/benchmarks/[id]` | page | 否 | `apps/web/app/(app)/discovery/benchmarks/[id]/page.tsx` |
| `/discovery/ideas/[id]` | page | 否 | `apps/web/app/(app)/discovery/ideas/[id]/page.tsx` |
| `/discovery/ideas` | page | 否 | `apps/web/app/(app)/discovery/ideas/page.tsx` |
| `/discovery` | page | 否 | `apps/web/app/(app)/discovery/page.tsx` |
| `/discovery/recommendations/[id]` | page | 否 | `apps/web/app/(app)/discovery/recommendations/[id]/page.tsx` |
| `/discovery/trends/[key]` | page | 否 | `apps/web/app/(app)/discovery/trends/[key]/page.tsx` |
| `/discovery/trends` | page | 否 | `apps/web/app/(app)/discovery/trends/page.tsx` |
| `/library/[id]` | page | 否 | `apps/web/app/(app)/library/[id]/page.tsx` |
| `/library/methods/[id]` | page | 否 | `apps/web/app/(app)/library/methods/[id]/page.tsx` |
| `/library/methods` | page | 否 | `apps/web/app/(app)/library/methods/page.tsx` |
| `/library` | page | 否 | `apps/web/app/(app)/library/page.tsx` |
| `/projects/[id]` | page | 是 | `apps/web/app/(app)/projects/[id]/page.tsx` |
| `/projects/[id]/review/[platform]` | page | 否 | `apps/web/app/(app)/projects/[id]/review/[platform]/page.tsx` |
| `/projects/[id]/studio` | page | 是 | `apps/web/app/(app)/projects/[id]/studio/page.tsx` |
| `/projects/methods` | page | 是 | `apps/web/app/(app)/projects/methods/page.tsx` |
| `/projects/new` | page | 是 | `apps/web/app/(app)/projects/new/page.tsx` |
| `/projects` | page | 否 | `apps/web/app/(app)/projects/page.tsx` |
| `/research/benchmarks/[id]` | page | 否 | `apps/web/app/(app)/research/benchmarks/[id]/page.tsx` |
| `/research/benchmarks` | page | 否 | `apps/web/app/(app)/research/benchmarks/page.tsx` |
| `/research` | page | 否 | `apps/web/app/(app)/research/page.tsx` |
| `/research/results/[kind]/[id]` | page | 否 | `apps/web/app/(app)/research/results/[kind]/[id]/page.tsx` |
| `/research/results` | page | 否 | `apps/web/app/(app)/research/results/page.tsx` |
| `/research/session/[id]` | page | 否 | `apps/web/app/(app)/research/session/[id]/page.tsx` |
| `/research/trends/[stableKey]` | page | 否 | `apps/web/app/(app)/research/trends/[stableKey]/page.tsx` |
| `/research/trends` | page | 否 | `apps/web/app/(app)/research/trends/page.tsx` |
| `/settings/creator-profile` | page | 否 | `apps/web/app/(app)/settings/creator-profile/page.tsx` |
| `/settings/integrations` | page | 是 | `apps/web/app/(app)/settings/integrations/page.tsx` |
| `/settings/members` | page | 否 | `apps/web/app/(app)/settings/members/page.tsx` |
| `/settings` | page | 否 | `apps/web/app/(app)/settings/page.tsx` |
| `/login` | page | 否 | `apps/web/app/(auth)/login/page.tsx` |
| `/register` | page | 是 | `apps/web/app/(auth)/register/page.tsx` |
| `/__runtime` | page | 否 | `apps/web/app/__runtime/page.tsx` |
| `/onboarding` | page | 是 | `apps/web/app/onboarding/page.tsx` |
| `/` | page | 是 | `apps/web/app/page.tsx` |

## visual_candidate

目录：`E:\codex1\2026-10-08\https-www-douyin-com-video-7638373803566861619\work\xsj-cosmos-integration`。页面文件 76；普通独立路由 66；API 文件 200。

| URL 模式 | 文件类型 | 直接重定向 | 本地源码 |
| --- | --- | --- | --- |
| `/settings/about` | intercepted-page | 否 | `apps/web/app/(app)/@settings/(.)settings/about/page.tsx` |
| `/settings/account` | intercepted-page | 否 | `apps/web/app/(app)/@settings/(.)settings/account/page.tsx` |
| `/settings/creator-profile` | intercepted-page | 否 | `apps/web/app/(app)/@settings/(.)settings/creator-profile/page.tsx` |
| `/settings/diagnostics` | intercepted-page | 否 | `apps/web/app/(app)/@settings/(.)settings/diagnostics/page.tsx` |
| `/settings/integrations` | intercepted-page | 否 | `apps/web/app/(app)/@settings/(.)settings/integrations/page.tsx` |
| `/settings/members` | intercepted-page | 否 | `apps/web/app/(app)/@settings/(.)settings/members/page.tsx` |
| `/settings` | intercepted-page | 否 | `apps/web/app/(app)/@settings/(.)settings/page.tsx` |
| `/settings/storage` | intercepted-page | 否 | `apps/web/app/(app)/@settings/(.)settings/storage/page.tsx` |
| `/settings/workspace` | intercepted-page | 否 | `apps/web/app/(app)/@settings/(.)settings/workspace/page.tsx` |
| `/[...catchAll]` | parallel-fallback | 否 | `apps/web/app/(app)/@settings/[...catchAll]/page.tsx` |
| `/admin` | page | 是 | `apps/web/app/(app)/admin/page.tsx` |
| `/admin/system` | page | 否 | `apps/web/app/(app)/admin/system/page.tsx` |
| `/admin/usage` | page | 否 | `apps/web/app/(app)/admin/usage/page.tsx` |
| `/admin/users` | page | 否 | `apps/web/app/(app)/admin/users/page.tsx` |
| `/calendar` | page | 否 | `apps/web/app/(app)/calendar/page.tsx` |
| `/calendar/tasks/[id]` | page | 否 | `apps/web/app/(app)/calendar/tasks/[id]/page.tsx` |
| `/content/[id]` | page | 否 | `apps/web/app/(app)/content/[id]/page.tsx` |
| `/content` | page | 否 | `apps/web/app/(app)/content/page.tsx` |
| `/dashboard` | page | 是 | `apps/web/app/(app)/dashboard/page.tsx` |
| `/discovery/benchmarks/[id]` | page | 是 | `apps/web/app/(app)/discovery/benchmarks/[id]/page.tsx` |
| `/discovery/ideas/[id]` | page | 否 | `apps/web/app/(app)/discovery/ideas/[id]/page.tsx` |
| `/discovery/ideas` | page | 否 | `apps/web/app/(app)/discovery/ideas/page.tsx` |
| `/discovery` | page | 是 | `apps/web/app/(app)/discovery/page.tsx` |
| `/discovery/recommendations/[id]` | page | 否 | `apps/web/app/(app)/discovery/recommendations/[id]/page.tsx` |
| `/discovery/trends/[key]` | page | 否 | `apps/web/app/(app)/discovery/trends/[key]/page.tsx` |
| `/discovery/trends` | page | 否 | `apps/web/app/(app)/discovery/trends/page.tsx` |
| `/library/[id]` | page | 否 | `apps/web/app/(app)/library/[id]/page.tsx` |
| `/library/methods/[id]` | page | 否 | `apps/web/app/(app)/library/methods/[id]/page.tsx` |
| `/library/methods` | page | 否 | `apps/web/app/(app)/library/methods/page.tsx` |
| `/library` | page | 否 | `apps/web/app/(app)/library/page.tsx` |
| `/projects/[id]` | page | 是 | `apps/web/app/(app)/projects/[id]/page.tsx` |
| `/projects/[id]/review/[platform]` | page | 否 | `apps/web/app/(app)/projects/[id]/review/[platform]/page.tsx` |
| `/projects/[id]/studio` | page | 是 | `apps/web/app/(app)/projects/[id]/studio/page.tsx` |
| `/projects/methods` | page | 是 | `apps/web/app/(app)/projects/methods/page.tsx` |
| `/projects/new` | page | 是 | `apps/web/app/(app)/projects/new/page.tsx` |
| `/projects` | page | 否 | `apps/web/app/(app)/projects/page.tsx` |
| `/research/benchmarks/[id]/analysis` | page | 否 | `apps/web/app/(app)/research/benchmarks/[id]/analysis/page.tsx` |
| `/research/benchmarks/[id]` | page | 否 | `apps/web/app/(app)/research/benchmarks/[id]/page.tsx` |
| `/research/benchmarks/[id]/works/[workId]` | page | 是 | `apps/web/app/(app)/research/benchmarks/[id]/works/[workId]/page.tsx` |
| `/research/benchmarks` | page | 否 | `apps/web/app/(app)/research/benchmarks/page.tsx` |
| `/research/focus/[runId]` | page | 否 | `apps/web/app/(app)/research/focus/[runId]/page.tsx` |
| `/research/focus` | page | 否 | `apps/web/app/(app)/research/focus/page.tsx` |
| `/research/new` | page | 否 | `apps/web/app/(app)/research/new/page.tsx` |
| `/research` | page | 是 | `apps/web/app/(app)/research/page.tsx` |
| `/research/pool` | page | 否 | `apps/web/app/(app)/research/pool/page.tsx` |
| `/research/results/[kind]/[id]` | page | 否 | `apps/web/app/(app)/research/results/[kind]/[id]/page.tsx` |
| `/research/results` | page | 否 | `apps/web/app/(app)/research/results/page.tsx` |
| `/research/session/[id]` | page | 否 | `apps/web/app/(app)/research/session/[id]/page.tsx` |
| `/research/sources/[id]` | page | 否 | `apps/web/app/(app)/research/sources/[id]/page.tsx` |
| `/research/sources` | page | 是 | `apps/web/app/(app)/research/sources/page.tsx` |
| `/research/trends/[stableKey]` | page | 否 | `apps/web/app/(app)/research/trends/[stableKey]/page.tsx` |
| `/research/trends` | page | 否 | `apps/web/app/(app)/research/trends/page.tsx` |
| `/research/works` | page | 是 | `apps/web/app/(app)/research/works/page.tsx` |
| `/settings/about` | page | 否 | `apps/web/app/(app)/settings/about/page.tsx` |
| `/settings/account` | page | 否 | `apps/web/app/(app)/settings/account/page.tsx` |
| `/settings/creator-profile` | page | 否 | `apps/web/app/(app)/settings/creator-profile/page.tsx` |
| `/settings/diagnostics` | page | 否 | `apps/web/app/(app)/settings/diagnostics/page.tsx` |
| `/settings/integrations` | page | 否 | `apps/web/app/(app)/settings/integrations/page.tsx` |
| `/settings/members` | page | 否 | `apps/web/app/(app)/settings/members/page.tsx` |
| `/settings` | page | 否 | `apps/web/app/(app)/settings/page.tsx` |
| `/settings/storage` | page | 否 | `apps/web/app/(app)/settings/storage/page.tsx` |
| `/settings/workspace` | page | 否 | `apps/web/app/(app)/settings/workspace/page.tsx` |
| `/account/invite` | page | 否 | `apps/web/app/(auth)/account/invite/page.tsx` |
| `/account/recovery` | page | 否 | `apps/web/app/(auth)/account/recovery/page.tsx` |
| `/account/reset` | page | 否 | `apps/web/app/(auth)/account/reset/page.tsx` |
| `/account/verify` | page | 否 | `apps/web/app/(auth)/account/verify/page.tsx` |
| `/login` | page | 是 | `apps/web/app/(auth)/login/page.tsx` |
| `/register` | page | 是 | `apps/web/app/(auth)/register/page.tsx` |
| `/__runtime` | page | 否 | `apps/web/app/__runtime/page.tsx` |
| `/cosmos-preview` | page | 否 | `apps/web/app/cosmos-preview/page.tsx` |
| `/experience` | page | 否 | `apps/web/app/experience/page.tsx` |
| `/onboarding` | page | 是 | `apps/web/app/onboarding/page.tsx` |
| `/` | page | 是 | `apps/web/app/page.tsx` |
| `/platform/accounts` | page | 否 | `apps/web/app/platform/accounts/page.tsx` |
| `/platform/spaces` | page | 否 | `apps/web/app/platform/spaces/page.tsx` |
| `/workspace-unavailable` | page | 否 | `apps/web/app/workspace-unavailable/page.tsx` |
