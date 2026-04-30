"""
task_client.py - 读写本地 tasks.json 任务表
"""
import json
import uuid
from datetime import datetime, timezone
from pathlib import Path

VALID_STATUSES = {"queued", "running", "succeeded", "failed", "cancelled", "timeout"}


def _load(path: Path) -> list:
    if not path.exists():
        return []
    return json.loads(path.read_text(encoding="utf-8"))


def _save(path: Path, tasks: list):
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(tasks, indent=2, ensure_ascii=False), encoding="utf-8")


def list_tasks(store_path: str) -> list:
    return _load(Path(store_path))


def get_queued_task(store_path: str) -> dict | None:
    for t in _load(Path(store_path)):
        if t.get("status") == "queued":
            return t
    return None


def lock_task(store_path: str, task_id: str, executor_name: str) -> bool:
    """CAS: queued -> running，返回是否成功锁定"""
    path = Path(store_path)
    tasks = _load(path)
    for t in tasks:
        if t["id"] == task_id and t["status"] == "queued":
            t["status"] = "running"
            t["executor"] = executor_name
            t["started_at"] = datetime.now(timezone.utc).isoformat()
            _save(path, tasks)
            return True
    return False


def update_task(store_path: str, task_id: str, **fields):
    path = Path(store_path)
    tasks = _load(path)
    for t in tasks:
        if t["id"] == task_id:
            t.update(fields)
            if fields.get("status") in {"succeeded", "failed", "cancelled", "timeout"}:
                t.setdefault("finished_at", datetime.now(timezone.utc).isoformat())
            _save(path, tasks)
            return
    raise KeyError(f"Task {task_id} not found")


def create_task(store_path: str, project_key: str, suite_id: str,
                environment: str = "local", parameters: dict | None = None) -> dict:
    path = Path(store_path)
    tasks = _load(path)
    task = {
        "id": str(uuid.uuid4()),
        "project_key": project_key,
        "suite_id": suite_id,
        "environment": environment,
        "status": "queued",
        "parameters": parameters or {},
        "created_at": datetime.now(timezone.utc).isoformat(),
        "started_at": None,
        "finished_at": None,
        "executor": None,
        "report": None,
    }
    tasks.append(task)
    _save(path, tasks)
    return task
