import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { createOpenCodeClient } from '@/api/opencode'
import type { SessionV2Info } from '@/api/opencode'

export interface ModelUsage {
  providerID: string
  modelID: string
  sessionCount: number
  totalCost: number
  totalTokens: { input: number; output: number; reasoning: number; cache: { read: number; write: number } }
}

export interface UsageStats {
  totalSessions: number
  totalCost: number
  totalTokens: { input: number; output: number; reasoning: number; cache: { read: number; write: number } }
  byModel: ModelUsage[]
}

function emptyTokens() {
  return { input: 0, output: 0, reasoning: 0, cache: { read: 0, write: 0 } }
}

function addTokens(a: { input: number; output: number; reasoning: number; cache: { read: number; write: number } }, b: { input: number; output: number; reasoning: number; cache: { read: number; write: number } }) {
  return {
    input: a.input + b.input,
    output: a.output + b.output,
    reasoning: a.reasoning + b.reasoning,
    cache: { read: a.cache.read + b.cache.read, write: a.cache.write + b.cache.write },
  }
}

export function useSessionUsage(opcodeUrl: string | null | undefined, directories: string[]) {
  const { data: sessions, isLoading } = useQuery({
    queryKey: ['opencode', 'session-usage', opcodeUrl, directories.join('|')],
    queryFn: async () => {
      if (!opcodeUrl) return [] as SessionV2Info[]
      const allSessions: SessionV2Info[] = []
      for (const dir of directories) {
        const client = createOpenCodeClient(opcodeUrl, dir)
        try {
          const result = await client.listSessionsV2({ limit: 200, order: 'desc' })
          allSessions.push(...result.items)
        } catch {
          // skip failed directories
        }
      }
      return allSessions
    },
    enabled: !!opcodeUrl && directories.length > 0,
    staleTime: 15_000,
    refetchInterval: 30_000,
  })

  const stats = useMemo<UsageStats>(() => {
    if (!sessions || sessions.length === 0) {
      return { totalSessions: 0, totalCost: 0, totalTokens: emptyTokens(), byModel: [] }
    }

    let totalCost = 0
    let totalTokens = emptyTokens()
    const modelMap = new Map<string, ModelUsage>()

    for (const session of sessions) {
      totalCost += session.cost ?? 0
      if (session.tokens) {
        totalTokens = addTokens(totalTokens, session.tokens)
      }

      if (session.model) {
        const key = `${session.model.providerID}/${session.model.id}`
        const existing = modelMap.get(key)
        if (existing) {
          existing.sessionCount++
          existing.totalCost += session.cost ?? 0
          if (session.tokens) {
            existing.totalTokens = addTokens(existing.totalTokens, session.tokens)
          }
        } else {
          modelMap.set(key, {
            providerID: session.model.providerID,
            modelID: session.model.id,
            sessionCount: 1,
            totalCost: session.cost ?? 0,
            totalTokens: session.tokens ? { ...session.tokens } : emptyTokens(),
          })
        }
      }
    }

    const byModel = Array.from(modelMap.values()).sort((a, b) => b.totalCost - a.totalCost)

    return { totalSessions: sessions.length, totalCost, totalTokens, byModel }
  }, [sessions])

  return { stats, isLoading, sessionCount: sessions?.length ?? 0 }
}
