# bkg-paf Client

Frontend application for bkg-paf — the multi-agent AI coding platform.

## Stack

- React 18 + TypeScript (strict mode)
- Vite build tool
- TanStack Query for state management
- Radix UI + Tailwind CSS
- React Router for navigation

## Features

- **Multi-Agent Dashboard** — Switch between OpenCode, OpenClaude, and PI agents
- **Provider Management** — Add, configure, and manage AI providers (OpenAI, Anthropic, NVIDIA NIM, etc.)
- **Session Management** — Create, monitor, and control coding sessions per agent
- **Monitor** — Real-time health, usage, and pending items
- **Mobile & PWA** — Responsive mobile-first UI, installable on any device

## Development

```bash
pnpm install
pnpm dev        # Starts both backend (5003) and frontend (5173)
pnpm lint       # Lint frontend
pnpm build      # Build for production
```
