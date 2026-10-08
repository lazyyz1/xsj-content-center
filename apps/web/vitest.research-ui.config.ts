import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";
export default defineConfig({
 resolve: { alias: { "@": fileURLToPath(new URL("./", import.meta.url)) } },
 oxc: { jsx: { runtime: "automatic" } },
 test: { include: ["apps/web/tests/report-desk-ui.test.tsx", "apps/web/tests/research-workspace-ui.test.tsx", "apps/web/tests/research-object-assistant-ui.test.tsx", "apps/web/tests/source-processing-poller.test.tsx", "apps/web/tests/research-saved-content-default.test.ts", "apps/web/tests/personal-content-ui.test.tsx"] },
});
