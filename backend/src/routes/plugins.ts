import { Hono } from 'hono'
import type { Database } from 'bun:sqlite'
import type { OpenCodeClient } from '../services/opencode/client'
import { getOpenCodeConfigFilePath } from '@opencode-manager/shared/config/env'
import { readFileContent, fileExists } from '../services/file-operations'
import { parse as parseJsonc } from 'jsonc-parser'
import { logger } from '../utils/logger'
import * as path from 'path'
import * as os from 'os'

interface PluginEntry {
  name: string
  description: string
  npmPackage?: string
  options: Record<string, unknown> | null
}

interface PluginsConfigResponse {
  plugins: PluginEntry[]
  providers: Array<{ id: string; name: string; models: Array<{ id: string; name: string; reasoning?: boolean }> }>
  config: {
    model?: string
    smallModel?: string
    defaultAgent?: string
  }
}

const PLUGIN_DESCRIPTIONS: Record<string, { description: string; npm?: string }> = {
  'oh-my-opencode-slim': {
    description: 'Agent orchestration, preset management, and model configuration for OpenCode',
    npm: 'oh-my-opencode-slim',
  },
  '@rahadiana/opencode-multi-account': {
    description: 'Multiple API keys per provider with priority rotation and cooldown management',
    npm: '@rahadiana/opencode-multi-account',
  },
  '@crystalfluxay/opencode-rate-limiter': {
    description: 'Proactive TPM/RPM rate limiting with circuit breaker and backoff strategies',
    npm: '@crystalfluxay/opencode-rate-limiter',
  },
}

export function createPluginsRoutes(db: Database, openCodeClient: OpenCodeClient) {
  const app = new Hono()

  app.get('/config', async (c) => {
    try {
      const configPath = getOpenCodeConfigFilePath()
      let pluginList: string[] = []
      let pluginOptions: Record<string, unknown> = {}
      let modelConfig: PluginsConfigResponse['config'] = {}

      if (await fileExists(configPath)) {
        const rawContent = await readFileContent(configPath)
        const config = parseJsonc(rawContent) as Record<string, unknown>

        pluginList = Array.isArray(config.plugin) ? (config.plugin as string[]) : []
        pluginOptions = (config.pluginOptions as Record<string, unknown>) ?? {}
        modelConfig = {
          model: config.model as string | undefined,
          smallModel: config.small_model as string | undefined,
          defaultAgent: config.default_agent as string | undefined,
        }
      }

      if (pluginList.length === 0) {
        const homeConfigPath = path.join(os.homedir(), '.config', 'opencode', 'opencode.json')
        if (await fileExists(homeConfigPath)) {
          const rawContent = await readFileContent(homeConfigPath)
          const config = parseJsonc(rawContent) as Record<string, unknown>
          pluginList = Array.isArray(config.plugin) ? (config.plugin as string[]) : []
          pluginOptions = (config.pluginOptions as Record<string, unknown>) ?? {}
          if (!modelConfig.model) {
            modelConfig = {
              model: config.model as string | undefined,
              smallModel: config.small_model as string | undefined,
              defaultAgent: config.default_agent as string | undefined,
            }
          }
        }
      }

      const plugins: PluginEntry[] = pluginList.map((name) => ({
        name,
        description: PLUGIN_DESCRIPTIONS[name]?.description ?? 'OpenCode plugin',
        npmPackage: PLUGIN_DESCRIPTIONS[name]?.npm,
        options: (pluginOptions[name] as Record<string, unknown>) ?? null,
      }))

      let providers: PluginsConfigResponse['providers'] = []
      try {
        const providerData = await openCodeClient.getJson<Array<Record<string, unknown>>>('/config/providers')
        if (Array.isArray(providerData)) {
          providers = providerData.map((p) => ({
            id: p.id as string,
            name: (p.name as string) ?? (p.id as string),
            models: Array.isArray(p.models)
              ? (p.models as Array<Record<string, unknown>>).map((m) => ({
                  id: m.id as string,
                  name: (m.name as string) ?? (m.id as string),
                  reasoning: m.reasoning as boolean | undefined,
                }))
              : [],
          }))
        }
      } catch (error) {
        logger.warn('Failed to fetch provider data from OpenCode:', error)
      }

      const response: PluginsConfigResponse = {
        plugins,
        providers,
        config: modelConfig,
      }

      return c.json(response)
    } catch (error) {
      logger.error('Failed to read plugin config:', error)
      return c.json({ plugins: [], providers: [], config: {} })
    }
  })

  return app
}
