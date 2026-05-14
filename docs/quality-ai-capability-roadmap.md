# MeteorTest Quality And AI Capability Roadmap

Updated: 2026-05-15

## Purpose

This document turns MeteorTest's next quality-platform improvements into implementation-ready work for AI coding agents.

`PROGRESS.md` remains the top-level progress index. Detailed execution plans should live in focused docs like this one, while runbooks stay in their own topic-specific files.

The next product step is not adding more isolated pages. The goal is to move from task execution visibility to quality intelligence:

```text
structured test results
-> AI diagnosis and repair guidance
-> rerun and verification workflows
-> quality trends and coverage suggestions
-> AI-generated test drafts and PR workflows
```

## Principles

- Build structured data first, then statistics, AI, and automation.
- Browser-facing data must go through DTOs or View Models. Do not expose internal database UUIDs.
- UI copy must be added to `apps/web/content/i18n.ts` with matching `zh-CN` and `en` structure.
- Write operations must check roles. Future project-level permissions must also check project membership.
- The Agent executes and parses artifacts. Web APIs own permissions, display, and user actions. Supabase owns persistence and RLS.
- AI-generated content is a draft by default. It must go through human confirmation or a PR workflow before entering a test repository.

## Recommended Order

1. Structured test results and case-level reports.
2. Structured AI failure diagnosis and repair guidance.
3. Task cancellation, rerun, and failed-task verification.
4. AI test case draft generation.
5. Quality trends and coverage insights.
6. AI patch generation and GitHub PR drafts.
7. Platform test case management.

## Phase 1: Structured Test Results And Case-Level Reports

Suggested issue: `[Feature] Add structured test results and case-level reports`

Goal: turn task summaries and report links into queryable case-level result data.

Add a migration such as `010_test_results.sql`:

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

Implementation areas:

- `agent/reporters/supabase_reporter.py`
- `agent/executors/pytest_executor.py`
- new `agent/services/test_result_parser.py`
- `apps/web/app/tasks/[id]/TaskDetailPage.tsx`
- `apps/web/app/api/tasks/[id]/route.ts`
- `apps/web/content/i18n.ts`

Requirements:

- Prefer parsing Allure result JSON.
- Fall back to a coarse pytest-derived result if Allure is unavailable.
- Generate stable `case_key` values from normalized file path, class name, and case name.
- Do not expose `test_results.id`, `task_id`, `project_id`, or `suite_id` in browser payloads.
- Add a case-results section to task detail, with filters for all, failed, passed, skipped, and error.

Validation:

- A real Agent task writes rows to `test_results`.
- Task detail shows case-level results.
- Failed cases show failure summaries.
- Browser payloads do not include internal IDs.
- `npm run lint`, `npm run build`, `python -m compileall agent`, and `python -m pytest agent/tests -q` pass.

Agent prompt:

```text
Implement MeteorTest Phase 1: structured test results and case-level reports.
Read AGENTS.md, docs/quality-ai-capability-roadmap.md, agent/README.md, and apps/web/README.md first.
Create an issue with feature and relevant area labels.
Add the Supabase migration, Agent parser/writer, task-detail DTO, and UI.
Do not expose internal UUIDs. Put all user-facing copy in apps/web/content/i18n.ts.
Run Web and Agent validation, then open a PR with Closes #issue.
```

## Phase 2: Structured AI Failure Diagnosis And Repair Guidance

Suggested issue: `[Feature] Structure AI failure diagnosis and repair guidance`

Goal: make AI output prioritize problem location, repair steps, and validation steps.

Extend `ai_analyses` with fields such as:

```text
root_cause_summary
suspected_layer
suspected_files
repair_steps
verification_steps
ai_repair_prompt
confidence
evidence
```

Implementation areas:

- `agent/services/ai_analyzer.py`
- `agent/reporters/supabase_reporter.py`
- `apps/web/lib/analysisPackage.ts`
- `apps/web/app/tasks/[id]/TaskDetailPage.tsx`
- `apps/web/content/i18n.ts`

Requirements:

- Prompt the model to return strict JSON.
- Keep a fallback path when parsing fails.
- UI order must be location, repair, validation, then root-cause context.
- Exported AI repair handoff Markdown should use the structured fields.
- Existing analyses without the new fields must still render safely.

## Phase 3: Task Cancellation, Rerun, And Failed-Task Verification

Suggested issue: `[Feature] Add task cancellation and rerun workflow`

Goal: complete the failure-to-verification loop.

Requirements:

- queued tasks can be cancelled.
- running tasks can receive a cancellation request.
- succeeded, failed, and timeout tasks can be rerun with the same public task ref.
- rerun tasks should record their source task display ref.
- Agent skips cancelled tasks and checks cancellation around long execution boundaries.
- Browser routes and APIs use `tasks.display_id`, not internal task UUIDs.

Implementation areas:

- `apps/web/app/api/tasks/[id]/route.ts`
- `apps/web/app/tasks/[id]/TaskDetailPage.tsx`
- `apps/web/app/tasks/TasksPage.tsx`
- `agent/agent.py`
- `agent/services/supabase_task_client.py`
- `apps/web/content/i18n.ts`

## Phase 4: AI Test Case Draft Generation

Suggested issue: `[Feature] Add AI test case draft generator`

Goal: generate test case drafts from a project, test scope, and user scenario without directly modifying the test repository.

Inputs:

- project key
- test scope key
- user scenario
- optional API docs, flow notes, failure report, or existing example

Outputs:

- test objective
- preconditions
- test data
- assertions
- pytest / Appium / Locust draft code
- risks requiring human confirmation
- recommended file path
- validation command

First version:

- Put the workflow in AI Center.
- Read project and `meteortest.yml` metadata.
- Do not clone or edit the test repository yet.
- If context is insufficient, ask for missing information instead of inventing it.
- Mark generated content as a draft requiring human review.

## Phase 5: Quality Trends And Coverage Insights

Suggested issue: `[Feature] Add quality trends and coverage insights`

Metrics:

- project success-rate trend
- test-scope success-rate trend
- most failed cases
- most failed scopes
- average duration
- flaky candidates
- environment failure distribution
- API / UI / performance health

Requirements:

- Support at least 7-day and 30-day views.
- Use server-side aggregation.
- Show clear empty states when there is not enough data.
- Add AI SQL-style report questions such as recent failed cases and suite health.

## Phase 6: AI Patch Generation And GitHub PR Drafts

Suggested issue: `[Feature] Generate test case patches and GitHub PR drafts`

Allowed:

- generate diff patches
- create a branch
- commit test draft changes
- create a draft PR
- trigger a MeteorTest verification task

Not allowed:

- push directly to main
- merge without confirmation
- change production configuration automatically
- generate many unvalidated tests at once

## Phase 7: Platform Test Case Management

Suggested issue: `[Feature] Add platform test case management`

Goal: manage test cases as platform assets after structured test results and AI drafts are stable.

Possible model:

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

This is intentionally later. Building it before structured results and AI drafts would likely create a low-value form system.

