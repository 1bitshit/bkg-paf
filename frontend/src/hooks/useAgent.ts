import { useQuery } from '@tanstack/react-query'
import {
  listAgents,
  getAgent,
  listAgentSessions,
  type AgentSession,
} from '@/api/agents'

export function useAgentsList() {
  return useQuery({
    queryKey: ['agents'],
    queryFn: listAgents,
    staleTime: 30_000,
    refetchInterval: 30_000,
  })
}

export function useAgent(agentId: string | null) {
  return useQuery({
    queryKey: ['agents', agentId],
    queryFn: () => getAgent(agentId!),
    enabled: !!agentId,
    staleTime: 15_000,
  })
}

export function useAgentSessions(agentId: string | null, params?: { limit?: number; order?: 'asc' | 'desc' }) {
  return useQuery({
    queryKey: ['agents', agentId, 'sessions', params],
    queryFn: () => listAgentSessions(agentId!, params),
    enabled: !!agentId,
    staleTime: 10_000,
    refetchInterval: 15_000,
  })
}

export function useAllAgentSessions() {
  const { data: agents, isLoading: agentsLoading } = useAgentsList()

  const enabled = !agentsLoading && agents && agents.length > 0

  return useQuery({
    queryKey: ['agents', 'all-sessions'],
    queryFn: async () => {
      if (!agents) return [] as Array<AgentSession & { agentId: string }>
      const allSessions: Array<AgentSession & { agentId: string }> = []
      for (const agent of agents) {
        try {
          const sessions = await listAgentSessions(agent.id, { limit: 100, order: 'desc' })
          allSessions.push(...sessions.map(s => ({ ...s, agentId: agent.id })))
        } catch {
          // skip failed agents
        }
      }
      return allSessions.sort((a, b) => b.updatedAt - a.updatedAt)
    },
    enabled,
    staleTime: 10_000,
    refetchInterval: 15_000,
  })
}
