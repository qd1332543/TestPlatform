# Private Agent Preview Loop

## Semi-Automated Validation Script

The Web package now includes:

```bash
cd apps/web
npm run validate:private-agent-loop
```

The script uses `NEXT_PUBLIC_SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` to create a private preview task, then polls task status, log URL, and Allure URL.

Optional environment variables:

```text
METEORTEST_LOOP_PROJECT_KEY=yunlu-ios
METEORTEST_LOOP_SUITE_KEY=smoke
METEORTEST_LOOP_ENVIRONMENT=dev
METEORTEST_LOOP_TIMEOUT_SECONDS=600
```

Make sure the private Local Agent is running, or start it immediately after the script creates the task.

This runbook validates the safe connected-preview path:

```text
Public Web preview -> preview Supabase -> private Local Agent -> test repository -> report back to Web
```

The Local Agent stays private. Do not expose an Agent HTTP endpoint, local path, device identifier, service-role key, or test account on the public internet.

## Preconditions

1. The Web preview is deployed and reachable at `https://meteortest.jcmeteor.com/`.
2. The deployment uses `METEORTEST_PUBLIC_PREVIEW=1` and `METEORTEST_AGENT_DISABLED=1`.
3. The Web preview and the private Agent point to the same preview Supabase project.
4. Preview demo data has been inserted with `supabase/seed-preview.sql`, or an equivalent project and suite exist.
5. The private machine has the test repository cloned, for example `iOS-Automation-Framework`.
6. The Agent config has a `repositories` entry whose `key` exactly matches the `projects.key` value in Supabase.

For the safe preview seed, include this repository alias in `agent/config.yaml`:

```yaml
repositories:
  - key: ios-automation-framework
    path: /absolute/path/to/iOS-Automation-Framework
    contract: meteortest.yml
```

If the preview project uses `yunlu-ios` or `yunluji` instead, keep those keys in the same list as additional aliases pointing to the same local repository.

## Private Environment

Configure these only on the private machine or trusted runner:

```bash
export SUPABASE_SERVICE_ROLE_KEY=your-preview-service-role-key
export METEORTEST_TEST_PYTHON=/absolute/path/to/iOS-Automation-Framework/.venv/bin/python
export METEORTEST_AGENT_TASK_SOURCE=web-console
export METEORTEST_AGENT_PRIVATE_PREVIEW_ONLY=1
```

`agent/config.yaml` should use:

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

Use a public bucket only for short-lived previews with synthetic reports. For production-like data, use private storage and signed URLs.

`METEORTEST_AGENT_TASK_SOURCE` and `METEORTEST_AGENT_PRIVATE_PREVIEW_ONLY` are optional safety filters. They make the private Agent claim only tasks created by the Web console for the private preview loop, avoiding stale seed tasks or unrelated queued work.

## Validation Flow

1. Open `https://meteortest.jcmeteor.com/tasks/new`.
2. Create an `api_smoke` task for the preview project. Avoid selecting the placeholder demo app build unless you intend to validate artifact download behavior. Tasks created by the Web console include `parameters.source=web-console` and `parameters.private_agent_preview=true` when `METEORTEST_PUBLIC_PREVIEW=1`.
3. The Web console redirects to the new task detail page.
4. Start the private Agent from the repository root:

```bash
python -m agent.agent --config agent/config.yaml --interval 10
```

5. Confirm the Agent registers an executor and claims the queued task.
6. Wait for the task detail page to move from `queued` to `running`, then to `succeeded` or `failed`.
7. Open the task detail page and confirm:
   - status changed from the private Agent result,
   - report row was created,
   - log link exists when artifact upload or local artifact reporting is configured,
   - failed tasks show AI repair diagnostics and the AI repair handoff export.

## Non-Secret Checks

These checks can be shared in issues or PRs:

```bash
curl -I https://meteortest.jcmeteor.com/
curl -I https://meteortest.jcmeteor.com/tasks
curl -I https://meteortest.jcmeteor.com/executors
```

Do not paste service-role keys, full `.env.local` contents, private Supabase URLs, local absolute paths, device IDs, or raw logs containing account data.

## Troubleshooting

- If the Agent picks up a task and fails with `Repository for project ... not found`, add that exact `projects.key` to `agent/config.yaml`.
- If the task stays `queued`, verify the Agent is running in `platform.mode: supabase`, the service-role key is set, and the Agent can reach Supabase.
- If reports are written but links are local paths, configure `artifacts.supabase_bucket` and ensure the bucket exists.
- If Allure links are missing, confirm the suite command writes to the `--alluredir` path and that the Agent can zip/upload the result directory.
- If public pages expose local paths or secret variable names, stop the preview and run `npm run smoke:public-preview` before redeploying.

## Completion Criteria

The preview loop is considered validated when one task created from `https://meteortest.jcmeteor.com/` is executed by a private Agent and the Web console shows the returned status, report summary, and failure diagnostics or success report.
