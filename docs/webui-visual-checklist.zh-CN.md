# MeteorTest WebUI 视觉验收清单

WebUI 布局、主题或响应式改动完成后，使用这份清单做基础验收。

## 本地预览

```bash
cd apps/web
npm run dev:local
```

打开 `http://127.0.0.1:3000/`。

## 视口

- 手机：`390 x 844`
- 小屏浏览器，12-14 寸笔记本级别：`1280 x 800`
- 常规桌面：`1440 x 900`
- 宽屏桌面：`2560 x 1100`
- 4K 类桌面：`3560 x 1100`

## 页面

- Dashboard：`/`
- Projects：`/projects`
- Tasks：`/tasks`
- Reports：`/reports`
- Builds：`/builds`
- Executors：`/executors`
- Settings：`/settings`
- AI Center：`/ai`

## 主题

涉及 UI 颜色时，至少检查这些主题：

- `meteor`
- `parchment`
- `sky`
- `glacier`
- `sakura`
- `dune`

## 验收标准

- 页面没有 500 或运行时错误。
- 手机端主要内容不依赖横向滚动。
- 承载核心流程信息的表格，需要有可读的手机卡片视图，或明确放在可控横向滚动容器中。
- 主操作、选中态、链接、状态标签、表单和 AI 消息卡片使用语义 token，不写死页面颜色。
- 字体颜色跟随组件实际背景：深色背景用浅色字，浅色背景用深色字。
- 主题、语言、密度或布局相关改动，需要同步更新代码和文档。
- 桌面端主内容和侧栏使用比例列布局；移动端保持单列，除非页面有明确的移动端专用卡片或表格模式。
