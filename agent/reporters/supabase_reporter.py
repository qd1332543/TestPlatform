"""
supabase_reporter.py - 写回 tasks + reports + ai_analyses 表
"""
import os
import httpx


def _headers() -> dict:
    return {
        "apikey": os.environ["SUPABASE_SERVICE_ROLE_KEY"],
        "Authorization": f"Bearer {os.environ['SUPABASE_SERVICE_ROLE_KEY']}",
        "Content-Type": "application/json",
    }


def _url(table: str) -> str:
    return f"{os.environ['SUPABASE_URL']}/rest/v1/{table}"


def report(task_id: str, exec_result: dict, task: dict | None = None):
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
            "log_url": exec_result.get("log_path"),
            "allure_url": exec_result.get("allure_results_path"),
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
