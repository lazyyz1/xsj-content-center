# 已批准账号可恢复停用交付（2026-10-04）

STATUS：已执行，仅保留李俊恒 2629194738@qq.com 启用，其余26个账号可恢复停用；没有永久删除账号、凭证、工作区或业务数据。

## 授权与执行边界

用户明确确认“李俊恒：2629194738@qq.com，只保留这个”，是在“只保留本人、停用其余26人，不永久删除，不转移其他空间数据”的具体建议后批准。正式55432名单与上次只读盘点完全一致；无新增用户、邮箱/角色变化或目标数量歧义。

唯一保留用户ID nUdkAz5T2fOSHIjVnDiAGglQPPctaneR；26个目标按明确ID、邮箱和原角色allowlist限定，包括指定测试SYSTEM_ADMIN 3lTL1lLmo0xEJnsR972qaA6DaBOfFA21。此管理员停用是本次已批准的一次性维护例外，未修改setUserDisabled通用禁止停用SYSTEM_ADMIN的保护，也未降级任何systemRole。

暂停仅本项目daily进程，保存最新数据库完整备份与用户/会话安全元数据、业务摘要；核对维护时没有其他数据库连接。采用SERIALIZABLE事务、User/Session/AuditLog表锁、超时及前后guard；只更新目标User.disabledAt/updatedAt、删除目标Session，并以保留管理员作为批准动作的审计主体新增26条user.disabled记录。全部条件在COMMIT前检查。

## 实际结果

- User总数27不变：启用1、停用26；唯一启用用户为李俊恒2629194738@qq.com。
- 测试管理员仍保留原SYSTEM_ADMIN角色，但disabledAt已设置。没有角色/Workspace权限转移。
- 撤销19条目标会话；事务前保留用户会话数为0，事务后仍0。与早期盘点数量不同的会话状态按本次最新备份执行，未新增或恢复任何会话。
- 保留用户全部字段未变；其他用户只有disabledAt/updatedAt改变，姓名、邮箱、角色等均未改。
- 18条Account凭证记录保留，安全元数据摘要一致；未查询或输出密码/hash/token，未更新密码或删除凭证。完整备份包含数据库内容，仅本地保管。
- 既有业务表安全摘要全部一致；全部历史审计保留，仅新增26条审计。没有修改原空间成员或创作者配置。

| 对象 | 事务前 | 事务后 |
| --- | ---: | ---: |
| Account | 18 | 18 |
| Workspace | 26 | 26 |
| WorkspaceMember | 27 | 27 |
| SourceItem | 32 | 32 |
| SourceAsset | 31 | 31 |
| Transcript | 21 | 21 |
| ContentProject | 44 | 44 |
| DraftBranch | 44 | 44 |
| DraftRevision | 33 | 33 |
| Artifact | 0 | 0 |
| ResearchSession | 0 | 0 |
| ResearchRun | 0 | 0 |
| CreatorProfile | 5 | 5 |
| MethodAsset | 20 | 20 |
| MethodVersion | 27 | 27 |
| AuditLog | 1174 | 1200 |

核对时间：2026-10-04T16:39:29.923Z。客户空间仍按原归属隔离；停用后23个Workspace暂时没有可用成员，涉及16材料、3附件元数据和17项目。数据仍保存，但不会自动授予李俊恒这些空间的访问权。31条附件元数据和已有对象均未操作，本轮未重复读取附件二进制；此前正式切换17/17附件内容校验见切换交付记录。

## 访问验证与入口

生产auth.ts的session创建前置hook在受控依赖下执行，数据库只读disabledAt：26目标全部返回拒绝，保留管理员未被拒绝。没有建立真实会话、fixture、虚构密码或代输本人密码；另只读核对页面/API的disabledAt服务端保护。该验证不是本人密码登录验收。

http://localhost:3000 已用既有daily配置恢复，仅本机监听。恢复后登录页200、正式数据库/存储健康、未登录项目API401。3017/3020仍停止，Worker/采集/付费模型仍关闭。旧55435/review未操作。

未修改业务源码、通用保护或schema；没有migration、git add/commit/push。HEAD保持ae3ff0879029394cec99ccb2f00d012e1e8a52ed。未跑全仓测试/build；本轮为实际状态变更与相关只读服务逻辑/HTTP核验。

## 备份、恢复与剩余项

私有目录：output/account-upgrade-private/account-disable-20261004，已确认Git忽略，不上传。

- before-disable-current.dump：963568字节，SHA256 d8c1842b1cbbf8e300cc8749f89fc422df6fd80a234862ac18cfa596947f5771；备份TOC可读。
- target-state-before.json、keep-sessions-before.json、business-before/after.json、session-counts-before.json、approved-disable-transaction.sql、transaction-result.json、final-verification.json、no-password-access-verification.json、restored-daily-http.json保留准确目标和证据。
- 新会话不会通过恢复旧token重建。常规恢复仅由李俊恒经过现有认证管理入口把指定用户disabled设置为false，保留凭证后重新登录即可；记录user.restored审计。
- 普通25用户可通过用户管理页启用。测试管理员当前UI的canChange保护不允许直接按钮操作；现有受SYSTEM_ADMIN认证的PATCH /api/admin/users/3lTL1lLmo0xEJnsR972qaA6DaBOfFA21允许disabled:false恢复，其通用禁止“停用管理员”保护不变。该恢复需后续明确指令，本次未执行。
- 不用旧全库备份覆盖后续用户写入；备份不是日常恢复停用的首选方式。所有恢复仅限明确目标，不扩大权限或转移其他客户数据。
- 仍待本人用原密码登录核对；未验证本人密码。停用账号仍在管理页显示为已停用，数据库用户数仍27，不冒称已永久清空。
