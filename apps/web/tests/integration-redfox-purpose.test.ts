import {it,expect,vi} from "vitest";
const {config,parse}=vi.hoisted(()=>({config:vi.fn(),parse:vi.fn().mockResolvedValue({})}));
vi.mock("server-only",()=>({}));
vi.mock("@content-center/providers",async()=>({...await vi.importActual<object>("@content-center/providers"),RedFoxClient:class{constructor(options:unknown){config(options);}parseWork=parse;}}));
import {testIntegration} from "../server/integration-test";
import type {IntegrationService} from "@content-center/integrations";
it("tests the saved RedFox credential with its restricted research transport",async()=>{
 const service={getDecryptedIntegrationConfig:vi.fn().mockResolvedValue({apiKey:"synthetic-fixture",baseUrl:"https://redfox.hk"})} as unknown as IntegrationService;
 expect(await testIntegration("fixture","REDFOX","https://www.douyin.com/video/123",service)).toMatchObject({ok:true});
 expect(config).toHaveBeenCalledWith(expect.objectContaining({purpose:"RESEARCH_COLLECTION",baseUrl:"https://redfox.hk"}));expect(config.mock.calls[0]![0].fetch).toBeUndefined();expect(parse).toHaveBeenCalledWith("https://www.douyin.com/video/123");
});
