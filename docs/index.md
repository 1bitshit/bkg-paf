---
hide:
  - toc
---

# bkg-paf

Multi-agent AI coding platform. Manage OpenCode, OpenClaude, and PI agents from one interface — your phone, tablet, or desktop.

## What is bkg-paf?

bkg-paf is a mobile-first web interface for managing multiple AI coding agents. It combines multi-agent orchestration, provider management, repository management, chat/session control, Git and file tools, schedules, AI configuration, MCP server management, push notifications, and full PWA support into a single responsive application.

- **Multi-Agent Support** — Switch between OpenCode, OpenClaude, and PI (pi_agent_rust) agents
- **Provider Management** — Add, configure, and manage AI providers (OpenAI, Anthropic, NVIDIA NIM, local models)
- **Repository management** — Clone, discover, and manage multiple Git repos with SSH authentication and worktree support
- **Chat & sessions** — Real-time SSE streaming with slash commands, `@file` mentions, Plan/Build modes
- **Schedules** — Recurring repo jobs with reusable prompts, run history, and linked sessions
- **AI configuration** — Model/provider setup, OAuth for Anthropic/GitHub Copilot, custom agents
- **MCP & Skills** — MCP server management and skill support
- **Mobile & notifications** — Installable PWA with push notifications and mobile-first navigation

## How It Works

bkg-paf runs as a pnpm workspace:

- The Bun/Hono backend manages a pluggable **Agent Registry** with adapters for OpenCode, OpenClaude, and PI.
- **Provider Management** merges configuration from file, database, and live OpenCode server.
- The React/Vite frontend renders the Agents dashboard, Provider management, sessions, and navigation.
- The shared package keeps config, schemas, and TypeScript types aligned between backend and frontend.

## Agent Backends

| Agent | Type | Description |
|-------|------|-------------|
| **OpenCode** | Server process (port 5551) | Primary AI coding agent with SSE streaming, tools, MCP |
| **OpenClaude** | CLI process | Multi-provider agent (OpenAI, Gemini, Ollama, NIM) |
| **PI (Rust)** | CLI process (`pi --mode rpc`) | High-performance agent with 8 built-in tools |

## Project Layout

- `client/` — Frontend: React + Vite SPA (pages, components, hooks, API clients)
- `server/` — Backend: Bun + Hono API server (agent adapters, routes, services)
- `backend/` — Backend source code
- `frontend/` — Frontend source code
- `shared/` — Workspace package for schemas, types, config, and utilities
- `docs/` — MkDocs Material documentation

## Next Steps

- [Installation Guide](getting-started/installation.md) — Detailed setup instructions
- [Quick Start](getting-started/quickstart.md) — Get up and running fast
- [Features Overview](features/overview.md) — Explore all features
- [Configuration](configuration/environment.md) — Environment variables and setup
- [Roadmap](roadmap.md) — What's planned next
- [Implementation Plan](plan.md) — Architecture and design decisions
