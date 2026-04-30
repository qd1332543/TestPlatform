"""
local_reporter.py - 将执行结果写回任务表
"""
from agent.services.task_client import update_task


def report(store_path: str, task_id: str, exec_result: dict):
    update_task(
        store_path,
        task_id,
        status=exec_result["status"],
        started_at=exec_result["started_at"],
        finished_at=exec_result["finished_at"],
        report={
            "log_path": exec_result["log_path"],
            "allure_results_path": exec_result.get("allure_results_path"),
            "exit_code": exec_result["exit_code"],
        },
    )
