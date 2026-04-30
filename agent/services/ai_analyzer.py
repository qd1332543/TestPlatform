"""
ai_analyzer.py - 调用 Claude API 分析测试失败原因
"""
import os
import json
import httpx
from pathlib import Path

DEEPSEEK_API_URL = "https://api.deepseek.com/v1/chat/completions"
MODEL = "deepseek-chat"
MAX_LOG_CHARS = 8000


def _read_log(log_path: str | None) -> str:
    if not log_path:
        return ""
    path = Path(log_path)
    if not path.exists():
        return ""
    content = path.read_text(encoding="utf-8", errors="replace")
    return content[-MAX_LOG_CHARS:] if len(content) > MAX_LOG_CHARS else content


def analyze_failure(task: dict, exec_result: dict) -> dict:
    """调用 Claude API 分析失败原因，返回结构化分析结果"""
    api_key = os.environ.get("DEEPSEEK_API_KEY", "")
    if not api_key:
        return {}

    log_content = _read_log(exec_result.get("log_path"))
    prompt = f"""You are a test failure analyst. Analyze the following test execution failure and return a JSON object.

Task info:
- Suite: {task.get('suite_id')}
- Environment: {task.get('environment')}
- Exit code: {exec_result.get('exit_code')}

Test output log:
{log_content or '(no log available)'}

Return ONLY a JSON object with these fields:
- failure_reason: string, concise description of why the test failed
- impact: string, what functionality is affected
- suggestion: string, recommended fix direction
- suspected_files: array of strings, file paths likely related to the failure
- flaky_probability: number between 0 and 1, likelihood this is a flaky test
"""

    resp = httpx.post(
        DEEPSEEK_API_URL,
        headers={
            "Authorization": f"Bearer {api_key}",
            "content-type": "application/json",
        },
        json={
            "model": MODEL,
            "max_tokens": 1024,
            "messages": [{"role": "user", "content": prompt}],
        },
        timeout=60,
    )
    resp.raise_for_status()
    raw = resp.json()["choices"][0]["message"]["content"]

    try:
        # 提取 JSON（Claude 可能包裹在 ```json 中）
        text = raw.strip()
        if "```" in text:
            text = text.split("```")[1].lstrip("json").strip()
        result = json.loads(text)
    except Exception:
        result = {"failure_reason": raw[:500]}

    result["raw_response"] = raw
    return result
