# 媒体采集与转写管线

## 范围

阶段 3D 的闭环仅覆盖：抖音分享内容 → RedFox 解析 → 视频私有存储 → FFmpeg 提取音频 → 豆包 ASR → Transcript → 素材详情页。Transcript 之后不触发 LLM、内容分析或发布动作。

## 状态语义

`SourceItem.READY` 表示原始视频已经存储成功。转写是附加能力；未配置、排队中或失败都不会回滚 `READY`，重新转写失败也不会覆盖已有 Transcript。

页面通过 `getSourceProcessingState()` 从现有 Source、Asset、Job、Transcript 和 Integration 状态计算四步进度，不新增数据库状态：

1. RedFox 解析
2. 视频保存
3. 音频提取
4. AI 转写

转写展示状态为 `NOT_CONFIGURED`、`NOT_STARTED`、`QUEUED`、`EXTRACTING_AUDIO`、`TRANSCRIBING`、`SUCCEEDED`、`FAILED`。

## 失败与重试

- RedFox 解析或媒体保存失败：素材进入 `FAILED`，详情页提供原采集任务重试。
- FFmpeg 或豆包失败：素材继续保持 `READY`，详情页提供重新转写。
- 已存在 `STORED AUDIO` 时，重新转写直接复用音频。
- 同一 Workspace、同一素材存在 `QUEUED` 或 `RUNNING` 转写任务时，API 返回 `TRANSCRIPTION_ALREADY_RUNNING`，不创建第二个任务。
- 豆包未配置时不自动排队，页面明确显示未配置。

## 外部能力边界

RedFox、豆包、FFmpeg 与 MinIO 均通过现有 Provider / Adapter 层调用。凭证只在服务端解密，API、页面与日志不返回密钥或原始配置。

## 验收

无真实凭证时使用本地 HTTP fixture、真实 MinIO 与真实 FFmpeg 验证完整链路。真实线上验收只允许使用用户提供的抖音来源，并且必须同时具备 RedFox 与豆包凭证。
