"""
agent.py - Local Agent 主入口，支持 local/supabase 模式、app_build 下载、超时重试
"""
import os
import time
import yaml
import logging
from pathlib import Path
from datetime import datetime, timezone

from agent.services.contract_reader import load_contract, get_suite
from agent.executors.pytest_executor import run_suite

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
log = logging.getLogger(__name__)

MAX_RETRIES = 3


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


def _setup_supabase_env(config: dict):
    os.environ.setdefault("SUPABASE_URL", config["platform"].get("supabase_url", ""))
    key_env = config["platform"].get("supabase_service_role_key_env", "SUPABASE_SERVICE_ROLE_KEY")
    bucket = config.get("artifacts", {}).get("supabase_bucket")
    if bucket:
        os.environ.setdefault("SUPABASE_ARTIFACT_BUCKET", bucket)
    if not os.environ.get("SUPABASE_URL"):
        raise ValueError("SUPABASE_URL is not set")
    if not os.environ.get(key_env):
        raise ValueError(f"Environment variable '{key_env}' is not set")
    os.environ["SUPABASE_SERVICE_ROLE_KEY"] = os.environ[key_env]


def run_agent(config_path: str = "config.yaml", poll_interval: int = 10):
    config = load_config(config_path)
    agent_cfg = config["agent"]
    agent_name = agent_cfg["name"]
    mode = config["platform"]["mode"]
    output_root = config["artifacts"]["local_output_root"]

    if mode == "supabase":
        _setup_supabase_env(config)
        from agent.services.supabase_task_client import get_queued_task, lock_task, update_task, get_suite_info
        from agent.reporters.supabase_reporter import report
        from agent.services.heartbeat import register_executor, start_heartbeat, set_offline
        from agent.services.artifact_downloader import download_artifact
        executor_id = register_executor(agent_name, agent_cfg["type"], config.get("capabilities", {}))
        start_heartbeat(executor_id, agent_cfg.get("heartbeat_interval_seconds", 30))
        log.info(f"Agent '{agent_name}' registered (supabase, executor_id={executor_id})")
    else:
        from agent.services.task_client import get_queued_task, lock_task, update_task
        from agent.reporters.local_reporter import report
        from agent.services.artifact_downloader import download_artifact
        executor_id = None
        get_suite_info = None

    log.info(f"Polling every {poll_interval}s (mode={mode}) ...")

    try:
        while True:
            task = get_queued_task() if mode == "supabase" else get_queued_task(config["platform"]["local_task_store"])
            if not task:
                time.sleep(poll_interval)
                continue

            task_id = task["id"]
            suite_id = task["suite_id"]
            retry_count = (task.get("parameters") or {}).get("_retry_count", 0)

            # 锁定任务
            locked = lock_task(task_id, executor_id) if mode == "supabase" else lock_task(
                config["platform"]["local_task_store"], task_id, agent_name)
            if not locked:
                log.warning(f"Task {task_id} already locked, skipping.")
                time.sleep(poll_interval)
                continue

            log.info(f"Picked up task {task_id}: suite={suite_id} retry={retry_count}")

            try:
                parameters = task.get("parameters") or {}
                parameters.setdefault("environment", task.get("environment", ""))

                if mode == "supabase":
                    suite_row = get_suite_info(suite_id)
                    if not suite_row:
                        raise KeyError(f"Suite '{suite_id}' not found")
                    project_key = suite_row["projects"]["key"]
                    repo_path = find_repo(config, project_key)
                    contract = load_contract(repo_path)
                    suite = get_suite(contract, suite_row["suite_key"])
                    # 下载 app_build 产物
                    app_build_id = task.get("app_build_id")
                    if app_build_id and download_artifact:
                        import httpx
                        r = httpx.get(
                            f"{os.environ['SUPABASE_URL']}/rest/v1/app_builds",
                            headers={"apikey": os.environ["SUPABASE_SERVICE_ROLE_KEY"],
                                     "Authorization": f"Bearer {os.environ['SUPABASE_SERVICE_ROLE_KEY']}"},
                            params={"id": f"eq.{app_build_id}", "select": "artifact_url,platform"},
                        )
                        build_info = r.json()[0] if r.json() else None
                        if build_info:
                            artifact_dir = str(Path(output_root) / task_id / "artifacts")
                            local_path = download_artifact(build_info["artifact_url"], artifact_dir)
                            parameters["app_path"] = local_path
                            parameters["app_platform"] = build_info.get("platform")
                            log.info(f"Downloaded artifact to {local_path}")
                else:
                    project_key = task["project_key"]
                    repo_path = find_repo(config, project_key)
                    contract = load_contract(repo_path)
                    suite = get_suite(contract, suite_id)
                    app_url = parameters.get("app_url")
                    if app_url and not parameters.get("app_path"):
                        artifact_dir = str(Path(output_root) / task_id / "artifacts")
                        parameters["app_path"] = download_artifact(app_url, artifact_dir)

                result = run_suite(suite, repo_path, output_root, task_id, parameters=parameters)

            except Exception as e:
                log.error(f"Task {task_id} error: {e}")
                # 超时重试
                if retry_count < MAX_RETRIES - 1:
                    log.info(f"Retrying task {task_id} ({retry_count + 1}/{MAX_RETRIES})")
                    params = task.get("parameters") or {}
                    params["_retry_count"] = retry_count + 1
                    if mode == "supabase":
                        update_task(task_id, status="queued", parameters=params)
                    else:
                        update_task(config["platform"]["local_task_store"], task_id, status="queued", parameters=params)
                    time.sleep(poll_interval)
                    continue
                result = {
                    "status": "failed", "exit_code": -1,
                    "log_path": None, "allure_results_path": None,
                    "started_at": task.get("started_at"),
                    "finished_at": datetime.now(timezone.utc).isoformat(),
                }

            if mode == "supabase":
                report(task_id, result, task=task)
            else:
                report(config["platform"]["local_task_store"], task_id, result)

            log.info(f"Task {task_id} finished: {result['status']}")
    finally:
        if mode == "supabase" and executor_id:
            set_offline(executor_id)


if __name__ == "__main__":
    import argparse
    parser = argparse.ArgumentParser(description="TestPlatform Local Agent")
    parser.add_argument("--config", default="config.yaml")
    parser.add_argument("--interval", type=int, default=10)
    args = parser.parse_args()
    run_agent(args.config, args.interval)
