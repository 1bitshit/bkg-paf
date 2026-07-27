# Implementation Plan

## Architecture

```
┌──────────────────────────────────────────────────┐
│              Client (React + Vite)               │
│  Agents · Providers · Sessions · Monitor         │
└──────────────────┬───────────────────────────────┘
                   │ REST API (port 5003)
┌──────────────────▼───────────────────────────────┐
│              Server (Bun + Hono)                 │
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
1. **Config file** — `opencode.json` on disk
2. **Database** — `opencode_configs` table via SettingsService
3. **OpenCode server** — Live `/provider` endpoint

Write operations go to the config file, then sync to DB and restart OpenCode.

## PI Agent Integration

PI (pi_agent_rust) uses RPC mode:
- Spawned as `pi --mode rpc --no-session`
- JSON commands over stdin: `{ "command": "prompt", "content": "..." }`
- Streaming events over stdout
- Supports all 8 built-in tools (read, write, edit, bash, grep, find, ls, hashline_edit)
- Requires `ANTHROPIC_API_KEY` or `OPENAI_API_KEY`

## Project Structure

```
bkg-paf/
├── client/               # Frontend overview
├── server/               # Backend overview
├── backend/              # Backend source (Bun + Hono)
│   └── src/
│       ├── agents/       # Agent adapters (OpenCode, OpenClaude, PI)
│       ├── routes/       # API routes (agents, providers, settings)
│       ├── services/     # Business logic (auth, settings, scheduling)
│       └── index.ts      # Entry point
├── frontend/             # Frontend source (React + Vite)
│   └── src/
│       ├── pages/        # Agents, Providers, Monitor, etc.
│       ├── api/          # API client functions
│       ├── hooks/        # React Query hooks
│       └── components/   # UI components
├── shared/               # Shared types, schemas, config
└── docs/                 # Documentation
```

## Next Steps

1. Server/client repo split — `bkg-code-manager-server` (private) + `bkg-code-manager-client` (public)
2. bkg-p2p integration — CLAW token earning via P2P network
3. opencode-voice — Voice-driven coding sessions
4. Production hardening — Monitoring, audit logging, credential rotation
