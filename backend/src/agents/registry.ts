import type { AgentAdapter, AgentCapabilities } from './types'
import { logger } from '../utils/logger'

export class AgentRegistry {
  private adapters: Map<string, AgentAdapter> = new Map()

  register(adapter: AgentAdapter): void {
    if (this.adapters.has(adapter.id)) {
      logger.warn(`Agent adapter '${adapter.id}' already registered, overwriting`)
    }
    this.adapters.set(adapter.id, adapter)
    logger.info(`Registered agent adapter: ${adapter.id} (${adapter.name})`)
  }

  unregister(id: string): boolean {
    const removed = this.adapters.delete(id)
    if (removed) {
      logger.info(`Unregistered agent adapter: ${id}`)
    }
    return removed
  }

  get(id: string): AgentAdapter | undefined {
    return this.adapters.get(id)
  }

  list(): AgentAdapter[] {
    return Array.from(this.adapters.values())
  }

  getByCapability(cap: keyof AgentCapabilities): AgentAdapter[] {
    return this.list().filter(adapter => adapter.capabilities[cap])
  }

  has(id: string): boolean {
    return this.adapters.has(id)
  }
}

let globalRegistry: AgentRegistry | null = null

export function getAgentRegistry(): AgentRegistry {
  if (!globalRegistry) {
    globalRegistry = new AgentRegistry()
  }
  return globalRegistry
}
