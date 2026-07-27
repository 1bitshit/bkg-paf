import type {
  AgentAdapter,
  AgentHealth,
  AgentCapabilities,
  AgentSession,
  AgentMessage,
  AgentProvider,
  CreateSessionParams,
} from './types'
import { logger } from '../utils/logger'
import { randomBytes } from 'crypto'

export interface NimConfig {
  apiKey?: string
  baseUrl?: string
}

const DEFAULT_BASE_URL = 'https://integrate.api.nvidia.com/v1'

const CURATED_MODELS = [
  { id: 'nvidia/llama-3.1-nemotron-ultra-253b-v1', name: 'Llama 3.1 Nemotron Ultra 253B' },
  { id: 'nvidia/llama-3.3-nemotron-super-49b-v1', name: 'Llama 3.3 Nemotron Super 49B' },
  { id: 'nvidia/llama-3.3-nemotron-super-49b-v1.5', name: 'Llama 3.3 Nemotron Super 49B v1.5' },
  { id: 'nvidia/nemotron-3-super-120b-a12b', name: 'Nemotron 3 Super 120B' },
  { id: 'nvidia/nemotron-3-ultra-550b-a55b', name: 'Nemotron 3 Ultra 550B' },
  { id: 'nvidia/nvidia-nemotron-nano-9b-v2', name: 'Nemotron Nano 9B v2' },
  { id: 'deepseek-ai/deepseek-r1', name: 'DeepSeek R1' },
  { id: 'deepseek-ai/deepseek-v4', name: 'DeepSeek V4' },
  { id: 'deepseek-ai/deepseek-r1-0528', name: 'DeepSeek R1 0528' },
  { id: 'qwen/qwq-32b', name: 'QwQ 32B' },
  { id: 'qwen/qwen3-coder', name: 'Qwen3 Coder' },
  { id: 'qwen/qwen3-235b-a22b', name: 'Qwen3 235B' },
  { id: 'qwen/qwen3-30b-a3b', name: 'Qwen3 30B' },
  { id: 'qwen/qwen3-next-80b-a3b-instruct', name: 'Qwen3 Next 80B' },
  { id: 'meta/llama-4-maverick-17b-128e-instruct', name: 'Llama 4 Maverick 17B' },
  { id: 'meta/llama-4-scout-17b-16e-instruct', name: 'Llama 4 Scout 17B' },
  { id: 'meta/llama-3.1-8b-instruct', name: 'Llama 3.1 8B' },
  { id: 'meta/llama-3.1-70b-instruct', name: 'Llama 3.1 70B' },
  { id: 'meta/llama-3.1-405b-instruct', name: 'Llama 3.1 405B' },
  { id: 'meta/llama-3.3-70b-instruct', name: 'Llama 3.3 70B' },
  { id: 'microsoft/phi-4-reasoning-plus', name: 'Phi-4 Reasoning Plus' },
  { id: 'microsoft/phi-4-reasoning', name: 'Phi-4 Reasoning' },
  { id: 'microsoft/phi-4', name: 'Phi-4' },
  { id: 'google/gemma-3-27b-it', name: 'Gemma 3 27B' },
  { id: 'google/gemma-3-12b-it', name: 'Gemma 3 12B' },
  { id: 'mistralai/mistral-large-2-instruct', name: 'Mistral Large 2' },
  { id: 'mistralai/mistral-small-3.1-24b-instruct', name: 'Mistral Small 3.1 24B' },
  { id: 'mistralai/magistral-small-2506', name: 'Magistral Small' },
  { id: 'moonshotai/kimi-k2', name: 'Kimi K2' },
  { id: 'moonshotai/kimi-k2-thinking', name: 'Kimi K2 Thinking' },
  { id: 'minimaxai/minimax-m3', name: 'MiniMax M3' },
  { id: 'z-ai/glm-5.1', name: 'GLM 5.1' },
  { id: 'stepfun-ai/step-3.5-flash:free', name: 'Step 3.5 Flash' },
  { id: 'nvidia/router', name: 'NVIDIA Router (auto)' },
] as const

const generateId = (): string => {
  return randomBytes(8).toString('hex')
}

interface NimChatMessage {
  role: 'system' | 'user' | 'assistant'
  content: string
}

interface NimChatRequest {
  model: string
  messages: NimChatMessage[]
  stream: boolean
  max_tokens?: number
}

interface NimChatResponse {
  id: string
  choices: Array<{
    index: number
    message: { role: string; content: string }
    finish_reason: string
  }>
  usage?: { prompt_tokens: number; completion_tokens: number; total_tokens: number }
}

interface NimModelsResponse {
  data: Array<{ id: string; owned_by?: string }>
}

export class NimAdapter implements AgentAdapter {
  readonly id = 'nim'
  readonly name = 'NVIDIA NIM'
  readonly description = 'NVIDIA NIM API — access 80+ curated AI models'
  readonly capabilities: AgentCapabilities = {
    sessions: true,
    messages: true,
    streaming: false,
    tools: false,
    mcp: false,
    permissions: false,
    costTracking: false,
  }

  private readonly apiKey: string
  private readonly baseUrl: string
  private sessions = new Map<string, AgentSession>()
  private messageHistories = new Map<string, AgentMessage[]>()

  constructor(config: NimConfig = {}) {
    this.apiKey = config.apiKey ?? process.env.NVIDIA_API_KEY ?? ''
    this.baseUrl = config.baseUrl ?? process.env.NIM_BASE_URL ?? DEFAULT_BASE_URL
  }

  async start(): Promise<void> {
    if (this.apiKey) {
      logger.info('NIM adapter ready')
    } else {
      logger.info('NIM adapter inactive — no API key')
    }
  }

  async stop(): Promise<void> {
    this.sessions.clear()
    this.messageHistories.clear()
    logger.info('NIM adapter stopped')
  }

  async healthCheck(): Promise<AgentHealth> {
    if (!this.apiKey) {
      return { healthy: false, state: 'not-configured', error: 'NVIDIA_API_KEY not set' }
    }

    try {
      const response = await fetch(`${this.baseUrl}/models`, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          Accept: 'application/json',
        },
        signal: AbortSignal.timeout(5000),
      })

      if (response.ok) {
        return { healthy: true, state: 'healthy' }
      }

      if (response.status === 401) {
        return { healthy: false, state: 'unauthorized', error: 'Invalid API key' }
      }

      return { healthy: false, state: 'error', error: `HTTP ${response.status}` }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error'
      return { healthy: false, state: 'unreachable', error: message }
    }
  }

  async listSessions(): Promise<AgentSession[]> {
    return Array.from(this.sessions.values()).sort((a, b) => b.updatedAt - a.updatedAt)
  }

  async createSession(params: CreateSessionParams): Promise<AgentSession> {
    const id = `nim-${Date.now()}-${generateId()}`
    const session: AgentSession = {
      id,
      title: params.title || 'NIM Session',
      createdAt: Date.now(),
      updatedAt: Date.now(),
      agent: 'nim',
      model: 'nvidia/llama-3.1-nemotron-ultra-253b-v1',
    }

    this.sessions.set(id, session)
    this.messageHistories.set(id, [])
    return session
  }

  async getSession(id: string): Promise<AgentSession> {
    const session = this.sessions.get(id)
    if (!session) {
      throw new Error(`Session ${id} not found`)
    }
    return session
  }

  async deleteSession(id: string): Promise<void> {
    this.sessions.delete(id)
    this.messageHistories.delete(id)
  }

  async abortSession(id: string): Promise<void> {
    this.sessions.delete(id)
    this.messageHistories.delete(id)
  }

  async listMessages(sessionId: string): Promise<AgentMessage[]> {
    return this.messageHistories.get(sessionId) ?? []
  }

  async sendMessage(sessionId: string, content: string): Promise<void> {
    if (!this.apiKey) {
      throw new Error('NVIDIA_API_KEY not configured')
    }

    const session = this.sessions.get(sessionId)
    if (!session) {
      throw new Error(`Session ${sessionId} not found`)
    }

    const history = this.messageHistories.get(sessionId) ?? []

    const userMessage: AgentMessage = {
      id: `msg-${Date.now()}-${generateId()}`,
      role: 'user',
      content,
      createdAt: Date.now(),
    }
    history.push(userMessage)

    const model = session.model ?? 'nvidia/llama-3.1-nemotron-ultra-253b-v1'

    const apiMessages: NimChatMessage[] = history.map((msg) => ({
      role: msg.role === 'user' ? 'user' : 'assistant',
      content: msg.content,
    }))

    const requestBody: NimChatRequest = {
      model,
      messages: apiMessages,
      stream: false,
      max_tokens: 16384,
    }

    try {
      const response = await fetch(`${this.baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify(requestBody),
        signal: AbortSignal.timeout(120_000),
      })

      if (!response.ok) {
        const errorText = await response.text().catch(() => 'Unknown error')
        const errorMessage: AgentMessage = {
          id: `msg-${Date.now()}-${generateId()}`,
          role: 'assistant',
          content: `[NIM Error ${response.status}] ${errorText}`,
          createdAt: Date.now(),
        }
        history.push(errorMessage)
        this.messageHistories.set(sessionId, history)
        throw new Error(`NIM API error ${response.status}: ${errorText}`)
      }

      const data = (await response.json()) as NimChatResponse
      const assistantContent = data.choices?.[0]?.message?.content ?? ''

      const assistantMessage: AgentMessage = {
        id: `msg-${Date.now()}-${generateId()}`,
        role: 'assistant',
        content: assistantContent,
        createdAt: Date.now(),
      }
      history.push(assistantMessage)
      this.messageHistories.set(sessionId, history)

      session.updatedAt = Date.now()
      session.tokens = data.usage
        ? {
            input: data.usage.prompt_tokens,
            output: data.usage.completion_tokens,
            reasoning: 0,
            cache: { read: 0, write: 0 },
          }
        : session.tokens
    } catch (error) {
      if (!history.some((m) => m.content.startsWith('[NIM Error'))) {
        const errorMessage: AgentMessage = {
          id: `msg-${Date.now()}-${generateId()}`,
          role: 'assistant',
          content: `[NIM Error] ${error instanceof Error ? error.message : 'Request failed'}`,
          createdAt: Date.now(),
        }
        history.push(errorMessage)
      }
      this.messageHistories.set(sessionId, history)
      throw error
    }
  }

  async listProviders(): Promise<AgentProvider[]> {
    if (!this.apiKey) {
      return [{ id: 'nvidia-nim', name: 'NVIDIA NIM (not configured)', models: [] }]
    }

    try {
      const response = await fetch(`${this.baseUrl}/models`, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          Accept: 'application/json',
        },
        signal: AbortSignal.timeout(10_000),
      })

      if (response.ok) {
        const data = (await response.json()) as NimModelsResponse
        const curatedMap = new Map<string, string>(CURATED_MODELS.map((m) => [m.id, m.name]))

        const models = (data.data ?? [])
          .filter((m) => !m.id.includes('embed') && !m.id.includes('rerank') && !m.id.includes('guard'))
          .map((m) => ({
            id: m.id,
            name: curatedMap.get(m.id) ?? m.id.split('/').pop()?.split('-').map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(' ') ?? m.id,
          }))
          .sort((a, b) => a.name.localeCompare(b.name))

        return [{ id: 'nvidia-nim', name: 'NVIDIA NIM', models }]
      }
    } catch {
      // Fallback to curated list
    }

    return [
      {
        id: 'nvidia-nim',
        name: 'NVIDIA NIM',
        models: CURATED_MODELS.map((m) => ({ id: m.id, name: m.name })),
      },
    ]
  }
}
