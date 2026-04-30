# TestPlatform Local Agent

Local Agent is the temporary platform-side executor implementation for the MVP stage.

It is responsible for:

- Registering executor capabilities.
- Reading a test repository contract such as `test-platform.yml`.
- Polling queued tasks from a local JSON/SQLite queue in the short term.
- Polling Supabase `tasks` in the medium term.
- Locking tasks before execution.
- Preparing app artifacts such as `.ipa`, `.app`, or `.apk` when required.
- Running suite commands from the test repository.
- Capturing logs and report artifacts.
- Updating task status and report metadata.

It is not owned by individual test repositories. Test repositories only expose suite metadata and executable commands.

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

Only the README and config template are committed at this stage. Runtime code should be added when the local task loop is implemented.

## Relationship With iOS-Automation-Framework

```text
TestPlatform/agent
  -> reads iOS-Automation-Framework/test-platform.yml
  -> receives a task such as suite=ios_ui_smoke and app_path=/tmp/app.ipa
  -> prepares device/Appium environment
  -> runs the suite command in iOS-Automation-Framework
  -> uploads logs and Allure results
```

The long-term direction is to split this directory into an independent `test-platform-agent` repository or package after the protocol stabilizes.
