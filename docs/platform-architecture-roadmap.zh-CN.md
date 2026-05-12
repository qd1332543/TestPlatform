# MeteorTest 平台架构与推进路线

更新时间：2026-05-12

## 当前定位

MeteorTest 当前已经是早期 Beta 形态的通用自动化测试平台。它由 Web Console、Next.js Server Routes、Supabase、私有 Local Agent 和测试项目契约共同组成。

当前公开预览地址是 `https://meteortest.jcmeteor.com/`。公网 Web 只作为操作台，不直接暴露本地执行器；真实执行由私有 Local Agent 主动轮询 Supabase 后完成。

## 已完成能力

- 项目与套件管理：支持项目创建、详情查看、`meteortest.yml` 套件导入。
- 任务执行链路：Web 创建任务，Agent 轮询领取，执行后写回任务状态和报告记录。
- 构建产物：支持登记 App/Web 构建，并在任务创建时关联。
- 报告闭环：支持日志上传、报告摘要、失败任务 AI 分析、分析包导出。
- AI 中枢：支持查询平台快照、创建任务、创建项目、查询任务详情和生成下一步建议。
- 私有 Agent preview loop：已经验证 Web preview 创建任务后，由私有 Mac Agent 执行并回写报告。
- 协作规则：仓库要求先建 issue、按标题前缀加 label、分支使用 `dev/v-peq/<name>`，PR 底部写 `Closes #<issue>`。

## 本阶段目标

1. Auth + RLS + 角色边界完整落地。
2. 修复 Allure URL 缺失，让报告链路从日志到 Allure 都闭环。
3. 将 private Agent preview loop 做成一键或半自动验证脚本。
4. 增加 Agent 配置校验和清晰错误提示，降低接入新项目时的踩坑成本。

## 权限边界设计

- `viewer`：查看项目、套件、任务、报告、执行器、AI 分析。
- `operator`：继承 viewer，可创建测试任务、登记构建产物。
- `admin`：继承 operator，可创建/编辑/删除项目、导入套件、调整关键平台数据。

访问路径：

- 页面访问通过 Supabase Auth 登录态进入，未登录跳转 `/login`。
- 写操作 API 即使使用 service-role key，也必须先做角色校验。
- 数据库通过 RLS 限制 anon 访问；authenticated 用户按角色读写。
- Local Agent 继续使用 service-role key 私有运行，不放到公网，也不使用用户 session。

## 个人信息页

个人信息入口放在左上品牌区。页面包含：

- 用户名、手机号、邮箱、用户 ID、角色、创建时间、最近登录时间。
- 昵称和头像 URL。
- 权限说明。
- 反馈提交与最近反馈记录。
- 退出登录。

## 登录账号策略

登录页兼容用户名 + 密码、手机号 + 密码：

- 手机号账号直接使用 Supabase Auth 的 `phone + password`。
- 用户名账号在产品层显示为 `username`，并在 `profiles.username` 中记录；Supabase Auth 底层使用内部邮箱别名，例如 `admin@users.meteortest.local`。
- 内部邮箱别名不是用户真实邮箱，也不用于收邮件，只是为了复用 Supabase Auth 的密码、session 和 RLS 能力。
- 昵称 `display_name` 可自由展示；登录用户名建议保持稳定，长度 3-20 位，只使用字母、数字、下划线、短横线。

## 架构边界

当前项目不是传统“独立前端 + 独立后端”的完全分离架构，而是 Next.js 模块化一体架构：

- `apps/web/app/**`：页面和前端交互。
- `apps/web/app/api/**`：平台后端入口，负责服务端密钥、权限判断、AI 工具调用和写操作。
- `apps/web/lib/**`：共享基础设施，例如 Supabase client、auth、i18n、preview access。
- `agent/**`：独立 Python Local Agent，不依赖 Web 运行进程。
- `supabase/migrations/**`：数据库结构、约束、Auth/RLS 权限边界。

后续如果要演进成更强的前后端分离，可以把 `apps/web/app/api/**` 抽成独立 API 服务；当前阶段保留 Next.js Server Routes 更利于快速迭代和部署。

## 已落地的工程改动

- 新增 Supabase `profiles`、`feedbacks`、RLS policies。
- 新增用户名/手机号登录页、个人信息页、退出登录、资料保存、反馈提交。
- API 写操作增加角色检查：任务创建需要 operator，项目管理和套件导入需要 admin。
- Allure 报告路径从实际命令中解析，支持 `--alluredir=...` 和 `--alluredir ...`。
- 新增 `npm run validate:private-agent-loop`，用于创建 preview task 并轮询结果。
- Agent 启动前校验 config，提前提示缺少环境变量、仓库路径、contract 文件、输出目录等问题。

## 下一步建议顺序

1. 按 [Supabase 账号与账号级数据 SQL 执行手册](supabase-account-data-runbook.zh-CN.md) 执行最新版 `004_auth_rls.sql` 和 `005_account_preferences_ai_history.sql`。
2. 在 Supabase Auth 创建管理员账号。用户名账号可用内部邮箱别名，例如 `admin@users.meteortest.local`；手机号账号使用 `+86...` 这类国际格式。
3. 在 `profiles` 表把管理员账号角色改为 `admin`。
4. 部署 Web，验证 `/login`、`/profile`、`/settings`、`/ai`、任务创建、项目管理、构建登记。
5. 在私有机器运行 Local Agent，再运行 `npm run validate:private-agent-loop` 验证闭环。
6. 下一轮推进团队/组织模型、项目级权限、反馈管理后台、任务取消/重跑、报告产物可视化。

## 账号级数据推进计划

跟踪 issue：`#82 [Feature] Add account-scoped preferences and AI conversation history`

### Step 1：账号偏好

状态：已实现，待在 Supabase 执行 `005_account_preferences_ai_history.sql` 后做线上验证。

目标：把当前依赖 `meteortest.settings.v1` localStorage 的关键用户偏好迁移到账号级数据。

数据表：`user_preferences`

字段：

- `user_id`
- `locale`
- `theme`
- `density`
- `default_environment`
- `ai_model`
- `ai_base_url`
- `auto_analyze_failures`

实现规则：

- 登录后服务端读取账号偏好。
- 设置页保存时写 Supabase，并同步写本地缓存。
- 本地缓存保留为未登录、加载前、网络失败时的 fallback。
- 语言 cookie 仍保留，用于 Next.js 首屏 `html lang` 和服务端字典选择；保存账号偏好时同步 cookie。

验收：

- 设置页可从账号偏好加载主题、语言、密度、默认环境和 AI 配置。
- 保存后刷新页面仍保持账号偏好。
- `npm run lint`、`npm run build`、`npm run smoke:public-preview` 通过。

### Step 2：AI 会话历史

状态：已实现账号级 API 与页面接入，待在 Supabase 执行 `005_account_preferences_ai_history.sql` 后做线上验证。

目标：把 AI 对话历史从浏览器 localStorage 迁移到账号级会话记录。

数据表：

- `ai_conversations`
- `ai_messages`

实现规则：

- 每次创建会话、发送消息、收到 AI 回复后落库。
- AI 页面左侧显示账号历史会话。
- 支持删除、重命名、继续会话。
- localStorage 只作为读取失败或未登录状态的临时 fallback。

验收：

- 刷新页面后 AI 历史仍存在。
- 删除/重命名/继续会话能同步到 Supabase。
- AI 发送失败时不能破坏已有历史。
- `npm run lint`、`npm run build`、`npm run smoke:public-preview` 通过。
