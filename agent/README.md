# MeteorTest Local Agent

Local Agent is the temporary platform-side executor implementation for the MVP stage.

It is responsible for:

- Registering executor capabilities.
- Reading a test repository contract such as `meteortest.yml`.
- Polling queued tasks from a local JSON/SQLite queue in the short term.
- Polling Supabase `tasks` in the medium term.
- Locking tasks before execution.
- Preparing app artifacts such as `.ipa`, `.app`, or `.apk` when required.
- Running suite commands from the test repository.
- Capturing logs and report artifacts.
- Updating task status and report metadata.

It is not owned by individual test repositories. Test repositories only expose suite metadata and executable commands.

## Test Repository Runtime

The Agent should not force suite commands to run with the Agent's own Python interpreter. When a command starts with `python` or `python3`, the executor resolves the test runtime in this order:

1. `parameters.python_executable` from the task.
2. `METEORTEST_TEST_PYTHON` from the Agent environment.
3. `.venv` or `venv` inside the test repository.
4. The original command token if no project runtime is found.

This keeps platform dependencies separate from pytest/Appium/Locust dependencies owned by the test project.

## MVP Layout

```text
agent/
├── README.md
├── config.example.yaml
├── agent.py
├── executors/
├── reporters/
└── services/
```

Runtime code now covers the MVP loop for local JSON tasks and Supabase-backed tasks. It is still intentionally small and should be treated as the reference implementation for the platform protocol, not as a separately distributed product yet.

## App Artifact Handling

When a task includes `app_build_id` in Supabase mode, the agent downloads the matching `app_builds.artifact_url` into the task artifact directory and exposes it to the suite command through:

- `METEORTEST_APP_PATH`
- `APP_PATH`
- `{app_path}` command template variable

Local JSON tasks can pass either `parameters.app_path` or `parameters.app_url`. If `app_url` is provided, the agent downloads it before execution and then sets the same environment variables.

## Report Handling

Suite logs are always written locally under the configured artifact root. In Supabase mode, if `artifacts.supabase_bucket` is configured, the reporter uploads `output.log` and a zipped `allure-results` archive to Supabase Storage and stores the resulting URLs in `reports`.

## Relationship With iOS-Automation-Framework

```text
MeteorTest/agent
  -> reads iOS-Automation-Framework/meteortest.yml
  -> receives a task such as suite=ios_ui_smoke and app_path=/tmp/app.ipa
  -> prepares device/Appium environment
  -> runs the suite command in iOS-Automation-Framework
  -> uploads logs and Allure results
```

The long-term direction is to split this directory into an independent `meteortest-agent` repository or package after the protocol stabilizes.
