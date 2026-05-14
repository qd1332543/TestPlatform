# MeteorTest 质量与 AI 能力增强路线

更新时间：2026-05-15

## 定位

这份文档承接 `PROGRESS.md` 中“后续能力增强”的部分，用来指导后续 AI coding agent 逐步实现 MeteorTest 的质量平台能力。

`PROGRESS.md` 继续作为项目整体进度索引，不再承载每个能力的详细实施步骤。详细实施方案放在本文档，执行手册和专项 runbook 继续放在对应主题文档中。

下一阶段目标不是简单增加页面，而是把平台从“能调度和展示任务”推进到：

```text
结构化测试结果
-> AI 问题定位与修复建议
-> 任务重跑和验证闭环
-> 质量趋势与覆盖建议
-> AI 测试用例生成和 PR 化
```

## 总体原则

- 先沉淀结构化数据，再做统计、AI 和自动化动作。
- 任何浏览器可见数据都必须走 DTO / View Model，避免暴露数据库内部 UUID。
- UI 文案必须进入 `apps/web/content/i18n.ts`，中英文结构保持一致。
- 写操作必须经过角色校验；后续项目级权限落地后，还要经过项目成员关系校验。
- Agent 负责执行和产物解析，Web API 负责权限、展示和用户操作，Supabase 负责持久化和 RLS。
- AI 生成内容默认是建议或草稿，进入测试仓库前必须经过人工确认或 PR 流程。

## 推荐执行顺序

1. 结构化测试结果与用例级报告。
2. AI 失败定位与修复建议结构升级。
3. 任务取消、重跑和失败任务一键验证。
4. AI 测试用例生成草稿。
5. 质量趋势和覆盖建议。
6. AI 生成补丁 / 创建 PR。
7. 平台内测试用例管理。

## Phase 1：结构化测试结果与用例级报告

### 目标

把当前“任务状态 + 报告摘要 + 日志链接”的结果，升级为可查询、可统计、可 AI 分析的用例级数据资产。

### 建议 issue

`[Feature] Add structured test results and case-level reports`

### 数据模型

新增 migration，例如 `010_test_results.sql`：

```text
test_results
- id uuid primary key
- task_id uuid references tasks(id)
- project_id uuid references projects(id)
- suite_id uuid references test_suites(id)
- case_key text
- case_name text
- file_path text
- class_name text
- status text
- duration_ms integer
- error_message text
- stack_trace text
- failure_category text
- attempt integer default 1
- raw jsonb
- created_at timestamptz
```

约束建议：

- `status` 限制为 `passed / failed / skipped / xfailed / xpassed / error / unknown`。
- `(task_id, case_key, attempt)` 建唯一索引。
- 开启 RLS，authenticated 用户可读；写入由 service role / Agent 完成。

### Agent 改动

涉及路径：

- `agent/reporters/supabase_reporter.py`
- `agent/executors/pytest_executor.py`
- 新增 `agent/services/test_result_parser.py`

实现要求：

- 优先解析 Allure results JSON。
- 如果没有 Allure results，则从 pytest 输出中提取粗粒度结果，至少写入任务级 fallback case。
- 每个 case 生成稳定 `case_key`，建议用 `file_path + class_name + case_name` 规范化。
- 写入 `test_results` 时不要依赖浏览器展示 ID，内部仍用 task/project/suite UUID。
- 失败 case 需要保留错误摘要和堆栈摘要，避免把超长日志完整写入列表页。

### Web 改动

涉及路径：

- `apps/web/app/tasks/[id]/TaskDetailPage.tsx`
- `apps/web/app/reports/ReportsPage.tsx`
- `apps/web/app/api/tasks/[id]/route.ts`
- `apps/web/content/i18n.ts`

实现要求：

- 任务详情页新增“用例结果”区域。
- 支持按状态筛选：全部、失败、通过、跳过、错误。
- 默认优先展示失败和错误。
- 列表展示公开信息：case name、status、duration、failure summary。
- 不展示 `test_results.id`、`task_id`、`project_id`、`suite_id`。
- API 返回 DTO，例如：

```ts
{
  results: [{
    caseKey,
    name,
    status,
    durationMs,
    filePath,
    failureSummary
  }]
}
```

### 验收

- 一个真实 Agent 任务执行后，`test_results` 有记录。
- 任务详情页能看到用例级结果。
- 失败用例能看到错误摘要。
- 浏览器 payload 不包含 `test_results.id`、`task_id`、`project_id`、`suite_id`。
- `npm run lint`、`npm run build` 通过。
- `python -m compileall agent`、`python -m pytest agent/tests -q` 通过。

### AI agent 执行提示

```text
请实现 MeteorTest Phase 1：结构化测试结果与用例级报告。
先阅读 AGENTS.md、docs/quality-ai-capability-roadmap.zh-CN.md、agent/README.md、apps/web/README.md。
创建 issue，label 至少包含 feature 和 area:agent 或 area:web。
新增 Supabase migration、Agent 解析与写入逻辑、任务详情页用例结果 DTO 和 UI。
不要暴露内部 UUID。所有新增 UI 文案写入 apps/web/content/i18n.ts。
完成后运行 Web 和 Agent 验证，并提交 PR，PR 底部写 Closes #issue。
```

## Phase 2：AI 失败定位与修复建议结构升级

### 目标

把 AI 分析从“原因说明文本”升级为“定位、修复、验证”的结构化结果，让用户可以直接把建议交给代码 AI 或测试工程维护者执行。

### 建议 issue

`[Feature] Structure AI failure diagnosis and repair guidance`

### 数据模型

扩展 `ai_analyses`：

```text
- root_cause_summary text
- suspected_layer text
- suspected_files jsonb
- repair_steps jsonb
- verification_steps jsonb
- ai_repair_prompt text
- confidence numeric
- evidence jsonb
```

字段语义：

- `root_cause_summary`：简短原因。
- `suspected_layer`：`product / test_code / environment / data / dependency / unknown`。
- `repair_steps`：面向人或 AI 的修复步骤。
- `verification_steps`：修完后如何验证。
- `ai_repair_prompt`：可复制给代码 AI 的精简上下文。
- `evidence`：日志片段、失败用例、报告链接等证据摘要。

### Agent / AI 改动

涉及路径：

- `agent/services/ai_analyzer.py`
- `agent/reporters/supabase_reporter.py`
- `apps/web/lib/analysisPackage.ts`
- `apps/web/app/tasks/[id]/TaskDetailPage.tsx`

实现要求：

- AI prompt 要求返回严格 JSON。
- 解析失败时保留 raw response，并给出 fallback 分析。
- 页面优先展示：问题定位、修复步骤、验证步骤、AI 修复提示词。
- 原因说明放在次级区域。
- 导出的 AI 修复交接 Markdown 使用这些结构化字段。

### 验收

- 失败任务产生结构化 `ai_analyses`。
- 任务详情页能清晰看到定位、修复、验证。
- AI 修复提示词可以复制或导出。
- 旧数据没有新字段时页面不报错。

### AI agent 执行提示

```text
请实现 MeteorTest Phase 2：AI 失败定位与修复建议结构升级。
不要只改页面文案，要同时调整 ai_analyses migration、Agent AI analyzer、Supabase reporter、任务详情展示和分析包导出。
用户最关心问题定位和如何修复，所以 UI 优先级必须是定位 -> 修复 -> 验证 -> 原因。
保留旧数据兼容。
```

## Phase 3：任务取消、重跑和失败任务一键验证

### 目标

让平台具备基本任务操作能力，形成“失败 -> 修复 -> 重跑验证”的闭环。

### 建议 issue

`[Feature] Add task cancellation and rerun workflow`

### 数据模型

可新增：

```text
task_runs 或 task_events
- id
- task_id
- event_type
- actor_type
- actor_ref
- payload
- created_at
```

也可以第一版先复用 `tasks.parameters` 记录 `rerun_of`、`cancel_reason`，但长期建议建立事件表。

### Web/API 改动

涉及路径：

- `apps/web/app/api/tasks/[id]/route.ts`
- `apps/web/app/tasks/[id]/TaskDetailPage.tsx`
- `apps/web/app/tasks/TasksPage.tsx`
- `apps/web/content/i18n.ts`

实现要求：

- queued 任务允许取消。
- running 任务允许请求取消，实际停止由 Agent 下轮检查或执行器支持决定。
- succeeded/failed/timeout 任务允许重跑。
- 重跑使用原任务的公开 ref，服务端解析到内部 ID 后复制参数。
- 新任务记录 `rerun_of_display_id` 或公开来源信息。
- UI 显示“重跑自 MT-...”。

### Agent 改动

涉及路径：

- `agent/agent.py`
- `agent/services/supabase_task_client.py`

实现要求：

- 领取任务前跳过 cancelled。
- 长任务执行前后检查取消状态。
- 第一版不强制 kill 子进程也可以，但必须把能力边界写清楚。

### 验收

- queued 任务可以取消。
- failed 任务可以一键重跑。
- 重跑任务参数和原任务一致。
- 浏览器不传内部 task UUID。

## Phase 4：AI 测试用例生成草稿

### 目标

平台可以基于项目协议、已有测试结构和用户输入，生成测试用例草稿，但不直接写入主分支。

### 建议 issue

`[Feature] Add AI test case draft generator`

### 输入

- 项目 key。
- 测试范围 key。
- 用户输入的需求或场景。
- 可选：接口文档、页面流程、失败报告、已有用例样例。

### 输出

- 测试目标。
- 前置条件。
- 测试数据。
- 断言点。
- pytest / Appium / Locust 代码草稿。
- 需要人工确认的风险点。
- 推荐保存路径。
- 验证命令。

### Web 改动

第一版可以放在 AI 中枢，不单独做完整用例管理页面：

- AI 中枢新增“生成测试用例草稿”快捷入口。
- 用户选择项目和测试范围，输入场景。
- AI 返回结构化草稿卡片。
- 支持复制 Markdown、复制代码、导出草稿。

### 后端改动

涉及路径：

- `apps/web/app/api/ai/chat/route.ts`
- 后续可拆分到 `apps/web/lib/ai/*`

实现要求：

- 读取项目的 `meteortest.yml` 元信息。
- 第一版不需要拉取完整 Git 仓库代码。
- 如果没有足够上下文，AI 必须列出缺失信息，而不是编造。
- 生成内容必须标注“草稿，需要人工确认”。

### 验收

- AI 可以为 API 冒烟、UI 冒烟分别生成不同风格草稿。
- 输出包含验证命令。
- 不直接修改测试仓库。
- 不生成承诺一定可执行的表述。

## Phase 5：质量趋势和覆盖建议

### 目标

基于 `tasks`、`reports`、`test_results`、`ai_analyses` 形成质量趋势和覆盖建议。

### 建议 issue

`[Feature] Add quality trends and coverage insights`

### 指标

- 项目成功率趋势。
- 测试范围成功率趋势。
- 失败最多的用例。
- 失败最多的测试范围。
- 平均执行耗时。
- flaky 候选用例。
- 环境维度失败分布。
- API / UI / 性能健康度。

### Web 改动

- Dashboard 增加质量趋势摘要。
- Project Detail 增加项目质量概览。
- Reports 增加失败聚合和筛选。
- AI 中枢支持“最近失败最多的用例是什么？”这类 SQL 型问答。

### 验收

- 至少能按最近 7 天和 30 天查看趋势。
- 没有足够数据时显示清晰空状态。
- 趋势查询走服务端聚合，不把原始大表全量传给浏览器。

## Phase 6：AI 生成补丁 / 创建 PR

### 目标

在测试用例草稿稳定后，支持生成 patch 或 GitHub PR，但仍需要人工确认。

### 建议 issue

`[Feature] Generate test case patches and GitHub PR drafts`

### 能力边界

可以做：

- 生成 diff patch。
- 创建新分支。
- 提交测试用例草稿。
- 创建 PR 草稿。
- 触发 MeteorTest 验证任务。

不应该做：

- 直接推主分支。
- 无确认合并 PR。
- 自动修改生产配置。
- 自动生成大量无验证用例。

### 技术路径

- 本地开发阶段可以由 Codex/本机 git 完成 patch。
- 平台产品化阶段需要 GitHub App 或用户授权。
- PR 标题和 body 必须引用平台任务或 AI 草稿 ref。

## Phase 7：平台内测试用例管理

### 目标

在平台内沉淀测试用例资产，支持用例、自动化实现、执行结果之间的映射。

### 建议 issue

`[Feature] Add platform test case management`

### 数据模型

```text
test_cases
- id
- project_id
- case_key
- title
- description
- priority
- tags
- owner
- automation_status
- linked_suite_key
- linked_file_path
- created_at
- updated_at
```

### 能力

- 查看项目下用例列表。
- 关联自动化用例。
- 标记手工 / 自动化 / 待维护。
- 从失败结果反向关联用例。
- AI 根据薄弱区域建议新增用例。

### 边界

这不是当前最优先能力。必须等结构化测试结果和 AI 草稿能力稳定后再做，否则容易变成低价值表单系统。

## 文档维护规则

- `PROGRESS.md`：保留，作为整体进度和入口索引。
- `DESIGN.md`：保留，作为长期产品和架构意图。
- `docs/quality-ai-capability-roadmap.zh-CN.md`：本文档，作为质量与 AI 能力增强执行计划。
- `docs/README.zh-CN.md`：文档目录和阅读顺序。
- 专项 runbook 继续独立存在，例如 Supabase、Agent、Vercel、私有 Agent 闭环。

新增能力时，优先更新本文档的对应 Phase；只有状态变化才同步更新 `PROGRESS.md`。

