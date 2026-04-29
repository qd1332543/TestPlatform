# test-platform

通用自动化测试平台 — 支持多项目接入、任务调度、测试报告和 AI 失败分析。

## 技术栈

- **前端**：Next.js 16 + TypeScript + Tailwind CSS
- **数据库**：Supabase (PostgreSQL)
- **部署**：Vercel（前端）+ 本地 Mac Agent（执行器）

## 项目结构

```
test-platform/
├── apps/
│   └── web/          # Next.js Web 管理台
├── packages/
│   └── shared/       # 共享类型定义
├── supabase/
│   └── migrations/   # 数据库迁移 SQL
└── PROGRESS.md       # 开发进度
```

## 快速开始

### 1. 安装依赖

```bash
cd apps/web
npm install
```

### 2. 配置环境变量

```bash
cp .env.local.example .env.local
# 填入 Supabase URL 和 anon key
```

### 3. 初始化数据库

在 Supabase SQL Editor 中执行 `supabase/migrations/001_init.sql`

### 4. 启动开发服务器

```bash
npm run dev
```

访问 http://localhost:3000

## 开发进度

详见 [PROGRESS.md](./PROGRESS.md)

## 参考方案

详见 `无所谓.md`（项目规划文档）
