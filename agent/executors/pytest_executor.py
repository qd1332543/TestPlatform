"""
pytest_executor.py - 执行 suite 命令并收集日志和 Allure 结果
"""
import subprocess
import shlex
from pathlib import Path
from datetime import datetime, timezone


def run_suite(suite: dict, repo_path: str, output_dir: str, task_id: str) -> dict:
    """
    执行 suite 命令，返回执行结果字典。
    """
    out_path = Path(output_dir) / task_id
    out_path.mkdir(parents=True, exist_ok=True)
    log_file = out_path / "output.log"

    command = suite["command"]
    # 如果 suite 有 allure 报告，注入 --alluredir
    allure_dir = None
    if suite.get("report", {}).get("allure"):
        allure_dir = str(out_path / "allure-results")
        command = f"{command} --alluredir={allure_dir}"

    started_at = datetime.now(timezone.utc).isoformat()
    with open(log_file, "w", encoding="utf-8") as f:
        result = subprocess.run(
            shlex.split(command),
            cwd=repo_path,
            stdout=f,
            stderr=subprocess.STDOUT,
            timeout=3600,
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
