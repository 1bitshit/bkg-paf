import type {
  AgentAdapter,
  AgentHealth,
  AgentCapabilities,
  AgentSession,
  AgentMessage,
  AgentProvider,
  CreateSessionParams,
} from './types'
import { spawn, type ChildProcess } from 'child_process'
import { logger } from '../utils/logger'
import { randomBytes } from 'crypto'

export interface ClaudeAgentRsConfig {
  command?: string
  workingDir?: string
  backend?: 'cli' | 'api'
  apiKey?: string
  model?: string
  autoRoute?: boolean
  env?: Record<string, string>
}

const DEFAULT_CONFIG: ClaudeAgentRsConfig = {
  command: 'claude-agent',
  workingDir: undefined,
  backend: 'api',
  apiKey: undefined,
  model: undefined,
  autoRoute: false,
  env: {},
}

const generateId = (): string => randomBytes(8).toString('hex')

export class ClaudeAgentRsAdapter implements AgentAdapter {
  readonly id = 'claude-agent-rs'
  readonly name = 'Claude Agent (Rust)'
  readonly description = 'claude-agent-rs — 5.4MB Rust binary, dual backend (CLI/API), 8 tools, MCP client, SSE streaming'
  readonly capabilities: AgentCapabilities = {
    sessions: true,
    messages: true,
    streaming: true,
    tools: true,
    mcp: true,
    permissions: true,
    costTracking: false,
  }

  private config: ClaudeAgentRsConfig
  private sessions = new Map<string, AgentSession>()
  private processes = new Map<string, ChildProcess>()
  private messageHistories = new Map<string, AgentMessage[]>()

  constructor(config: ClaudeAgentRsConfig = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config }
  }

  async start(): Promise<void> {
    try {
      const { execSync } = await import('child_process')
      const cmd = this.config.command ?? 'claude-agent'
      const result = execSync(`${cmd} --version`, { timeout: 5000, encoding: 'utf-8' })
      logger.info(`Claude Agent RS adapter ready (${result.trim()})`)
    } catch {
      logger.warn('Claude Agent RS adapter inactive — binary not found')
    }
  }

  async stop(): Promise<void> {
    for (const [id, proc] of this.processes) {
      try {
        proc.kill('SIGTERM')
      } catch {
        logger.warn(`Failed to kill Claude Agent RS process for session ${id}`)
      }
    }
    this.processes.clear()
    this.sessions.clear()
    this.messageHistories.clear()
    logger.info('Claude Agent RS adapter stopped')
  }

  async healthCheck(): Promise<AgentHealth> {
    try {
      const { execSync } = await import('child_process')
      const cmd = this.config.command ?? 'claude-agent'
      const version = execSync(`${cmd} --version`, { timeout: 5000, encoding: 'utf-8' })
      return { healthy: true, state: 'healthy', version: version.trim() }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'claude-agent binary not found'
      return { healthy: false, state: 'unreachable', error: message }
    }
  }

  async listSessions(): Promise<AgentSession[]> {
    return Array.from(this.sessions.values()).sort((a, b) => b.updatedAt - a.updatedAt)
  }

  async createSession(params: CreateSessionParams): Promise<AgentSession> {
    const id = `car-${Date.now()}-${generateId()}`
    const session: AgentSession = {
      id,
      title: params.title || 'Claude Agent RS Session',
      createdAt: Date.now(),
      updatedAt: Date.now(),
      agent: 'claude-agent-rs',
      model: this.config.model ?? (this.config.autoRoute ? 'auto-route' : 'default'),
      status: 'idle',
    }

    this.sessions.set(id, session)
    this.messageHistories.set(id, [])
    return session
  }

  async getSession(id: string): Promise<AgentSession> {
    const session = this.sessions.get(id)
    if (!session) {
      throw new Error(`Claude Agent RS session ${id} not found`)
    }
    return session
  }

  async deleteSession(id: string): Promise<void> {
    const proc = this.processes.get(id)
    if (proc) {
      try {
        proc.kill('SIGTERM')
      } catch {
        // ignore
      }
      this.processes.delete(id)
    }
    this.sessions.delete(id)
    this.messageHistories.delete(id)
  }

  async abortSession(id: string): Promise<void> {
    const proc = this.processes.get(id)
    if (proc) {
      try {
        proc.kill('SIGINT')
      } catch {
        proc.kill('SIGTERM')
      }
    }
    const session = this.sessions.get(id)
    if (session) {
      session.status = 'idle'
      session.updatedAt = Date.now()
    }
  }

  async listMessages(sessionId: string): Promise<AgentMessage[]> {
    return this.messageHistories.get(sessionId) ?? []
  }

  async sendMessage(sessionId: string, content: string): Promise<void> {
    const session = this.sessions.get(sessionId)
    if (!session) {
      throw new Error(`Claude Agent RS session ${sessionId} not found`)
    }

    const history = this.messageHistories.get(sessionId) ?? []

    const userMessage: AgentMessage = {
      id: `msg-${Date.now()}-${generateId()}`,
      role: 'user',
      content,
      createdAt: Date.now(),
    }
    history.push(userMessage)
    this.messageHistories.set(sessionId, history)

    session.status = 'busy'
    session.updatedAt = Date.now()

    try {
      const response = await this.executeAgent(sessionId, content)
      const assistantMessage: AgentMessage = {
        id: `msg-${Date.now()}-${generateId()}`,
        role: 'assistant',
        content: response,
        createdAt: Date.now(),
      }
      history.push(assistantMessage)
      this.messageHistories.set(sessionId, history)
      session.status = 'idle'
      session.updatedAt = Date.now()
    } catch (error) {
      const errorMessage: AgentMessage = {
        id: `msg-${Date.now()}-${generateId()}`,
        role: 'assistant',
        content: `[Claude Agent RS Error] ${error instanceof Error ? error.message : 'Request failed'}`,
        createdAt: Date.now(),
      }
      history.push(errorMessage)
      this.messageHistories.set(sessionId, history)
      session.status = 'idle'
      throw error
    }
  }

  async listProviders(): Promise<AgentProvider[]> {
    const models: Array<{ id: string; name: string }> = []

    if (this.config.autoRoute) {
      models.push(
        { id: 'auto-route', name: 'Auto-Route (Opus/Haiku)' },
      )
    }

    models.push(
      { id: 'claude-opus-4-6', name: 'Claude Opus 4.6' },
      { id: 'claude-sonnet-4-6', name: 'Claude Sonnet 4.6' },
      { id: 'claude-haiku-3-5', name: 'Claude Haiku 3.5' },
    )

    return [{ id: 'claude-agent-rs-providers', name: 'Claude Agent RS Providers', models }]
  }

  private executeAgent(sessionId: string, message: string): Promise<string> {
    return new Promise((resolve, reject) => {
      const cmd = this.config.command ?? 'claude-agent'

      const args: string[] = [message]

      if (this.config.autoRoute) {
        args.push('--auto-route')
      }

      if (this.config.model && this.config.model !== 'auto-route') {
        args.push('--model', this.config.model)
      }

      const env: Record<string, string> = { ...this.config.env }
      if (this.config.backend === 'api') {
        env.AGENT_BACKEND = 'api'
        if (this.config.apiKey) {
          env.ANTHROPIC_API_KEY = this.config.apiKey
        }
      } else {
        env.AGENT_BACKEND = 'cli'
      }

      const proc = spawn(cmd, args, {
        cwd: this.config.workingDir,
        env: { ...process.env, ...env },
        stdio: ['pipe', 'pipe', 'pipe'],
      })

      this.processes.set(sessionId, proc)

      let responseText = ''
      let stderr = ''

      proc.stdout?.on('data', (chunk: Buffer) => {
        const text = chunk.toString()
        const lines = text.split('\n').filter((l) => l.trim())
        for (const line of lines) {
          try {
            const event = JSON.parse(line)
            if (event.type === 'assistant' && event.content) {
              for (const block of event.content) {
                if (block.type === 'text' && block.text) {
                  responseText += block.text
                }
              }
            } else if (event.type === 'content_block_delta' && event.delta?.text) {
              responseText += event.delta.text
            } else if (event.type === 'result' && event.result) {
              responseText += event.result
            } else if (event.type === 'error') {
              reject(new Error(String(event.message ?? 'Agent error')))
              return
            }
          } catch {
            if (line.startsWith('{')) return
            responseText += line
          }
        }
      })

      proc.stderr?.on('data', (chunk: Buffer) => {
        stderr += chunk.toString()
      })

      proc.on('close', (code) => {
        this.processes.delete(sessionId)
        if (code === 0 || responseText.length > 0) {
          resolve(responseText || '(empty response)')
        } else {
          reject(new Error(`Claude Agent RS exited with code ${code}: ${stderr.slice(0, 500)}`))
        }
      })

      proc.on('error', (error) => {
        this.processes.delete(sessionId)
        reject(error)
      })

      const timeout = setTimeout(() => {
        proc.kill('SIGTERM')
        reject(new Error('Claude Agent RS timeout (120s)'))
      }, 120_000)

      proc.on('close', () => clearTimeout(timeout))
    })
  }
}
