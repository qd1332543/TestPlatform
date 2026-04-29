# test-platform 开发进度

> 参考方案：`/Users/meteoroid/Documents/管理目录/无所谓.md`

## 阶段 0：整理当前项目（iOS-Automation-Framework）

- [ ] 新增 `test-platform.yml`
- [ ] 整理 README 执行说明
- [ ] 固化 Allure 输出目录

## 阶段 1：本地 Agent MVP

- [ ] 新增 `agent/` 目录
- [ ] 支持读取 `test-platform.yml`
- [ ] 支持执行 API suite
- [ ] 支持执行 UI suite
- [ ] 支持写入日志
- [ ] 用本地 JSON/SQLite 模拟任务表

## 阶段 2：平台 Web MVP

- [x] 创建 `test-platform` 仓库目录结构
- [x] 初始化 Next.js 项目（apps/web）
- [x] 接入 Supabase Auth
- [x] 创建数据库表（projects / test_suites / executors / tasks / reports）
- [x] 实现 Dashboard
- [x] 实现项目中心
- [x] 实现任务中心
- [x] 实现任务详情
- [ ] Agent 改为轮询 Supabase 任务表

## 阶段 3：AI 失败分析

- [ ] 收集失败日志和报告摘要
- [ ] 调用 Claude API
- [ ] 生成结构化分析
- [ ] 写入 ai_analyses 表
- [ ] 任务详情页展示

## 阶段 4：AI 报告问答

- [ ] AI 助手页面
- [ ] 查询任务、报告、分析结果
- [ ] 引入向量索引（pgvector）

## 阶段 5：多项目接入

- [ ] 完善接入规范
- [ ] 支持多个 Git 仓库

## 阶段 6：移动端入口

- [ ] 响应式 Web
- [ ] WebView 封装

## 阶段 7：云真机和高级调度

- [ ] 抽象 CloudDeviceFarmExecutor
- [ ] 接入云真机平台
