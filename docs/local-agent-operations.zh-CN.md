# Local Agent 运维方式

更新时间：2026-05-13

Local Agent 的管理要分成本机进程和平台反馈两部分看：

- 本机进程由 macOS `launchd` 常驻。
- 平台状态以 Supabase 为准。
- Web 控制台从 Supabase 读取 executor、task、report 和 AI analysis。

## 推荐常驻方式

在 MeteorTest 仓库根目录执行一次：

```bash
./scripts/install-local-agent-launchd.sh
```

它会安装用户级 `launchd` 服务：

- 登录 macOS 后自动启动。
- 进程退出后自动拉起。
- 启动命令来自 `scripts/start-local-agent.sh`。
- 环境变量读取 `apps/web/.env.local`。
- Agent 配置读取 `agent/config.yaml`。
- macOS 上默认通过 `caffeinate -dimsu` 运行，防止锁屏后系统睡眠导致 Agent 暂停。

注意：`launchd` 负责进程常驻，`caffeinate` 负责防止系统睡眠。锁屏本身不会停止 Agent；真正会暂停 Agent 的是 Mac 进入 sleep。默认配置会尽量保持机器唤醒，只关闭屏幕不影响 Agent。

如果你确实希望关闭这个防睡眠行为，可以在启动环境中设置：

```bash
export METEORTEST_AGENT_CAFFEINATE=0
```

修改脚本或环境变量后，需要重新安装或重启服务才会生效：

```bash
./scripts/restart-local-agent-launchd.sh
```

## 平台可调的任务检查频率

目标不是让用户理解轮询、心跳等实现细节，而是提供一个“本机服务器节能模式”：

- 本机 Agent 始终常驻待命。
- 没任务时减少对 Supabase 的请求。
- 任务少时可以慢一点检查，节省本机和 Supabase 资源。
- 需要快速执行时，可以临时调快。
- 任务结果仍然以 Supabase 为准，Web 页面继续展示任务状态、报告、日志和 AI 分析。

这个设置只控制 Agent **多久检查一次新任务**，不控制在线心跳。

心跳建议固定为 `120s`：

- 心跳只更新 `executors.status` 和 `executors.last_heartbeat_at`，资源开销很小。
- 心跳过长会让 Web 控制台更难判断 Agent 是否真的在线。
- 即使任务检查频率设置为 `60min`，Agent 也应该继续用固定心跳告诉平台“我还活着”。

最终策略：

```text
任务检查频率：由设置页分段滑动条控制，30s 到 60min。
Agent 在线心跳：固定 120s，不跟随任务检查频率变化。
```

设置页文案建议：

```text
任务检查频率
控制 Local Agent 多久检查一次新任务。频率越低越省资源，但新任务开始执行会更慢。
```

默认值建议：`5m`。

分段式时间密度：

| 档位 | 显示文案 | 实际值 | 适用场景 |
| --- | --- | ---: | --- |
| 1 | 30s | 30 秒 | 正在调试、希望任务尽快开始 |
| 2 | 1m | 60 秒 | 短时间集中执行任务 |
| 3 | 5m | 300 秒 | 默认推荐，兼顾响应和资源 |
| 4 | 10m | 600 秒 | 任务较少，但仍希望较快响应 |
| 5 | 15m | 900 秒 | 日常低频使用 |
| 6 | 30min | 1800 秒 | 半天级偶发任务 |
| 7 | 45min | 2700 秒 | 很低频任务 |
| 8 | 60min | 3600 秒 | 极低频、省资源优先 |

设置页交互：

- 使用分段式滑动条，而不是自由输入数字。
- 滑动条只允许选择上表 8 个档位。
- 当前档位旁显示“约每 X 检查一次新任务”。
- 下方显示资源提示：更短更快、更长更省资源。
- 保存后写入 Supabase，Agent 下次读取配置后生效。

数据与权限：

- 配置应作为平台级 Agent 运行配置保存，而不是浏览器本地设置。
- 只有 `admin` 可以修改。
- `viewer` / `operator` 可以查看当前策略，但不能修改。
- 本机 `agent/config.yaml` 只保留启动兜底值；平台配置存在时，以平台配置为准。

建议数据表：

```text
agent_runtime_settings
- id
- executor_name
- enabled
- task_check_interval_seconds
- task_source
- private_preview_only
- updated_by
- updated_at
```

执行策略：

- Agent 启动后先读取平台配置。
- Agent 空闲时按 `task_check_interval_seconds` 等待下一次检查。
- Agent 在线心跳保持固定低频，例如 `120s`，不受 `task_check_interval_seconds` 影响。
- Agent 每隔一段时间重新读取配置，让设置页修改可以自动生效。
- 如果读取平台配置失败，继续使用本机配置或启动脚本中的默认值。
- 任务执行中不强行中断；新的时间间隔从下一轮空闲检查开始生效。

验收标准：

- 设置页能通过分段式滑动条选择 `30s / 1m / 5m / 10m / 15m / 30min / 45min / 60min`。
- 保存后刷新页面仍保持当前档位。
- Agent 不重启也能在后续周期内读取到新配置。
- Executors 页面或检查脚本能看到当前生效的任务检查频率。
- Executors 页面仍能通过固定心跳判断 Agent 在线状态。
- 新任务会在所选时间范围内被领取。
- 任务执行结果继续写回 `tasks`、`reports`，失败时继续写回 `ai_analyses`。

## 运行状态怎么看

本机进程状态：

```bash
launchctl list | grep com.meteortest.local-agent
```

本机日志：

```bash
tail -f .meteortest-agent/logs/launchd.out.log
tail -f .meteortest-agent/logs/launchd.err.log
```

综合检查本机进程和 Supabase 状态：

```bash
./scripts/check-local-agent.sh
```

## Supabase 中的反馈链路

Agent 启动后会注册或更新 `executors`：

- `name`
- `type`
- `status`
- `capabilities`
- `last_heartbeat_at`

Agent 轮询到任务后会更新 `tasks`：

- `status=running`
- `executor_id`
- `started_at`
- 最终 `status=succeeded/failed/timeout`
- `finished_at`

任务完成后会写 `reports`：

- `task_id`
- `summary`
- `log_url`
- `allure_url`

任务失败时会尽量写 `ai_analyses`：

- `failure_reason`
- `impact`
- `suggestion`
- `suspected_files`
- `flaky_probability`

所以 Web 上最终应该看三处：

- Executors 页面：确认 Agent 在线和心跳。
- Tasks / Task Detail：确认任务从 queued 到 running，再到 succeeded / failed。
- Reports / Task Detail：确认日志、Allure 和 AI 分析是否写回。

## OpenClaw 怎么用

OpenClaw 不建议作为主守护进程。它更适合做定时巡检：

```bash
./scripts/check-local-agent.sh
```

如果发现异常，再定时执行：

```bash
./scripts/restart-local-agent-launchd.sh
```

主常驻仍交给 `launchd`，平台反馈仍以 Supabase 为准。
