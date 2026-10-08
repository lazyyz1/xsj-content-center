# W2 共享成果编辑器实施卡 — 2026-10-05

STATUS：当前人工明确批准的小批；不含新schema、品牌/临时Task建模、私研究自动分享或真实外调。W1与旧未提交hunk保留，不使用旧build作当前证明。

主要目标：项目ArtifactWindow与研究WorkCreationAction共用手动编辑、expectedVersion保存、冲突保留、仅导出已保存版本、未保存保护。先提取研究侧现有导航保护和编辑保存实现，再接入项目；保留研究原入口及创建/生成业务。实际权限沿Artifact API，不改角色或归属。

八路径开工快照在output/workbench-iteration-20261005/W2/before：新use-artifact-editor.tsx/artifact-editor.tsx；artifact-window.tsx/css；studio-shell.tsx只补editable传入；work-creation-action.tsx提取编辑；global-search.tsx非anchor导航接保护；新shared-artifact-editor-browser.test.ts。允许必要直接依赖最小hunk先记录；不改Prompt/model/research执行器/后端版本API。

隔离验收：55436/本机3020可丢弃认证fixture，模型生成仅拦截mock SSE，实际Artifact GET/POST/PUT走原Next API；测试不得伪造PUT成功或绕过鉴权。覆盖重复保存、旧版保留、真实409冲突保留、导出保存版、切成果/项目/关闭/刷新/返回、跨workspace与VIEWER、研究同成果再编辑、W1搜索node准确定位。保留截图和清理证据。不发邮件/采集、不开Worker、不重启3000或迁移55432。

定向type/lint/client边界；阶段末记录实际通过/未测与精确diff。稳定后再构建当前production，不反复引用失效旧产物。后续handoff单独卡，若需改变私人/团队默认可见则先停止该项报告，其他已授权小卡继续。

实际收口：八路径完成共享编辑器；最终16项隔离定向测试、Web typecheck、精确lint、客户端边界及最新production候选验收通过，3020/3030已退出、fixture清零、日常3000保持。交付见workbench-W2-delivery-20261005.md。研究交接批尚未开始。
