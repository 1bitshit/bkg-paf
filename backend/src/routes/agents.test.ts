import { describe, expect, it } from 'vitest'
import { Hono } from 'hono'
import { createAgentRoutes } from './agents'
import { AgentRegistry } from '../agents/registry'
import type { AgentAdapter, AgentCapabilities, AgentMessage, AgentProvider, AgentSession, CreateSessionParams } from '../agents/types'

const capabilities: AgentCapabilities = {
  sessions: true,
  messages: true,
  streaming: false,
  tools: false,
  mcp: false,
  permissions: false,
  costTracking: false,
}

function createThrowingAdapter(): AgentAdapter {
  return {
    id: 'broken',
    name: 'Broken Agent',
    description: 'Throws during health checks',
    capabilities,
    start: async () => {},
    stop: async () => {},
    healthCheck: async () => {
      throw new Error('agent binary exploded')
    },
    listSessions: async () => [],
    createSession: async (params: CreateSessionParams): Promise<AgentSession> => ({
      id: 'session-1',
      title: params.title ?? 'Session',
      createdAt: 1,
      updatedAt: 1,
    }),
    getSession: async () => {
      throw new Error('not found')
    },
    deleteSession: async () => {},
    abortSession: async () => {},
    listMessages: async (): Promise<AgentMessage[]> => [],
    sendMessage: async () => {},
    listProviders: async (): Promise<AgentProvider[]> => [],
  }
}

describe('agent routes', () => {
  it('returns unhealthy adapter entries when health checks throw', async () => {
    const registry = new AgentRegistry()
    registry.register(createThrowingAdapter())
    const app = new Hono()
    app.route('/agents', createAgentRoutes(registry))

    const res = await app.request('/agents')
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(body).toEqual([
      {
        id: 'broken',
        name: 'Broken Agent',
        description: 'Throws during health checks',
        capabilities,
        health: {
          healthy: false,
          state: 'error',
          error: 'agent binary exploded',
        },
      },
    ])
  })
})
