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

export interface CreateSessionParams {
  title?: string
  directory?: string
}

export interface SessionParams {
  limit?: number
  order?: 'asc' | 'desc'
  search?: string
}

export interface AgentAdapter {
  readonly id: string
  readonly name: string
  readonly description: string
  readonly capabilities: AgentCapabilities

  start(): Promise<void>
  stop(): Promise<void>
  healthCheck(): Promise<AgentHealth>

  listSessions(params?: SessionParams): Promise<AgentSession[]>
  createSession(params: CreateSessionParams): Promise<AgentSession>
  getSession(id: string): Promise<AgentSession>
  deleteSession(id: string): Promise<void>
  abortSession(id: string): Promise<void>

  listMessages(sessionId: string): Promise<AgentMessage[]>
  sendMessage(sessionId: string, content: string): Promise<void>

  listProviders(): Promise<AgentProvider[]>
}
