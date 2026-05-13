# Local Agent Operations

Updated: 2026-05-13

Local Agent operations should be viewed in two layers:

- macOS `launchd` keeps the local process alive.
- Supabase is the source of truth for platform feedback.
- The Web console reads executor, task, report, and AI analysis data from Supabase.

## Recommended Supervisor

Run once from the MeteorTest repository root:

```bash
./scripts/install-local-agent-launchd.sh
```

This installs a user-level `launchd` service:

- Starts after macOS login.
- Restarts the process if it exits.
- Uses `scripts/start-local-agent.sh`.
- Reads environment variables from `apps/web/.env.local`.
- Reads Agent configuration from `agent/config.yaml`.

## Platform-Configurable Task Check Frequency

The product goal is not to expose polling or heartbeat internals. The goal is a local-server resource-saving mode:

- Keep the local Agent resident and ready.
- Reduce Supabase requests when there are no tasks.
- Let low-volume periods check less often to save local and Supabase resources.
- Let operators temporarily speed it up when fast execution is needed.
- Keep Supabase as the source of truth for task results, reports, logs, and AI analysis.

This setting only controls how often the Agent checks for new tasks. It does not control online heartbeat.

Recommended fixed heartbeat: `120s`.

- Heartbeat only updates `executors.status` and `executors.last_heartbeat_at`, so its resource cost is very small.
- A long heartbeat interval makes it harder for the Web console to know whether the Agent is actually online.
- Even when task check frequency is set to `60min`, the Agent should still keep sending a fixed heartbeat to say “I am alive.”

Final strategy:

```text
Task check frequency: controlled by the Settings segmented slider, from 30s to 60min.
Agent online heartbeat: fixed at 120s, independent from task check frequency.
```

Recommended Settings copy:

```text
Task check frequency
Control how often the Local Agent checks for new tasks. Lower frequency saves resources, but new tasks start later.
```

Recommended default: `5m`.

Segmented time density:

| Step | Label | Value | Scenario |
| --- | --- | ---: | --- |
| 1 | 30s | 30 seconds | Active debugging or immediate execution |
| 2 | 1m | 60 seconds | Short task bursts |
| 3 | 5m | 300 seconds | Recommended default balancing response and cost |
| 4 | 10m | 600 seconds | Low task volume with moderate responsiveness |
| 5 | 15m | 900 seconds | Daily low-frequency usage |
| 6 | 30min | 1800 seconds | Occasional half-day checks |
| 7 | 45min | 2700 seconds | Very low task volume |
| 8 | 60min | 3600 seconds | Maximum resource saving |

Settings interaction:

- Use a segmented slider instead of free numeric input.
- Only allow the 8 values listed above.
- Show the active value as “Checks for new tasks about every X”.
- Show helper text explaining the faster/slower tradeoff.
- Save to Supabase; the Agent applies the next loaded config.

Data and permissions:

- Store this as platform-level Agent runtime configuration, not browser-local settings.
- Only `admin` can modify it.
- `viewer` and `operator` can see the active strategy but cannot edit it.
- Keep `agent/config.yaml` as a startup fallback. Platform config wins when available.

Recommended table:

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

Runtime behavior:

- Agent reads platform config after startup.
- While idle, it waits `task_check_interval_seconds` before checking again.
- Agent online heartbeat stays fixed and low-frequency, for example `120s`, independent from `task_check_interval_seconds`.
- Agent refreshes config periodically so Settings changes apply without restart.
- If platform config cannot be read, fall back to local config or script defaults.
- Running tasks are not interrupted; the new interval applies from the next idle check.

Acceptance:

- Settings can select `30s / 1m / 5m / 10m / 15m / 30min / 45min / 60min` with a segmented slider.
- Refreshing Settings keeps the saved segment.
- Agent can pick up the new config without restart.
- Executors or the check script shows the active task check frequency.
- Executors can still determine online state through the fixed heartbeat.
- New tasks are claimed within the selected timing window.
- Results still write back to `tasks`, `reports`, and failed-task `ai_analyses`.

## Check Status

Local process:

```bash
launchctl list | grep com.meteortest.local-agent
```

Local logs:

```bash
tail -f .meteortest-agent/logs/launchd.out.log
tail -f .meteortest-agent/logs/launchd.err.log
```

Combined local process and Supabase status:

```bash
./scripts/check-local-agent.sh
```

## Supabase Feedback Loop

After startup, the Agent registers or updates `executors`:

- `name`
- `type`
- `status`
- `capabilities`
- `last_heartbeat_at`

When it claims a task, it updates `tasks`:

- `status=running`
- `executor_id`
- `started_at`
- final `status=succeeded/failed/timeout`
- `finished_at`

After execution, it writes `reports`:

- `task_id`
- `summary`
- `log_url`
- `allure_url`

For failed tasks, it also tries to write `ai_analyses`:

- `failure_reason`
- `impact`
- `suggestion`
- `suspected_files`
- `flaky_probability`

The Web console should be checked in three places:

- Executors: Agent online state and heartbeat.
- Tasks / Task Detail: queued -> running -> succeeded / failed.
- Reports / Task Detail: logs, Allure, and AI analysis.

## OpenClaw Usage

OpenClaw should not be the primary process supervisor. Use it for scheduled checks:

```bash
./scripts/check-local-agent.sh
```

If needed, have it run:

```bash
./scripts/restart-local-agent-launchd.sh
```

Keep `launchd` responsible for process supervision and Supabase responsible for platform feedback.
