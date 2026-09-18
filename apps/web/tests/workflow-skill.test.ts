import { describe, expect, it } from "vitest";
import { parseWorkflowSkill, WorkflowSkillParseError } from "../server/workflow-skill/contract";

const valid = [
  "# 创作方法：知识型口播",
  "",
  "## 基本信息",
  "- 契约版本：workflow-skill-v1",
  "- 输出类型：ORAL_VIDEO_SCRIPT",
  "",
  "## 适用场景",
  "- 解释一个知识问题",
  "",
  "## 输入要求",
  "### 系统自动提供",
  "- 当前资料正文",
  "### 用户补充",
  "- 主题和受众",
  "### 前置条件",
  "- 至少有一个明确问题",
  "",
  "## 执行步骤",
  "1. 先明确问题",
  "2. 再给出判断",
  "",
  "## 判断规则",
  "- 只保留一个主问题",
  "",
  "## 表达规则",
  "- 句子适合自然口播",
  "",
  "## 禁止事项",
  "- 不虚构案例或数字",
  "",
  "## 输出要求",
  "- 标题、正文和行动建议",
  "",
  "## 事实边界",
  "- 只决定表达，不确认事实",
  "",
  "## 来源说明",
  "- 来源类型：EXTERNAL_GPT",
  "- 来源说明：安全合成测试方法",
].join("\n");

describe("workflow skill contract", () => {
  it("parses a valid oral video skill into stable sections", () => {
    expect(parseWorkflowSkill(valid)).toMatchObject({
      contractVersion: "workflow-skill-v1",
      name: "知识型口播",
      outputType: "ORAL_VIDEO_SCRIPT",
      scenarios: ["解释一个知识问题"],
      steps: ["先明确问题", "再给出判断"],
      sourceType: "EXTERNAL_GPT",
    });
  });

  it("reports missing required sections in user language", () => {
    try { parseWorkflowSkill(valid.replace("## 执行步骤", "## 省略步骤")); throw new Error("expected parse failure"); }
    catch (error) { expect(error).toBeInstanceOf(WorkflowSkillParseError); expect((error as WorkflowSkillParseError).issues).toContain("缺少「执行步骤」章节。"); }
  });

  it("rejects unsupported output types", () => {
    try { parseWorkflowSkill(valid.replace("ORAL_VIDEO_SCRIPT", "XIAOHONGSHU_POST")); throw new Error("expected parse failure"); }
    catch (error) { expect(error).toBeInstanceOf(WorkflowSkillParseError); expect((error as WorkflowSkillParseError).issues).toContain("不支持当前输出类型，请使用短视频口播稿。"); }
  });
});
