"""
heartbeat.py - 注册执行器并定时发送心跳
"""
import os
import threading
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


def _flatten_capabilities(capabilities: dict | list | None) -> list[str]:
    if not capabilities:
        return []
    if isinstance(capabilities, list):
        return [str(item) for item in capabilities]

    flattened: list[str] = []
    for group, values in capabilities.items():
        if isinstance(values, list):
            flattened.extend(f"{group}:{value}" for value in values)
        else:
            flattened.append(f"{group}:{values}")
    return flattened


def register_executor(name: str, executor_type: str, capabilities: dict) -> str:
    payload = {
        "name": name,
        "type": executor_type,
        "status": "online",
        "capabilities": _flatten_capabilities(capabilities),
        "last_heartbeat_at": datetime.now(timezone.utc).isoformat(),
    }

    existing = httpx.get(
        _url("executors"),
        headers=_headers(),
        params={"name": f"eq.{name}", "select": "id", "limit": "1"},
    )
    existing.raise_for_status()
    rows = existing.json()
    if rows:
        executor_id = rows[0]["id"]
        r = httpx.patch(
            _url("executors"),
            headers=_headers(),
            params={"id": f"eq.{executor_id}"},
            json=payload,
        )
        r.raise_for_status()
        return executor_id

    r = httpx.post(_url("executors"),
                   headers=_headers(),
                   json=payload)
    r.raise_for_status()
    return r.json()[0]["id"]


def start_heartbeat(executor_id: str, interval: int = 30):
    def _beat():
        import time
        while True:
            try:
                httpx.patch(_url("executors"), headers=_headers(),
                            params={"id": f"eq.{executor_id}"},
                            json={"status": "online",
                                  "last_heartbeat_at": datetime.now(timezone.utc).isoformat()})
            except Exception:
                pass
            time.sleep(interval)
    threading.Thread(target=_beat, daemon=True).start()


def set_offline(executor_id: str):
    httpx.patch(_url("executors"), headers=_headers(),
                params={"id": f"eq.{executor_id}"}, json={"status": "offline"})
