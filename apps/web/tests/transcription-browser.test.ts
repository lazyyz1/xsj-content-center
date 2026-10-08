import {randomUUID} from "node:crypto";
import {mkdir,writeFile} from "node:fs/promises";
import {createRequire} from "node:module";
import path from "node:path";
import {chromium,type Browser,type BrowserContext} from "@playwright/test";
import {afterAll,beforeAll,expect,it,vi} from "vitest";
vi.mock("server-only",()=>({}));
import {db} from "@content-center/db";
import {auth} from "../lib/auth";
import {startWorkDeepResearch} from "../server/research/work-research-service";
import {executeResearchRun,saveResearchResult} from "../server/research/service";
import {MockLLMProvider} from "@content-center/providers";
import {sampleAnswer,sampleBody,sampleDecisionPass} from "./work-research-fixture";
const origin="http://localhost:3047",output="E:/codex1/2026-10-04/task-4/research-page-correction-20261007/acceptance";
let browser:Browser,context:BrowserContext,viewer:BrowserContext,userId="",viewerId="",workspaceId="",accountId="",workId="",sourceId="",reportId="",projectId="";
const checks:string[]=[],pageErrors:string[]=[];let externalRequests=0,modelRequests=0;
const req=createRequire(import.meta.url);
const sign=req(req.resolve("better-call",{paths:[path.dirname(req.resolve("better-auth/cookies"))]})).serializeSignedCookie as (name:string,value:string,secret:string,options:object)=>Promise<string>;
async function session(target:BrowserContext,id:string){const token=randomUUID()+randomUUID();await db.session.create({data:{userId:id,token,activeWorkspaceId:workspaceId,expiresAt:new Date(Date.now()+3600000)}});
 const signed=await sign("transcription-test.session_token",token,(await auth.$context).secret,{path:"/",httpOnly:true,sameSite:"lax"});const pair=signed.split(";")[0]!,i=pair.indexOf("=");await target.addCookies([{name:pair.slice(0,i),value:pair.slice(i+1),url:origin}]);}
const actor=()=>({workspaceId,userId});
const workUrl=()=>origin+"/research/benchmarks/"+accountId+"/works/"+workId;
beforeAll(async()=>{
 if(process.env.ENVIRONMENT_ID!=="LOCAL_TEST"||new URL(process.env.DATABASE_URL!).port!=="55433"||process.env.APP_URL!==origin||process.env.EXTERNAL_CALLS_DISABLED!=="true")throw Error("ISOLATED_BROWSER_REQUIRED");
 await mkdir(output,{recursive:true});const suffix=randomUUID();userId="browser-owner-"+suffix;viewerId="browser-viewer-"+suffix;
 await db.user.createMany({data:[userId,viewerId].map(id=>({id,name:"Disposable acceptance",email:id+"@example.test"}))});
 workspaceId=(await db.workspace.create({data:{name:"转录拆解隔离验收",slug:suffix,members:{create:[{userId,role:"OWNER"},{userId:viewerId,role:"VIEWER"}]}}})).id;
 accountId=(await db.benchmarkAccount.create({data:{workspaceId,createdById:userId,platform:"DOUYIN",externalAccountId:suffix,name:"隔离测试作者"}})).id;
 workId=(await db.benchmarkContentSnapshot.create({data:{workspaceId,benchmarkAccountId:accountId,platform:"DOUYIN",externalId:suffix,title:"怎样解决真实问题 · 隔离演示",url:"https://example.test/work",metadata:{durationMs:18000},observations:{create:{metrics:{likes:42,comments:null}}}}})).id;
 sourceId=(await db.sourceItem.create({data:{workspaceId,createdById:userId,sourcePlatform:"DOUYIN",externalId:suffix,sourceType:"VIDEO",title:"隔离合成原文",status:"READY",transcript:{create:{workspaceId,provider:"FIXTURE",providerMode:"REAL",fullText:sampleBody,segments:[{startMs:0,endMs:6000,text:"先展示用户的真实问题。"},{startMs:6000,endMs:12000,text:"接着演示操作。"},{startMs:12000,endMs:18000,text:"最后解释结果如何用于自己。"}]}}}})).id;
 projectId=(await db.contentProject.create({data:{workspaceId,createdById:userId,title:"自己的隔离创作项目"}})).id;
 const run=await startWorkDeepResearch(actor(),accountId,workId,{requestKey:randomUUID()});reportId=run.runId;
 await executeResearchRun(actor(),run.sessionId,run.runId,{runtime:{provider:new MockLLMProvider(input=>JSON.parse(input.prompt).task.includes("决策层")?sampleDecisionPass():sampleAnswer()),providerName:"FIXTURE",model:"local-fixture",mode:"FIXTURE"}});
 await saveResearchResult(actor(),run.sessionId,run.runId);
 browser=await chromium.launch({channel:"msedge",headless:true});context=await browser.newContext({viewport:{width:1440,height:900},acceptDownloads:true});viewer=await browser.newContext();await session(context,userId);await session(viewer,viewerId);
 await context.route("**/*",route=>{const u=new URL(route.request().url());if(![origin,"http://127.0.0.1:9002"].includes(u.origin)){externalRequests++;return route.abort();}return route.continue();});
 context.on("request",request=>{if(/\/analysis$|\/assistant$/.test(new URL(request.url()).pathname)&&request.method()!=="GET")modelRequests++;});
 context.on("page",page=>page.on("pageerror",error=>pageErrors.push(error.message)));
},90000);
afterAll(async()=>{
 await context?.close();await viewer?.close();await browser?.close();
 if(workspaceId)await db.workspace.deleteMany({where:{id:workspaceId}});await db.user.deleteMany({where:{id:{in:[userId,viewerId].filter(Boolean)}}});
 await writeFile(path.join(output,"browser-evidence.json"),JSON.stringify({checks,pageErrors,externalRequests,modelRequests,formalDatabaseWrites:0,liveProviderCalls:0,isolatedPort:3047,fixtureCleanupVerified:await db.user.count({where:{id:{in:[userId,viewerId]}}})===0},null,2));await db.$disconnect();
},30000);
it("renders the saved report on desktop and mobile with inline original and truthful metrics",async()=>{
 const page=await context.newPage();await page.goto(workUrl());await page.waitForLoadState("networkidle");await page.getByRole("heading",{name:"内容怎样一步步推进"}).first().waitFor();
 expect(await page.locator(".work-report-fragments>li").count()).toBe(3);expect(await page.locator(".work-report-compact-metrics").innerText()).not.toContain("评论\n0");
 await page.locator("#fragment-2 .work-fragment-original summary").click();expect(await page.locator("#fragment-2 .work-fragment-original blockquote").innerText()).toBe("接着演示操作。");
 await page.evaluate(()=>window.scrollTo(0,0));expect((await page.locator(".work-structure-panel").boundingBox())!.y).toBeLessThan(420);expect((await page.locator(".work-fragment-analysis").first().boundingBox())!.y).toBeLessThan(600);await page.screenshot({path:path.join(output,"report-desktop-1440x900.png"),fullPage:false});
 await page.setViewportSize({width:390,height:844});expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
 await page.evaluate(()=>window.scrollTo(0,0));await page.screenshot({path:path.join(output,"report-mobile-390x844.png"),fullPage:false});
 await page.reload();await page.waitForLoadState("networkidle");await page.locator("#fragment-2 .work-fragment-original summary").click();expect(await page.locator("#fragment-2 .work-fragment-original blockquote").innerText()).toContain("接着演示操作");await page.close();
 checks.push("saved-report-reopen-desktop-mobile-original-metrics");
},90000);

it("switches saved report versions and existing works within the same research workspace",async()=>{
 const next=await startWorkDeepResearch(actor(),accountId,workId,{requestKey:randomUUID(),force:true});
 await executeResearchRun(actor(),next.sessionId,next.runId,{runtime:{provider:new MockLLMProvider(input=>JSON.parse(input.prompt).task.includes("决策层")?sampleDecisionPass():sampleAnswer()),providerName:"FIXTURE",model:"local-fixture",mode:"FIXTURE"}});
 await saveResearchResult(actor(),next.sessionId,next.runId);
 const other=await db.benchmarkContentSnapshot.create({data:{workspaceId,benchmarkAccountId:accountId,platform:"DOUYIN",externalId:randomUUID(),title:"第二条已经保存的作品",url:"https://example.test/second-work",metadata:{linkedSourceItemId:sourceId}}});
 const page=await context.newPage();await page.goto(workUrl());await page.waitForLoadState("networkidle");await page.getByLabel("报告版本").selectOption(reportId);
 await page.waitForURL(url=>url.searchParams.get("report")===reportId);expect((await page.getByLabel("报告版本").inputValue())).toBe(reportId);
 await page.locator(".work-report-sidebar").getByText("第二条已经保存的作品",{exact:true}).click();await page.waitForURL(url=>url.pathname.endsWith("/"+other.id));
 await page.getByRole("heading",{name:"已有原文，直接沿用",exact:true}).waitFor();expect(await page.locator(".work-report-readable").innerText()).toContain("先展示用户的真实问题。");await page.close();checks.push("scoped-version-selector-and-existing-work-switch-no-model-request");
},90000);
it("keeps creation explicit, compares own intent and requires review before private handoff",async()=>{
 const page=await context.newPage();await page.goto(workUrl());await page.waitForLoadState("networkidle");const beforeHeight=await page.evaluate(()=>document.documentElement.scrollHeight);await page.getByRole("button",{name:"用这些发现创作",exact:true}).click();await page.getByRole("dialog",{name:"把结构用到自己的内容"}).waitFor();expect(await page.evaluate(()=>document.documentElement.scrollHeight)).toBe(beforeHeight);expect((await page.getByRole("dialog").boundingBox())!.height).toBeLessThan(860);
 await page.locator(".research-findings-panel fieldset input").first().check();
 await page.getByLabel("研究使用项目").selectOption(projectId);
 await page.getByLabel("本次创作意图").fill("自己的受众是初学者；用我的真实操作案例说明观点，不照抄原作者。");
 expect(await page.locator(".work-creation-comparison").innerText()).toContain("参考作品结构");
 const bring=page.getByRole("button",{name:"带入项目，先审阅",exact:true});expect(await bring.isDisabled()).toBe(true);
 await page.getByText("我已核对来源版本、所选结论和自己的创作意图",{exact:true}).click();expect(await bring.isEnabled()).toBe(true);
 await page.evaluate(()=>window.scrollTo(0,0));await page.screenshot({path:path.join(output,"creation-review-1440x900.png"),fullPage:false});await page.setViewportSize({width:390,height:844});expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);await page.screenshot({path:path.join(output,"creation-mobile-390x844.png"),fullPage:false});await page.setViewportSize({width:1440,height:900});await bring.click();await page.waitForURL(url=>url.pathname==="/dashboard");
 expect(await db.assistantMessage.count({where:{thread:{projectId}}})).toBe(0);expect(await db.artifact.count({where:{projectId}})).toBe(0);await page.close();checks.push("explicit-private-handoff-review-no-message-or-artifact");
},90000);
it("enforces editing versions, removes timestamps and marks the report stale",async()=>{
 const page=await context.newPage();await page.goto(origin+"/library/"+sourceId);await page.getByTestId("source-workspace").waitFor();await page.waitForLoadState("networkidle");
 await page.getByLabel("搜索文字内容").fill("接着");expect(await page.locator(".source-text-content").innerText()).toContain("接着演示操作");
 await page.locator(".source-text").getByRole("button",{name:"编辑",exact:true}).click();await page.getByLabel("编辑资料文字").fill(sampleBody+"补充核对后的文字。");await page.getByRole("button",{name:"保存文字",exact:true}).click();
 await expect.poll(async()=>(await db.transcript.findUniqueOrThrow({where:{sourceItemId:sourceId}})).segments,{timeout:15000}).toEqual([]);
 await page.goto(workUrl());await page.waitForLoadState("networkidle");await page.getByText("原证据已变化",{exact:false}).first().waitFor();
 expect((await db.researchRun.findUniqueOrThrow({where:{id:reportId}})).status).toBe("COMPLETED");await page.close();checks.push("edit-clears-timecodes-old-report-preserved-stale");
},90000);
it("recovers a failed link through uploaded text, supplementary text, replay and cancellation",async()=>{
 const page=await context.newPage();await page.goto(workUrl());await page.waitForLoadState("networkidle");await page.locator(".work-report-options>summary").click();await page.getByRole("button",{name:"链接无法读取？上传视频或补充文字",exact:true}).click();
 await page.locator(".work-source-recovery input[type=file]").setInputFiles({name:"合法原文.txt",mimeType:"text/plain",buffer:Buffer.from("上传原文来自合法本地固定内容。")});
 const beforeUploads=await db.sourceItem.count({where:{workspaceId,sourceProvider:"LOCAL_UPLOAD"}});let lostReply=true;
 await page.route("**/works/"+workId+"/source",async route=>{if(lostReply){lostReply=false;await route.fetch();return route.abort("failed");}return route.continue();});
 await page.getByRole("button",{name:"上传并关联",exact:true}).click();await page.getByText("请求中断，请先核对已保存资料，再重试关联。",{exact:true}).waitFor();
 await page.getByRole("button",{name:"上传并关联",exact:true}).click();await page.getByText("已保存原文并关联当前作品，可以开始拆解。",{exact:true}).waitFor();
 expect(await db.sourceItem.count({where:{workspaceId,sourceProvider:"LOCAL_UPLOAD"}})).toBe(beforeUploads+1);
 const work=await db.benchmarkContentSnapshot.findUniqueOrThrow({where:{id:workId}});const linked=(work.metadata as {linkedSourceItemId:string}).linkedSourceItemId;expect((await db.sourceItem.findUniqueOrThrow({where:{id:linked}})).sourceProvider).toBe("LOCAL_UPLOAD");
 await page.getByLabel("补充作品原文").fill("独立补充的核对文字。");await page.getByRole("button",{name:"保存文字并关联",exact:true}).click();
 await expect.poll(async()=>((await db.benchmarkContentSnapshot.findUniqueOrThrow({where:{id:workId}})).metadata as {linkedSourceItemId:string}).linkedSourceItemId).not.toBe(linked);
 await page.getByRole("button",{name:"取消返回",exact:true}).click();expect(await page.getByLabel("补充作品原文").count()).toBe(0);
 const response=await viewer.request.post(workUrl().replace(origin,origin+"/api")+"/source",{data:{sourceItemId:sourceId}});expect(response.status()).toBe(403);
 await page.close();checks.push("upload-and-text-associated-same-work-cancel-viewer-rejected");
},90000);

it("requires an authorized explicit review and never automatically enqueues another transcription",async()=>{
 const job=await db.ingestJob.create({data:{workspaceId,sourceItemId:sourceId,requestedById:userId,jobType:"TRANSCRIBE",provider:"LOCAL_FUNASR",providerMode:"REAL",status:"FAILED",errorCode:"ASR_RESULT_UNCERTAIN"}});
 const url=origin+"/api/ingest-jobs/"+job.id+"/review",input={confirmation:"CONFIRMED_NO_RESULT",note:"已核对隔离模拟服务，确认没有可恢复的结果。"};
 const anonymous=await browser.newContext();
 expect((await anonymous.request.post(url,{data:input})).status()).toBe(401);await anonymous.close();
 expect((await viewer.request.post(url,{data:input})).status()).toBe(403);
 expect((await context.request.post(url,{data:{confirmation:"CONFIRMED_NO_RESULT",note:"短"}})).status()).toBe(400);
 expect((await context.request.post(origin+"/api/ingest-jobs/"+randomUUID()+"/review",{data:input})).status()).toBe(404);
 const count=await db.ingestJob.count({where:{workspaceId}});
 expect((await context.request.post(url,{data:input})).status()).toBe(200);
 expect((await db.ingestJob.findUniqueOrThrow({where:{id:job.id}})).errorCode).toBe("ASR_CONFIRMED_NO_RESULT");
 expect(await db.ingestJob.count({where:{workspaceId}})).toBe(count);
 expect(await db.auditLog.count({where:{workspaceId,resourceId:job.id,action:"transcription.uncertain_reviewed"}})).toBe(1);
 expect((await context.request.post(url,{data:input})).status()).toBe(409);
 checks.push("asr-admin-review-auth-validation-audit-no-auto-retry");
},90000);
