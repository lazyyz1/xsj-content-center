# 鑫世界 Core Web 集成联调验收

STATUS: CORE_INTEGRATION_READY_FOR_POLISH

验收日期：2026-09-28。此状态表示独立集成环境的核心功能链通过，不代表已部署生产。

## 集成环境与来源

- 工位：D:/Documents/ChatGPT/内容生产中心-integration
- 分支：feat/web-integration-release
- 基线：883dd84cd66e4a579b5126b5e317f9c854dd94e5
- Web：http://localhost:3017；Worker 健康端口 3018。
- 独立数据库：127.0.0.1:55435/content_center_agent_test_integration；独立 Redis DB 7；测试使用 DB 8 队列。
- 独立本机存储：output/integration-runtime/media。
- Agent：以内容生产中心-agent 为主，保留隔离、多轮、Streaming、Retry/Cancel、预算、引用、Adapter、Skill、Artifact。原工位的本轮临时整合补丁已精确移出；未覆盖原候选。
- Account：完整吸收稳定 Settings、公司/用户、Credential、测试连接、本机存储、登录设备、诊断及必要权限边界。
- Research：识别到新候选实际在主项目未提交代码中。提取研究链及必要依赖；没有吸收主项目 Home/Canvas 等无关改版。主项目只读。
- 整合前保存 Agent 21/25、Account 52/73、Research 91/338（tracked/untracked）差异清单和代码快照。Agent 数字包含本轮最初后已移出的 Provider 补丁。
- 26 个重叠文件的处理见 core-web-integration-overlap.md；完整快照在 output/integration-audit。

## 真实链路

| 验收项 | 当前结果 |
| --- | --- |
| 登录 / 用户设置 | 真实登录成功，设置窗口及模型配置可用 |
| DeepSeek 配置与连接 | 通过设置 API 保存；真实连接测试通过；请求模型 deepseek-v4-flash，Provider 响应实际模型 deepseek-flash |
| Agent 模型路由 | 使用当前空间 Credential，经 ModelRouter / Provider；PDF 三轮和 Research 创作均为真实 DeepSeek |
| RedFox | 使用集成空间已保存凭据；用户更新配置后真实连接测试、账号资料和作品获取均通过 |
| 真实新账号添加 | 浏览器搜索并添加“李校碎碎念”，真实 Provider ID 61145488681，采集 20 条作品 |
| 主研究样本 | “洋老司「本月有课”：本轮 RedFox 采集 20 条作品，复用现有 Material 对应的 5 条真实 Transcript；不将旧正文冒充新采集 |
| 缺失数据 | 播放量保持 null，未显示假播放量；没有原始评论正文，commentInsights 为空 |
| Research AI 输入 | 实际请求记录包含研究问题、对象、20 条元数据、5 条正文、系统统计、source refs、响应约束；保存在无凭据的 research-request-1.json |
| Research 输出 | 完成第 7 版；20 条逐条分析（5 条正文、15 条标题级），3 个判断、1 个模板、15 个展示块 |
| Evidence | 引文逐字核对、引用范围/分组/数字校验通过；原始摘录、作品 ID、发布时间、观察时间和版本快照持久化；浏览器可打开依据与 Transcript |
| Research Result | COMPLETED 且已保存，ID cmukqz30w0001q9ssrb48ru41；失败调试版本保留，没有伪造或覆盖旧结果 |
| Research → Agent | 浏览器引用搜索找到保存的研究；Agent 实际读取结论，产出 3 个选题，引用链接返回研究 |
| Skill | 浏览器选择一个联调验收 Skill；实际 AIRun manifest 包含其 ID，输出遵循标题/角度/依据/边界要求 |
| Artifact | 浏览器成功保存“基于真实账号研究的三个短视频选题”为现有 TEXT Artifact；另有 PDF 口播稿 |
| PDF | 上传真实《普通高等学校本科专业目录（2026年）》；正文总结、第二轮写稿、第三轮缩短通过 |
| MP4 / FunASR | 上传真实 MP4 → FFmpeg → LOCAL_FUNASR BINARY_DATA → Transcript 成功；Agent 正确逐字引用转录开头 |
| Streaming | PDF 三轮分别收到 558 / 178 / 98 个 delta，首字约 5.17 / 4.01 / 1.21 秒；浏览器研究选题同样流式完成 |
| 退出 / 恢复 | 退出后旧会话 401；重登后 10 条对话消息、2 个 TEXT Artifact、PDF/MP4 资料仍存在 |
| 无变更更新 | 再次研究相同证据返回 unchanged=true，复用第 7 版，新增模型调用 0 次 |

## 实际修复

1. 保留 Account 在 production 使用用户空间 Provider 的策略，避免静默切换系统配置。
2. Windows 深目录上传临时文件触发 ENAMETOOLONG；relay 上传改用 namespaced path，PDF 与 MP4 实际复测通过。
3. RedFox 3201 明确映射余额不足，不回显 Provider 原始信息，不做无意义重试。
4. Research 对允许缺失的观察字段补 null，不编造内容；不再因 omitted nullable field 阻断研究。
5. Research 验证只允许精确绑定对象的系统覆盖数，避免将真实“20 条作品”等误判成伪造，同时继续拦截任意播放/表现数字。
6. 引文/数字错误汇总反馈，最多一次纠正请求；比较必须引用两边证据。失败不形成可用 Result、不覆盖旧结果。
7. Agent 先接收保存结论，再接收较大的 evidence snapshot，防止预算将核心结论挤掉。
8. Account disabled membership/workspace 边界延伸到 Agent、Material 和 Artifact 服务。
9. 内置浏览器不支持 window.prompt，原“保存为成果”报错。仅将这一处替换为项目已有 NameDialog，保留聊天布局、CSS 和其他交互；已真实浏览器保存、刷新验收。原 Agent 工位未改。
10. 更新已有 Provider/Worker fixture 的显式本地测试 transport 许可；生产 HTTPS/DNS 安全不放宽。

## 权限与凭据

- 同空间 VIEWER/EDITOR 的私人对话均为空，不泄露所有者消息；跨空间项目为 404。
- VIEWER 不能创建 Artifact；EDITOR 不能用别人的消息创建自己的成果。
- 普通成员不能连接测试公司 API（403），配置响应 publicConfig 为空且无真实 Key。
- API Key 经已有加密体系保存；公开 API 响应无完整 Key。
- 停用成员/空间在 Agent/Material/Artifact 服务边界被拒绝；对应回归通过。
- 不执行生产 migration deploy。只初始化新隔离 DB，并补齐既有迁移中的两个 active-run 部分唯一索引。

## 验证

- 全仓 8 个包 typecheck：PASS。
- Web 定向 15 文件 / 84 tests：PASS。
- Provider 27 文件 / 167 tests：PASS。
- Credential / integrations 8 文件 / 49 tests：PASS。
- Worker 15 文件 / 136 tests：PASS。
- Core 11 文件 / 33 tests：PASS。
- 后续 Research/Agent 定向回归、真实 HTTP 与内置浏览器操作：PASS。
- git diff --check：PASS；暂存区为空。
- 自动化全仓 Playwright/生产 build 未作为此次通过依据；本次执行了真实服务、API 和浏览器完整主链。

证据位置：output/integration-runtime 下的 redfox-live-collection.json、new-account-collection.json、material-smoke.json、research-smoke.json、research-request-*.json、research-candidate-*.json、research-agent-artifact.json、permissions-recovery.json、final-recovery.json 和测试日志。runtime 与证据目录已忽略，不进入候选提交。

## 范围与限制

RedFox 对这两个账号都仅返回当前可得的 20 条作品，没有可验证下一页游标，采集保留 PARTIAL。这是可见的数据覆盖边界，不阻塞基于已有证据研究，也不宣称获得完整 180 天数据。Machine Transcript 保留误差说明。现有 Context Budget 仍可能截断长资料，并明确显示提醒。

当前没有阻断上述核心功能链的已知问题。统一视觉/导航文案调优留在下一阶段；没有新增 Knowledge、Desktop、Voice、License、Memory、多 Agent、多 Skill、Canvas V2 或 Legacy Cleanup。

Git：未 add、commit、push、reset、clean、stash；所有候选留在 feat/web-integration-release 供人工审查。

CORE_INTEGRATION_READY_FOR_POLISH
