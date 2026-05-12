"""
Validate Local Agent configuration before polling tasks.
"""
import os
from pathlib import Path


class ConfigValidationError(ValueError):
    pass


def _require_mapping(config: dict, key: str, errors: list[str]) -> dict:
    value = config.get(key)
    if not isinstance(value, dict):
        errors.append(f"Missing or invalid '{key}' section.")
        return {}
    return value


def validate_config(config: dict, config_path: str = "config.yaml") -> None:
    errors: list[str] = []
    config_dir = Path(config_path).resolve().parent

    agent = _require_mapping(config, "agent", errors)
    platform = _require_mapping(config, "platform", errors)
    artifacts = _require_mapping(config, "artifacts", errors)

    if not agent.get("name"):
        errors.append("agent.name is required.")
    if not agent.get("type"):
        errors.append("agent.type is required.")

    mode = platform.get("mode")
    if mode not in {"local", "supabase"}:
        errors.append("platform.mode must be 'local' or 'supabase'.")

    if mode == "local" and not platform.get("local_task_store"):
        errors.append("platform.local_task_store is required in local mode.")
    if mode == "supabase":
        if not platform.get("supabase_url") and not os.environ.get("SUPABASE_URL"):
            errors.append("platform.supabase_url or SUPABASE_URL is required in supabase mode.")
        key_env = platform.get("supabase_service_role_key_env", "SUPABASE_SERVICE_ROLE_KEY")
        if not os.environ.get(key_env):
            errors.append(f"Environment variable '{key_env}' is required in supabase mode.")

    output_root = artifacts.get("local_output_root")
    if not output_root:
        errors.append("artifacts.local_output_root is required.")
    else:
        output_path = Path(output_root)
        if not output_path.is_absolute():
            output_path = config_dir / output_path
        try:
            output_path.mkdir(parents=True, exist_ok=True)
        except OSError as exc:
            errors.append(f"artifacts.local_output_root is not writable: {output_path} ({exc})")

    repositories = config.get("repositories")
    if not isinstance(repositories, list) or not repositories:
        errors.append("repositories must contain at least one repository mapping.")
    else:
        seen_keys = set()
        for index, repo in enumerate(repositories):
            prefix = f"repositories[{index}]"
            if not isinstance(repo, dict):
                errors.append(f"{prefix} must be an object.")
                continue
            key = repo.get("key")
            path_value = repo.get("path")
            contract = repo.get("contract", "meteortest.yml")
            if not key:
                errors.append(f"{prefix}.key is required.")
            elif key in seen_keys:
                errors.append(f"{prefix}.key '{key}' is duplicated.")
            else:
                seen_keys.add(key)
            if not path_value:
                errors.append(f"{prefix}.path is required.")
                continue
            repo_path = Path(path_value)
            if not repo_path.is_absolute():
                repo_path = config_dir / repo_path
            if not repo_path.exists():
                errors.append(f"{prefix}.path does not exist: {repo_path}")
                continue
            contract_path = repo_path / str(contract)
            if not contract_path.exists():
                errors.append(f"{prefix}.contract does not exist: {contract_path}")

    if errors:
        message = "Agent config validation failed:\n" + "\n".join(f"- {error}" for error in errors)
        raise ConfigValidationError(message)
