import json
import sys
import threading
import time
from pathlib import Path

from agent.agent import run_agent
from agent.executors.pytest_executor import _prepare_command, _repo_python_candidates


def _write_sample_repo(repo_path: Path) -> None:
    tests_dir = repo_path / "tests"
    tests_dir.mkdir(parents=True)
    (repo_path / "meteortest.yml").write_text(
        """
project:
  key: sample
  name: Sample Project
suites:
  - id: smoke
    name: Smoke
    type: api
    command: python -m pytest tests/test_smoke.py -q
    report:
      allure: true
""".strip(),
        encoding="utf-8",
    )
    (tests_dir / "test_smoke.py").write_text(
        """
import os
from pathlib import Path


def test_agent_injects_task_environment():
    assert os.environ["METEORTEST_TASK_ID"] == "task-1"
    assert os.environ["TEST_ENV"] == "staging"
    Path(os.environ["METEORTEST_ALLURE_RESULTS"]).mkdir(parents=True, exist_ok=True)
""".strip(),
        encoding="utf-8",
    )


def test_local_agent_executes_task_and_writes_report(tmp_path):
    repo_path = tmp_path / "sample-repo"
    repo_path.mkdir()
    _write_sample_repo(repo_path)

    task_store = tmp_path / "tasks.json"
    output_root = tmp_path / "artifacts"
    task_store.write_text(
        json.dumps(
            [
                {
                    "id": "task-1",
                    "project_key": "sample",
                    "suite_id": "smoke",
                    "environment": "staging",
                    "status": "queued",
                    "parameters": {"python_executable": sys.executable},
                    "created_at": "2026-04-30T00:00:00Z",
                    "started_at": None,
                    "finished_at": None,
                    "executor": None,
                    "report": None,
                }
            ]
        ),
        encoding="utf-8",
    )

    config_path = tmp_path / "config.yaml"
    config_path.write_text(
        f"""
agent:
  name: local-test-agent
  type: local_mac
platform:
  mode: local
  local_task_store: {task_store.as_posix()}
repositories:
  - key: sample
    path: {repo_path.as_posix()}
    contract: meteortest.yml
artifacts:
  local_output_root: {output_root.as_posix()}
""".strip(),
        encoding="utf-8",
    )

    thread = threading.Thread(target=run_agent, args=(str(config_path), 1), daemon=True)
    thread.start()

    deadline = time.monotonic() + 10
    task = None
    while time.monotonic() < deadline:
        tasks = json.loads(task_store.read_text(encoding="utf-8"))
        task = tasks[0]
        if task["status"] in {"succeeded", "failed", "timeout", "cancelled"}:
            break
        time.sleep(0.2)

    tasks = json.loads(task_store.read_text(encoding="utf-8"))
    task = tasks[0]
    assert task["status"] == "succeeded"
    assert task["executor"] == "local-test-agent"
    assert task["started_at"]
    assert task["finished_at"]
    assert task["report"]["exit_code"] == 0

    log_path = Path(task["report"]["log_path"])
    assert log_path.exists()
    assert "1 passed" in log_path.read_text(encoding="utf-8")
    assert Path(task["report"]["allure_results_path"]).exists()


def test_python_command_prefers_test_repo_virtualenv(tmp_path):
    repo_path = tmp_path / "sample-repo"
    python_path = _repo_python_candidates(str(repo_path))[0]
    python_path.parent.mkdir(parents=True)
    python_path.write_text("", encoding="utf-8")

    command = _prepare_command("python -m pytest tests", str(repo_path), {})

    assert command[0] == str(python_path)
    assert command[1:] == ["-m", "pytest", "tests"]


def test_python_command_can_be_configured_per_task(tmp_path):
    repo_path = tmp_path / "sample-repo"
    repo_path.mkdir()

    command = _prepare_command(
        "python -m pytest tests",
        str(repo_path),
        {"python_executable": r"C:\Python313\python.exe"},
    )

    assert command[0] == r"C:\Python313\python.exe"
