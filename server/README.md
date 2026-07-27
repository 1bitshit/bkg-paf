# bkg-paf Server

Backend application for bkg-paf — the multi-agent AI coding platform.

## Stack

- Bun runtime
- Hono web framework
- SQLite via bun:sqlite
- Better Auth for authentication

## Architecture

### Agent Adapter Pattern

Three agent backends are supported via a pluggable adapter interface:

| Agent | Type | Description |
|-------|------|-------------|
| **OpenCode** | Server process (port 5551) | Primary AI coding agent with SSE streaming |
| **OpenClaude** | CLI process | Multi-provider coding agent (OpenAI, Gemini, Ollama, NIM) |
| **PI (Rust)** | CLI process (`pi --mode rpc`) | High-performance agent with 8 built-in tools |

Each adapter implements `AgentAdapter`: `healthCheck()`, `createSession()`, `sendMessage()`, `listSessions()`, etc.

### Provider Management

Providers are merged from three sources:
1. **Config file** — `opencode.json` on disk
2. **Database** — SQLite `opencode_configs` table
3. **OpenCode server** — Live `/provider` endpoint

Full CRUD via `POST/PUT/DELETE /api/provider-management`.

### API Routes

| Route | Description |
|-------|-------------|
| `GET /api/agents` | List all registered agents with health |
| `POST /api/agents/:id/sessions` | Create a new session on an agent |
| `GET /api/provider-management` | List all providers (merged from file + DB + server) |
| `POST /api/provider-management` | Add a new provider |
| `DELETE /api/provider-management/:id` | Remove a provider |

## Development

```bash
pnpm install
pnpm dev:backend    # Backend only on port 5003
pnpm lint:backend   # Lint backend
pnpm test           # Run backend tests (vitest)
```
