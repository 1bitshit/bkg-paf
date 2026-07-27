# Implementation Plan

## Architecture

```
┌──────────────────────────────────────────────────┐
│                   Frontend (React)                │
│  Agents page → Sessions → Messages               │
│  Providers page → CRUD → API keys                │
│  Monitor page → Health → Usage                   │
└──────────────────┬───────────────────────────────┘
                   │ REST API (port 5003)
┌──────────────────▼───────────────────────────────┐
│                  Backend (Bun + Hono)             │
│  Agent Registry → Adapter Pattern                │
│  ├── OpenCodeAdapter (OpenCode server :5551)     │
│  ├── OpenClaudeAdapter (CLI process)             │
│  └── PiAdapter (pi --mode rpc, CLI process)      │
│  Provider Management (file + DB + server merge)  │
│  Settings (SQLite via bun:sqlite)                │
└──────────────────┬───────────────────────────────┘
                   │
┌──────────────────▼───────────────────────────────┐
│              External Agent CLIs                  │
│  OpenCode (port 5551) | OpenClaude | PI (Rust)   │
└──────────────────────────────────────────────────┘
```

## Agent Adapter Pattern

Each agent implements `AgentAdapter` interface:
- `id`, `name`, `description` — identity
- `capabilities` — what the agent supports (sessions, messages, streaming, tools, mcp, permissions, costTracking)
- `start()` / `stop()` — lifecycle
- `healthCheck()` — returns health status + version
- `listSessions()` / `createSession()` / `deleteSession()` / `abortSession()`
- `listMessages()` / `sendMessage()`
- `listProviders()` — available model providers

Registry manages all adapters. Frontend queries `/api/agents` for list + health.

## Provider Management

Providers are merged from three sources:
1. **Config file** (opencode.json on disk)
2. **Database** (opencode_configs table via SettingsService)
3. **OpenCode server** (live `/provider` endpoint)

Write operations go to the config file, then sync to DB and restart OpenCode.

## PI Agent Integration

PI (pi_agent_rust) uses RPC mode:
- Spawned as `pi --mode rpc --no-session`
- JSON commands over stdin: `{ "command": "prompt", "content": "..." }`
- Streaming events over stdout
- Supports all 8 built-in tools (read, write, edit, bash, grep, find, ls, hashline_edit)
- Requires ANTHROPIC_API_KEY or OPENAI_API_KEY

## Next Steps

1. Server/client repo split
2. bkg-p2p integration for CLAW token economy
3. opencode-voice integration
4. Production monitoring and audit logging
