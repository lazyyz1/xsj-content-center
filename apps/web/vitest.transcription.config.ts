import {defineConfig,mergeConfig} from "vitest/config";
import base from "../../vitest.config";
export default mergeConfig(base,defineConfig({oxc:{jsx:{runtime:"automatic"}},test:{include:["apps/web/tests/source-processing-poller.test.tsx"]}}));
