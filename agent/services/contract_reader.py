"""
contract_reader.py - 读取测试工程的 test-platform.yml
"""
import yaml
from pathlib import Path


def load_contract(repo_path: str, contract_file: str = "test-platform.yml") -> dict:
    path = Path(repo_path) / contract_file
    if not path.exists():
        raise FileNotFoundError(f"Contract not found: {path}")
    return yaml.safe_load(path.read_text(encoding="utf-8"))


def get_suite(contract: dict, suite_id: str) -> dict:
    for suite in contract.get("suites", []):
        if suite["id"] == suite_id:
            return suite
    raise KeyError(f"Suite '{suite_id}' not found in contract")
