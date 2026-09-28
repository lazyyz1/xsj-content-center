# Web experience candidate — review snapshot

Status: UPLOADED_FOR_REVIEW, NOT_APPROVED_FOR_DEPLOYMENT.

This snapshot collects the integrated Web UI, Agent, materials, Skill Markdown import, model routing, native DeepSeek search, and experience-limit work.

## Still blocking deployment

- The supplied remote-video example parses successfully but the application downloader has not yet passed the complete download/transcription/browser acceptance test. Download transport changes are included for review, not declared verified.
- Shared experience-account provisioning, read-only settings enforcement, public example seeding and 72-hour cleanup are not yet complete.
- Doubao transcription must be configured and smoke-tested on the actual Render environment.
- The final snapshot needs another production build and end-to-end regression after the remaining fixes.

## Runtime plan

Use Web + Worker + PostgreSQL + Redis + persistent media storage. Do not use render.free.yaml for durable video/transcription testing. Keep production secrets in Render environment variables; preserve the encryption key across deployments. Use a separate experience database and curated public samples, never the developer database or uploads.

Redis experience defaults: AI 5 concurrent, 40 requests per visitor/72h and 150/site/day; search 2 concurrent, 15/visitor/72h and 50/site/day; transcription 2 running with queueing, 5/visitor/72h and 20/site/day; upload 1 concurrent, 10 files/visitor/72h and 50/site/day. Native web search also uses a model request. These are request limits, not a guaranteed currency budget. Coverage is still being audited.

The source branch upload does not authorize switching the live Render service to this snapshot. Review the deployment branch and pending items before enabling it.
