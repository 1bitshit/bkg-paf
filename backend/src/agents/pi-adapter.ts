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

export interface PiConfig {
  command?: string
  workingDir?: string
  apiKey?: string
  model?: string
  provider?: string
  env?: Record<string, string>
}

const DEFAULT_CONFIG: PiConfig = {
  command: 'pi',
  workingDir: undefined,
  apiKey: undefined,
  model: undefined,
  provider: undefined,
  env: {},
}

interface RpcEvent {
  type: string
  [key: string]: unknown
}

const generateId = (): string => randomBytes(8).toString('hex')

export class PiAdapter implements AgentAdapter {
  readonly id = 'pi'
  readonly name = 'PI (Rust)'
  readonly description = 'pi_agent_rust — high-performance AI coding agent CLI with 8 built-in tools'
  readonly capabilities: AgentCapabilities = {
    sessions: true,
    messages: true,
    streaming: true,
    tools: true,
    mcp: false,
    permissions: true,
    costTracking: true,
  }

  private config: PiConfig
  private sessions = new Map<string, AgentSession>()
  private processes = new Map<string, ChildProcess>()
  private messageHistories = new Map<string, AgentMessage[]>()

  constructor(config: PiConfig = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config }
  }

  async start(): Promise<void> {
    try {
      const { execSync } = await import('child_process')
      const cmd = this.config.command ?? 'pi'
      const result = execSync(`${cmd} --version`, { timeout: 5000, encoding: 'utf-8' })
      logger.info(`PI adapter ready (${result.trim()})`)
    } catch {
      logger.warn('PI adapter inactive — pi binary not found')
    }
  }

  async stop(): Promise<void> {
    for (const [id, proc] of this.processes) {
      try {
        proc.kill('SIGTERM')
      } catch {
        logger.warn(`Failed to kill PI process for session ${id}`)
      }
    }
    this.processes.clear()
    this.sessions.clear()
    this.messageHistories.clear()
    logger.info('PI adapter stopped')
  }

  async healthCheck(): Promise<AgentHealth> {
    try {
      const { execSync } = await import('child_process')
      const cmd = this.config.command ?? 'pi'
      const version = execSync(`${cmd} --version`, { timeout: 5000, encoding: 'utf-8' })
      return { healthy: true, state: 'healthy', version: version.trim() }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'pi binary not found'
      return { healthy: false, state: 'unreachable', error: message }
    }
  }

  async listSessions(): Promise<AgentSession[]> {
    return Array.from(this.sessions.values()).sort((a, b) => b.updatedAt - a.updatedAt)
  }

  async createSession(params: CreateSessionParams): Promise<AgentSession> {
    const id = `pi-${Date.now()}-${generateId()}`
    const session: AgentSession = {
      id,
      title: params.title || 'PI Session',
      createdAt: Date.now(),
      updatedAt: Date.now(),
      agent: 'pi',
      model: this.config.model ?? 'auto',
      status: 'idle',
    }

    this.sessions.set(id, session)
    this.messageHistories.set(id, [])
    return session
  }

  async getSession(id: string): Promise<AgentSession> {
    const session = this.sessions.get(id)
    if (!session) {
      throw new Error(`PI session ${id} not found`)
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
        proc.stdin?.write(JSON.stringify({ command: 'abort' }) + '\n')
      } catch {
        proc.kill('SIGTERM')
      }
    }
    const session = this.sessions.get(id)
    if (session) {
      session.status = 'idle'
    }
  }

  async listMessages(sessionId: string): Promise<AgentMessage[]> {
    return this.messageHistories.get(sessionId) ?? []
  }

  async sendMessage(sessionId: string, content: string): Promise<void> {
    const session = this.sessions.get(sessionId)
    if (!session) {
      throw new Error(`PI session ${sessionId} not found`)
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
      const response = await this.executeRpc(sessionId, content)
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
        content: `[PI Error] ${error instanceof Error ? error.message : 'Request failed'}`,
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

    try {
      const { execSync } = await import('child_process')
      const cmd = this.config.command ?? 'pi'
      const output = execSync(`${cmd} --list-models`, { timeout: 10000, encoding: 'utf-8' })
      const lines = output.split('\n').filter((l) => l.trim())
      for (const line of lines) {
        const trimmed = line.trim()
        if (trimmed && !trimmed.startsWith('Available') && !trimmed.startsWith('-')) {
          models.push({ id: trimmed, name: trimmed })
        }
      }
    } catch {
      models.push(
        { id: 'anthropic/claude-sonnet-4-6', name: 'Claude Sonnet 4.6' },
        { id: 'anthropic/claude-opus-4-7', name: 'Claude Opus 4.7' },
        { id: 'openai/gpt-5.1-codex', name: 'GPT-5.1 Codex' },
      )
    }

    return [{ id: 'pi-providers', name: 'PI Providers', models }]
  }

  private executeRpc(sessionId: string, message: string): Promise<string> {
    return new Promise((resolve, reject) => {
      const cmd = this.config.command ?? 'pi'
      const args = ['--mode', 'rpc', '--no-session']
      if (this.config.model) args.push('--model', this.config.model)
      if (this.config.provider) args.push('--provider', this.config.provider)

      const env: Record<string, string> = { ...this.config.env }
      if (this.config.apiKey) {
        if (!env.ANTHROPIC_API_KEY && !env.OPENAI_API_KEY) {
          env.ANTHROPIC_API_KEY = this.config.apiKey
        }
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
            const event = JSON.parse(line) as RpcEvent
            if (event.type === 'message' && typeof event.content === 'string') {
              responseText += event.content
            } else if (event.type === 'response' && typeof event.content === 'string') {
              responseText += event.content
            } else if (event.type === 'error') {
              reject(new Error(String(event.message ?? 'RPC error')))
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
          reject(new Error(`PI process exited with code ${code}: ${stderr.slice(0, 500)}`))
        }
      })

      proc.on('error', (error) => {
        this.processes.delete(sessionId)
        reject(error)
      })

      const rpcMessage = JSON.stringify({ command: 'prompt', content: message }) + '\n'
      proc.stdin?.write(rpcMessage)
      proc.stdin?.end()

      const timeout = setTimeout(() => {
        proc.kill('SIGTERM')
        reject(new Error('PI RPC timeout (120s)'))
      }, 120_000)

      proc.on('close', () => clearTimeout(timeout))
    })
  }
}
