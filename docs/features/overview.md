# Features Overview

bkg-paf provides a comprehensive multi-agent web interface for managing AI coding agents.

## Multi-Agent System

### Agent Dashboard

- **Agent Registry** — Pluggable adapter pattern supporting OpenCode, OpenClaude, and PI (Rust) agents
- **Health Monitoring** — Real-time health status for each agent (healthy/unhealthy/stopped)
- **Session Creation** — Create new sessions directly from any agent card
- **Capability Display** — View each agent's capabilities (sessions, messages, streaming, tools, MCP, permissions, cost tracking)

[Learn more →](../plan.md)

### Agent Backends

| Agent | Type | Capabilities |
|-------|------|-------------|
| **OpenCode** | Server process | Sessions, messages, streaming, tools, MCP, cost tracking |
| **OpenClaude** | CLI process | Sessions, messages, streaming, tools, MCP |
| **PI (Rust)** | CLI process (RPC mode) | Sessions, messages, streaming, tools, permissions, cost tracking |

## Provider Management

### Provider Dashboard

- **Merged Providers** — Providers aggregated from config file, database, and OpenCode server
- **Add/Remove** — Full CRUD for AI providers
- **API Key Management** — Securely store and manage provider credentials
- **Model Listing** — View available models per provider

[Learn more →](ai-config.md)

### Supported Providers

- **OpenAI** — GPT models, Codex, o-series
- **Anthropic** — Claude models (Sonnet, Opus, Haiku)
- **NVIDIA NIM** — 80+ curated models (Llama, DeepSeek, Qwen, Mistral, etc.)
- **Local Models** — Ollama, llama.cpp, LM Studio, vLLM
- **Custom** — Any OpenAI-compatible endpoint

## Core Features

### Repository & Git

- **Multi-Repository Support** — Clone and manage multiple git repos with private repo support via GitHub PAT
- **SSH Authentication** — SSH key authentication for git repositories
- **Git Worktrees** — Work on multiple branches simultaneously
- **Source Control Panel** — View changes, commits, and branches in a unified interface
- **Diff Viewer** — Unified diffs with line numbers and change counts

[Learn more →](git.md)

### File Management

- **Directory Browser** — Navigate files with tree view and search
- **Syntax Highlighting** — Code preview with highlighting for 100+ languages
- **File Operations** — Create, rename, delete, and drag-and-drop upload
- **ZIP Download** — Download repos as ZIP (respects .gitignore)

[Learn more →](files.md)

### Chat & Sessions

- **Real-time Streaming** — Live message streaming with SSE
- **Slash Commands** — Built-in (`/help`, `/new`, `/compact`) and custom commands
- **File Mentions** — Reference files with `@filename` autocomplete
- **Plan/Build Modes** — Toggle between read-only and file-change modes
- **Per-Agent Model Selection** — Each agent retains its own model selection independently
- **Session Pinning** — Pin important sessions to a dedicated section
- **Mermaid Diagrams** — Visual diagram rendering in chat

[Learn more →](chat.md)

### Schedules & Recurring Jobs

- **Recurring Repo Jobs** — Run reusable prompts against a repository on an interval or cron schedule
- **Prompt Templates** — Built-in reviews for repo health, dependencies, release readiness
- **Run History** — Inspect statuses, logs, errors from past runs
- **Session Handoff** — Open the linked session for any run

[Learn more →](schedules.md)

### MCP Servers

- **Local Servers** — Add command-based MCP servers
- **Remote Servers** — Connect to HTTP-based MCP servers
- **Templates** — Pre-built configurations for common servers
- **Management** — Enable, disable, and configure servers

[Learn more →](mcp.md)

### Mobile & PWA

- **Mobile-First Design** — Responsive UI optimized for mobile
- **PWA Installable** — Add to home screen on any device
- **iOS Optimized** — Proper keyboard handling and swipe navigation

[Learn more →](mobile.md)

### Push Notifications

- **Background Alerts** — Receive notifications when the app is closed
- **Agent Events** — Get alerted for permissions, questions, errors, and completions
- **Multi-Device** — Subscribe multiple devices

[Learn more →](notifications.md)
