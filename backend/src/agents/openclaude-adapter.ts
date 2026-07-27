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
import { EventEmitter } from 'events'

export interface OpenClaudeConfig {
  command?: string
  configDir?: string
  workingDir?: string
  env?: Record<string, string>
}

const DEFAULT_CONFIG: OpenClaudeConfig = {
  command: 'openclaude',
  configDir: undefined,
  workingDir: undefined,
  env: {},
}

export class OpenClaudeAdapter extends EventEmitter implements AgentAdapter {
  readonly id = 'openclaude'
  readonly name = 'OpenClaude'
  readonly description = 'OpenClaude multi-provider coding agent (OpenAI, Gemini, Ollama, NIM, etc.)'
  readonly capabilities: AgentCapabilities = {
    sessions: true,
    messages: true,
    streaming: true,
    tools: true,
    mcp: true,
    permissions: false,
    costTracking: false,
  }

  private process: ChildProcess | null = null
  private config: OpenClaudeConfig
  private running = false
  private sessions: Map<string, AgentSession> = new Map()

  constructor(config: OpenClaudeConfig = {}) {
    super()
    this.config = { ...DEFAULT_CONFIG, ...config }
  }

  async start(): Promise<void> {
    if (this.running) {
      logger.info('OpenClaude adapter already running')
      return
    }

    try {
      const args = ['--version']
      const result = await this.spawnProcess(args)
      if (result.exitCode !== 0) {
        logger.warn('OpenClaude not found, adapter will be inactive')
        return
      }

      this.running = true
      logger.info('OpenClaude adapter started')
    } catch (error) {
      logger.warn('Failed to start OpenClaude adapter:', error)
    }
  }

  async stop(): Promise<void> {
    if (this.process) {
      this.process.kill('SIGTERM')
      this.process = null
    }
    this.running = false
    this.sessions.clear()
    logger.info('OpenClaude adapter stopped')
  }

  async healthCheck(): Promise<AgentHealth> {
    if (!this.running) {
      return { healthy: false, state: 'stopped' }
    }

    try {
      const result = await this.spawnProcess(['--version'])
      return {
        healthy: result.exitCode === 0,
        state: result.exitCode === 0 ? 'healthy' : 'unhealthy',
        version: result.stdout?.trim() ?? undefined,
      }
    } catch {
      return { healthy: false, state: 'error', error: 'Failed to check health' }
    }
  }

  async listSessions(): Promise<AgentSession[]> {
    return Array.from(this.sessions.values())
  }

  async createSession(params: CreateSessionParams): Promise<AgentSession> {
    const id = `oc-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
    const session: AgentSession = {
      id,
      title: params.title || 'OpenClaude Session',
      createdAt: Date.now(),
      updatedAt: Date.now(),
      agent: 'openclaude',
    }

    this.sessions.set(id, session)
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
  }

  async abortSession(id: string): Promise<void> {
    this.sessions.delete(id)
    if (this.process) {
      this.process.kill('SIGTERM')
      this.process = null
    }
  }

  async listMessages(sessionId: string): Promise<AgentMessage[]> {
    void sessionId
    return []
  }

  async sendMessage(sessionId: string, content: string): Promise<void> {
    throw new Error(`OpenClaude message sending not yet implemented (session: ${sessionId}, content length: ${content.length})`)
  }

  async listProviders(): Promise<AgentProvider[]> {
    return [
      { id: 'openai', name: 'OpenAI', models: [] },
      { id: 'gemini', name: 'Gemini', models: [] },
      { id: 'ollama', name: 'Ollama', models: [] },
      { id: 'fireworks', name: 'Fireworks AI', models: [] },
      { id: 'github', name: 'GitHub Models', models: [] },
    ]
  }

  private spawnProcess(args: string[]): Promise<{ exitCode: number | null; stdout: string; stderr: string }> {
    return new Promise((resolve, reject) => {
      const command = this.config.command ?? 'openclaude'
      const proc = spawn(command, args, {
        cwd: this.config.workingDir,
        env: { ...process.env, ...this.config.env },
        stdio: ['ignore', 'pipe', 'pipe'],
        timeout: 10000,
      })

      let stdout = ''
      let stderr = ''

      proc.stdout?.on('data', (data: Buffer) => { stdout += data.toString() })
      proc.stderr?.on('data', (data: Buffer) => { stderr += data.toString() })

      proc.on('error', reject)
      proc.on('close', (exitCode) => {
        resolve({ exitCode, stdout, stderr })
      })
    })
  }
}
