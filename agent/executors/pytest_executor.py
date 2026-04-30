"""
pytest_executor.py - 执行 suite 命令并收集日志和 Allure 结果
"""
import subprocess
import shlex
import os
from pathlib import Path
from datetime import datetime, timezone


class _SafeFormatDict(dict):
    def __missing__(self, key):
        return "{" + key + "}"


def _format_command(command: str, values: dict) -> str:
    return command.format_map(_SafeFormatDict(values))


def run_suite(suite: dict, repo_path: str, output_dir: str, task_id: str,
              parameters: dict | None = None) -> dict:
    """
    执行 suite 命令，返回执行结果字典。
    """
    parameters = parameters or {}
    out_path = Path(output_dir) / task_id
    out_path.mkdir(parents=True, exist_ok=True)
    log_file = out_path / "output.log"

    format_values = {
        "task_id": task_id,
        "output_dir": str(out_path),
        "app_path": parameters.get("app_path", ""),
        "app_url": parameters.get("app_url", ""),
        "environment": parameters.get("environment", ""),
        **parameters,
    }
    command = _format_command(suite["command"], format_values)
    # macOS 上 python 命令不存在，替换为 python3
    if command.startswith("python "):
        command = "python3" + command[6:]

    # 如果 suite 有 allure 报告且命令未显式声明 --alluredir，则注入默认目录。
    allure_dir = None
    if suite.get("report", {}).get("allure"):
        allure_dir = str(out_path / "allure-results")
        if "--alluredir" not in command:
            command = f"{command} --alluredir={allure_dir}"

    env = os.environ.copy()
    env.update({
        "TEST_PLATFORM_TASK_ID": task_id,
        "TEST_PLATFORM_OUTPUT_DIR": str(out_path),
        "TEST_PLATFORM_ALLURE_RESULTS": allure_dir or "",
        "TEST_PLATFORM_APP_PATH": str(parameters.get("app_path") or ""),
        "APP_PATH": str(parameters.get("app_path") or ""),
        "TEST_ENV": str(parameters.get("environment") or ""),
    })

    started_at = datetime.now(timezone.utc).isoformat()
    with open(log_file, "w", encoding="utf-8") as f:
        result = subprocess.run(
            shlex.split(command),
            cwd=repo_path,
            stdout=f,
            stderr=subprocess.STDOUT,
            env=env,
            timeout=int(suite.get("timeout_seconds", parameters.get("timeout_seconds", 3600))),
        )
    finished_at = datetime.now(timezone.utc).isoformat()

    return {
        "exit_code": result.returncode,
        "status": "succeeded" if result.returncode == 0 else "failed",
        "log_path": str(log_file),
        "allure_results_path": allure_dir,
        "started_at": started_at,
        "finished_at": finished_at,
    }
