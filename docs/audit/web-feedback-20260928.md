# Web 用户反馈增量验收 · 2026-09-28

本报告仅记录本批实际证据，不将代码已写等同于全部验收完成。

## 已完成并有证据

- Skill 普通 Markdown 导入：原文存入 workflowContract.rawMarkdown，兼容旧结构；无需固定章节。浏览器完成预览、保存、详情原文、去使用自动选择。旧记录无原文件时明确显示历史内容，不能恢复不存在的原文。
- Skill 管理：列表编辑入口、启停、删除确认；服务端 workspace + owner 校验，删除审计；删除会级联 Skill 版本与使用关联，保留对话和成果正文。隔离、版本保留及删除测试通过。
- Skill 真实模型调用：初始验收项目 cmuku6oew0091q938cdzuqcvv 返回指定结构及“先行动，再调整”。该项目后来在浏览器返回404，未尝试恢复或更改用户数据。
- 输入框：数字1/2/3、Backspace和Delete逐键验证，输入后值2；输入前后坐标宽度一致。Shift+Enter/Enter受当前IME状态影响，本轮未确认物理键盘完全通过。
- 成果：真实成果 cmukr4uu4006pq9bwe82m5jvq 在模态窗口打开，Markdown内容完整，关闭回到聊天及紧凑成果入口。
- 研究：横向导航、账号卡片/数据表切换代码；真实账号显示20条发现作品和0/8条收录资料，截图验证布局。趋势当前页概览使用真实快照，不生成虚构趋势。
- DeepSeek原生搜索：已有公司DeepSeek密钥，官方Anthropic兼容接口HTTP200，返回server_tool_use、web_search_tool_result，usage显示1次搜索。不是模型文本中猜测链接。
- Agent联网链路：独立项目 cmukuj47h0001q99k3dxayt4x 完成红狐今日热门作品榜检索及DeepSeek官方通知网页检索，回复保留真实来源和检索时间。
- 搜索正文增强：再读取前两个公开来源，复用GenericUrlSourceProvider的SSRF防护和上限；实测6个来源、2篇可读正文，2893字符证据。失败保留限制说明。
- Exa：作为其他模型可选搜索服务，密钥公司级加密。免密真实调用限流，未填Key，不声称通过Exa真实验收。当前DeepSeek无需新增Exa密钥。
- 本机存储开关已在Web重启后生效，目录选择实现及迁移9项测试通过；未替用户选择/迁移真实目录，Windows选择窗口尚未人工验收。

## Tests

- 全8包typecheck通过（web-search-typecheck.log）。后续正文增强Web typecheck通过。
- Skill/Agent/search/fact-safety合计47项测试通过（agent-quality-tests.log）。
- 先前PDF4项、存储9项、模型配置51项通过，历史结果不代替修改后对应回归。

## 数据库与Git

新增IntegrationProvider.WEB_SEARCH枚举，执行精确ADD VALUE SQL，未运行migration deploy。对应迁移文件20260928142000_web_search_provider/migration.sql保留供审查。
Web3017、Worker3018已重启。未执行git add/commit/push/reset/clean/stash。

## 仍需验收

- 物理输入法的Enter/Shift+Enter、全部键盘快捷键。
- 原生目录选择窗口和用户选定目录后的迁移。
- 创作偏好保存、折叠侧栏及项目菜单细项回归。
- Agent模糊意图、热点转创作、多轮改稿的完整最新回归；搜索目前按显式检索/时效表达触发，不宣称等同官方聊天端完整工具编排。
- 所有后续调整汇总后的完整Web Release回归尚未重新执行。
