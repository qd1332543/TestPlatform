"""
supabase_reporter.py - 写回 tasks + reports + ai_analyses 表
"""
import os
import shutil
import tempfile
from pathlib import Path
from urllib.parse import quote
import httpx


def _headers() -> dict:
    return {
        "apikey": os.environ["SUPABASE_SERVICE_ROLE_KEY"],
        "Authorization": f"Bearer {os.environ['SUPABASE_SERVICE_ROLE_KEY']}",
        "Content-Type": "application/json",
    }


def _url(table: str) -> str:
    return f"{os.environ['SUPABASE_URL']}/rest/v1/{table}"


def _storage_public_url(bucket: str, object_path: str) -> str:
    encoded = quote(object_path.replace("\\", "/"), safe="/")
    return f"{os.environ['SUPABASE_URL']}/storage/v1/object/public/{bucket}/{encoded}"


def _upload_file(path: Path, object_path: str, content_type: str = "application/octet-stream") -> str:
    bucket = os.environ.get("SUPABASE_ARTIFACT_BUCKET")
    if not bucket or not path.exists():
        return str(path)

    upload_url = f"{os.environ['SUPABASE_URL']}/storage/v1/object/{bucket}/{quote(object_path, safe='/')}"
    headers = {
        "apikey": os.environ["SUPABASE_SERVICE_ROLE_KEY"],
        "Authorization": f"Bearer {os.environ['SUPABASE_SERVICE_ROLE_KEY']}",
        "Content-Type": content_type,
        "x-upsert": "true",
    }
    with path.open("rb") as file:
        httpx.put(upload_url, headers=headers, content=file.read(), timeout=120).raise_for_status()
    return _storage_public_url(bucket, object_path)


def _upload_artifacts(task_id: str, exec_result: dict) -> tuple[str | None, str | None]:
    log_url = None
    allure_url = None

    log_path = exec_result.get("log_path")
    if log_path:
        log_url = _upload_file(Path(log_path), f"{task_id}/output.log", "text/plain")

    allure_path = exec_result.get("allure_results_path")
    if allure_path and Path(allure_path).exists():
        with tempfile.TemporaryDirectory() as tmp:
            archive_base = Path(tmp) / "allure-results"
            archive_path = Path(shutil.make_archive(str(archive_base), "zip", allure_path))
            allure_url = _upload_file(archive_path, f"{task_id}/allure-results.zip", "application/zip")

    return log_url, allure_url


def report(task_id: str, exec_result: dict, task: dict | None = None):
    log_url, allure_url = _upload_artifacts(task_id, exec_result)

    httpx.patch(
        _url("tasks"),
        headers=_headers(),
        params={"id": f"eq.{task_id}"},
        json={
            "status": exec_result["status"],
            "started_at": exec_result["started_at"],
            "finished_at": exec_result["finished_at"],
        },
    ).raise_for_status()

    httpx.post(
        _url("reports"),
        headers=_headers(),
        json={
            "task_id": task_id,
            "log_url": log_url,
            "allure_url": allure_url,
            "summary": f"exit_code={exec_result['exit_code']}",
        },
    ).raise_for_status()

    # 失败时触发 AI 分析
    if exec_result["status"] == "failed" and task:
        try:
            from agent.services.ai_analyzer import analyze_failure
            analysis = analyze_failure(task, exec_result)
            if analysis:
                httpx.post(
                    _url("ai_analyses"),
                    headers=_headers(),
                    json={
                        "task_id": task_id,
                        "failure_reason": analysis.get("failure_reason"),
                        "impact": analysis.get("impact"),
                        "suggestion": analysis.get("suggestion"),
                        "suspected_files": analysis.get("suspected_files", []),
                        "flaky_probability": analysis.get("flaky_probability"),
                        "raw_response": analysis.get("raw_response"),
                    },
                ).raise_for_status()
        except Exception as e:
            import logging
            logging.getLogger(__name__).warning(f"AI analysis failed: {e}")
