# Vercel 公网预览部署流程

这份 runbook 用于把 MeteorTest Web 部署到 Vercel，作为公网预览。只有按这里完成并验证后，才应该把 MeteorTest Web 的公网地址写入 README、个人官网或项目文档。

## 部署目标

这次只部署 Web 控制台：

- 访问者可以打开 MeteorTest Web UI。
- 当前预览地址：`https://meteortest.jcmeteor.com/`。
- 部署连接隔离的预览 Supabase 项目或 schema。
- 密钥放在 Vercel Project Settings，不进入 Git。
- Local Agent 执行保持私有。
- 公网联网执行仍然不在本阶段范围内，必须等认证、数据隔离、限流和执行器安全设计完成后再做。

## 你必须手动提供或操作的部分

以下步骤涉及账号归属、浏览器登录或真实密钥，必须由项目所有者手动完成：

1. 用目标 GitHub 账号登录 Vercel。
2. 授权 Vercel 访问 `JunchenMeteor/MeteorTest`。
3. 创建或选择一个预览 Supabase 项目。
4. 在这个预览项目中执行 Supabase migrations。
5. 从 Supabase 复制真实的 Supabase URL、anon key 和 service-role key。
6. 决定是否给预览环境启用 `DEEPSEEK_API_KEY`。
7. 在 Vercel Project Settings 中添加环境变量。
8. 在 Vercel 中点击 Deploy 或 Redeploy。
9. 把公网预览 URL 或部署错误日志发回来，供后续排查。

不要把真实 service-role key、API key 或私有项目 URL 粘贴到聊天、issue、PR 描述、README、截图或提交文件中。

## Codex 可以帮你做的部分

Codex 可以在仓库侧完成这些事：

1. 用 `npm run lint` 和 `npm run build` 验证 Web 应用。
2. 检查代码实际读取了哪些环境变量。
3. 更新 README、AGENTS、PROGRESS 和 runbook。
4. 如果公网预览暴露了令人困惑的入口，补充安全提示或不可用状态。
5. 在你提供脱敏错误日志后，分析 Vercel build 失败原因。
6. 部署后帮你检查公网 URL 的页面行为。
7. 准备修复 PR。

Codex 不应该替你配置生产密钥，也不应该登录你的 Vercel、Supabase 或 AI 服务账号。

## Vercel 项目配置

导入配置：

```text
Git repository: JunchenMeteor/MeteorTest
Framework preset: Next.js
Root Directory: apps/web
Install Command: npm ci
Build Command: npm run build
Output Directory: 默认 / 留空
Node.js version: 22
```

环境变量：

```text
NEXT_PUBLIC_SUPABASE_URL=https://your-preview-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-preview-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-preview-service-role-key
DEEPSEEK_API_KEY=可选
METEORTEST_AGENT_DISABLED=1
METEORTEST_PUBLIC_PREVIEW=1
METEORTEST_PREVIEW_ACCESS_TOKEN=可选的共享预览口令
```

这些值要配置在 Vercel Project Settings 中，不要提交 `.env.local`。

`METEORTEST_PREVIEW_ACCESS_TOKEN` 会启用应用级预览访问门禁。它和 `METEORTEST_PUBLIC_PREVIEW=1` 同时存在时，访问者需要先输入口令才能加载页面。API 调用方可以通过 `x-meteortest-preview-token` 请求头传入同一个值。只有在 Vercel Deployment Protection 或其他访问控制已经启用的短期预览中，才建议留空。

不要在 Vercel 中配置 `METEORTEST_SMOKE_NO_SUPABASE`。这个变量只给 CI smoke check 使用，用来在没有真实 Supabase 密钥的情况下验证公网预览安全边界。

重要边界：

- `NEXT_PUBLIC_SUPABASE_URL` 和 `NEXT_PUBLIC_SUPABASE_ANON_KEY` 会暴露到浏览器端。
- `SUPABASE_SERVICE_ROLE_KEY` 和 `DEEPSEEK_API_KEY` 只能服务端使用。
- 不要给 service-role key 或 AI 服务 key 加 `NEXT_PUBLIC_` 前缀。
- 不要在公网部署中配置 `METEORTEST_REPO_ROOT`、`METEORTEST_AGENT_PYTHON`、`METEORTEST_AGENT_INTERVAL`、本地仓库路径或本机 Agent 配置，除非已经完成执行安全设计。
- 公网预览部署不得尝试启动 Local Agent。`/executors` 和 `/api/agent/status` 应显示 disabled/unavailable 状态。
- 如果配置了 `METEORTEST_PREVIEW_ACCESS_TOKEN`，它只能放在 Vercel Project Settings 服务端环境中，不要粘贴到 issue、PR 描述、截图或客户端代码里。

## Supabase 预览环境

使用专门的预览 Supabase 项目，或清晰隔离的预览 schema。

按顺序执行迁移：

```text
supabase/migrations/001_init.sql
supabase/migrations/002_app_builds.sql
supabase/migrations/003_constraints.sql
```

第一次公网预览优先使用空数据或 demo 数据。不要接入真实设备记录、私有 app 构建、内部 URL、真实测试账号或生产报告存储。

如果需要初始化公开安全的 demo 数据，在迁移后执行：

```text
supabase/seed-preview.sql
```

这个 seed 会创建 demo `iOS-Automation-Framework` 项目、`api_smoke` suite、占位构建元数据、离线的 `local-agent-demo` 执行器、queued/succeeded/failed 任务、报告摘要和一条合成 AI 分析记录。它只用于预览页面，不要改成包含私有端点、本机路径、凭据、真实设备或生产产物的数据。

## Vercel 页面操作流程

1. 打开 Vercel。
2. 选择正确的个人账号或 team。
3. 选择 `Add New...`，再选择 `Project`。
4. 导入 `JunchenMeteor/MeteorTest`。
5. 在项目配置中，把 `Root Directory` 设置为 `apps/web`。
6. 确认 framework 是 `Next.js`。
7. 把 install command 设置为 `npm ci`。
8. 把 build command 设置为 `npm run build`。
9. 如果导入页面没有显示 Node.js 版本，在 Project Settings 中设置 Node.js version 为 `22`。
10. 打开 Environment Variables，为需要的环境添加上述变量。
11. 点击 Deploy。

如果后续修改了环境变量，需要重新部署。Vercel 的环境变量变更不会影响已经创建的旧部署。

## 部署后的第一次 smoke check

部署前后，仓库 CI 会运行：

```bash
npm run smoke:public-preview
```

这个本地 smoke check 会用公网预览开关构建 Web 应用，启动隔离的预览服务，验证预览访问门禁，验证 `/api/agent/status` 保持 disabled，验证 `/executors` 渲染公网预览边界提示，并扫描本机路径、密钥变量名、堆栈信息或 Agent 启动入口。它会故意使用 `METEORTEST_SMOKE_NO_SUPABASE=1`；真实 Vercel 预览应该使用 Project Settings 中配置的 Supabase 变量。

打开部署 URL，检查：

1. `/` 可以加载。
2. `/projects` 可以加载。
3. `/tasks` 可以加载。
4. `/reports` 可以加载。
5. `/builds` 可以加载。
6. `/executors` 可以加载，并且没有暴露本机路径或公网 Local Agent 端点。
7. `/settings` 可以加载。
8. API 调用不会输出密钥、service-role key、本机路径或包含私密值的堆栈。
9. 如果没有配置 `DEEPSEEK_API_KEY`，AI assistant 应显示清晰的不可用状态。

如果页面失败，保留 Vercel deployment log、浏览器 console 和 network 错误，但要先脱敏密钥。

## 预览 URL 可用之后

只有 URL 验证通过后，再做这些事：

1. 把 MeteorTest Web 公网预览链接加到个人官网。
2. 更新 `README.md`、`README.zh-CN.md`、`PROGRESS.md` 和 `AGENTS.md`。
3. Phase 12 公网联网执行继续保持延期，除非安全设计已经完成。

然后按这个顺序继续加固：

1. 公网预览模式：确保公网部署不可能启动本机 Agent，并记录不可用状态。
2. 访问保护：长期公开前启用 Vercel Deployment Protection、`METEORTEST_PREVIEW_ACCESS_TOKEN` 或等价保护。
3. 预览数据：执行 `supabase/seed-preview.sql` 初始化安全 demo 项目、suite、任务、报告、执行器和构建数据。
4. 任务/报告体验：通过状态、日志、失败分类、AI 分析和下一步建议，让 failed task 可读。
5. 私有 Agent 闭环：上述稳定后，按照 `docs/private-agent-preview-loop.zh-CN.md` 让私有 Local Agent 连接 preview backend。

## 参考资料

- Vercel project settings: https://vercel.com/docs/project-configuration/project-settings
- Vercel environment variables: https://vercel.com/docs/projects/environment-variables
- Next.js environment variables: https://nextjs.org/docs/pages/guides/environment-variables
- 私有 Agent 预览闭环：`docs/private-agent-preview-loop.zh-CN.md`
