<div align="center">

# BKG PAF

**BKG Primordial AI Forge**

*Where Intelligent Systems Are Forged.*

Multi-agent AI coding platform — manage OpenCode, OpenClaude, and PI agents from one interface.

</div>

---

## Overview

BKG PAF is a mobile-first web platform for orchestrating multiple AI coding agents. It provides a unified dashboard to switch between **OpenCode**, **OpenClaude**, and **PI (pi_agent_rust)** backends, manage AI providers, create coding sessions, and monitor performance — from any device.

## Architecture

```
bkg-paf/
├── bkg-paf-server          # Backend API (Bun + Hono)
├── bkg-paf-desktop         # Desktop app (future)
├── bkg-paf-cli             # CLI tool (future)
├── bkg-paf-sdk             # SDK for integrations
├── bkg-paf-node            # Node.js bindings
├── bkg-paf-agent           # Agent runtime
├── bkg-paf-runtime         # Execution runtime
├── bkg-paf-wallet          # Wallet integration
├── bkg-paf-p2p             # P2P networking (bkg-p2p)
├── bkg-paf-market          # Marketplace
└── bkg-paf-plugin-api      # Plugin system
```

### Rust Crates

```
crates/
├── paf-core        # Core types, traits, and abstractions
├── paf-api         # API layer
├── paf-agent       # Agent implementations
├── paf-provider    # Provider management
├── paf-runtime     # Execution runtime
├── paf-wallet      # Wallet and token management
├── paf-p2p         # P2P networking
├── paf-coin        # CLAW token economy
├── paf-ui          # Shared UI components
├── paf-plugin      # Plugin system
├── paf-compute     # Compute orchestration
└── paf-storage     # Persistent storage
```

### Current System (TypeScript)

The working platform is a pnpm workspace with three packages:

| Package | Stack | Purpose |
|---------|-------|---------|
| `backend/` | Bun + Hono + SQLite | API server, agent adapters, auth, scheduling |
| `frontend/` | React + Vite + Tailwind | Web UI, mobile-first, PWA |
| `shared/` | TypeScript + Zod | Shared types, schemas, config |

## Agent Backends

| Agent | Type | Description |
|-------|------|-------------|
| **OpenCode** | Server process (port 5551) | Primary AI coding agent with SSE streaming, tools, MCP |
| **OpenClaude** | CLI process | Multi-provider agent (OpenAI, Gemini, Ollama, NIM) |
| **PI (Rust)** | CLI process (`pi --mode rpc`) | High-performance agent with 8 built-in tools |

Each agent implements a pluggable `AgentAdapter` interface:
`healthCheck()` · `createSession()` · `sendMessage()` · `listSessions()` · `abortSession()` · `listProviders()`

## Provider Management

Providers are merged from three sources:

1. **Config file** — `opencode.json` on disk
2. **Database** — SQLite `opencode_configs` table
3. **OpenCode server** — Live `/provider` endpoint

Full CRUD API for adding, updating, and removing AI providers with API key management.

**Supported providers:** OpenAI · Anthropic · NVIDIA NIM (80+ models) · Ollama · llama.cpp · LM Studio · vLLM · Custom OpenAI-compatible endpoints

## Quick Start

```bash
git clone https://github.com/1bitshit/bkg-paf.git
cd bkg-paf
cp .env.example .env
echo "AUTH_SECRET=$(openssl rand -base64 32)" >> .env
docker-compose up -d
# Open http://localhost:5003
```

Create your admin account on first launch.

## Configuration

```bash
# Required
AUTH_SECRET=your-secure-random-secret

# Admin (optional)
ADMIN_EMAIL=admin@example.com
ADMIN_PASSWORD=your-secure-password

# Network access
AUTH_TRUSTED_ORIGINS=http://localhost:5003,https://yourdomain.com
AUTH_SECURE_COOKIES=false

# PI agent (optional)
PI_API_KEY=your-anthropic-or-openai-key
PI_MODEL=claude-sonnet-4-6
PI_PROVIDER=anthropic
```

## Development

```bash
pnpm install
pnpm dev          # Backend (5003) + Frontend (5173)
pnpm lint         # Lint all
pnpm test         # Backend tests (vitest)
pnpm build        # Production build
```

## Features

- **Multi-Agent Dashboard** — OpenCode, OpenClaude, PI with health monitoring
- **Provider Management** — Add, configure, manage AI providers with API keys
- **Session Control** — Create, monitor, abort sessions per agent
- **Repositories & Git** — Multi-repo, SSH auth, worktrees, diffs
- **Chat & Streaming** — Real-time SSE, slash commands, @file mentions
- **Files** — Syntax highlighting, create/rename/delete, ZIP download
- **Schedules** — Recurring jobs with prompt templates and run history
- **MCP Servers** — Local and remote MCP server management
- **Plugins** — Extensible plugin system
- **Push Notifications** — Background alerts for agent events
- **Mobile & PWA** — Responsive UI, installable on any device
- **Voice** — Text-to-speech and speech-to-text

## Roadmap

- [x] Multi-agent adapter pattern (OpenCode, OpenClaude, PI)
- [x] Provider management with merge strategy
- [x] Client/Server folder structure
- [ ] Server/Client repo split
- [ ] bkg-p2p integration (CLAW token economy)
- [ ] Desktop app (bkg-paf-desktop)
- [ ] CLI tool (bkg-paf-cli)
- [ ] Voice coding (opencode-voice)
- [ ] Rust crates (paf-core, paf-agent, paf-coin)
- [ ] Plugin marketplace

## License

MIT
