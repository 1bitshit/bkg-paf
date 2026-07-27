# Tasks

## Completed

### Provider Management
- Fix providers page root cause (wrong config path + OpenCode server unreachable)
- Merge providers from file, DB, and OpenCode server in GET / route
- Merge providers in GET /:id route

### Agent System
- Create PI (pi_agent_rust) agent adapter with RPC mode integration
- Remove NIM from agent registry (provider-only, not an agent CLI)
- Register PI adapter in backend index.ts
- Export PI adapter from agents/index.ts

### Frontend
- Add New Session button per agent card on Agents page
- Add useCreateAgentSession hook with React Query mutation
- Wire session creation to navigate to new session
- Remove NIM from navigation drawer

### Code Quality
- Fix lint errors (unused Triangle import, unused stdout variable)
- All lint passes clean (0 errors)

## In Progress

### Documentation
- Create docs/roadmap.md
- Create docs/tasks.md
- Create docs/plan.md

## Pending

### Server/Client Split
- Create bkg-code-manager-server (private)
- Create bkg-code-manager-client (public)
- Extract frontend and backend into separate packages

### bkg-p2p Integration
- Bridge bkg-paf with bkg-p2p P2P network
- CLAW token earning system
- Network health dashboard

### Voice Integration
- Integrate opencode-voice for voice coding
- Real-time session streaming

### Production
- OpenCode server health monitoring
- Provider credential rotation
- Session persistence
- Audit logging
