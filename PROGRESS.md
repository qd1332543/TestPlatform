# MeteorTest 开发进度

> 参考方案：`DESIGN.md`
> 当前判断：`iOS-Automation-Framework` 只作为测试工程和接入样板；通用 Local Agent 短期放在 `MeteorTest/agent`，成熟后再独立成仓库或包。

## 短期：职责拆分与本地闭环

### iOS-Automation-Framework 接入样板

- [x] 新增 `test-platform.yml`
- [x] 整理 README，明确它是测试工程，不是平台本体或通用 Agent
- [x] 固化平台接入场景下的 Allure 输出目录
- [x] 明确 API / UI / 性能 suite 的命令、依赖和产物路径
- [x] 保留 `tools/webui` 作为本地 Demo，并弱化平台职责描述

### Local Agent MVP（MeteorTest/agent）

- [x] 新增 `agent/` 目录
- [x] 支持读取测试工程的 `test-platform.yml`
- [x] 支持本地 JSON/SQLite 模拟任务表
- [x] 支持执行 API suite
- [x] 支持执行 UI suite
- [x] 支持收集日志
- [x] 支持收集 Allure 结果
- [x] 支持把任务状态写回本地任务表

## 中期：平台调度与多项目接入

### 平台 Web MVP

- [x] 创建 `MeteorTest` 仓库目录结构
- [x] 初始化 Next.js 项目（apps/web）
- [x] 接入 Supabase Auth
- [x] 创建数据库表（projects / test_suites / executors / tasks / reports）
- [x] 实现 Dashboard
- [x] 实现项目中心
- [x] 实现任务中心
- [x] 实现任务详情
- [x] Agent 改为轮询 Supabase 任务表

### 构建产物与任务调度

- [x] 增加或完善 `app_builds` 概念，支持 `.ipa` / `.apk` / build URL
- [x] 任务支持关联 `app_build_id`
- [x] Web 页面支持登记或选择构建产物
- [x] Agent 支持下载或读取任务指定的 App 包
- [x] Agent 支持任务锁定、心跳、超时和失败重试

### AI 失败分析

- [x] 收集失败日志和报告摘要
- [x] 调用 Claude API
- [x] 生成结构化分析
- [x] 写入 ai_analyses 表
- [x] 任务详情页展示

### AI 报告问答

- [x] AI 助手页面
- [x] 查询任务、报告、分析结果
- [ ] 引入向量索引（pgvector）

### 多项目接入

- [x] 完善接入规范
- [x] 支持多个 Git 仓库
- [x] 提供示例 `test-platform.yml`
- [x] 支持不同测试框架和执行器能力标签

## 远期：独立 Agent 与高级执行能力

### Agent 独立化

- [ ] 将 `MeteorTest/agent` 拆分为 `test-platform-agent` 独立仓库或包
- [ ] 支持 Agent 安装、配置、版本管理和自动升级
- [ ] 支持插件化执行器：pytest、Appium、Playwright、Jest、Newman
- [ ] 支持多机器 Agent 注册、心跳和能力管理

### 移动端入口

- [ ] 响应式 Web
- [ ] WebView 封装

### 云真机和高级调度

- [ ] 抽象 CloudDeviceFarmExecutor
- [ ] 接入云真机平台
- [ ] 支持构建包上传、云端状态轮询和报告下载
- [ ] 支持多执行器智能调度

### 高级 AI 能力

- [ ] 跨报告、日志、代码的向量检索
- [ ] 自然语言生成测试用例草稿
- [ ] 生成内容必须人工确认后进入分支或 PR
