# 内部 ID 暴露治理方案

更新时间：2026-05-13

## 背景

MeteorTest 当前大量使用 Supabase/Postgres UUID 作为主键和外键：

- `profiles.id`
- `projects.id`
- `test_suites.id`
- `tasks.id`
- `executors.id`
- `reports.id`
- `ai_analyses.id`
- `app_builds.id`
- `user_preferences.user_id`
- `ai_conversations.id`
- `ai_messages.id`

这些 ID 是数据库内部关联标识。它们适合数据库约束、RLS、服务端查询和 Agent 回写，不应该作为默认前端展示内容。

## 目标

- 前端默认不展示完整 UUID。
- 前端不把用户、项目、任务、构建、执行器的内部关联 ID 当作业务信息展示。
- 路由、表单、AI 上下文和导出文件优先使用业务可读的显示 ID。
- API 返回给浏览器的数据经过 DTO / View Model 收敛，不直接返回数据库行。
- Supabase RLS 继续负责访问权限，DTO 负责数据暴露边界。

## 非目标

- 不删除数据库主键 UUID。
- 不把 UUID 当作唯一安全机制。权限仍由 Auth、RLS 和服务端角色检查负责。
- 不为了隐藏 ID 牺牲可排查性。必要时可以给 admin 提供折叠的调试信息，但默认不展示。

## ID 分类

### 内部 ID

只允许服务端、数据库、Agent 使用。默认不展示、不导出、不传给 AI。

示例：

- `profiles.id`
- `auth.users.id`
- `tasks.project_id`
- `tasks.suite_id`
- `tasks.executor_id`
- `reports.task_id`
- `ai_analyses.task_id`
- `app_builds.project_id`
- `user_preferences.user_id`
- `ai_messages.user_id`

### 路由 / 操作引用 ID

浏览器需要发起详情页、编辑、删除、创建任务等操作时，可以使用稳定的公开引用，不直接使用内部 UUID。

建议：

- 项目：用 `projects.key`，例如 `yunlu-ios`。
- 套件：用 `project_key + suite_key`。
- 任务：新增 `tasks.display_id`，例如 `MT-20260513-0001`。
- 构建：新增 `app_builds.display_id` 或使用 `project_key + platform + version + build_number` 组合引用。
- 执行器：用 `executors.name`，例如 `local-mac-01`。
- 用户：用 `profiles.username` 或 `display_name`，不使用 `auth.users.id`。

### 显示 ID

用于页面、导出、AI、复制、搜索。

示例：

| 实体 | 当前内部 ID | 推荐显示 ID |
| --- | --- | --- |
| 用户 | `auth.users.id` | `username` / `display_name` |
| 项目 | `projects.id` | `projects.key` |
| 套件 | `test_suites.id` | `suite_key` |
| 任务 | `tasks.id` | `tasks.display_id` |
| 构建 | `app_builds.id` | `app_builds.display_id` |
| 执行器 | `executors.id` | `executors.name` |
| 报告 | `reports.id` | `task.display_id + report.created_at` |
| AI 会话 | `ai_conversations.id` | `title + updated_at` |

## 数据字典 / 显示引用设计

可以增加一个通用显示引用字典，让前端使用公开引用，服务端负责解析到内部 UUID。

建议表：

```sql
create table entity_display_refs (
  id uuid primary key default gen_random_uuid(),
  entity_type text not null,
  entity_id uuid not null,
  display_id text not null,
  label text not null,
  metadata jsonb default '{}'::jsonb,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique (entity_type, display_id),
  unique (entity_type, entity_id)
);
```

示例数据：

```text
entity_type = task
entity_id = 9a2d691c-...
display_id = MT-20260513-0001
label = Yunlu iOS / api_smoke / dev
metadata = { "status": "succeeded", "environment": "dev" }
```

```text
entity_type = project
entity_id = 2d7d...
display_id = yunlu-ios
label = Yunlu iOS
metadata = { "repoLinked": true }
```

前端使用：

- 列表展示 `display_id` 和 `label`。
- 表单 option value 使用 `display_id` 或业务 key。
- API 接收 `display_id`，服务端解析到 `entity_id` 后写数据库。
- AI 工具参数优先使用 `display_id`、`project_key`、`suite_key`。

注意：对于已经有天然业务 key 的表，不一定要额外查字典。

- `projects.key` 可以直接作为项目公开引用。
- `test_suites.suite_key` 需要和 `project_key` 组合使用。
- `executors.name` 可以直接作为执行器公开引用。
- `tasks` 和 `app_builds` 更适合新增 `display_id`。

## API DTO 原则

不要把数据库 row 原样传给前端。

避免：

```ts
select('*')
return NextResponse.json(data)
```

推荐：

```ts
return {
  task: {
    ref: task.display_id,
    status: task.status,
    environment: task.environment,
    project: { key: project.key, name: project.name },
    suite: { key: suite.suite_key, name: suite.name },
    executor: executor ? { name: executor.name } : null,
    createdAt: task.created_at,
  }
}
```

DTO 命名建议：

- `ref`：前端操作引用，例如 `MT-20260513-0001`。
- `label`：用户可读名称。
- `internalId`：默认禁止出现在浏览器 DTO 中。
- `debug.internalId`：只允许 admin 调试视图按需返回。

## 当前需要治理的页面和接口

### Profile

当前风险：

- 个人页显示 `user.id`。

目标：

- 默认隐藏 `user.id`。
- 展示 `username`、`display_name`、`role`、`phone`、`email`。
- 如需要排查，可为 admin 增加折叠的“调试信息”，默认关闭。

### Tasks / Task Detail

当前风险：

- 任务列表、任务详情、报告导出、AI 卡片使用 `tasks.id`。
- `/tasks/[id]` 使用内部 UUID。

目标：

- 新增 `tasks.display_id`。
- 页面展示 `display_id`，不展示完整 UUID。
- 路由迁移到 `/tasks/[ref]`，服务端用 `display_id` 解析内部 UUID。
- 报告导出文件名使用 `display_id`。
- AI 分析包使用 `display_id`。

### Projects / Project Detail

当前风险：

- `/projects/[id]` 使用内部 UUID。
- 项目详情里把 `project.id` 传给管理组件和导入套件表单。

目标：

- 路由迁移到 `/projects/[key]`。
- 前端展示和操作使用 `project.key`。
- 服务端 API 用 `key` 解析内部 ID。

### New Task / New Build Forms

当前风险：

- select option value 使用 `project.id`、`suite.id`、`app_builds.id`。

目标：

- 项目 option value 使用 `project.key`。
- 套件 option value 使用 `suite_key`。
- 构建 option value 使用 `build.display_id`。
- API 接收公开引用，服务端解析内部 ID 后写入 `tasks`。

### Reports

当前风险：

- 报告列表使用任务 UUID 作为详情链接和导出文件名。

目标：

- 使用 `task.display_id`。
- 报告自身不需要展示 `reports.id`。
- 日志和 Allure 链接保留。

### AI Center

当前风险：

- AI 上下文、工具参数、建议 prompt 中使用任务 UUID。
- `taskIdPattern` 专门识别 UUID 并渲染任务链接。

目标：

- AI 上下文中使用 `task.display_id`。
- 工具参数支持 `task_ref`，服务端解析到内部 UUID。
- `task_id` 作为兼容字段暂时保留，但不在提示词中主动暴露。
- 链接识别改为识别 `MT-YYYYMMDD-NNNN` 这类显示 ID。

### Builds

当前风险：

- 构建页查询和关联任务使用 `app_builds.id`。

目标：

- 新增 `app_builds.display_id`。
- 页面展示和表单提交使用 `display_id`。
- 服务端解析后写 `tasks.app_build_id`。

### Executors

当前风险：

- 页面查询 `executors.id`，但主要用于 React key。

目标：

- 前端展示和引用使用 `executors.name`。
- `executors.id` 不展示。
- React key 可以使用 `name`。

## 迁移设计

### 方案 A：给核心表增加 display_id

适合强业务实体：

- `tasks.display_id`
- `app_builds.display_id`

优点：

- 查询简单。
- 路由清晰。
- 导出和 AI 引用稳定。

缺点：

- 每个实体需要单独维护生成规则。

### 方案 B：通用 entity_display_refs 字典

适合统一管理所有实体的显示引用。

优点：

- 统一 DTO 映射。
- 可以记录 label 和 metadata。
- 后续支持多语言 label、别名、搜索。

缺点：

- 查询和同步复杂度更高。
- 需要保证 entity_id 和源表一致。

### 最终落地组合

本治理不采用临时隐藏或中短期折中方案，直接按 API DTO / View Model 边界落地：

- `projects.key`：继续作为项目公开引用。
- `test_suites.suite_key`：和 `project_key` 组合使用。
- `executors.name`：作为执行器公开引用。
- `tasks.display_id`：新增字段。
- `app_builds.display_id`：新增字段。
- `entity_display_refs`：作为后续通用字典能力预留，不阻塞当前 DTO 边界。

## 当前落地状态

- `supabase/migrations/008_display_refs.sql` 新增并回填 `tasks.display_id`、`app_builds.display_id`，并提供 `next_display_id` 生成函数。
- `apps/web/lib/viewModels/displayRefs.ts` 统一生成任务和构建的前端显示引用。
- `/api/tasks` 接收 `project_key`、`suite_key`、`app_build_ref`，服务端解析内部 ID 后写入任务，只返回 `task_ref`。
- `/api/builds` 接收 `project_key`，服务端解析内部项目 ID 后写入构建，只返回 `build_ref`。
- 项目详情和项目管理 API 使用 `projects.key` 作为浏览器侧操作引用。
- 新建任务和新建构建表单不再把 `project_id`、`suite_id`、`app_build_id` 作为 option value 传给浏览器。
- AI Center 的平台快照、工具描述、建议 prompt 和任务卡片使用显示 ID；用户可见文案接入 `apps/web/content/i18n.ts`。
- Task / Report / Build / Dashboard 页面展示和跳转优先使用显示 ID。

## 验收标准

- 普通页面不显示完整 UUID。
- Profile 不默认显示 `auth.users.id`。
- Task / Report / AI 页面使用 `tasks.display_id`。
- Project 路由使用 `projects.key`。
- 新建任务表单不把 `project_id`、`suite_id`、`app_build_id` 暴露为 option value。
- AI prompt、suggestions、analysis package 默认不包含内部 UUID。
- 服务端仍使用内部 UUID 完成数据库关联。
- RLS、角色检查、Agent 回写不受影响。

## 安全边界说明

隐藏 UUID 不是权限控制。真正的权限边界仍然是：

- Supabase Auth
- RLS policy
- API role check
- service-role key 只在服务端和私有 Agent 使用

隐藏 UUID 的价值是：

- 降低内部数据结构暴露。
- 减少用户、AI、导出文件接触内部关联 ID。
- 让产品展示更专业。
- 为后续多租户、项目级权限和审计打基础。
