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


def _split_command(command: str) -> list[str]:
    if os.name == "nt":
        return shlex.split(command, posix=False)
    return shlex.split(command)


def _repo_python_candidates(repo_path: str) -> list[Path]:
    repo = Path(repo_path)
    if os.name == "nt":
        return [
            repo / ".venv" / "Scripts" / "python.exe",
            repo / "venv" / "Scripts" / "python.exe",
        ]
    return [
        repo / ".venv" / "bin" / "python",
        repo / "venv" / "bin" / "python",
    ]


def _resolve_python_executable(repo_path: str, parameters: dict) -> str | None:
    configured = parameters.get("python_executable") or os.environ.get("METEORTEST_TEST_PYTHON")
    if configured:
        return str(configured)
    for candidate in _repo_python_candidates(repo_path):
        if candidate.exists():
            return str(candidate)
    return None


def _prepare_command(command: str, repo_path: str, parameters: dict) -> list[str]:
    tokens = _split_command(command)
    if not tokens:
        return tokens
    if tokens[0] in {"python", "python3"}:
        python_executable = _resolve_python_executable(repo_path, parameters)
        if python_executable:
            tokens[0] = python_executable
    return tokens


def _resolve_allure_dir(command_tokens: list[str], repo_path: str) -> str | None:
    for index, token in enumerate(command_tokens):
        value = None
        if token == "--alluredir" and index + 1 < len(command_tokens):
            value = command_tokens[index + 1]
        elif token.startswith("--alluredir="):
            value = token.split("=", 1)[1]
        if value:
            path = Path(value)
            if not path.is_absolute():
                path = Path(repo_path) / path
            return str(path)
    return None


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

    # 如果 suite 有 allure 报告且命令未显式声明 --alluredir，则注入默认目录。
    allure_dir = None
    if suite.get("report", {}).get("allure"):
        if "--alluredir" not in command:
            allure_dir = str(out_path / "allure-results")
            command = f"{command} --alluredir={allure_dir}"

    command_tokens = _prepare_command(command, repo_path, parameters)
    if suite.get("report", {}).get("allure"):
        allure_dir = _resolve_allure_dir(command_tokens, repo_path) or allure_dir

    env = os.environ.copy()
    env.update({
        "METEORTEST_TASK_ID": task_id,
        "METEORTEST_OUTPUT_DIR": str(out_path),
        "METEORTEST_ALLURE_RESULTS": allure_dir or "",
        "METEORTEST_APP_PATH": str(parameters.get("app_path") or ""),
        "APP_PATH": str(parameters.get("app_path") or ""),
        "TEST_ENV": str(parameters.get("environment") or ""),
    })

    started_at = datetime.now(timezone.utc).isoformat()
    with open(log_file, "w", encoding="utf-8") as f:
        result = subprocess.run(
            command_tokens,
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
