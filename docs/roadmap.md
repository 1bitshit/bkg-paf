# Roadmap

## Phase 1: Core Multi-Agent Platform ✅

- [x] Backend agent adapter pattern (types, registry, OpenCode/OpenClaude/PI adapters)
- [x] Frontend Agents page with Overview + Sessions tabs
- [x] NVIDIA NIM integration as provider (not agent CLI)
- [x] Provider Management UI with full CRUD (add/edit/delete/API keys)
- [x] Providers page reading from file + DB + OpenCode server
- [x] PI (pi_agent_rust) agent adapter with RPC mode
- [x] New Session creation per agent card
- [x] Navigation cleanup (NIM removed from nav, kept as provider only)
- [x] Client/Server folder structure

## Phase 2: Server/Client Split

- [ ] Create `bkg-code-manager-server` (private repo)
- [ ] Create `bkg-code-manager-client` (public repo)
- [ ] Extract frontend into standalone client package
- [ ] Extract backend into standalone server package
- [ ] Shared types package via npm or git submodule
- [ ] API documentation for client-server contract

## Phase 3: bkg-p2p Integration

- [ ] Integrate bkg-p2p (Rust P2P network) as earning backend
- [ ] CLAW token economy for users who strengthen the network
- [ ] User authentication bridging (bkg-paf ↔ bkg-p2p)
- [ ] Network health monitoring dashboard
- [ ] Reward distribution tracking

## Phase 4: Voice & Advanced UX

- [ ] opencode-voice integration for voice-driven coding sessions
- [ ] Real-time streaming session viewer
- [ ] Session replay and diff visualization
- [ ] Multi-agent collaboration (agents working on same task)

## Phase 5: Production Hardening

- [ ] OpenCode server health monitoring with auto-restart
- [ ] Provider credential rotation and management
- [ ] Session persistence across restarts
- [ ] Audit logging for all agent actions
- [ ] Rate limiting and cost controls per provider
