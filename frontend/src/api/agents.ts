import { fetchWrapper, fetchWrapperVoid } from './fetchWrapper'

export interface AgentHealth {
  healthy: boolean
  state: string
  version?: string | null
  error?: string | null
}

export interface AgentCapabilities {
  sessions: boolean
  messages: boolean
  streaming: boolean
  tools: boolean
  mcp: boolean
  permissions: boolean
  costTracking: boolean
}

export interface AgentInfo {
  id: string
  name: string
  description: string
  capabilities: AgentCapabilities
  health: AgentHealth
}

export interface AgentSession {
  id: string
  title: string
  createdAt: number
  updatedAt: number
  agent?: string
  model?: string
  status?: 'idle' | 'busy' | 'retry'
  cost?: number
  tokens?: {
    input: number
    output: number
    reasoning: number
    cache: { read: number; write: number }
  }
}

export interface AgentMessage {
  id: string
  role: 'user' | 'assistant' | 'tool'
  content: string
  createdAt?: number
}

export interface AgentProvider {
  id: string
  name: string
  models: Array<{ id: string; name: string }>
}

export async function listAgents(): Promise<AgentInfo[]> {
  return fetchWrapper<AgentInfo[]>('/api/agents')
}

export async function getAgent(agentId: string): Promise<AgentInfo> {
  return fetchWrapper<AgentInfo>(`/api/agents/${agentId}`)
}

export async function getAgentHealth(agentId: string): Promise<AgentHealth> {
  return fetchWrapper<AgentHealth>(`/api/agents/${agentId}/health`)
}

export async function listAgentSessions(agentId: string, params?: { limit?: number; order?: 'asc' | 'desc'; search?: string }): Promise<AgentSession[]> {
  return fetchWrapper<AgentSession[]>(`/api/agents/${agentId}/sessions`, { params })
}

export async function createAgentSession(agentId: string, data?: { title?: string; directory?: string }): Promise<AgentSession> {
  return fetchWrapper<AgentSession>(`/api/agents/${agentId}/sessions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data ?? {}),
  })
}

export async function getAgentSession(agentId: string, sessionId: string): Promise<AgentSession> {
  return fetchWrapper<AgentSession>(`/api/agents/${agentId}/sessions/${sessionId}`)
}

export async function deleteAgentSession(agentId: string, sessionId: string): Promise<void> {
  return fetchWrapperVoid(`/api/agents/${agentId}/sessions/${sessionId}`, { method: 'DELETE' })
}

export async function abortAgentSession(agentId: string, sessionId: string): Promise<void> {
  return fetchWrapperVoid(`/api/agents/${agentId}/sessions/${sessionId}/abort`, { method: 'POST' })
}

export async function listAgentMessages(agentId: string, sessionId: string): Promise<AgentMessage[]> {
  return fetchWrapper<AgentMessage[]>(`/api/agents/${agentId}/sessions/${sessionId}/messages`)
}

export async function sendAgentMessage(agentId: string, sessionId: string, content: string): Promise<void> {
  return fetchWrapperVoid(`/api/agents/${agentId}/sessions/${sessionId}/messages`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ content }),
  })
}

export async function listAgentProviders(agentId: string): Promise<AgentProvider[]> {
  return fetchWrapper<AgentProvider[]>(`/api/agents/${agentId}/providers`)
}
