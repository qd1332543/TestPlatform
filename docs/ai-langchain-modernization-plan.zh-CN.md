# MeteorTest AI 与 LangChain 渐进改造方案

## 结论

LangChain 值得在 MeteorTest 中局部引入，但不建议现在全量替换。

推荐策略：

1. 先整理现有 AI Chat 的代码边界。
2. 再把 Web 端 AI 编排层局部切到 LangChain JS。
3. 先做 SQL 型报告问答。
4. 等历史报告和失败日志积累后，再加入 Supabase pgvector 和 RAG。
5. Agent 端失败分析暂时保留现有轻量实现。

不要为了使用框架而重写已经能稳定运行的任务调度、Agent 执行、Supabase 数据模型和页面功能。

## 项目评价

MeteorTest 当前已经具备一个清晰的测试平台闭环：

- Web 控制台负责项目、suite、构建产物、任务、报告、执行器和 AI 操作入口。
- Local Agent 负责私有环境中的真实执行、日志收集和报告回写。
- Supabase 负责 Auth、RLS、平台数据、任务状态和报告数据。
- AI 能力已经覆盖失败分析、任务详情查询、报告摘要展示和会话历史。

这个方向是合理的。它没有把测试执行暴露到公网，也没有把测试工程和平台强耦合，而是通过 `meteortest.yml` 和 Local Agent 形成边界。

当前主要短板不是缺少 LangChain，而是 AI 层还缺少可维护的模块边界：

- `/api/ai/chat` 同时承担 prompt、上下文快照、工具调用、动作结果、建议生成和模型调用。
- 报告问答还主要依赖近期任务快照，缺少稳定的查询工具集合。
- pgvector 仍是待办，尚未定义索引对象、chunk 策略、embedding job 和权限边界。
- Agent 失败分析和 Web AI Chat 使用两套模型调用方式，后续需要统一配置和观测，但不必马上统一实现。

## 是否引入 LangChain

建议引入，但只引入到 Web AI 编排层。

适合交给 LangChain 的能力：

- Chat model 调用。
- Tool schema 和 tool execution flow。
- Structured output。
- 报告查询工具。
- 后续 retriever / pgvector / RAG。

暂时不建议交给 LangChain 的能力：

- 任务表、报告表、项目表的核心业务逻辑。
- Local Agent 任务轮询和执行。
- Agent 端失败分析。
- 页面状态、建议按钮和前端 UI。
- 全项目 LangGraph 多 Agent 工作流。

## 推荐目标架构

```text
apps/web/app/api/ai/chat/route.ts
        |
        v
apps/web/lib/ai/
  context.ts          平台上下文快照
  prompts.ts          系统提示词和任务提示词
  tools.ts            LangChain tools / 业务工具包装
  reportQueries.ts    SQL 报告问答查询
  suggestions.ts      前端建议按钮生成
  model.ts            模型配置和 provider 适配
        |
        v
Supabase
  projects
  test_suites
  tasks
  reports
  ai_analyses
  report_documents       后续
  report_document_chunks 后续
```

未来 RAG 版本：

```text
reports / ai_analyses / failed log snippets
        |
        v
document chunking
        |
        v
embedding model
        |
        v
Supabase pgvector
        |
        v
LangChain retriever
        |
        v
AI Chat answer with source references
```

## 分阶段计划

### Phase 0：整理现有 AI Chat

目标：不改变行为，只拆分代码。

建议改动：

- 从 `/api/ai/chat/route.ts` 拆出工具函数。
- 明确模型调用、工具执行、上下文查询、建议生成的责任边界。
- 保留现有 OpenAI SDK 和 DeepSeek base URL。

建议文件：

```text
apps/web/lib/ai/context.ts
apps/web/lib/ai/prompts.ts
apps/web/lib/ai/tools.ts
apps/web/lib/ai/reportQueries.ts
apps/web/lib/ai/suggestions.ts
apps/web/lib/ai/model.ts
```

验收标准：

- AI Chat 行为不退化。
- 创建任务、查询任务详情、列出执行器、查看失败报告仍可用。
- `npm run lint` 和 `npm run build` 通过。

预估投入：0.5 到 1 天。

### Phase 1：SQL 型报告问答

目标：先不用 embedding，用结构化 SQL 支撑高价值问题。

新增工具：

- `list_recent_failures`
- `get_task_detail`
- `summarize_suite_health`
- `list_reports_by_project`
- `list_reports_by_status`
- `summarize_failure_reasons`

示例问题：

```text
最近失败最多的是哪个 suite？
今天有哪些 failed 或 timeout 任务？
某个项目最近 7 天稳定吗？
帮我总结最近失败原因和修复建议。
这个任务的报告和 AI 分析是什么？
```

验收标准：

- AI 回答基于真实 `tasks` / `reports` / `ai_analyses` 数据。
- 回答中能指出来源任务或报告。
- 不需要 pgvector。

预估投入：1 到 2 天。

### Phase 2：局部引入 LangChain JS

目标：只替换 Web AI 编排层，不动 Agent。

建议依赖：

```text
@langchain/core
@langchain/openai
```

改造范围：

- 用 LangChain 包装 Chat model。
- 用 LangChain tools 描述现有业务工具。
- 保留现有 Supabase 查询实现。
- 保留现有前端 suggestion 逻辑。

风险点：

- DeepSeek OpenAI-compatible base URL 与 LangChain OpenAI wrapper 的兼容性要验证。
- Tool calling 的 schema、错误处理和多轮行为需要测试。
- 不要让框架抽象覆盖现有权限检查。

验收标准：

- 原有 AI Chat 功能仍可用。
- 工具调用日志更清晰。
- 新增 SQL 报告问答工具可被模型稳定调用。

预估投入：1 到 2 天。

### Phase 3：Supabase pgvector 与 RAG

目标：在报告数量足够后加入语义检索。

建议只索引：

- `reports.summary`
- `ai_analyses.failure_reason`
- `ai_analyses.impact`
- `ai_analyses.suggestion`
- 截断后的失败日志摘要

不建议第一版索引：

- 完整日志。
- 完整代码仓库。
- 内部 URL、token、账号、设备标识。
- Allure 原始大文件。

建议表：

```sql
report_documents
  id uuid primary key
  task_id uuid references tasks(id) on delete cascade
  source_type text
  title text
  content text
  metadata jsonb
  created_at timestamptz

report_document_chunks
  id uuid primary key
  document_id uuid references report_documents(id) on delete cascade
  chunk_index integer
  content text
  embedding vector(...)
  metadata jsonb
  created_at timestamptz
```

需要配套：

- embedding job。
- 增量更新策略。
- 去重策略。
- 数据脱敏。
- RLS 或 service-role 边界。
- 检索事件日志，便于调试回答来源。

验收标准：

- 用户问题可以召回语义相关的历史失败。
- 回答列出引用来源，例如 task id、suite、report summary。
- 没有引用来源时明确说明无法确认。

预估投入：2 到 4 天。

### Phase 4：评估、观测和成本控制

目标：让 AI 功能可验证、可调优、可控成本。

需要准备 20 到 50 个评估问题：

- 最近失败最多的 suite 是哪个？
- 某个错误以前出现过吗？
- 某个项目过去 7 天稳定吗？
- 这次失败更像环境问题还是代码问题？
- 给我总结最近失败原因和修复建议。

建议记录：

- 用户问题。
- 调用的工具。
- 检索到的任务/报告。
- 模型回答。
- token 用量。
- 是否命中预期答案。

预估投入：1 到 3 天。

## 成本评估

LangChain 本身是开源依赖，不直接产生模型费用。

主要成本来自：

- Chat model 调用。
- Embedding model 调用。
- Supabase 数据库和存储。
- 工程维护和调试。

Embedding 存储粗略估算：

```text
单条 1536 维 float 向量约 6 KB
10,000 个 chunk 约 60 MB
加上索引和 metadata 后可能是 100-200 MB
```

控制成本的方法：

- 只索引 failed / timeout 任务。
- 只索引摘要，不索引完整日志。
- 对同一内容 hash 去重。
- 只在 report 或 ai_analysis 变化后重新生成 embedding。
- 对检索结果设置 topK，例如 5 到 10。

## Supabase 判断

当前阶段 Supabase 可以胜任。

适合继续使用 Supabase 的原因：

- 业务数据已经在 Supabase。
- pgvector 可以和业务表共存。
- RLS 和权限边界更容易统一。
- 少一套外部向量库同步链路。

什么时候考虑 Pinecone、Qdrant、Weaviate 或 OpenSearch：

- chunk 数量达到几十万到百万级。
- 检索并发明显上升。
- 需要专门的混合检索、rerank、搜索运营能力。
- 日志搜索成为平台核心能力，而不是 AI 辅助能力。

## 安全与合规边界

AI 和向量索引必须遵守这些边界：

- 不索引或发送 secret、token、cookie、内部账号和真实客户数据。
- 公网预览只使用 demo 数据或脱敏数据。
- 私有 Agent 不直接暴露到公网。
- 安全漏洞细节不要进入未经批准的第三方模型或向量库。
- embedding 内容也属于派生数据，仍需要按源数据敏感级别处理。
- 对日志做截断、脱敏和最小化保存。

建议新增脱敏函数，覆盖：

- URL query token。
- Bearer token。
- API key。
- email / phone。
- 内部域名或本机路径，视部署策略决定是否保留。

## 需要准备的资源

### 技术资源

- 模型 API key。
- embedding model。
- Supabase pgvector 权限。
- preview Supabase 与生产 Supabase 的数据隔离。
- CI 能跑 `npm run lint`、`npm run build` 和关键 smoke。

### 数据资源

- 20 到 50 个评估问题。
- 一批 failed / timeout 报告样例。
- 一批 succeeded 报告样例，用于避免 AI 只学习失败路径。
- 脱敏日志样例。

### 产品资源

- 明确 AI 报告问答的优先场景。
- 明确是否展示引用来源。
- 明确哪些回答允许触发操作，例如创建任务。
- 明确哪些回答只能建议，不能执行。

## 改进清单

优先级从高到低：

1. 拆分 `/api/ai/chat/route.ts`，降低单文件复杂度。
2. 增加 SQL 型报告问答工具，先不用向量。
3. 为 AI Chat 增加工具调用和回答来源记录。
4. 统一 Web AI 与 Agent AI 的模型配置命名。
5. 为日志和 AI 输入增加脱敏层。
6. 建立 20 到 50 个 AI 问答评估样例。
7. 再引入 LangChain JS 管理 Web AI tools。
8. 报告数据积累后再启用 pgvector。
9. 为 RAG 回答增加 task/report 引用。
10. 最后考虑 LangSmith、LangGraph 或独立向量库。

## 不建议现在做的事

- 不要把 Agent 任务执行改成 LangChain。
- 不要把所有业务查询包装成 Agent 自动决策。
- 不要一开始索引完整代码库。
- 不要一开始索引完整日志。
- 不要引入独立向量数据库作为第一版。
- 不要让 AI 自动改主分支代码或自动执行危险操作。

## 最小可执行版本

第一轮推荐只做这三个任务：

1. 拆分 AI Chat route。
2. 增加 SQL 报告问答工具。
3. 保留 OpenAI SDK，不引入 pgvector。

完成后再判断是否进入 LangChain JS。

这个版本投入小、风险低，并且能直接验证用户是否真的需要 AI 报告问答。
