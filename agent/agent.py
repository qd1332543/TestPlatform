"""
agent.py - Local Agent 主入口，任务轮询循环
"""
import time
import yaml
import logging
from pathlib import Path

from agent.services.task_client import get_queued_task, lock_task
from agent.services.contract_reader import load_contract, get_suite
from agent.executors.pytest_executor import run_suite
from agent.reporters.local_reporter import report

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
log = logging.getLogger(__name__)


def load_config(config_path: str = "config.yaml") -> dict:
    path = Path(config_path)
    if not path.exists():
        raise FileNotFoundError(f"Config not found: {path}. Copy config.example.yaml to config.yaml.")
    return yaml.safe_load(path.read_text(encoding="utf-8"))


def find_repo(config: dict, project_key: str) -> str:
    for repo in config.get("repositories", []):
        if repo["key"] == project_key:
            return repo["path"]
    raise KeyError(f"Repository for project '{project_key}' not found in config")


def run_agent(config_path: str = "config.yaml", poll_interval: int = 10):
    config = load_config(config_path)
    agent_name = config["agent"]["name"]
    store_path = config["platform"]["local_task_store"]
    output_root = config["artifacts"]["local_output_root"]

    log.info(f"Agent '{agent_name}' started. Polling every {poll_interval}s ...")

    while True:
        task = get_queued_task(store_path)
        if not task:
            time.sleep(poll_interval)
            continue

        task_id = task["id"]
        project_key = task["project_key"]
        suite_id = task["suite_id"]

        if not lock_task(store_path, task_id, agent_name):
            log.warning(f"Task {task_id} already locked, skipping.")
            time.sleep(poll_interval)
            continue

        log.info(f"Picked up task {task_id}: project={project_key} suite={suite_id}")

        try:
            repo_path = find_repo(config, project_key)
            contract = load_contract(repo_path)
            suite = get_suite(contract, suite_id)
            result = run_suite(suite, repo_path, output_root, task_id)
        except Exception as e:
            log.error(f"Task {task_id} failed with exception: {e}")
            result = {
                "status": "failed",
                "exit_code": -1,
                "log_path": None,
                "allure_results_path": None,
                "started_at": task.get("started_at"),
                "finished_at": None,
            }

        report(store_path, task_id, result)
        log.info(f"Task {task_id} finished: {result['status']}")


if __name__ == "__main__":
    import argparse
    parser = argparse.ArgumentParser(description="TestPlatform Local Agent")
    parser.add_argument("--config", default="config.yaml")
    parser.add_argument("--interval", type=int, default=10)
    args = parser.parse_args()
    run_agent(args.config, args.interval)
