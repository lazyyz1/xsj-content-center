# System provider policy

Production always enforces system-managed Providers; `SYSTEM_MANAGED_PROVIDERS=false` cannot disable that production guard. Kimi, RedFox, and Doubao credentials come from server environment variables and are resolved through the existing Integration/Provider layer for every Workspace. Historic encrypted Workspace IntegrationConfig rows are preserved but ignored in system-managed mode.

Ordinary users cannot view or update provider configuration. The settings entry and direct integration API are both blocked. System Admin sees only `CONFIGURED` / `UNCONFIGURED` service status; secrets, full Base URLs, access tokens, and model internals are not returned. V1-A deliberately does not add online secret editing: production secrets are `ENV_MANAGED`.

Local development may set `SYSTEM_MANAGED_PROVIDERS=false` to retain the existing encrypted Workspace configuration flow. This override is not the production default.

Resolution order in production is:

```text
server environment
→ system provider policy
→ Provider / Adapter
→ all Workspaces
```

Required public model policy remains Kimi 2.6 with `KIMI_MODEL_ID=kimi-k2.6`. No provider secret may be logged, returned to the browser, or committed.
