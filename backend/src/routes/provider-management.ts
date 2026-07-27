import { Hono } from 'hono'
import { z } from 'zod'
import type { Database } from 'bun:sqlite'
import type { OpenCodeClient } from '../services/opencode/client'
import { SettingsService } from '../services/settings'
import { getOpenCodeConfigFilePath } from '@opencode-manager/shared/config/env'
import { writeFileContent, readFileContent, fileExists } from '../services/file-operations'
import { parse as parseJsonc } from 'jsonc-parser'
import { logger } from '../utils/logger'
import { opencodeServerManager } from '../services/opencode-single-server'
import { restartOpenCode } from '../services/opencode-restart'
import type { OpenCodeSupervisor } from '../services/opencode-supervisor'
import { reloadOpenCodeConfig } from '../services/opencode-restart'

const AddProviderSchema = z.object({
  id: z.string().min(1).max(128).regex(/^[a-zA-Z0-9_-]+$/, 'Provider ID must be alphanumeric with hyphens/underscores'),
  name: z.string().min(1).max(256).optional(),
  source: z.enum(['env', 'config', 'custom', 'api']).optional(),
  env: z.array(z.string()).optional(),
  key: z.string().optional(),
  options: z.record(z.string(), z.unknown()).optional(),
  models: z.record(z.string(), z.unknown()).optional(),
}).strict()

const UpdateProviderSchema = z.object({
  name: z.string().min(1).max(256).optional(),
  source: z.enum(['env', 'config', 'custom', 'api']).optional(),
  env: z.array(z.string()).optional(),
  key: z.string().optional(),
  options: z.record(z.string(), z.unknown()).optional(),
  models: z.record(z.string(), z.unknown()).optional(),
}).strict()

const AddModelSchema = z.object({
  modelId: z.string().min(1).max(128),
  name: z.string().min(1).max(256).optional(),
  limit: z.object({
    context: z.number().optional(),
    output: z.number().optional(),
  }).optional(),
  options: z.record(z.string(), z.unknown()).optional(),
}).strict()

interface ProviderEntry {
  id: string
  name: string
  source: string
  env: string[]
  key?: string
  options: Record<string, unknown>
  models: Record<string, unknown>
  hasApiKey?: boolean
}

async function readConfigProviders(configPath: string): Promise<Record<string, unknown>> {
  if (!(await fileExists(configPath))) return {}
  const raw = await readFileContent(configPath)
  const config = parseJsonc(raw) as Record<string, unknown>
  return (config.provider as Record<string, unknown>) ?? {}
}

async function writeConfigProvider(configPath: string, providerId: string, providerData: Record<string, unknown>): Promise<void> {
  let config: Record<string, unknown> = {}

  if (await fileExists(configPath)) {
    const raw = await readFileContent(configPath)
    config = parseJsonc(raw) as Record<string, unknown>
  }

  const provider = (config.provider as Record<string, unknown>) ?? {}
  provider[providerId] = providerData
  config.provider = provider

  await writeFileContent(configPath, JSON.stringify(config, null, 2))
}

async function removeConfigProvider(configPath: string, providerId: string): Promise<boolean> {
  if (!(await fileExists(configPath))) return false
  const raw = await readFileContent(configPath)
  const config = parseJsonc(raw) as Record<string, unknown>
  const provider = (config.provider as Record<string, unknown>) ?? {}

  if (!(providerId in provider)) return false

  delete provider[providerId]

  if (Object.keys(provider).length === 0) {
    delete config.provider
  } else {
    config.provider = provider
  }

  await writeFileContent(configPath, JSON.stringify(config, null, 2))
  return true
}

export function createProviderManagementRoutes(
  db: Database,
  openCodeClient: OpenCodeClient,
  openCodeSupervisor?: OpenCodeSupervisor,
) {
  const app = new Hono()
  const settingsService = new SettingsService(db)
  const configPath = getOpenCodeConfigFilePath()

  app.get('/', async (c) => {
    try {
      const configProviders = await readConfigProviders(configPath)
      const result: ProviderEntry[] = []

      let serverProviders: Array<Record<string, unknown>> = []
      try {
        const data = await openCodeClient.getJson<{ all?: Array<Record<string, unknown>>; connected?: string[] }>(
          '/provider'
        )
        if (data?.all && Array.isArray(data.all)) {
          serverProviders = data.all
        }
      } catch {
        logger.warn('Failed to fetch providers from OpenCode server')
      }

      const serverMap = new Map<string, Record<string, unknown>>()
      for (const sp of serverProviders) {
        const id = sp.id as string
        if (id) serverMap.set(id, sp)
      }

      const allIds = new Set<string>([
        ...Object.keys(configProviders),
        ...serverMap.keys(),
      ])

      for (const id of allIds) {
        const configData = configProviders[id]
        const serverData = serverMap.get(id)

        let name = id
        let source = 'builtin'
        let env: string[] = []
        let key: string | undefined
        let options: Record<string, unknown> = {}
        let models: Record<string, unknown> = {}

        if (configData && typeof configData === 'object') {
          const cp = configData as Record<string, unknown>
          name = (cp.name as string) ?? name
          source = (cp.source as string) ?? 'custom'
          env = (cp.env as string[]) ?? []
          key = cp.key as string | undefined
          options = (cp.options as Record<string, unknown>) ?? {}
          models = (cp.models as Record<string, unknown>) ?? {}
        }

        if (serverData) {
          name = (serverData.name as string) ?? name
          if (serverData.env) env = serverData.env as string[]
          if (!configData) source = 'builtin'
          if (serverData.models && typeof serverData.models === 'object') {
            const serverModels = serverData.models as Record<string, unknown>
            models = { ...serverModels, ...models }
          }
        }

        let hasApiKey = false
        try {
          const status = await openCodeClient.getJson<{ hasCredentials: boolean }>(
            `/provider/${id}/auth/status`
          )
          hasApiKey = status.hasCredentials
        } catch {
          if (env.length > 0 || key) {
            hasApiKey = true
          }
        }

        result.push({
          id,
          name,
          source,
          env,
          key,
          options,
          models,
          hasApiKey,
        })
      }

      return c.json(result)
    } catch (error) {
      logger.error('Failed to list providers:', error)
      return c.json({ error: 'Failed to list providers' }, 500)
    }
  })

  app.get('/:id', async (c) => {
    try {
      const providerId = c.req.param('id')
      const providers = await readConfigProviders(configPath)
      const data = providers[providerId]

      if (!data || typeof data !== 'object') {
        return c.json({ error: `Provider '${providerId}' not found` }, 404)
      }

      return c.json({ id: providerId, ...(data as Record<string, unknown>) })
    } catch (error) {
      logger.error('Failed to get provider:', error)
      return c.json({ error: 'Failed to get provider' }, 500)
    }
  })

  app.post('/', async (c) => {
    try {
      const body = await c.req.json()
      const validated = AddProviderSchema.parse(body)

      const existingProviders = await readConfigProviders(configPath)
      if (validated.id in existingProviders) {
        return c.json({ error: `Provider '${validated.id}' already exists` }, 409)
      }

      const providerData: Record<string, unknown> = {}
      if (validated.name) providerData.name = validated.name
      if (validated.source) providerData.source = validated.source
      if (validated.env?.length) providerData.env = validated.env
      if (validated.key) providerData.key = validated.key
      if (validated.options && Object.keys(validated.options).length > 0) providerData.options = validated.options
      if (validated.models && Object.keys(validated.models).length > 0) providerData.models = validated.models

      await writeConfigProvider(configPath, validated.id, providerData)

      const settingsDefault = settingsService.getDefaultOpenCodeConfig()
      if (settingsDefault) {
        settingsService.updateOpenCodeConfig('default', {
          content: await readFileContent(configPath),
          isDefault: true,
        })
      }

      try {
        opencodeServerManager.clearStartupError()
        await restartOpenCode(openCodeSupervisor)
      } catch (restartError) {
        logger.warn('Failed to restart OpenCode after adding provider:', restartError)
      }

      return c.json({ id: validated.id, ...providerData }, 201)
    } catch (error) {
      if (error instanceof z.ZodError) {
        return c.json({ error: 'Invalid request', details: error.issues }, 400)
      }
      logger.error('Failed to add provider:', error)
      return c.json({ error: 'Failed to add provider' }, 500)
    }
  })

  app.put('/:id', async (c) => {
    try {
      const providerId = c.req.param('id')
      const body = await c.req.json()
      const validated = UpdateProviderSchema.parse(body)

      const providers = await readConfigProviders(configPath)
      const existing = providers[providerId]

      if (!existing || typeof existing !== 'object') {
        return c.json({ error: `Provider '${providerId}' not found` }, 404)
      }

      const updated = { ...(existing as Record<string, unknown>) }
      if (validated.name !== undefined) updated.name = validated.name
      if (validated.source !== undefined) updated.source = validated.source
      if (validated.env !== undefined) updated.env = validated.env
      if (validated.key !== undefined) updated.key = validated.key
      if (validated.options !== undefined) updated.options = validated.options
      if (validated.models !== undefined) updated.models = validated.models

      await writeConfigProvider(configPath, providerId, updated)

      const settingsDefault = settingsService.getDefaultOpenCodeConfig()
      if (settingsDefault) {
        settingsService.updateOpenCodeConfig('default', {
          content: await readFileContent(configPath),
          isDefault: true,
        })
      }

      try {
        await reloadOpenCodeConfig(openCodeSupervisor)
      } catch (reloadError) {
        logger.warn('Failed to reload OpenCode config after updating provider:', reloadError)
      }

      return c.json({ id: providerId, ...updated })
    } catch (error) {
      if (error instanceof z.ZodError) {
        return c.json({ error: 'Invalid request', details: error.issues }, 400)
      }
      logger.error('Failed to update provider:', error)
      return c.json({ error: 'Failed to update provider' }, 500)
    }
  })

  app.delete('/:id', async (c) => {
    try {
      const providerId = c.req.param('id')
      const removed = await removeConfigProvider(configPath, providerId)

      if (!removed) {
        return c.json({ error: `Provider '${providerId}' not found` }, 404)
      }

      const settingsDefault = settingsService.getDefaultOpenCodeConfig()
      if (settingsDefault) {
        settingsService.updateOpenCodeConfig('default', {
          content: await readFileContent(configPath),
          isDefault: true,
        })
      }

      try {
        await reloadOpenCodeConfig(openCodeSupervisor)
      } catch (reloadError) {
        logger.warn('Failed to reload OpenCode config after deleting provider:', reloadError)
      }

      return c.json({ success: true })
    } catch (error) {
      logger.error('Failed to delete provider:', error)
      return c.json({ error: 'Failed to delete provider' }, 500)
    }
  })

  app.post('/:id/models', async (c) => {
    try {
      const providerId = c.req.param('id')
      const body = await c.req.json()
      const validated = AddModelSchema.parse(body)

      const providers = await readConfigProviders(configPath)
      const existing = providers[providerId]

      if (!existing || typeof existing !== 'object') {
        return c.json({ error: `Provider '${providerId}' not found` }, 404)
      }

      const providerData = { ...(existing as Record<string, unknown>) }
      const models = (providerData.models as Record<string, unknown>) ?? {}

      if (validated.modelId in models) {
        return c.json({ error: `Model '${validated.modelId}' already exists in provider '${providerId}'` }, 409)
      }

      const modelData: Record<string, unknown> = {}
      if (validated.name) modelData.name = validated.name
      if (validated.limit) modelData.limit = validated.limit
      if (validated.options) modelData.options = validated.options

      models[validated.modelId] = modelData
      providerData.models = models

      await writeConfigProvider(configPath, providerId, providerData)

      const settingsDefault = settingsService.getDefaultOpenCodeConfig()
      if (settingsDefault) {
        settingsService.updateOpenCodeConfig('default', {
          content: await readFileContent(configPath),
          isDefault: true,
        })
      }

      try {
        await reloadOpenCodeConfig(openCodeSupervisor)
      } catch (reloadError) {
        logger.warn('Failed to reload config after adding model:', reloadError)
      }

      return c.json({ providerId, modelId: validated.modelId, ...modelData }, 201)
    } catch (error) {
      if (error instanceof z.ZodError) {
        return c.json({ error: 'Invalid request', details: error.issues }, 400)
      }
      logger.error('Failed to add model:', error)
      return c.json({ error: 'Failed to add model' }, 500)
    }
  })

  app.delete('/:id/models/:modelId', async (c) => {
    try {
      const providerId = c.req.param('id')
      const modelId = c.req.param('modelId')

      const providers = await readConfigProviders(configPath)
      const existing = providers[providerId]

      if (!existing || typeof existing !== 'object') {
        return c.json({ error: `Provider '${providerId}' not found` }, 404)
      }

      const providerData = { ...(existing as Record<string, unknown>) }
      const models = (providerData.models as Record<string, unknown>) ?? {}

      if (!(modelId in models)) {
        return c.json({ error: `Model '${modelId}' not found in provider '${providerId}'` }, 404)
      }

      delete models[modelId]
      providerData.models = Object.keys(models).length > 0 ? models : undefined

      await writeConfigProvider(configPath, providerId, providerData)

      const settingsDefault = settingsService.getDefaultOpenCodeConfig()
      if (settingsDefault) {
        settingsService.updateOpenCodeConfig('default', {
          content: await readFileContent(configPath),
          isDefault: true,
        })
      }

      try {
        await reloadOpenCodeConfig(openCodeSupervisor)
      } catch (reloadError) {
        logger.warn('Failed to reload config after deleting model:', reloadError)
      }

      return c.json({ success: true })
    } catch (error) {
      logger.error('Failed to delete model:', error)
      return c.json({ error: 'Failed to delete model' }, 500)
    }
  })

  return app
}
