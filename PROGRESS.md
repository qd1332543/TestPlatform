# MeteorTest 开发进度

> 参考方案：`DESIGN.md`
> 当前判断：`iOS-Automation-Framework` 只作为测试工程和接入样板；通用 Local Agent 短期放在 `MeteorTest/agent`，成熟后再独立成仓库或包。

## 短期：职责拆分与本地闭环

### iOS-Automation-Framework 接入样板

- [x] 新增 `meteortest.yml`
- [x] 整理 README，明确它是测试工程，不是平台本体或通用 Agent
- [x] 固化平台接入场景下的 Allure 输出目录
- [x] 明确 API / UI / 性能 suite 的命令、依赖和产物路径
- [x] 保留 `tools/webui` 作为本地 Demo，并弱化平台职责描述

### Local Agent MVP（MeteorTest/agent）

- [x] 新增 `agent/` 目录
- [x] 支持读取测试工程的 `meteortest.yml`
- [x] 支持本地 JSON/SQLite 模拟任务表
- [x] 支持执行 API suite
- [x] 支持执行 UI suite
- [x] 支持收集日志
- [x] 支持收集 Allure 结果
- [x] 支持把任务状态写回本地任务表

## 当前优先级：公网预览加固与 Beta 路径

> 当前公网预览：`https://meteortest.jcmeteor.com/`
> 当前定位：Web Preview 已可访问；Local Agent 仍保持私有；公网联网执行 Demo 仍延期。

### 推荐推进顺序

1. 完善公网预览模式，确保 Vercel 部署不会尝试启动本机 Local Agent。
2. 为公网控制台增加访问保护，避免带服务端能力的控制台长期裸露。
3. 准备预览数据初始化，让 Dashboard、Projects、Tasks、Reports、Executors 都有安全 demo 数据。
4. 增强任务详情和报告体验，让 demo failed task 能清楚展示状态、日志、失败原因、AI 分析和下一步建议。
5. 在公网 Web + preview Supabase 稳定后，再用私有 Local Agent 跑通线上任务闭环。

### Public Preview Mode

- [x] 新增或明确 `METEORTEST_PUBLIC_PREVIEW=1` 作为公网预览模式开关
- [x] 保留 `METEORTEST_AGENT_DISABLED=1` 用于禁用公网部署中的 Local Agent 启动
- [x] `/api/agent/status` 在 public preview 下始终返回 disabled/unavailable，不尝试读取或启动本机 Agent
- [x] Executors 页面在 public preview 下显示“公网部署不启动 Local Agent；请在私有机器上单独运行 Agent 并轮询后端”
- [x] Settings 页面在 public preview 下隐藏或禁用 auto-start Agent 控制，避免误导
- [x] Vercel runbook 明确不要配置 `METEORTEST_REPO_ROOT`、`METEORTEST_AGENT_PYTHON`、`METEORTEST_AGENT_INTERVAL` 或本机路径
- [x] Smoke check 覆盖 `/executors` 和 `/api/agent/status`，确认不暴露本机路径、栈信息、密钥或 Agent 启动入口
  - `apps/web/scripts/check-public-preview.mts` 使用 public-preview 环境构建并启动独立 smoke server。
  - CI 通过 `npm run smoke:public-preview` 验证 preview access gate、`/api/agent/status` 禁用 Agent 控制、`/executors` 服务端渲染 public preview 边界提示，并扫描响应中是否出现本机路径、密钥变量、栈信息或 Agent 启动入口。
  - smoke 使用 `METEORTEST_SMOKE_NO_SUPABASE=1` 跳过 Supabase 查询；Vercel 真实公网预览已配置 Supabase 密钥时仍可正常展示 preview 数据。

### Authentication And Access Control

- [ ] 短期：启用 Vercel Deployment Protection、Vercel Password 或等价访问保护
- [x] 增加应用级 `METEORTEST_PREVIEW_ACCESS_TOKEN` 访问门禁，供公网预览在 Vercel 环境变量中启用
- [x] 在 `docs/vercel-public-preview.md` 和中文文档中记录访问保护方式与 token 边界
- [ ] 中期：设计 Supabase Auth 登录页、会话状态、API route 鉴权和 viewer/operator/admin 角色边界
- [ ] 长期：把任务创建、构建登记、AI 分析、执行器控制等操作拆分权限

### Preview Data Initialization

- [x] 增加 `supabase/seed-preview.sql` 或脚本化 seed 流程
- [x] Demo project：`iOS-Automation-Framework`
- [x] Demo suite：`api_smoke`
- [x] Demo tasks：至少覆盖 queued、succeeded、failed
- [x] Demo report：包含 pytest summary、日志链接占位、AI 分析摘要
- [x] Demo executor：`local-agent-demo`，状态为 offline/disabled，明确不是公网 Agent
- [x] Demo build：示例 app build 元数据，不包含真实包、内部 URL、账号或设备信息
- [x] Runbook 记录如何在新的 preview Supabase 中初始化 demo 数据

### Task And Report Experience

- [x] 任务详情增加 preview 任务标识、执行摘要、Pytest 摘要、失败分类和无报告状态说明
- [x] 报告列表增强 preview 任务标识、display name、Pytest 摘要和失败分类展示
- [x] AI 分析结果绑定 task/report 上下文，而不是只作为独立聊天内容
- [x] 增加“导出分析包”入口，便于二次 AI 分析
  - 报告列表和任务详情均可导出 Markdown 分析包。
  - 分析包内容由 `apps/web/lib/analysisPackage.ts` 统一生成，并通过 i18n 文案输出当前语言版本。
- [ ] 让一个 demo failed task 能在不看数据库的情况下说明发生了什么、为什么失败、下一步该做什么

### Private Agent Online Loop

- [ ] Vercel Web 连接 preview Supabase
- [ ] 私有机器 Local Agent 连接同一个 preview Supabase
- [ ] 从 `https://meteortest.jcmeteor.com/` 创建任务
- [ ] 私有 Agent 轮询 queued 任务并执行 iOS-Automation-Framework smoke suite
- [ ] Agent 回写 task status、report、artifact/log URL
- [ ] Web 展示 succeeded/failed、报告摘要和 AI 分析
- [ ] 完成后，个人官网可以声明 `validated private-agent preview loop`，但仍不能声明 public connected execution

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
- [x] 设置页支持平台名称、AI 模型、默认环境、通知策略和 Agent 启动策略
- [x] Web 控制台支持主题设置：星流墨色、靛蓝瓷、沙丘、极光终端
- [ ] 全量页面统一迁移到主题语义类，减少硬编码颜色

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
- [x] 提供示例 `meteortest.yml`
- [x] 支持不同测试框架和执行器能力标签
- [x] 项目详情页支持修改项目显示名称、仓库地址和描述
- [x] 项目详情页支持删除项目，并清理该项目下任务、报告、AI 分析、套件和构建记录；公网预览模式禁用该危险操作

### Web 体验与国际化

- [x] 侧栏支持从设置读取自定义平台名称
- [x] 设置页主题选择写入本地设置并全站生效
- [x] 主题扩展为深浅混合预设：墨水经典、靛蓝瓷、沙丘、极光终端、牛皮纸、晴空蓝、冰湖银、樱花雾
- [x] 明确 Web UI 产品方向：工程测试控制台，融合 CI/DevOps 执行流、QA 报告语义和 AI 操作台能力
- [x] 页面文件可维护性整理：保留 Next.js `page.tsx` 路由约定，但将复杂页面实现逐步迁移到具名组件文件，例如 `TasksPage.tsx`、`ReportsPage.tsx`
- [x] Phase 11 公网 Web 预览准备：补齐 `.env.local.example`，明确部署环境变量、密钥边界和 Local Agent 不直接公网暴露
- [x] Phase 11 Vercel 部署 runbook：记录账号操作、环境变量、Supabase 预览环境、Codex 可协助范围和人工必须提供内容
- [x] Phase 11 公网 Web 预览部署：Vercel 预览已发布到 `https://meteortest.jcmeteor.com/`
- [x] WebUI 本地预览入口固定为 `npm run dev:local`，锁定 `127.0.0.1:3000` 并提供 public-preview/local-preview 安全默认值
- [ ] Phase 11 公网 Web 预览加固：完善 public preview mode、访问保护、demo 数据、任务/报告体验和私有 Agent 线上闭环
- [ ] Phase 12 Public Connected Demo：基于独立预览后端和私有 Agent 打通可操作 Demo
- [ ] 基于工程测试控制台方向重构首页、项目、任务、报告和 AI 页面
  - [x] 首页、项目、任务和报告页完成第一轮控制台化布局：状态概览、接入状态卡片、执行队列和报告分析侧栏
  - [x] AI 页面完成第一轮“操作指挥台”重构：新增操作入口卡片、平台上下文面板、执行对话区和移动端基础对话切换
  - [x] Dashboard / Projects / Tasks 完成第二轮控制台化：Dashboard 强化今日运行态势和执行队列入口，Projects 强化接入状态和下一步动作，Tasks 强化队列健康与移动端任务卡片
- [x] 新增 `zh-CN` / `en` 多语言文案层基础模块，使用 `supportedLocales` 通用语言归一化方式
- [x] 参考 `junchen-meteor` 的内容配置方式，建设 `zh-CN` / `en` 多语言文案层
- [x] 导航、设置、AI 模板、空状态、表单提示和页面标题接入多语言
- [x] 设置页支持语言切换，语言状态通过 `meteortest.locale` cookie 驱动 Web UI
- [x] README / DESIGN / PROGRESS 保持中英文文档同步

## 远期：独立 Agent 与高级执行能力

### Agent 独立化

- [ ] 将 `MeteorTest/agent` 拆分为 `meteortest-agent` 独立仓库或包
- [ ] 支持 Agent 安装、配置、版本管理和自动升级
- [ ] 支持插件化执行器：pytest、Appium、Playwright、Jest、Newman
- [ ] 支持多机器 Agent 注册、心跳和能力管理

### 移动端入口

- [ ] WebUI 移动端适配专项：完整检查 Dashboard、Projects、Tasks、Reports、Builds、Executors、Settings 和 AI 页面在手机浏览器下的导航、表格、操作按钮、表单和滚动体验
  - [x] 第一轮移动端壳层：手机端使用顶部品牌栏和横向导航，主内容缩小内边距，页面标题纵向堆叠
  - [x] Dashboard / Tasks 表格在手机端提供卡片视图，避免横向表格成为唯一浏览方式
  - [x] Projects 卡片在手机端纵向排列，保留接入状态、套件数量、仓库状态和下一步动作
  - [ ] 继续检查 Reports、Builds、Executors、Settings、AI、详情页、表单页的手机端布局和滚动体验
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

### 平台产品化体验

- [ ] 主题系统扩展为完整设计令牌，覆盖表格、图表、状态、表单和 AI 消息卡片
- [ ] 支持用户级语言、主题、密度等偏好配置
- [ ] 增加 Web 控制台交互截图或视觉验收说明
