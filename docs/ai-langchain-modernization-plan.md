# MeteorTest AI and LangChain Modernization Plan

## Decision

LangChain is worth introducing locally, but it should not replace the whole MeteorTest AI stack now.

Recommended approach:

1. Refactor the current AI Chat boundaries first.
2. Introduce LangChain JS only in the Web AI orchestration layer.
3. Add SQL-based report Q&A before vector search.
4. Add Supabase pgvector and RAG after enough report data exists.
5. Keep the Agent failure analyzer lightweight for now.

## Project Assessment

MeteorTest already has a useful testing-platform loop:

- The Web console manages projects, suites, builds, tasks, reports, executors, and AI entry points.
- The Local Agent performs private execution and writes logs/reports back.
- Supabase handles Auth, RLS, platform data, task state, and report data.
- AI already supports failure analysis, task lookup, report summaries, and account-scoped conversations.

The main gap is not the lack of LangChain. The main gap is that the AI layer needs clearer module boundaries before it grows into report Q&A, RAG, and more tools.

## Recommended Scope

Use LangChain for:

- Chat model calls.
- Tool schemas and tool execution flow.
- Structured output.
- Report query tools.
- Future retrievers, pgvector, and RAG.

Do not use LangChain yet for:

- Core task/report/project business logic.
- Local Agent polling and execution.
- Agent-side failure analysis.
- Page state and UI suggestions.
- Full LangGraph multi-agent workflows.

## Target Architecture

```text
apps/web/app/api/ai/chat/route.ts
        |
        v
apps/web/lib/ai/
  context.ts
  prompts.ts
  tools.ts
  reportQueries.ts
  suggestions.ts
  model.ts
        |
        v
Supabase
  projects
  test_suites
  tasks
  reports
  ai_analyses
  report_documents       future
  report_document_chunks future
```

Future RAG path:

```text
reports / ai_analyses / failed log snippets
        |
        v
chunking
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
AI answer with source references
```

## Phases

### Phase 0: Refactor AI Chat

Do not change behavior. Split the current route into:

```text
apps/web/lib/ai/context.ts
apps/web/lib/ai/prompts.ts
apps/web/lib/ai/tools.ts
apps/web/lib/ai/reportQueries.ts
apps/web/lib/ai/suggestions.ts
apps/web/lib/ai/model.ts
```

Acceptance:

- Existing AI Chat behavior still works.
- Task creation, task detail lookup, executor listing, and failed-report review still work.
- `npm run lint` and `npm run build` pass.

Estimate: 0.5-1 day.

### Phase 1: SQL-Based Report Q&A

Add deterministic tools before vector search:

- `list_recent_failures`
- `get_task_detail`
- `summarize_suite_health`
- `list_reports_by_project`
- `list_reports_by_status`
- `summarize_failure_reasons`

Acceptance:

- Answers are grounded in `tasks`, `reports`, and `ai_analyses`.
- Answers can cite task or report sources.
- No pgvector required.

Estimate: 1-2 days.

### Phase 2: Introduce LangChain JS

Add:

```text
@langchain/core
@langchain/openai
```

Scope:

- Wrap the chat model.
- Represent business operations as LangChain tools.
- Keep Supabase query implementations.
- Keep existing UI suggestion logic.

Risks:

- Validate DeepSeek OpenAI-compatible base URL with LangChain.
- Preserve role checks and server-side authorization.
- Avoid changing UI behavior unnecessarily.

Estimate: 1-2 days.

### Phase 3: Supabase pgvector and RAG

Index only:

- `reports.summary`
- `ai_analyses.failure_reason`
- `ai_analyses.impact`
- `ai_analyses.suggestion`
- Sanitized failed-log snippets.

Do not index first:

- Full logs.
- Full code repositories.
- Internal URLs, tokens, accounts, or device identifiers.
- Large Allure raw files.

Suggested tables:

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

Acceptance:

- User questions can retrieve semantically related historical failures.
- Answers include source references such as task id, suite, and report summary.
- The system says when it cannot verify an answer.

Estimate: 2-4 days.

### Phase 4: Evaluation and Cost Control

Prepare 20-50 evaluation questions covering:

- Recent failure summaries.
- Suite stability.
- Similar historical failures.
- Environment-vs-code failure classification.
- Suggested next steps.

Record:

- Question.
- Tools called.
- Retrieved reports/tasks.
- Model answer.
- Token usage.
- Expected-answer match.

Estimate: 1-3 days.

## Cost Notes

LangChain itself does not create model costs. Costs come from:

- Chat model calls.
- Embedding model calls.
- Supabase database and storage.
- Engineering maintenance.

Embedding storage estimate:

```text
one 1536-dimensional float vector ~= 6 KB
10,000 chunks ~= 60 MB
with indexes and metadata ~= 100-200 MB
```

Cost controls:

- Index only failed/timeout tasks first.
- Index summaries, not full logs.
- Deduplicate by content hash.
- Re-embed only when report or analysis content changes.
- Keep retrieval `topK` small, such as 5-10.

## Security Boundaries

- Do not index or send secrets, tokens, cookies, real accounts, or customer data.
- Public preview must use demo or sanitized data.
- Keep the private Agent off the public internet.
- Treat embeddings as derived sensitive data.
- Sanitize logs before AI and embedding calls.

## Improvement Backlog

1. Split `/api/ai/chat/route.ts`.
2. Add SQL report Q&A tools.
3. Add tool-call and answer-source logging.
4. Align Web AI and Agent AI model configuration names.
5. Add sanitization for logs and AI inputs.
6. Build 20-50 AI evaluation questions.
7. Introduce LangChain JS for Web AI tools.
8. Add pgvector after report data accumulates.
9. Add task/report source references to RAG answers.
10. Consider LangSmith, LangGraph, or a dedicated vector database only after the simpler path proves useful.

## First Executable Version

The first implementation should only:

1. Split the AI Chat route.
2. Add SQL report Q&A tools.
3. Keep the current OpenAI SDK.
4. Avoid pgvector until the feature proves valuable.

This gives the project a low-risk way to validate AI report Q&A before adding LangChain and RAG complexity.
