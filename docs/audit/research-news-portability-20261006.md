# Research news: local packaging and deployment conditions

This is documentation and validation for the existing module, not an approved cloud deployment. No credentials, databases, uploads, cache contents or build artifacts are included here.

The approved local daily entry uses the existing private daily configuration, original PostgreSQL55432 and original MinIO9000. The review entry uses isolated55436/19000. These local profiles are not generic cloud configuration templates. A source archive alone cannot supply infrastructure, existing credentials or persistent data.

## Secret-free news settings example

AIHOT_PUBLIC_NEWS_ENABLED=false
AIHOT_NEWS_CACHE_ROOT=<absolute persistent private directory on the target host>

Enable the narrow public-news permission only under the authorized deployment scope. This flag permits only the existing anonymous AIHOT v1 whitelist; it does not enable paid models, other collectors or generic Workers. Existing application database, storage and authentication settings remain separately required; no new secret values are provided by this example.

When using the approved local launchers, the cache path derives from the checkout root and is fixed per daily/review profile. For a different working directory or deployment environment, supply an absolute persistent cache directory. Relative roots fail. Without an explicit root, only the daily/review local profile fallback is accepted; an unspecified deployment profile fails rather than silently choosing review.

## Persistence and process requirements

The cache directory holds public state, synchronization cursor, retry schedule and pause control. Preserve all of these files across restart; never replace them with an older snapshot. Access should be restricted to the application OS account and host administrators. Windows ACL protection in this current checkout does not configure another host; POSIX deployments must configure ownership and permissions.

The scheduler runs inside a long-lived Node process. It checks the persisted due time each minute and synchronizes at most hourly. Sleeping, stopped or scale-to-zero processes cannot synchronize while absent. On restart, persisted due time causes a single catch-up pass, not one pass per missed hour.

The filesystem lock is scoped to the local host/process. It is not distributed coordination for several cloud hosts sharing a network filesystem. Multi-host, serverless and ephemeral-disk deployment have not been accepted or verified by this task.

## Packaging boundary

Ordinary zip tools do not automatically honor Git or Docker ignore rules. Exclude .env files, private output, database dumps, original attachments, cookie/session data, cache files and installed dependencies from a code-only archive. Do not package or upload local data as part of this task. Rebuild from source in an authorized target environment with its own installed dependencies and approved configuration.

## Current delivery limits

The news API remains limited to the explicitly selected local account and active workspace membership. It is not a generally enabled public multi-tenant service. No automatic fixed project or creative-message routing is provided by this news module. No cloud deployment, new infrastructure, credential creation or formal3000 version switch is performed here.
