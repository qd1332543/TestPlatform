"""
supabase_task_client.py - 通过 Supabase REST API 操作 tasks 表
"""
import os
import httpx
from datetime import datetime, timezone


def _headers() -> dict:
    return {
        "apikey": os.environ["SUPABASE_SERVICE_ROLE_KEY"],
        "Authorization": f"Bearer {os.environ['SUPABASE_SERVICE_ROLE_KEY']}",
        "Content-Type": "application/json",
        "Prefer": "return=representation",
    }


def _url(table: str) -> str:
    return f"{os.environ['SUPABASE_URL']}/rest/v1/{table}"


def get_queued_task() -> dict | None:
    params = {"status": "eq.queued", "order": "created_at.asc", "limit": "1", "select": "*"}
    task_source = os.environ.get("METEORTEST_AGENT_TASK_SOURCE")
    if task_source:
        params["parameters->>source"] = f"eq.{task_source}"
    if os.environ.get("METEORTEST_AGENT_PRIVATE_PREVIEW_ONLY") == "1":
        params["parameters->>private_agent_preview"] = "eq.true"

    r = httpx.get(_url("tasks"), headers=_headers(), params=params)
    r.raise_for_status()
    return r.json()[0] if r.json() else None


def lock_task(task_id: str, executor_id: str) -> bool:
    r = httpx.patch(_url("tasks"), headers=_headers(),
                    params={"id": f"eq.{task_id}", "status": "eq.queued"},
                    json={"status": "running", "executor_id": executor_id,
                          "started_at": datetime.now(timezone.utc).isoformat()})
    r.raise_for_status()
    return len(r.json()) > 0


def update_task(task_id: str, **fields):
    if fields.get("status") in {"succeeded", "failed", "cancelled", "timeout"}:
        fields.setdefault("finished_at", datetime.now(timezone.utc).isoformat())
    httpx.patch(_url("tasks"), headers=_headers(),
                params={"id": f"eq.{task_id}"}, json=fields).raise_for_status()


def get_suite_info(suite_id: str) -> dict | None:
    r = httpx.get(_url("test_suites"), headers=_headers(),
                  params={"id": f"eq.{suite_id}", "select": "*,projects(key,repo_url)", "limit": "1"})
    r.raise_for_status()
    data = r.json()
    return data[0] if data else None
