# Assistant Mode Workspace

This directory is the shared Assistant Mode workspace for OpenCode Manager.

## Directory Contents

- `opencode.json` configures this workspace and selects the default assistant agent.
- `.opencode/agents/assistant.md` contains the default assistant agent instructions, behavior, durable preferences, and self-editing rules.
- `.opencode/skills/` contains managed workspace skills for repos, schedules, notifications, and settings.
- `.opencode/internal-token` is managed by OpenCode Manager for internal API authentication.

Assistant-specific instructions belong in `.opencode/agents/assistant.md`.
