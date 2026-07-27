import { Hono } from 'hono'
import { z } from 'zod'
import type { AgentRegistry } from '../agents/registry'
import type { AgentAdapter, AgentHealth } from '../agents/types'
import { logger } from '../utils/logger'

const CreateSessionSchema = z.object({
  title: z.string().optional(),
  directory: z.string().optional(),
}).strict()

const SendMessageSchema = z.object({
  content: z.string().min(1),
}).strict()

export function createAgentRoutes(registry: AgentRegistry) {
  const app = new Hono()

  app.get('/', async (c) => {
    const adapters = registry.list()
    const result = await Promise.all(
      adapters.map(async (adapter) => {
        return getAgentInfo(adapter)
      })
    )
    return c.json(result)
  })

  app.get('/:agentId', async (c) => {
    const agentId = c.req.param('agentId')
    const adapter = registry.get(agentId)
    if (!adapter) {
      return c.json({ error: `Agent '${agentId}' not found` }, 404)
    }
    return c.json(await getAgentInfo(adapter))
  })

  app.get('/:agentId/health', async (c) => {
    const agentId = c.req.param('agentId')
    const adapter = registry.get(agentId)
    if (!adapter) {
      return c.json({ error: `Agent '${agentId}' not found` }, 404)
    }
    const health = await adapter.healthCheck()
    return c.json(health)
  })

  app.get('/:agentId/sessions', async (c) => {
    const agentId = c.req.param('agentId')
    const adapter = registry.get(agentId)
    if (!adapter) {
      return c.json({ error: `Agent '${agentId}' not found` }, 404)
    }

    const limit = c.req.query('limit') ? parseInt(c.req.query('limit')!) : undefined
    const order = c.req.query('order') as 'asc' | 'desc' | undefined
    const search = c.req.query('search') ?? undefined

    const sessions = await adapter.listSessions({ limit, order, search })
    return c.json(sessions)
  })

  app.post('/:agentId/sessions', async (c) => {
    const agentId = c.req.param('agentId')
    const adapter = registry.get(agentId)
    if (!adapter) {
      return c.json({ error: `Agent '${agentId}' not found` }, 404)
    }

    const body = await c.req.json()
    const validated = CreateSessionSchema.parse(body)
    const session = await adapter.createSession(validated)
    return c.json(session, 201)
  })

  app.get('/:agentId/sessions/:sessionId', async (c) => {
    const agentId = c.req.param('agentId')
    const sessionId = c.req.param('sessionId')
    const adapter = registry.get(agentId)
    if (!adapter) {
      return c.json({ error: `Agent '${agentId}' not found` }, 404)
    }

    try {
      const session = await adapter.getSession(sessionId)
      return c.json(session)
    } catch {
      return c.json({ error: `Session '${sessionId}' not found` }, 404)
    }
  })

  app.delete('/:agentId/sessions/:sessionId', async (c) => {
    const agentId = c.req.param('agentId')
    const sessionId = c.req.param('sessionId')
    const adapter = registry.get(agentId)
    if (!adapter) {
      return c.json({ error: `Agent '${agentId}' not found` }, 404)
    }

    try {
      await adapter.deleteSession(sessionId)
      return c.json({ success: true })
    } catch {
      return c.json({ error: `Failed to delete session '${sessionId}'` }, 500)
    }
  })

  app.post('/:agentId/sessions/:sessionId/abort', async (c) => {
    const agentId = c.req.param('agentId')
    const sessionId = c.req.param('sessionId')
    const adapter = registry.get(agentId)
    if (!adapter) {
      return c.json({ error: `Agent '${agentId}' not found` }, 404)
    }

    try {
      await adapter.abortSession(sessionId)
      return c.json({ success: true })
    } catch {
      return c.json({ error: `Failed to abort session '${sessionId}'` }, 500)
    }
  })

  app.get('/:agentId/sessions/:sessionId/messages', async (c) => {
    const agentId = c.req.param('agentId')
    const sessionId = c.req.param('sessionId')
    const adapter = registry.get(agentId)
    if (!adapter) {
      return c.json({ error: `Agent '${agentId}' not found` }, 404)
    }

    try {
      const messages = await adapter.listMessages(sessionId)
      return c.json(messages)
    } catch {
      return c.json({ error: `Failed to list messages for session '${sessionId}'` }, 500)
    }
  })

  app.post('/:agentId/sessions/:sessionId/messages', async (c) => {
    const agentId = c.req.param('agentId')
    const sessionId = c.req.param('sessionId')
    const adapter = registry.get(agentId)
    if (!adapter) {
      return c.json({ error: `Agent '${agentId}' not found` }, 404)
    }

    const body = await c.req.json()
    const validated = SendMessageSchema.parse(body)

    try {
      await adapter.sendMessage(sessionId, validated.content)
      return c.json({ success: true })
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to send message'
      return c.json({ error: message }, 500)
    }
  })

  app.get('/:agentId/providers', async (c) => {
    const agentId = c.req.param('agentId')
    const adapter = registry.get(agentId)
    if (!adapter) {
      return c.json({ error: `Agent '${agentId}' not found` }, 404)
    }

    try {
      const providers = await adapter.listProviders()
      return c.json(providers)
    } catch (error) {
      logger.error(`Failed to list providers for agent '${agentId}':`, error)
      return c.json({ error: 'Failed to list providers' }, 500)
    }
  })

  return app
}

async function getAgentInfo(adapter: AgentAdapter) {
  return {
    id: adapter.id,
    name: adapter.name,
    description: adapter.description,
    capabilities: adapter.capabilities,
    health: await getAgentHealth(adapter),
  }
}

async function getAgentHealth(adapter: AgentAdapter): Promise<AgentHealth> {
  try {
    return await adapter.healthCheck()
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Agent health check failed'
    logger.error(`Agent '${adapter.id}' health check failed:`, error)
    return { healthy: false, state: 'error', error: message }
  }
}
