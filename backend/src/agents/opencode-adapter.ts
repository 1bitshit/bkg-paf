import type {
  AgentAdapter,
  AgentHealth,
  AgentCapabilities,
  AgentSession,
  AgentMessage,
  AgentProvider,
  CreateSessionParams,
  SessionParams,
} from './types'
import type { OpenCodeClient } from '../services/opencode/client'
import type { OpenCodeSupervisor } from '../services/opencode-supervisor'

export class OpenCodeAdapter implements AgentAdapter {
  readonly id = 'opencode'
  readonly name = 'OpenCode'
  readonly description = 'OpenCode coding agent with plugin support'
  readonly capabilities: AgentCapabilities = {
    sessions: true,
    messages: true,
    streaming: true,
    tools: true,
    mcp: true,
    permissions: true,
    costTracking: true,
  }

  constructor(
    private readonly client: OpenCodeClient,
    private readonly supervisor?: OpenCodeSupervisor,
  ) {}

  async start(): Promise<void> {
    if (this.supervisor) {
      await this.supervisor.start()
    }
  }

  async stop(): Promise<void> {
    if (this.supervisor) {
      await this.supervisor.stop()
    }
  }

  async healthCheck(): Promise<AgentHealth> {
    if (this.supervisor) {
      const status = this.supervisor.getStatus()
      return {
        healthy: status.healthy,
        state: status.state,
        version: status.version,
        error: status.lastError ?? undefined,
      }
    }

    try {
      const response = await this.client.forward({
        method: 'GET',
        path: '/doc',
        signal: AbortSignal.timeout(3000),
      })
      return { healthy: response.ok, state: response.ok ? 'healthy' : 'unhealthy' }
    } catch {
      return { healthy: false, state: 'unreachable' }
    }
  }

  async listSessions(params?: SessionParams): Promise<AgentSession[]> {
    const queryParts: string[] = []
    if (params?.limit !== undefined) queryParts.push(`limit=${params.limit}`)
    if (params?.order !== undefined) queryParts.push(`order=${params.order}`)
    if (params?.search !== undefined) queryParts.push(`search=${encodeURIComponent(params.search)}`)
    const query = queryParts.length > 0 ? `?${queryParts.join('&')}` : ''
    const response = await this.client.getJson<unknown>(`/api/session${query}`)

    const data = (response as Record<string, unknown>).data ?? (response as Record<string, unknown>).items ?? []
    if (!Array.isArray(data)) return []

    return data.map((item: Record<string, unknown>) => {
      const time = item.time as Record<string, unknown> | undefined
      const model = item.model as Record<string, unknown> | undefined
      const tokens = item.tokens as Record<string, unknown> | undefined

      return {
        id: item.id as string,
        title: (item.title as string) || 'Untitled Session',
        createdAt: (time?.created as number) ?? 0,
        updatedAt: (time?.updated as number) ?? 0,
        agent: item.agent as string | undefined,
        model: model ? `${model.providerID}/${model.id}` : undefined,
        cost: (item.cost as number) ?? 0,
        tokens: tokens ? {
          input: (tokens.input as number) ?? 0,
          output: (tokens.output as number) ?? 0,
          reasoning: (tokens.reasoning as number) ?? 0,
          cache: {
            read: ((tokens.cache as Record<string, number>)?.read) ?? 0,
            write: ((tokens.cache as Record<string, number>)?.write) ?? 0,
          },
        } : undefined,
      }
    })
  }

  async createSession(params: CreateSessionParams): Promise<AgentSession> {
    const response = await this.client.postJson<Record<string, unknown>>('/session', {
      title: params.title,
    }, { directory: params.directory })

    const time = response.time as Record<string, unknown> | undefined
    return {
      id: response.id as string,
      title: (response.title as string) || 'Untitled Session',
      createdAt: (time?.created as number) ?? Date.now(),
      updatedAt: (time?.updated as number) ?? Date.now(),
    }
  }

  async getSession(id: string): Promise<AgentSession> {
    const response = await this.client.getJson<Record<string, unknown>>(`/session/${id}`)
    const time = response.time as Record<string, unknown> | undefined
    const model = response.model as Record<string, unknown> | undefined
    const tokens = response.tokens as Record<string, unknown> | undefined

    return {
      id: response.id as string,
      title: (response.title as string) || 'Untitled Session',
      createdAt: (time?.created as number) ?? 0,
      updatedAt: (time?.updated as number) ?? 0,
      agent: response.agent as string | undefined,
      model: model ? `${model.providerID}/${model.id}` : undefined,
      cost: (response.cost as number) ?? 0,
      tokens: tokens ? {
        input: (tokens.input as number) ?? 0,
        output: (tokens.output as number) ?? 0,
        reasoning: (tokens.reasoning as number) ?? 0,
        cache: {
          read: ((tokens.cache as Record<string, number>)?.read) ?? 0,
          write: ((tokens.cache as Record<string, number>)?.write) ?? 0,
        },
      } : undefined,
    }
  }

  async deleteSession(id: string): Promise<void> {
    await this.client.forward({ method: 'DELETE', path: `/session/${id}` })
  }

  async abortSession(id: string): Promise<void> {
    await this.client.forward({ method: 'POST', path: `/session/${id}/abort` })
  }

  async listMessages(sessionId: string): Promise<AgentMessage[]> {
    const response = await this.client.getJson<unknown[]>(`/session/${sessionId}/message`)
    if (!Array.isArray(response)) return []

    return response.map((item) => {
      const record = item as Record<string, unknown>
      return {
        id: record.id as string,
        role: (record.role as AgentMessage['role']) ?? 'assistant',
        content: typeof record.content === 'string' ? record.content : JSON.stringify(record.content ?? ''),
        createdAt: (record.createdAt as number) ?? undefined,
      }
    })
  }

  async sendMessage(sessionId: string, content: string): Promise<void> {
    await this.client.postJson(`/session/${sessionId}/prompt_async`, { content })
  }

  async listProviders(): Promise<AgentProvider[]> {
    const response = await this.client.getJson<unknown[]>('/config/providers')
    if (!Array.isArray(response)) return []

    return response.map((item) => {
      const record = item as Record<string, unknown>
      return {
        id: record.id as string,
        name: (record.name as string) ?? (record.id as string),
        models: Array.isArray(record.models)
          ? (record.models as Array<Record<string, unknown>>).map((m) => ({
              id: m.id as string,
              name: (m.name as string) ?? (m.id as string),
            }))
          : [],
      }
    })
  }
}
