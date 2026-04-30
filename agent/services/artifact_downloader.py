"""
artifact_downloader.py - 下载 App 构建产物到本地
"""
import httpx
from pathlib import Path


def download_artifact(artifact_url: str, dest_dir: str, filename: str | None = None) -> str:
    """下载产物到 dest_dir，返回本地路径"""
    dest = Path(dest_dir)
    dest.mkdir(parents=True, exist_ok=True)
    name = filename or artifact_url.split("/")[-1].split("?")[0] or "artifact"
    local_path = dest / name
    with httpx.stream("GET", artifact_url, follow_redirects=True) as r:
        r.raise_for_status()
        with open(local_path, "wb") as f:
            for chunk in r.iter_bytes():
                f.write(chunk)
    return str(local_path)
