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

### Project Structure
- Create `client/` folder with README
- Create `server/` folder with README

### Documentation
- Rebrand README.md with bkg-paf name and multi-agent features
- Rebrand docs/index.md with new name
- Update docs/features/overview.md with agent system and provider management
- Update docs/plan.md with full architecture
- Update docs/roadmap.md with phase tracking

### Code Quality
- Fix lint errors (unused imports, variables)
- All lint passes clean (0 errors)

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
