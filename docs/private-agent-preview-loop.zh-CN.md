# 私有 Agent 预览闭环

## 半自动验证脚本

Web 项目新增脚本：

```bash
cd apps/web
npm run validate:private-agent-loop
```

脚本会使用 `NEXT_PUBLIC_SUPABASE_URL` 和 `SUPABASE_SERVICE_ROLE_KEY` 创建一条 private preview task，并轮询任务状态、日志 URL 和 Allure URL。

可选环境变量：

```text
METEORTEST_LOOP_PROJECT_KEY=yunlu-ios
METEORTEST_LOOP_SUITE_KEY=smoke
METEORTEST_LOOP_ENVIRONMENT=dev
METEORTEST_LOOP_TIMEOUT_SECONDS=600
```

运行脚本前，确保私有机器上的 Local Agent 已启动，或在脚本创建任务后立即启动 Agent。

这个 runbook 用来验证安全的联网预览路径：

```text
公网 Web 预览 -> preview Supabase -> 私有 Local Agent -> 测试仓库 -> 回写 Web
```

Local Agent 必须保持私有。不要把 Agent HTTP 端点、本机路径、设备标识、service-role key 或测试账号暴露到公网。

## 前置条件

1. Web 预览已部署，并可通过 `https://meteortest.jcmeteor.com/` 访问。
2. 部署环境已设置 `METEORTEST_PUBLIC_PREVIEW=1` 和 `METEORTEST_AGENT_DISABLED=1`。
3. Web 预览和私有 Agent 指向同一个 preview Supabase 项目。
4. 已执行 `supabase/seed-preview.sql` 初始化预览数据，或已有等价的项目和套件。
5. 私有机器已经克隆测试仓库，例如 `iOS-Automation-Framework`。
6. Agent 配置中的 `repositories` 条目，必须有一个 `key` 和 Supabase `projects.key` 完全一致。

如果使用安全预览 seed，请在 `agent/config.yaml` 中加入这个仓库别名：

```yaml
repositories:
  - key: ios-automation-framework
    path: /absolute/path/to/iOS-Automation-Framework
    contract: meteortest.yml
```

如果预览项目使用的是 `yunlu-ios` 或 `yunluji`，也可以把这些 key 作为额外别名保留在同一个列表中，指向同一个本地测试仓库。

## 私有环境变量

这些值只配置在私有机器或可信 runner 上：

```bash
export SUPABASE_SERVICE_ROLE_KEY=your-preview-service-role-key
export METEORTEST_TEST_PYTHON=/absolute/path/to/iOS-Automation-Framework/.venv/bin/python
export METEORTEST_AGENT_TASK_SOURCE=web-console
export METEORTEST_AGENT_PRIVATE_PREVIEW_ONLY=1
```

`agent/config.yaml` 应使用：

```yaml
platform:
  mode: supabase
  supabase_url: "https://your-preview-project.supabase.co"
  supabase_service_role_key_env: SUPABASE_SERVICE_ROLE_KEY

artifacts:
  upload_mode: local
  local_output_root: .meteortest-agent/artifacts
  supabase_bucket: test-artifacts
```

public bucket 只适合短期预览和合成报告。接近生产的数据应使用私有存储和签名 URL。

`METEORTEST_AGENT_TASK_SOURCE` 和 `METEORTEST_AGENT_PRIVATE_PREVIEW_ONLY` 是可选安全过滤器。它们让私有 Agent 只领取 Web 控制台为私有预览闭环创建的任务，避免误领取旧 seed 任务或其他 queued 工作。

## 验证流程

1. 打开 `https://meteortest.jcmeteor.com/tasks/new`。
2. 为预览项目创建一个 `api_smoke` 任务。除非要验证构建产物下载，否则不要选择占位 demo app build。Web 控制台创建的任务会在 `METEORTEST_PUBLIC_PREVIEW=1` 时写入 `parameters.source=web-console` 和 `parameters.private_agent_preview=true`。
3. Web 控制台会跳转到新任务详情页。
4. 在仓库根目录启动私有 Agent：

```bash
python -m agent.agent --config agent/config.yaml --interval 10
```

5. 确认 Agent 注册 executor，并领取 queued 任务。
6. 等待任务详情页从 `queued` 变为 `running`，再变为 `succeeded` 或 `failed`。
7. 打开任务详情页并确认：
   - 状态来自私有 Agent 回写；
   - 已创建 report 记录；
   - 配置 artifact 上传或本地报告时，可以看到日志链接；
   - failed 任务展示 AI 修复诊断，并可以导出 AI 修复交接。

## 稳定 API Smoke 验证

第一次验证平台闭环时，优先使用 API smoke，不要直接使用 iOS UI 测试。UI 测试依赖 Xcode、Appium、模拟器或真机、App 构建产物，失败变量更多；API smoke 可以配合本地 mock API 做确定性验证。

推荐流程：

1. 在测试仓库准备虚拟环境并安装依赖：

```bash
python3 -m venv .venv
.venv/bin/python -m pip install -U pip
.venv/bin/python -m pip install -r requirements.txt
```

2. 启动测试仓库的 mock API，并确认健康检查通过：

```bash
.venv/bin/python -m tools.mock_api.server --port 8010
curl http://127.0.0.1:8010/health
```

3. 启动 Agent 前设置测试运行时：

```bash
export API_BASE_URL=http://127.0.0.1:8010
export METEORTEST_TEST_PYTHON=/absolute/path/to/iOS-Automation-Framework/.venv/bin/python
```

4. 如果要先绕过平台链路验证测试仓库本身：

```bash
API_BASE_URL=http://127.0.0.1:8010 \
.venv/bin/python -m pytest API_Automation/cases -v -n 0 -m smoke \
  --alluredir=Reports/platform/manual-smoke/allure-results
```

5. 再从 Web 创建 `api_smoke` / API 冒烟测试任务，环境选择 `dev`，构建产物不选。

成功标准：

- Web 任务详情状态变为 `succeeded`。
- Agent 日志显示任务被领取、命令执行完成、报告已回传。
- 任务详情或报告页能看到报告摘要和日志链接。

## 可公开分享的非敏感检查

这些检查可以放到 issue 或 PR 中：

```bash
curl -I https://meteortest.jcmeteor.com/
curl -I https://meteortest.jcmeteor.com/tasks
curl -I https://meteortest.jcmeteor.com/executors
```

不要粘贴 service-role key、完整 `.env.local`、私有 Supabase URL、本机绝对路径、设备 ID，或包含账号数据的原始日志。

## 排障

- 如果 Agent 领取任务后报 `Repository for project ... not found`，把报错里的 `projects.key` 原样加入 `agent/config.yaml`。
- 如果任务一直停在 `queued`，检查 Agent 是否使用 `platform.mode: supabase`，service-role key 是否已设置，以及 Agent 是否能访问 Supabase。
- 如果 `python: command not found` 或 `No module named pytest`，设置 `METEORTEST_TEST_PYTHON` 指向测试仓库 `.venv/bin/python`，并确认依赖已安装。
- 如果 API smoke 被跳过或失败，确认 `API_BASE_URL` 指向本地 mock API，且 `/health` 可访问。
- 如果 report 已写入但链接是本地路径，配置 `artifacts.supabase_bucket` 并确认 bucket 已存在。
- 如果 Allure 链接缺失，确认 suite command 写入了 `--alluredir` 路径，并且 Agent 能 zip/upload 该目录。
- 如果公网页面暴露了本机路径或密钥变量名，停止预览并先运行 `npm run smoke:public-preview`，再重新部署。

## 完成标准

当一个从 `https://meteortest.jcmeteor.com/` 创建的任务被私有 Agent 执行，并且 Web 控制台展示了回写状态、报告摘要、失败诊断或成功报告时，这条预览闭环才算验证完成。
