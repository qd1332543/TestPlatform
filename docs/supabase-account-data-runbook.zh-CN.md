# Supabase 账号与账号级数据 SQL 执行手册

更新时间：2026-05-13

适用范围：MeteorTest preview / production Supabase 项目。

## 执行原则

- 不重复执行 `001` / `002` / `003` 旧初始化 SQL，除非你明确要重建基础业务表和 demo 数据。
- 如果之前已经执行过旧版 `004_auth_rls.sql`，可以重新执行最新版 `004_auth_rls.sql`。该文件使用 `create table if not exists`、`add column if not exists` 和 `drop policy if exists`，用于补齐 Auth/RLS 和策略。
- 本阶段新增账号偏好和 AI 历史统一执行 `005_account_preferences_ai_history.sql`。
- 内部 ID 暴露治理需要执行 `008_display_refs.sql`，用于给任务和构建产物补齐公开显示 ID。
- Supabase SQL Editor 出现 RLS 或 destructive operation 提示时，先确认 SQL 内容是不是本文列出的文件；确认无误后再执行。

## 推荐执行顺序

1. 打开 Supabase Dashboard。
2. 进入目标项目。
3. 打开 `SQL Editor`。
4. 执行最新版 `supabase/migrations/004_auth_rls.sql`。
5. 执行 `supabase/migrations/005_account_preferences_ai_history.sql`。
6. 执行 `supabase/migrations/008_display_refs.sql`。
7. 在 `Authentication > Users` 创建管理员账号。
8. 在 `Table Editor > profiles` 中找到该用户，把 `role` 改成 `admin`。
9. 登录 `https://meteortest.jcmeteor.com/` 验证页面和权限。

## 004_auth_rls.sql 做什么

该文件负责账号基础能力和 RLS 边界：

- 创建或补齐 `profiles`。
- 创建或补齐 `feedbacks`。
- 为平台核心表开启 RLS。
- 增加 viewer / operator / admin 对应的读写策略。
- 支持登录页、个人信息页、反馈、角色权限检查。

如果你已经执行过旧版 004，重新执行最新版的目的只是补齐新增列、函数和 policy，不是清空数据。

## 005_account_preferences_ai_history.sql 做什么

该文件负责账号级用户数据：

- `user_preferences`：保存语言、主题、密度、默认环境、AI 模型、AI Base URL、失败自动分析开关。
- `ai_conversations`：保存当前用户的 AI 会话。
- `ai_messages`：保存会话内的用户消息、AI 回复、建议动作和工具结果。

所有三张表都开启 RLS：

- 用户只能读取、创建、更新自己的偏好。
- 用户只能读取、创建、重命名、删除自己的 AI 会话。
- 用户只能向自己的 AI 会话写入消息。

## 008_display_refs.sql 做什么

该文件负责内部 ID 暴露治理需要的公开引用：

- 给 `tasks` 增加 `display_id`，格式类似 `MT-20260513-0001`。
- 给 `app_builds` 增加 `display_id`，格式类似 `BLD-20260513-0001`。
- 为已有任务和构建产物回填显示 ID。
- 创建唯一索引，保证显示 ID 不重复。
- 创建 `public.next_display_id(prefix, table_name)`，供服务端创建新任务和构建产物时生成显示 ID。

该迁移不会删除业务表或清空数据。Supabase 如果提示 destructive operations，主要来自函数替换或索引/策略类 DDL，执行前确认文件内容来自本仓库即可。

## 管理员账号创建建议

用户名登录：

- Supabase Auth 用户邮箱可填写内部占位邮箱，例如 `admin@users.meteortest.local`。
- 这个邮箱不是真实收件邮箱，只用于 Supabase Auth 的密码、session 和 RLS。
- 在 `profiles.username` 中填写真实登录用户名，例如 `admin`。

手机号登录：

- 使用国际格式，例如 `+8613800000000`。
- 当前实现支持手机号 + 密码；手机号验证码暂不作为本阶段目标。

## 执行后验证

在 SQL Editor 执行：

```sql
select tablename, rowsecurity
from pg_tables
where schemaname = 'public'
  and tablename in ('profiles', 'feedbacks', 'user_preferences', 'ai_conversations', 'ai_messages')
order by tablename;
```

期望结果：

- 五张表都能查到。
- `rowsecurity` 都是 `true`。

再检查 policy：

```sql
select tablename, policyname, cmd
from pg_policies
where schemaname = 'public'
  and tablename in ('profiles', 'feedbacks', 'user_preferences', 'ai_conversations', 'ai_messages')
order by tablename, policyname;
```

最后在 Web 上验证：

- `/login` 可以登录。
- `/profile` 可以展示用户信息、角色、反馈入口。
- `/settings` 保存语言、主题、密度、默认环境和 AI 配置后，刷新仍保持。
- `/ai` 新建对话、发送消息、刷新、重命名、删除都能保持一致。

## 常见提示

`New tables will not have Row Level Security enabled`

- 这是 Supabase 对新表的通用提醒。
- 本项目 SQL 后续包含 `alter table ... enable row level security` 和 policy 创建语句，确认文件完整后可以执行。

`Query has destructive operations`

- 主要来自 `drop policy if exists`。
- 这里删除的是旧 policy，然后立刻用同名策略重建，不会删除业务表数据。
- 不要把这个提示理解成一定会删表；但执行前仍要确认 SQL 文件来自本仓库最新版本。
