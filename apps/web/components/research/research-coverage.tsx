import { z } from "zod";

const schema = z.object({ requested: z.number().int().nonnegative(), observed: z.number().int().nonnegative(), readable: z.number().int().nonnegative(), timed: z.number().int().nonnegative(), visual: z.number().int().nonnegative(), aiSampleCount: z.number().int().nonnegative(), truncated: z.boolean(), sampling: z.enum(["SELECTED", "WINDOW", "HIGH_PERFORMANCE"]), timeRange: z.object({ from: z.string().nullable(), to: z.string().nullable() }), gaps: z.array(z.string()) });

export function ResearchCoverageSummary({ value }: { value: unknown }) {
  const parsed = schema.safeParse(value);
  if (!parsed.success) return <p className="research-notice">这条历史结果没有可用的结构化样本范围，请以来源记录和原研究说明为准。</p>;
  const coverage = parsed.data;
  const date = (value: string | null) => value ? new Date(value).toLocaleString("zh-CN", { timeZone: "Asia/Shanghai" }) : "未提供";
  return <section className="research-section research-coverage-summary"><header><h2>本次数据范围</h2><span>运行时实际记录</span></header><p>请求对象或作品 {coverage.requested} 条；实际检查 {coverage.observed} 条；有可读正文 {coverage.readable} 条；进入本次分析 {coverage.aiSampleCount} 条。有时间码 {coverage.timed} 条，直接画面检视 {coverage.visual} 条。</p><p>样本口径：{coverage.sampling === "WINDOW" ? "保存的采集时间窗口" : coverage.sampling === "HIGH_PERFORMANCE" ? "高表现样本" : "用户选择或已保存的样本"}。{coverage.timeRange.from || coverage.timeRange.to ? `来源窗口 ${date(coverage.timeRange.from)} 至 ${date(coverage.timeRange.to)}。` : "没有统一的来源时间窗口。"}{coverage.truncated ? "正文或样本因本次读取上限而截断。" : ""}</p>{coverage.gaps.length ? <details><summary>查看证据缺口 · {coverage.gaps.length} 项</summary><ul>{coverage.gaps.map((gap, index) => <li key={index}>{gap}</li>)}</ul></details> : null}</section>;
}
