# MeteorTest

<p align="center">
  <strong>面向多项目、多套件、本地执行器和 AI 分析的自动化测试平台</strong>
</p>

<p align="center">
  <img alt="Next.js" src="https://img.shields.io/badge/Next.js-16-black?style=for-the-badge&logo=nextdotjs" />
  <img alt="Supabase" src="https://img.shields.io/badge/Supabase-PostgreSQL-3ECF8E?style=for-the-badge&logo=supabase&logoColor=white" />
  <img alt="Python" src="https://img.shields.io/badge/Python-Local_Agent-3776AB?style=for-the-badge&logo=python&logoColor=white" />
  <img alt="AI" src="https://img.shields.io/badge/AI-DeepSeek-4B7BFF?style=for-the-badge" />
</p>

MeteorTest 是一个通用自动化测试平台，用来管理多个测试项目、导入测试套件、创建测试任务、调度本地执行器、收集测试报告，并通过 AI 辅助分析失败原因和测试结果。

当前产品中文名是 **星流测试台**。`MeteorTest` 是工程和产品英文名，`meteortest.yml` 仍作为测试工程接入协议文件名保留，避免破坏既有自动化项目的接入方式。

## 目录

- [作者](#作者)
- [设计初衷](#设计初衷)
- [核心能力](#核心能力)
- [功能矩阵](#功能矩阵)
- [系统架构](#系统架构)
- [项目结构](#项目结构)
- [本地启动 Web](#本地启动-web)
- [接入测试项目](#接入测试项目)
- [运行 Local Agent](#运行-local-agent)
- [推荐验证流程](#推荐验证流程)
- [验证和 CI](#验证和-ci)
- [成本说明](#成本说明)
- [路线规划](#路线规划)

## 作者

MeteorTest 由 **流星** 发起和维护。

作者长期关注客户端工程质量、自动化测试、iOS 工程体系、测试平台化和 AI 辅助研发。这个项目的目标不是做一个只展示数据的后台页面，而是把测试工程、测试任务、执行器、报告和 AI 分析串成一个可以真实落地的闭环。

## 设计初衷

很多自动化测试项目一开始都能跑，但后续会遇到几个典型问题：

- 测试脚本散落在不同仓库，缺少统一入口。
- 测试任务靠人工命令触发，执行记录和报告难以追踪。
- 构建产物、测试环境、测试套件之间没有结构化关联。
- 本地 Mac、真机、模拟器等执行资源无法被平台感知。
- 失败日志越来越多，但真正定位问题仍然靠人工翻日志。
- AI 能分析问题，但如果不能读取平台上下文、不能创建任务、不能查看结果，就只能停留在聊天层面。

MeteorTest 的设计思路是：平台做控制面和数据层，真实执行留在本地 Local Agent；测试工程只暴露一个标准协议文件，平台不侵入业务测试代码。

```text
测试工程        MeteorTest 平台              Local Agent
  |                 |                           |
  | meteortest.yml                           |
  |---------------> | 导入项目 / 套件           |
  |                 | 创建任务 queued           |
  |                 | <----------------------- 轮询任务
  |                 |                           | 执行 pytest / Appium / Locust
  |                 | <----------------------- 回传日志 / 报告 / 状态
  |                 | AI 分析失败原因           |
```

## 核心能力

- 多项目管理：每个被测项目可绑定一个或多个自动化测试仓库。
- 测试套件管理：通过 `meteortest.yml` 导入 API、UI、性能等 suite。
- 构建产物管理：登记 `.ipa`、`.apk`、`.app` 或其他 build URL。
- 任务调度：从 Web 页面或 AI 助手创建任务，Agent 轮询并执行。
- 执行器管理：展示 Local Agent 在线状态、能力标签、心跳和一键启动入口。
- 报告中心：记录日志、Allure 产物、执行摘要和任务状态。
- AI 助手：支持上下文问答、项目创建、任务创建、任务详情查询和结果分析。
- 设置中心：支持平台名称、AI 模型、默认环境、通知策略和 Agent 启动策略配置。

## 功能矩阵

| 模块 | 当前能力 | 状态 |
|---|---|---|
| Dashboard | 平台概览、关键数据入口 | 已接入 |
| 项目中心 | 创建项目、查看项目、导入 suites | 已接入 |
| 任务中心 | 创建任务、查看状态、关联套件和环境 | 已接入 |
| 报告中心 | 查看执行日志、报告产物和结果摘要 | 已接入 |
| 构建产物 | 管理 App 包和构建 URL | 已接入 |
| 执行器 | 查看 Local Agent 状态、一键启动 Agent | 已接入 |
| AI 助手 | 聊天历史、工具调用、快捷建议、任务/项目操作 | 已接入 |
| 设置页 | 平台名、AI 模型、默认参数、启动策略 | 已接入 |

## 系统架构

```text
                    MeteorTest Web Console
                           Next.js
                              |
         +--------------------+--------------------+
         |                    |                    |
      Supabase             AI API              Agent API
 Auth / DB / Storage      DeepSeek            local spawn/status
         |                    |                    |
         |                    |                    |
  projects / suites     context + tools      .meteortest-agent
  builds / tasks
  reports / analyses
         |
         |
                  Local Agent (Python)
                         |
       +-----------------+-----------------+
       |                 |                 |
  meteortest.yml   app artifacts     test command
  suite metadata      ipa/apk/app       pytest/Appium/Locust
```

职责边界：

- `MeteorTest`：平台中心，负责任务、数据、报告、AI、执行器状态。
- `Local Agent`：执行器，负责领取任务、准备环境、跑命令、回传结果。
- 测试工程：只负责测试代码和 `meteortest.yml`，例如 `iOS-Automation-Framework`。
- App 包：被测对象，例如 `.ipa`、`.apk`、内部构建链接。

## 项目结构

```text
MeteorTest/
├── apps/web/                 # Next.js Web 管理台
├── agent/                    # MVP Local Agent
├── docs/                     # 示例接入协议
├── packages/shared/          # 共享类型定义
├── supabase/migrations/      # 数据库迁移 SQL
├── DESIGN.md                 # 产品和架构设计
└── PROGRESS.md               # 开发进度
```

## 本地启动 Web

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
DEEPSEEK_API_KEY=your-deepseek-api-key
```

`DEEPSEEK_API_KEY` 是可选项。没有它时，AI 助手不可用，但项目、任务、报告和执行器页面仍可开发调试。

### 4. 启动 Web

```bash
cd apps/web
npm run dev
```

访问：

```text
http://127.0.0.1:3000
```

注意：如果没有真实 Supabase 配置，页面会因为无法连接数据库而不可完整使用。填好 `.env.local` 后重启 `npm run dev`。

## 接入测试项目

测试项目根目录需要提供 `meteortest.yml`。示例见：

```text
docs/meteortest.example.yml
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
cp config.example.yaml config.yaml
```

配置重点：

```yaml
platform:
  mode: local        # local 或 supabase
  local_task_store: .meteortest-agent/tasks.json
  supabase_url: https://your-project.supabase.co
  supabase_service_role_key_env: SUPABASE_SERVICE_ROLE_KEY

repositories:
  - key: yunlu-ios
    path: ../iOS-Automation-Framework
    contract: meteortest.yml

artifacts:
  local_output_root: .meteortest-agent/artifacts
  supabase_bucket: test-artifacts
```

Supabase 模式需要设置：

```bash
export SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
export SUPABASE_ARTIFACT_BUCKET=test-artifacts
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

Web 执行器页面也提供 Local Agent 状态查看和一键启动入口。设置页中的启动策略可以控制进入执行器页面时是否自动启动 Agent。

## 推荐验证流程

1. 在 Supabase 执行迁移。
2. 启动 Web。
3. 创建 Project，例如 `yunlu-ios`。
4. 进入项目详情，粘贴测试工程的 `meteortest.yml` 并导入 suites。
5. 在 Builds 页面登记 `.ipa` / `.apk` / `.app` 的 URL。
6. 打开执行器页面，确认 Local Agent 已启动。
7. 在 Tasks 页面或 AI 助手中创建任务，选择项目、suite、环境和构建产物。
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

## 路线规划

| 阶段 | 目标 |
|---|---|
| MVP | 跑通项目、套件、任务、Agent、报告、AI 分析闭环 |
| Beta | 增强执行器稳定性、任务重试、报告聚合、权限控制 |
| Team | 支持团队协作、审计日志、通知集成、更多执行资源 |
| Cloud | 引入远程执行器、云真机、分布式调度和插件化能力 |
