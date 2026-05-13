"""
platform_config.py - 从 Supabase 读取 agent_runtime_settings，支持动态刷新 poll_interval
"""
import os
import logging
import httpx

log = logging.getLogger(__name__)

HEARTBEAT_INTERVAL = 120  # fixed, independent of task check interval


def _headers() -> dict:
    return {
        "apikey": os.environ["SUPABASE_SERVICE_ROLE_KEY"],
        "Authorization": f"Bearer {os.environ['SUPABASE_SERVICE_ROLE_KEY']}",
    }


def _url() -> str:
    return f"{os.environ['SUPABASE_URL']}/rest/v1/agent_runtime_settings"


def fetch_task_check_interval(executor_name: str = "default", fallback: int = 300) -> int:
    try:
        r = httpx.get(
            _url(),
            headers=_headers(),
            params={"executor_name": f"eq.{executor_name}", "select": "task_check_interval_seconds,enabled", "limit": "1"},
            timeout=5,
        )
        r.raise_for_status()
        rows = r.json()
        if rows and rows[0].get("enabled", True):
            return int(rows[0]["task_check_interval_seconds"])
    except Exception as e:
        log.warning(f"Could not fetch platform config, using fallback {fallback}s: {e}")
    return fallback
