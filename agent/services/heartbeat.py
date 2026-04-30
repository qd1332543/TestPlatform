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


def register_executor(name: str, executor_type: str, capabilities: dict) -> str:
    r = httpx.post(_url("executors"),
                   headers={**_headers(), "Prefer": "resolution=merge-duplicates,return=representation"},
                   json={"name": name, "type": executor_type, "status": "online",
                         "capabilities": capabilities,
                         "last_heartbeat_at": datetime.now(timezone.utc).isoformat()})
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
