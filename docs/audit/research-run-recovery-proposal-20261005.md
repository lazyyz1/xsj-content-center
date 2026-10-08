# ResearchRun after 中断恢复诊断与最小修复提案 — 2026-10-05

STATUS：以下为 R1 批准前的诊断/提案历史。R1 现已明确批准并实施，见 architecture-R1-and-common-foundation-delivery-20261005.md；R2 未批准实施，原提案不得作为自动恢复授权。


## 当前机制与风险

- 普通研究、账号V2、作品深度研究、专项/趋势研究 API 在事务创建 ResearchRun 后，只有 created=true 才调用 Next after(executeResearchRun)。maxDuration=900 是生命周期上限，不是持久化队列。已按本地 Next after 文档核对：after 在响应后完成受支持异步工作，但进程崩溃/强制结束仍不会持久保存回调。
- executeResearchRun 先校验真实成员与私人session，再用完整scope、QUEUED、createdAt未超过15分钟的条件updateMany抢占RUNNING，防同一记录并发执行；session权限检查在try之外，权限被撤销时可以在抢占前退出，未由该函数写FAILED。
- 通用研究正常catch会结算FAILED；COMPLETED/FAILED持久更新有status=RUNNING条件。已有部分profile的结算由各自执行器负责。本轮不借通用保护声称所有profile每次外部调用/多阶段结果皆安全。
- getResearchSession/getResearchRunStatus仅把超过15分钟的QUEUED/RUNNING投影为FAILED，未更新数据库。reserveResearchRun在创建新请求时结算超时活跃记录为FAILED/INTERRUPTED；同requestKey既存行会更早返回created=false，不再登记after。
- 15分钟按createdAt计算，不是可靠heartbeat租约；排队延迟会缩短实际执行窗口。新版本研究的scope约束、样本fingerprint复用、私人研究保存与用户追问语义必须保留。
- 风险窗口：①DB提交后进程消失，QUEUED无消费者；②claim后调用前进程消失，RUNNING不再推进；③Provider已经产生费用/响应但保存前进程消失，效果未知；④长期合法执行与createdAt超时投影冲突。不能自动重跑RUNNING来掩盖③。

## 本轮有界验证

55436可丢弃fixture两个诊断用例，测试后级联清理：
1. 创建QUEUED但不登记after（模拟丢失调度状态），把fixture createdAt调到16分钟前；status API显示FAILED，库内仍QUEUED。同requestKey返回同ID/created=false；新requestKey建立v2，旧记录才变FAILED/INTERRUPTED。
2. 模拟中断的RUNNING持久状态并使其过期；API显示FAILED，库内仍RUNNING/finishedAt=null；该fixture workspace ApiUsage=0。没有运行模型或自动重放。
这验证状态/重试行为，不是实际杀Next进程演练，也不是所有profile外部效果测试。本轮没有杀正式进程、没有真实计费调用。

## 无新schema时能做到什么

既有ResearchRun已保存scope、requestKey/hash、status、时间、aiRunId、coverage/blocks；已有partial active index。可以不加表，设计一个专属ResearchRun执行器，扫描限定scope的QUEUED并仍用现有条件claim。但这需要**执行方式切换授权**，且普通研究的输入正文会在执行时重新解析，自动恢复可能看到最新资料，不得默认为“原证据快照重放”。若有强一致snapshot要求，现有字段是否足够要按profile实证，不混接BenchmarkStudy/CollectionRun旧表。

可以可靠恢复“尚未claim的QUEUED意图”，不能仅凭现有createdAt/status证明“RUNNING没有外部效果”。无新schema也可用PG advisory lock防并发、用aiRunId/现有计费记录辅助诊断，但不能据此承诺Provider exactly-once，或自动重做所有RUNNING。

## 建议最小独立修复卡（待具体批准）

第一步：仅结算过期遗留状态并给显式重试（保留原记录/版本，不自动调用模型）。要明确是否保持15分钟createdAt政策，以及结算是服务端维护还是用户触发；同请求标识重放保持幂等，不隐式生成新的研究版本。先补QUEUED/RUNNING真实持久状态与提示一致性的测试。

第二步：另行批准专属ResearchRun消费者/执行生命周期；只恢复QUEUED，RUNNING效果未知进入人工确认，不自动重放。复用原session/member/owner权限和profile分流，不借IngestJob routing、不混Benchmark旧任务。硬禁外调的隔离演练须含commit-after未执行、claim进程中断、同模式并发、撤权、版本保存以及多阶段profile的假Provider效果核对。上线前单独批准执行方式及维护窗口。

如需要可靠heartbeat、完整input snapshot、retry世代或执行receipt新增列，先给具体migration/兼容影响和55436演练计划，未获明确批准不运行迁移。当前不提供会自动运行此提案的脚本，也未启用任何后台进程。

## 推荐一次审批的精确最小动作 R1（未实施）

建议先仅批准R1：保持既有15分钟createdAt政策；在用户读取状态/重放同请求时，对仍为QUEUED且已过期的行按完整workspace/user/session scope条件持久结算FAILED/INTERRUPTED，保留ID、requestKey和历史版本。同key响应仍created=false，不自动创建新研究；只有用户主动提交新的重试请求才按现有reserve建立下一版本。页面将不再出现“显示失败但重放返回QUEUED”的矛盾。没有schema/migration、新后台进程或自动模型重发；当前外调禁用保持。正式3000应用此代码仍需独立运行切换授权。

RUNNING不纳入上述无条件自动结算：可能仍在合法执行或已付费，应显示执行结果需确认/重试可能重复费用，不自动重放。若同批要修改RUNNING提示或显式重试确认流程，需一并明确批准该用户可见状态/确认行为，并先核对各profile终态条件；不以“15分钟到了”证明Provider没执行。本轮不实施这些变更。

后续R2专属持久消费者单独审批：它将自动恢复尚未开始的QUEUED意图，可能按原请求调用模型并产生费用，因此属于执行方式切换，不包含在R1。是否需要新字段取决于snapshot/heartbeat要求；若有新schema先演练后审批迁移。不能把R1描述为全部崩溃恢复已经可靠。

## R1 批准后的实际结果

过期且执行标记全空的 QUEUED 在限定服务读取/重放时原子持久结算，RUNNING 保留并提示结果需核查；同 key 不调度，仅显式新请求按既有规则继续。50项直接测试与类型/lint/边界通过，未重启3000/未批量扫55432/未执行R2。此前正文关于投影失败、待批准和未实施的描述只用于追溯；当前行为以本节和实际交付为准。
