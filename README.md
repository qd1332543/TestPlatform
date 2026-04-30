# TestPlatform

TestPlatform 是一个通用自动化测试平台，用来管理多个测试项目、创建测试任务、调度本地执行器、收集测试报告，并用 AI 辅助分析失败原因。

当前定位是低成本 MVP：平台负责控制面和数据层，真实测试执行由 Local Agent 在本地机器完成。

## 核心能力

- 多项目管理：每个被测项目可绑定一个或多个自动化测试仓库。
- 测试套件管理：通过 `test-platform.yml` 导入 API、UI、性能等 suite。
- 构建产物管理：登记 `.ipa`、`.apk`、`.app` 或其他 build URL。
- 任务调度：从 Web 页面创建任务，Agent 轮询并执行。
- 执行器管理：展示 Local Agent 在线状态、能力标签和心跳。
- 报告中心：记录日志、Allure 产物、执行摘要。
- AI 失败分析：失败任务可调用 Claude 生成结构化分析。
- AI 报告问答：基于最近任务、报告和分析结果进行问答。

## 架构

```text
Web Console (Next.js)
  -> Supabase Auth / PostgreSQL / Storage
  -> projects / suites / app_builds / tasks / reports / ai_analyses

Local Agent (Python)
  -> reads test-platform.yml
  -> polls local JSON or Supabase tasks
  -> downloads app artifacts
  -> runs pytest / Appium / Locust commands
  -> uploads logs and Allure results
```

职责边界：

- `TestPlatform`：平台中心，负责任务、数据、报告、AI、执行器状态。
- `Local Agent`：执行器，负责领取任务、准备环境、跑命令、回传结果。
- 测试工程：只负责测试代码和 `test-platform.yml`，例如 `iOS-Automation-Framework`。
- App 包：被测对象，例如 `.ipa`、`.apk`、内部构建链接。

## 项目结构

```text
test-platform/
├── apps/web/                 # Next.js Web 管理台
├── agent/                    # MVP Local Agent
├── docs/                     # 示例接入协议
├── packages/shared/          # 共享类型定义
├── supabase/migrations/      # 数据库迁移 SQL
├── DESIGN.md                 # 产品和架构设计
└── PROGRESS.md               # 开发进度
```

## 本地试用 Web 页面

### 1. 安装依赖

```bash
cd apps/web
npm install
```

### 2. 创建 Supabase 项目

在 Supabase 控制台创建一个新项目，然后在 SQL Editor 中按顺序执行：

```text
supabase/migrations/001_init.sql
supabase/migrations/002_app_builds.sql
supabase/migrations/003_constraints.sql
```

如需 Agent 上传日志和 Allure 压缩包，创建一个 Storage bucket，例如：

```text
test-artifacts
```

MVP 阶段可以先使用 public bucket，方便 Web 页面直接打开报告文件。生产环境应改成私有 bucket + 签名 URL。

### 3. 配置环境变量

```bash
cd apps/web
cp .env.local.example .env.local
```

填入：

```text
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
ANTHROPIC_API_KEY=your-anthropic-api-key
```

`ANTHROPIC_API_KEY` 是可选项。没有它时，AI 助手和失败分析不可用，但项目、任务、报告页面仍可开发调试。

### 4. 启动 Web

```bash
cd apps/web
npm run dev
```

访问：

```text
http://127.0.0.1:3000
```

当前我已经在本机启动了 dev server，地址是：

```text
http://127.0.0.1:3000
```

注意：如果没有真实 Supabase 配置，页面会因为无法连接数据库而不可完整使用。填好 `.env.local` 后重启 `npm run dev`。

## 接入一个测试项目

测试项目根目录需要提供 `test-platform.yml`。示例见：

```text
docs/test-platform.example.yml
```

最小结构：

```yaml
project:
  key: yunlu-ios
  name: 云鹿商城 iOS

suites:
  - id: api_smoke
    name: API 冒烟测试
    type: api
    command: python -m pytest API_Automation/cases -v --alluredir=Reports/platform/{task_id}/allure-results
    requires:
      - python
      - pytest
    report:
      allure: true
```

平台导入 suite 时兼容 `id`、`key`、`suite_key` 三种字段。

## 运行 Local Agent

### 1. 安装 Agent 依赖

```bash
python -m pip install -r agent/requirements.txt
```

### 2. 准备配置

```bash
cd agent
copy config.example.yaml config.yaml
```

配置重点：

```yaml
platform:
  mode: local        # local 或 supabase
  local_task_store: .test-platform-agent/tasks.json
  supabase_url: https://your-project.supabase.co
  supabase_service_role_key_env: SUPABASE_SERVICE_ROLE_KEY

repositories:
  - key: yunlu-ios
    path: ../iOS-Automation-Framework
    contract: test-platform.yml

artifacts:
  local_output_root: .test-platform-agent/artifacts
  supabase_bucket: test-artifacts
```

Supabase 模式需要设置：

```bash
set SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
set SUPABASE_ARTIFACT_BUCKET=test-artifacts
```

Windows PowerShell：

```powershell
$env:SUPABASE_SERVICE_ROLE_KEY="your-service-role-key"
$env:SUPABASE_ARTIFACT_BUCKET="test-artifacts"
```

### 3. 启动 Agent

```bash
python -m agent.agent --config agent/config.yaml --interval 10
```

Agent 会：

- 注册或更新 executor。
- 轮询 queued 任务。
- 锁定任务并置为 running。
- 下载任务关联的 app build。
- 执行 suite command。
- 写回 tasks、reports、ai_analyses。

## 操作流程

推荐 MVP 验证流程：

1. 在 Supabase 执行迁移。
2. 启动 Web。
3. 创建 Project，例如 `yunlu-ios`。
4. 进入项目详情，粘贴测试工程的 `test-platform.yml` 并导入 suites。
5. 在 Builds 页面登记 `.ipa` / `.apk` / `.app` 的 URL。
6. 启动 Local Agent。
7. 在 Tasks 页面创建任务，选择项目、suite、环境和构建产物。
8. 等待 Agent 执行。
9. 在任务详情查看状态、日志、Allure 产物和 AI 分析。

## 验证和 CI

本仓库包含 GitHub Actions CI：

```text
.github/workflows/ci.yml
```

PR 会自动运行：

```bash
cd apps/web
npm ci
npm run lint
npm run build
```

以及：

```bash
python -m pip install -r agent/requirements.txt
python -m compileall agent
python -m pytest agent/tests -q
```

本地手动验证：

```bash
python -m pytest agent/tests -q
python -m compileall agent
cd apps/web
npm run lint
npm run build
```

## 成本说明

MVP 阶段按低成本原则设计：

- Web 可以部署在 Vercel 免费额度内。
- 数据库和 Storage 可以先使用 Supabase 免费额度。
- iOS UI 自动化优先使用本地 Mac Agent，不依赖云真机。
- AI 能力按量调用，建议只对 failed / timeout 任务触发。

需要关注的成本来源：

- 测试报告和日志的 Storage 体积。
- AI 分析的调用次数和日志长度。
- 云真机、专用 CI Runner、团队级 Vercel/Supabase 套餐。

成本控制建议：

- 数据库只保存报告索引，不保存大文件正文。
- 日志上传前截断或压缩，AI 分析只取失败片段。
- 定期清理旧报告和临时构建产物。
- 等本地 Agent 闭环稳定后，再考虑云真机和高级调度。

## 当前限制

- Supabase RLS/权限策略还需要按真实部署环境细化。
- Allure 目前上传的是 `allure-results.zip`，不是完整可浏览 HTML 站点。
- AI 报告问答还没有引入 pgvector，只查询最近结构化数据。
- Local Agent 仍在平台仓库内，尚未拆成独立安装包。
- 云真机、智能调度、移动 WebView 入口仍未实现。

## 开发进度

详见：

- [PROGRESS.md](./PROGRESS.md)
- [DESIGN.md](./DESIGN.md)
