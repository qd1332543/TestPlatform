# 通用自动化测试平台需求与实施方案

> 版本：v1.0  
> 日期：2026-04-29  
> 当前基础项目：iOS-Automation-Framework  
> 目标：从单项目自动化测试工程，逐步演进为支持多项目接入、三端统一操作、AI 辅助测试分析的通用测试平台。

---

## 1. 背景与目标

当前已有 `iOS-Automation-Framework` 项目，具备以下基础能力：

- 基于 `pytest` 的 API 自动化测试。
- 基于 `Appium + XCUITest` 的 iOS UI 自动化测试。
- 基于 `Locust` 的性能测试能力。
- 基于 `Allure` 的测试报告能力。
- 基于 `FastAPI + Alpine.js` 的本地 Web 控制台。
- 初步 AI 问答入口。

当前项目本质上是一个面向“云鹿商城”的自动化测试工程，附带本地 Web 控制台。它不是严格意义上的平台工程。

未来目标是建设一个可供多个项目接入和多人使用的通用测试平台，支持：

- 多项目测试接入。
- 测试任务创建、调度、执行、查询。
- API / UI / 性能 / 后续更多类型测试。
- Web / iOS / Android 三端统一入口。
- 测试报告、失败分析、质量趋势统计。
- AI 辅助触发测试、分析失败、查询报告、生成测试用例草稿。

---

## 2. 总体结论

当前项目可以作为平台建设的基础，但不建议直接把当前仓库硬改造成平台本体。

更合理的定位是：

```text
iOS-Automation-Framework
  -> 第一个接入平台的测试项目
  -> 平台执行协议的样板项目
  -> 本地 Mac Agent 的首个验证项目
```

平台本体建议新建独立仓库，例如：

```text
test-platform
  -> 项目管理
  -> 任务调度
  -> 用户权限
  -> 报告中心
  -> AI 分析
  -> 三端统一界面
  -> 执行器管理
```

这样可以避免平台逻辑和云鹿商城测试逻辑耦合过深，也方便后续接入更多测试项目。

---

## 3. 产品定位

### 3.1 平台定位

建设一个低成本、可扩展、可维护的通用自动化测试平台。

平台负责：

- 管理测试项目。
- 管理测试套件。
- 创建测试任务。
- 分配执行器。
- 收集执行结果。
- 展示日志和报告。
- 分析失败原因。
- 支持自然语言触发测试。

### 3.2 当前项目定位

`iOS-Automation-Framework` 负责：

- 云鹿商城 API 自动化测试。
- 云鹿商城 iOS UI 自动化测试。
- 云鹿商城性能测试。
- 提供可被平台识别的测试套件配置。
- 运行本地 Agent，作为第一个执行样板。

当前项目不应该承担：

- 多项目管理。
- 用户权限。
- 平台级数据库。
- 通用任务调度中心。
- 三端统一产品界面。
- 多租户能力。

---

## 4. 用户角色

| 角色 | 主要诉求 | 典型操作 |
|---|---|---|
| 平台管理员 | 管理平台基础配置 | 管理用户、项目、执行机、权限 |
| 测试负责人 | 关注项目测试质量 | 配置项目、查看趋势、查看失败分布 |
| 测试开发工程师 | 维护自动化测试能力 | 编写用例、配置套件、分析失败 |
| QA 测试人员 | 快速执行和查看结果 | 一键触发测试、查看日志和报告 |
| 项目负责人 | 了解版本质量 | 查看成功率、失败模块、质量趋势 |

---

## 5. 核心对象模型

平台需要抽象以下核心对象：

| 对象 | 说明 |
|---|---|
| Workspace | 团队空间，用于隔离不同团队或组织 |
| User | 用户 |
| Role | 用户角色和权限 |
| Project | 被测项目，例如云鹿商城、其他 App 或 Web 项目 |
| Test Repository | 自动化测试代码仓库 |
| Test Suite | 测试套件，例如登录 API、购物车 UI、全量回归 |
| Test Case | 单条测试用例，后续用于更细粒度管理 |
| Environment | 测试环境，例如 dev、staging、prod |
| Device | 本地真机、模拟器、云真机 |
| Executor | 执行器，例如本地 Mac、GitHub Actions、云真机农场 |
| Task | 一次测试任务 |
| Run | 一次具体执行记录 |
| Report | 日志、截图、Allure、统计结果 |
| Analysis | AI 分析结果，例如失败原因、修复建议、趋势摘要 |

---

## 6. 功能需求

### 6.1 P0：最小可用闭环

目标：在低成本前提下跑通“创建任务 -> 执行测试 -> 回传结果 -> 查看报告”。

| 编号 | 功能 | 说明 |
|---|---|---|
| P0-01 | 项目管理 | 支持创建项目、配置测试仓库信息 |
| P0-02 | 测试套件管理 | 支持配置 API 冒烟、API 全量、UI 全量等套件 |
| P0-03 | 测试任务创建 | 用户可从 Web 页面选择项目、环境、套件并创建任务 |
| P0-04 | 本地 Agent 执行 | 本地 Mac Agent 轮询任务并执行 pytest/Appium |
| P0-05 | 任务状态查询 | 支持 queued、running、succeeded、failed、cancelled、timeout |
| P0-06 | 日志上传与查看 | 执行日志上传到平台并可在任务详情页查看 |
| P0-07 | Allure 报告接入 | 支持展示 Allure 报告链接或归档文件 |
| P0-08 | 基础 Dashboard | 展示今日执行数、成功率、失败任务、最近任务 |
| P0-09 | AI 失败分析 | 测试失败后自动分析原因并给出建议 |

### 6.2 P1：平台化增强

| 编号 | 功能 | 说明 |
|---|---|---|
| P1-01 | 多项目接入 | 支持多个测试项目通过统一协议接入 |
| P1-02 | 执行器管理 | 支持查看本地 Agent 在线状态、能力标签、最近心跳 |
| P1-03 | GitHub Actions 执行器 | 用于运行轻量 API 测试或无设备依赖任务 |
| P1-04 | AI 报告问答 | 支持自然语言查询历史报告、日志、代码 |
| P1-05 | 失败趋势统计 | 统计模块失败率、flaky 用例、环境问题比例 |
| P1-06 | 权限基础能力 | 区分管理员、测试负责人、普通 QA |
| P1-07 | 响应式移动 Web | 移动端可查看任务、触发任务、查看报告 |

### 6.3 P2：高级能力

| 编号 | 功能 | 说明 |
|---|---|---|
| P2-01 | 云真机农场接入 | 接入腾讯 WeTest、AWS Device Farm 或其他设备云 |
| P2-02 | 自然语言生成测试用例 | 根据测试场景生成 pytest 代码草稿 |
| P2-03 | 用例管理系统 | 支持在线维护手工用例、自动化用例映射 |
| P2-04 | 三端原生封装 | iOS / Android 使用 WebView 或 React Native 封装 |
| P2-05 | 多执行器智能调度 | 根据任务类型、设备、成本自动选择执行器 |
| P2-06 | 报告导出 | 支持 PDF / HTML / 分享链接 |
| P2-07 | CI/CD 深度集成 | 支持 PR 触发、版本发布前自动测试、质量门禁 |

---

## 7. 非功能需求

| 类型 | 要求 |
|---|---|
| 成本 | 第一阶段不购买长期服务器，优先使用免费额度和本地 Agent |
| 可扩展性 | 平台与测试项目解耦，通过统一配置和执行协议接入 |
| 可维护性 | 平台代码、测试项目代码、执行 Agent 职责分离 |
| 安全性 | 测试凭据和 Token 不写入仓库，使用环境变量或平台密钥管理 |
| 可观测性 | 任务状态、执行日志、Agent 心跳必须可查看 |
| 可靠性 | Agent 需要支持心跳、任务锁定、超时、失败重试 |
| 兼容性 | 第一阶段重点支持 Python + pytest，后续扩展 Playwright、Jest、Newman 等 |

---

## 8. 推荐技术架构

### 8.1 低成本个人开发者架构

```text
Web / Mobile UI
  -> Vercel / Netlify 部署前端

Supabase
  -> Auth：用户登录
  -> PostgreSQL：项目、任务、报告、执行器状态
  -> Storage：日志、截图、Allure 报告

Local Mac Agent
  -> 轮询任务
  -> 执行 pytest / Appium
  -> 上传日志和报告
  -> 更新任务状态

GitHub Actions Executor
  -> 执行轻量 API 测试
  -> 上传 artifact

Future Cloud Farm Executor
  -> 执行云真机测试
```

该方案的优点：

- 前期不需要购买服务器。
- iOS UI 自动化继续使用本地 Mac，符合现实环境约束。
- Supabase 免费额度足够支撑 MVP。
- 后续可以平滑迁移到常驻后端和独立 Worker。

### 8.2 后期标准平台架构

```text
Test Platform
├── Web / Mobile UI
├── API Server
├── Task Scheduler
├── Database
├── Object Storage
├── AI Analysis Service
├── Executor Manager
│   ├── Local Mac Executor
│   ├── Docker Executor
│   ├── GitHub Actions Executor
│   └── Cloud Device Farm Executor
└── Project Adapters
    ├── iOS-Automation-Framework
    ├── Android Test Repo
    ├── Web Test Repo
    └── API Test Repo
```

---

## 9. 为什么不优先使用完整 Serverless 后端

Serverless 适合轻量 API、页面接口、任务创建等场景，但不适合直接承担长时间测试执行。

原因：

- UI 自动化任务可能运行很久，容易超过 Serverless 执行时长限制。
- iOS UI 自动化依赖 macOS、Xcode、Appium，普通 Serverless 环境无法满足。
- 日志实时流、任务取消、设备控制、报告生成都更适合常驻执行器。
- 测试任务需要心跳、锁定、重试等机制，单纯 Serverless 会增加复杂度。

推荐方式：

```text
Serverless / BaaS
  -> 做控制面和数据层

Local Agent / Worker
  -> 做真实测试执行
```

---

## 10. 平台仓库设计

建议新建仓库：

```text
test-platform/
├── apps/
│   ├── web/
│   │   ├── app/
│   │   ├── components/
│   │   ├── lib/
│   │   └── package.json
│   └── mobile/
│       └── README.md
├── packages/
│   ├── shared/
│   ├── api-client/
│   └── ui/
├── supabase/
│   ├── migrations/
│   └── functions/
├── docs/
│   ├── architecture.md
│   ├── product-requirements.md
│   ├── executor-protocol.md
│   └── ai-capabilities.md
└── README.md
```

### 10.1 apps/web

负责平台 Web 管理台：

- Dashboard
- 项目中心
- 任务中心
- 报告中心
- AI 助手
- 执行器管理

### 10.2 apps/mobile

第一阶段可先留空或只保留说明。

后续可选：

- 响应式 Web。
- WebView 封装。
- React Native。
- Flutter。

### 10.3 packages/shared

共享类型定义：

- Project
- Suite
- Task
- Run
- Report
- Executor
- Analysis

### 10.4 supabase

负责数据库迁移和可选 Edge Functions。

---

## 11. 当前项目改造方案

当前仓库：

```text
iOS-Automation-Framework/
├── API_Automation/
├── UI_Automation/
├── Performance/
├── Reports/
├── tools/webui/
├── agent/
└── test-platform.yml
```

### 11.1 新增 test-platform.yml

用于描述该测试项目如何被平台识别和执行。

```yaml
project:
  key: yunlu-ios
  name: 云鹿商城 iOS 自动化测试
  description: 云鹿商城 API、iOS UI 和性能测试项目

suites:
  - id: api_all
    name: API 全量测试
    type: api
    command: python -m pytest API_Automation/cases -v
    report:
      allure: true

  - id: api_smoke
    name: API 冒烟测试
    type: api
    command: python -m pytest API_Automation/cases -v -m smoke
    report:
      allure: true

  - id: ui_all
    name: iOS UI 全量测试
    type: ui
    command: python -m pytest UI_Automation/Tests -v -n 0
    requires:
      - macos
      - xcode
      - appium
    report:
      allure: true

  - id: performance_all
    name: 性能测试
    type: performance
    command: locust -f Performance/locust_scripts/locustfile.py --headless
```

### 11.2 新增 agent 目录

```text
agent/
├── agent.py
├── config.example.yaml
├── executors/
│   ├── pytest_executor.py
│   └── appium_executor.py
├── reporters/
│   └── supabase_reporter.py
└── services/
    ├── task_client.py
    ├── heartbeat.py
    └── artifact_uploader.py
```

Agent 职责：

- 读取本地 `test-platform.yml`。
- 注册当前执行器能力。
- 定时发送心跳。
- 轮询平台待执行任务。
- 锁定任务，避免重复执行。
- 执行对应测试命令。
- 收集日志、截图、Allure 报告。
- 上传产物。
- 更新任务状态。

### 11.3 保留 tools/webui

`tools/webui` 可以保留为本地 Demo 控制台，但长期应弱化为：

- 本地调试入口。
- 平台 Agent 的辅助界面。
- 测试项目内部开发工具。

平台正式页面不建议继续放在当前仓库中。

---

## 12. 数据库设计草案

### 12.1 projects

| 字段 | 说明 |
|---|---|
| id | 项目 ID |
| key | 项目标识 |
| name | 项目名称 |
| repo_url | 测试仓库地址 |
| description | 描述 |
| created_at | 创建时间 |

### 12.2 test_suites

| 字段 | 说明 |
|---|---|
| id | 套件 ID |
| project_id | 所属项目 |
| suite_key | 套件标识 |
| name | 套件名称 |
| type | api / ui / performance |
| command | 默认执行命令或执行模板 |
| requires | 环境依赖 |

### 12.3 executors

| 字段 | 说明 |
|---|---|
| id | 执行器 ID |
| name | 执行器名称 |
| type | local_mac / github_actions / cloud_farm |
| status | online / offline / busy |
| capabilities | 能力标签 |
| last_heartbeat_at | 最近心跳时间 |

### 12.4 tasks

| 字段 | 说明 |
|---|---|
| id | 任务 ID |
| project_id | 项目 ID |
| suite_id | 测试套件 ID |
| environment | 测试环境 |
| status | queued / running / succeeded / failed / timeout / cancelled |
| executor_id | 执行器 ID |
| parameters | 执行参数 |
| created_by | 创建人 |
| created_at | 创建时间 |
| started_at | 开始时间 |
| finished_at | 结束时间 |

### 12.5 reports

| 字段 | 说明 |
|---|---|
| id | 报告 ID |
| task_id | 任务 ID |
| log_url | 日志地址 |
| allure_url | Allure 报告地址 |
| screenshots | 截图地址 |
| summary | 执行摘要 |
| created_at | 创建时间 |

### 12.6 ai_analyses

| 字段 | 说明 |
|---|---|
| id | 分析 ID |
| task_id | 任务 ID |
| failure_reason | 失败原因 |
| impact | 影响范围 |
| suggestion | 修复建议 |
| suspected_files | 疑似相关文件 |
| flaky_probability | flaky 概率 |
| raw_response | AI 原始响应 |

---

## 13. 原型设计框架

### 13.1 Dashboard

展示内容：

- 今日执行任务数。
- 成功率。
- 平均耗时。
- 失败任务数量。
- 最近任务列表。
- 快速触发入口。

页面结构：

```text
顶部：平台名称 / 当前 Workspace / 用户菜单

概览区：
  总任务数 | 成功率 | 平均耗时 | 失败数

快捷操作：
  新建任务 | 查看失败 | 查看报告 | AI 助手

最近任务：
  项目 | 套件 | 状态 | 执行器 | 时间 | 操作
```

### 13.2 项目中心

展示内容：

- 项目列表。
- 项目详情。
- 测试仓库地址。
- 已配置测试套件。
- 环境配置。
- 最近执行记录。

核心操作：

- 新建项目。
- 导入测试仓库。
- 同步 `test-platform.yml`。
- 查看套件。
- 创建任务。

### 13.3 任务中心

展示内容：

- 全部任务。
- 排队中。
- 执行中。
- 成功。
- 失败。
- 超时。

筛选条件：

- 项目。
- 测试类型。
- 环境。
- 执行器。
- 创建人。
- 时间范围。

### 13.4 任务详情

展示内容：

- 基本信息：项目、套件、环境、执行器。
- 状态时间线。
- 执行参数。
- 实时日志或历史日志。
- Allure 报告入口。
- 截图和附件。
- AI 失败分析。
- 重新执行按钮。

### 13.5 报告中心

展示内容：

- 成功率趋势。
- 失败模块分布。
- flaky 用例排行。
- 平均耗时趋势。
- 最近报告。

### 13.6 AI 助手

支持四类能力：

1. 自然语言触发测试任务。
2. 测试失败自动分析。
3. 对话式查询测试报告。
4. 生成测试用例草稿。

示例：

```text
用户：用 staging 环境跑云鹿商城登录 API 冒烟测试

AI：识别到以下参数：
  项目：云鹿商城
  套件：API 冒烟测试
  环境：staging

是否确认执行？
```

---

## 14. AI 能力规划

AI 能力不应作为独立玩具功能，而应贯穿测试流程。

```text
任务创建前
  -> 自然语言转测试任务

任务完成后
  -> 自动失败分析

历史查询时
  -> 对话式查询报告、日志、代码和趋势

测试开发时
  -> 生成测试用例草稿
```

### 14.1 P0：测试失败自动分析

目标：

测试执行完成后，自动分析失败原因并给出修复建议，减少人工逐行排查日志的成本。

输入：

- pytest 输出。
- 错误堆栈。
- Allure 结果。
- 截图路径。
- 任务参数。
- 项目和套件信息。

输出：

```text
失败用例
失败原因
影响范围
可能原因
建议修复方向
疑似相关文件
是否疑似环境问题
是否疑似 flaky case
```

当前项目集成点：

- `tools/webui/services/run_service.py`
- `Reports/webui-runs/{run_id}/logs.txt`
- `allure-results`
- 后续可补充 `conftest.py` 的 pytest hook

建议第一版直接使用 `anthropic` SDK，不必马上引入 LangChain。

### 14.2 P1：对话式查询测试报告

目标：

通过自然语言查询历史测试结果、代码逻辑、失败记录，无需手动翻报告。

查询示例：

```text
最近一次搜索功能测试失败了吗？
购物车模块最近 7 天稳定吗？
cart_api.py 里添加购物车接口是怎么调用的？
最近失败最多的是哪个模块？
```

实现建议：

- MVP：基于数据库任务记录、最近日志、分析结果做查询。
- 增强版：引入向量检索，对代码、报告、日志建立索引。
- 可选技术：Supabase Vector / pgvector / chromadb。

### 14.3 P2：自然语言生成测试用例

目标：

用户用自然语言描述测试场景，AI 生成符合项目规范的 pytest 测试代码草稿。

示例：

```text
生成一个测试用例：用户登录后添加商品到购物车，验证购物车数量 +1
```

安全策略：

- 只生成草稿。
- 必须预览。
- 必须人工确认。
- 优先保存到临时分支或创建 PR。
- 不允许直接写入主分支。

上下文来源：

- 现有 Page Object。
- 现有 API 封装类。
- 现有测试文件。
- 项目测试规范。

---

## 15. 执行方案

### 阶段 0：整理当前项目

目标：

把 `iOS-Automation-Framework` 整理成可被平台接入的样板项目。

任务：

- 清理本地临时文件。
- 明确 API/UI/性能测试入口。
- 固化 Allure 输出目录。
- 新增 `test-platform.yml`。
- 整理 README 中的执行说明。
- 保留 `tools/webui` 作为本地 Demo。

### 阶段 1：本地 Agent MVP

目标：

证明平台下发任务、本地执行、回传结果的链路可行。

任务：

- 新增 `agent/` 目录。
- 支持读取 `test-platform.yml`。
- 支持执行 API suite。
- 支持执行 UI suite。
- 支持写入日志。
- 支持生成 Allure 报告。
- 初期可用本地 JSON 或 SQLite 模拟任务表。

### 阶段 2：平台 Web MVP

目标：

做出第一个可用的平台 Web 版本。

任务：

- 新建 `test-platform` 仓库。
- 选择 Next.js / React 作为 Web 技术栈。
- 接入 Supabase Auth。
- 创建 projects、test_suites、executors、tasks、reports 表。
- 实现 Dashboard。
- 实现项目中心。
- 实现任务中心。
- 实现任务详情。
- Agent 改为轮询 Supabase 任务表。

### 阶段 3：AI 失败分析

目标：

让每次失败任务自动生成分析结论。

任务：

- 收集失败日志和报告摘要。
- 调用 LLM。
- 生成结构化分析。
- 写入 `ai_analyses` 表。
- 在任务详情页展示。

### 阶段 4：AI 报告问答

目标：

让用户可以自然语言查询历史报告、失败记录和代码逻辑。

任务：

- 复用 AI 助手页面。
- 查询任务、报告、分析结果。
- 后续引入向量索引。
- 支持按项目和时间范围提问。

### 阶段 5：多项目接入

目标：

从云鹿商城扩展到更多项目。

任务：

- 完善接入规范。
- 支持多个 Git 仓库。
- 支持不同测试框架。
- 支持不同执行器类型。
- 提供示例项目模板。

### 阶段 6：移动端入口

目标：

实现三端统一体验。

任务：

- 第一版做响应式 Web。
- 第二版用 WebView 封装 iOS/Android。
- 后续根据需求考虑 React Native 或 Flutter。

### 阶段 7：云真机和高级调度

目标：

提升执行能力和平台规模。

任务：

- 抽象 `CloudDeviceFarmExecutor`。
- 接入一个云真机平台。
- 支持构建包上传。
- 支持云端状态轮询。
- 支持报告下载和统一展示。

---

## 16. 风险与应对

| 风险 | 等级 | 应对 |
|---|---|---|
| 当前项目和平台耦合过深 | 高 | 平台只识别 `test-platform.yml`，不要写死云鹿逻辑 |
| Serverless 无法承载长任务 | 高 | 使用本地 Agent 或 Worker 执行测试 |
| iOS UI 环境复杂 | 高 | 第一阶段只支持本地 Mac Agent |
| AI 误触发测试 | 中 | 必须参数确认，且只允许白名单套件 |
| AI 生成代码不稳定 | 中 | 只生成草稿，必须人工确认 |
| 报告文件过大 | 中 | 文件存 Storage，数据库只存索引 |
| Agent 掉线 | 中 | 加心跳、任务超时、任务重试 |
| 多项目差异太大 | 中 | 用统一 suite 协议适配，不强制统一代码结构 |
| 成本失控 | 中 | 优先 Supabase/Vercel 免费额度，本地 Mac 执行 |

---

## 17. 推荐优先级

第一优先级：

1. 当前项目新增 `test-platform.yml`。
2. 当前项目新增本地 Agent。
3. 用本地 JSON/SQLite 跑通任务闭环。
4. 新建平台仓库。
5. 平台接入 Supabase。
6. 平台展示任务和报告。

第二优先级：

1. AI 失败分析。
2. AI 报告问答。
3. GitHub Actions Executor。
4. 响应式移动 Web。

第三优先级：

1. 自然语言生成测试用例。
2. 云真机农场。
3. 原生移动端封装。
4. 完整用例管理系统。

---

## 18. 最终建议

该方向可行，但建议采用“平台和测试项目分离”的建设方式。

当前项目不应继续无限扩展成庞大的平台，而应成为：

```text
第一个测试项目
第一个 Agent 执行样板
第一个平台接入示例
```

平台本体应独立建设，优先采用低成本架构：

```text
Vercel / Netlify
  -> 前端

Supabase
  -> 登录、数据库、存储

Local Mac Agent
  -> iOS UI 和本地 pytest 执行

GitHub Actions
  -> API 测试和轻量自动化任务
```

这样既能控制个人开发者前期成本，又能为后续多项目、多执行器、三端统一和 AI 测试能力留下清晰扩展空间。

