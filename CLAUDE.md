# CLAUDE.md

Claude Code should follow the project guidance in `AGENTS.md`.

Before making non-trivial changes:

1. Read `AGENTS.md`.
2. Read the relevant source files and nearby tests.
3. Use the validation commands listed in `AGENTS.md`.
4. Keep changes scoped and preserve the `meteortest.yml` contract unless explicitly asked to change it.

Do not commit secrets, local config, generated reports, or `.meteortest-agent/` artifacts.
