import { useState, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Header } from '@/components/ui/header'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { listRepos } from '@/api/repos'
import { useOpenCodeClient, useAgents, useSessionsAcrossDirectories } from '@/hooks/useOpenCode'
import { useSessionUsage, type UsageStats } from '@/hooks/useSessionUsage'
import { useEventContext } from '@/contexts/EventContext'
import { OPENCODE_API_ENDPOINT } from '@/config'
import {
  Activity,
  Bot,
  Clock,
  Loader2,
  MessageSquare,
  Zap,
  CheckCircle2,
  Cpu,
  HelpCircle,
  Shield,
  DollarSign,
  BarChart3,
  TrendingUp,
} from 'lucide-react'

type MonitorTab = 'agents' | 'sessions' | 'pending' | 'usage'

interface AgentStatus {
  id: string
  name: string
  description?: string
  sessionCount: number
}

interface SessionActivity {
  id: string
  title: string
  repoName: string
  repoId?: number
  status: 'active' | 'idle' | 'completed'
  agent?: string
  model?: string
  lastActivity?: number
  cost?: number
  tokens?: { input: number; output: number; reasoning: number; cache: { read: number; write: number } }
}

function formatTimestamp(ts?: number): string {
  if (!ts) return 'Never'
  const diff = Date.now() - ts
  if (diff < 60_000) return 'Just now'
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}m ago`
  if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)}h ago`
  return new Date(ts).toLocaleDateString()
}

function formatCost(cents: number): string {
  if (cents === 0) return '$0.00'
  if (cents < 0.01) return `<$0.01`
  return `$${cents.toFixed(2)}`
}

function formatTokens(n: number): string {
  if (n === 0) return '0'
  if (n < 1_000) return n.toString()
  if (n < 1_000_000) return `${(n / 1_000).toFixed(1)}k`
  if (n < 1_000_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  return `${(n / 1_000_000_000).toFixed(1)}B`
}

function getStatusColor(status: SessionActivity['status']): string {
  switch (status) {
    case 'active': return 'bg-green-500/15 text-green-600 dark:text-green-400 border-green-500/30'
    case 'idle': return 'bg-yellow-500/15 text-yellow-600 dark:text-yellow-400 border-yellow-500/30'
    case 'completed': return 'bg-muted text-muted-foreground border-border'
  }
}

function getStatusIcon(status: SessionActivity['status']) {
  switch (status) {
    case 'active': return <Zap className="h-3 w-3" />
    case 'idle': return <Clock className="h-3 w-3" />
    case 'completed': return <CheckCircle2 className="h-3 w-3" />
  }
}

export function Monitor() {
  const [monitorTab, setMonitorTab] = useState<MonitorTab>('agents')
  const { permissions, questions } = useEventContext()
  const client = useOpenCodeClient(OPENCODE_API_ENDPOINT)

  const { data: repos = [] } = useQuery({
    queryKey: ['repos'],
    queryFn: listRepos,
  })

  const directories = useMemo(() => repos.map(r => r.fullPath), [repos])

  const { data: agentsData = [], isLoading: agentsLoading } = useAgents(
    OPENCODE_API_ENDPOINT,
    directories[0],
  )

  const { data: sessionsData, isLoading: sessionsLoading } = useSessionsAcrossDirectories(
    OPENCODE_API_ENDPOINT,
    directories,
    { limit: 100 },
  )

  const { data: sessionStatuses } = useQuery({
    queryKey: ['opencode', 'session-statuses', OPENCODE_API_ENDPOINT],
    queryFn: async () => {
      if (!client) return {}
      return client.getSessionStatuses()
    },
    enabled: !!client,
    refetchInterval: 5_000,
  })

  const { stats: usageStats, isLoading: usageLoading } = useSessionUsage(OPENCODE_API_ENDPOINT, directories)

  const repoMap = useMemo(() => {
    const map = new Map<string, { name: string; id: number }>()
    repos.forEach(r => { map.set(r.fullPath, { name: r.name ?? '', id: r.id }) })
    return map
  }, [repos])

  const agentStatuses = useMemo<AgentStatus[]>(() => {
    if (!agentsData) return []
    const agents = Array.isArray(agentsData) ? agentsData : []
    return agents.map((agent: Record<string, unknown>) => ({
      id: agent.id as string,
      name: (agent.name as string) ?? (agent.id as string),
      description: agent.description as string | undefined,
      sessionCount: Array.isArray(sessionsData) ? sessionsData.length : 0,
    }))
  }, [agentsData, sessionsData])

  const sessionActivities = useMemo<SessionActivity[]>(() => {
    const items = Array.isArray(sessionsData) ? sessionsData : []
    return items.map(session => {
      const now = Date.now()
      const lastUpdated = session.time?.updated ?? session.time?.created ?? 0
      const age = now - lastUpdated

      const realStatus = sessionStatuses?.[session.id]
      let status: SessionActivity['status'] = 'completed'
      if (realStatus?.type === 'busy') status = 'active'
      else if (realStatus?.type === 'idle') status = 'idle'
      else if (realStatus?.type === 'retry') status = 'active'
      else if (age < 60_000) status = 'active'
      else if (age < 600_000) status = 'idle'

      const directory = session.directory ?? ''
      const normalizedDir = directory.replace(/\/+$/, '')
      const repoInfo = repoMap.get(normalizedDir)
      const repoName = repoInfo?.name ?? normalizedDir.split('/').pop() ?? 'Unknown'

      return {
        id: session.id,
        title: session.title || 'Untitled Session',
        repoName,
        repoId: repoInfo?.id,
        status,
        agent: (session as Record<string, unknown>).agent as string | undefined,
        model: (session as Record<string, unknown>).model as string | undefined,
        lastActivity: lastUpdated,
      }
    }).sort((a: SessionActivity, b: SessionActivity) => (b.lastActivity ?? 0) - (a.lastActivity ?? 0))
  }, [sessionsData, sessionStatuses, repoMap])

  const activeSessions = sessionActivities.filter(s => s.status === 'active')
  const idleSessions = sessionActivities.filter(s => s.status === 'idle')
  const completedSessions = sessionActivities.filter(s => s.status === 'completed')

  const pendingPermissions = permissions.pendingCount
  const pendingQuestions = questions.pendingCount

  return (
    <div className="h-dvh max-h-dvh overflow-hidden bg-background flex flex-col">
      <Header>
        <Header.BackButton to="/" />
        <Header.Title>Monitor</Header.Title>
      </Header>

      <Tabs value={monitorTab} onValueChange={(v) => setMonitorTab(v as MonitorTab)} className="flex-1 min-h-0 flex flex-col overflow-hidden">
        <div className="border-b border-border px-4">
          <TabsList className="h-auto gap-0 rounded-none border-0 bg-transparent p-0">
            <TabsTrigger value="agents" className="rounded-none border-b-2 border-transparent px-4 py-2.5 text-sm data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none">
              <Bot className="h-4 w-4 mr-1.5" />
              Agents
            </TabsTrigger>
            <TabsTrigger value="sessions" className="rounded-none border-b-2 border-transparent px-4 py-2.5 text-sm data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none">
              <MessageSquare className="h-4 w-4 mr-1.5" />
              Sessions
              {activeSessions.length > 0 && (
                <Badge variant="secondary" className="ml-1.5 h-5 px-1.5 text-xs">
                  {activeSessions.length}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="usage" className="rounded-none border-b-2 border-transparent px-4 py-2.5 text-sm data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none">
              <BarChart3 className="h-4 w-4 mr-1.5" />
              Usage
            </TabsTrigger>
            <TabsTrigger value="pending" className="rounded-none border-b-2 border-transparent px-4 py-2.5 text-sm data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none">
              <Activity className="h-4 w-4 mr-1.5" />
              Pending
              {(pendingPermissions + pendingQuestions) > 0 && (
                <Badge variant="destructive" className="ml-1.5 h-5 px-1.5 text-xs">
                  {pendingPermissions + pendingQuestions}
                </Badge>
              )}
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="agents" className="mt-0 flex-1 min-h-0 overflow-y-auto p-4 pb-[calc(env(safe-area-inset-bottom)+56px)] sm:pb-4">
          {agentsLoading ? (
            <LoadingSpinner />
          ) : agentStatuses.length === 0 ? (
            <EmptyState
              icon={<Bot className="h-8 w-8 text-muted-foreground" />}
              title="No agents found"
              description="Agents will appear here when configured in opencode.json."
            />
          ) : (
            <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
              {agentStatuses.map(agent => (
                <Card key={agent.id} className="border-border/70 bg-card/60 transition-all hover:shadow-md">
                  <CardContent className="p-4 space-y-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <h3 className="font-medium flex items-center gap-2">
                          <Cpu className="h-4 w-4 text-muted-foreground shrink-0" />
                          {agent.name}
                        </h3>
                        {agent.description && (
                          <p className="mt-1 text-xs text-muted-foreground line-clamp-2">{agent.description}</p>
                        )}
                      </div>
                      <Badge variant="outline" className="shrink-0">
                        {agent.sessionCount} {agent.sessionCount === 1 ? 'session' : 'sessions'}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-4 text-xs text-muted-foreground pt-2 border-t border-border/50">
                      <span>ID: {agent.id}</span>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="sessions" className="mt-0 flex-1 min-h-0 overflow-y-auto p-4 pb-[calc(env(safe-area-inset-bottom)+56px)] sm:pb-4">
          {sessionsLoading ? (
            <LoadingSpinner />
          ) : sessionActivities.length === 0 ? (
            <EmptyState
              icon={<MessageSquare className="h-8 w-8 text-muted-foreground" />}
              title="No sessions"
              description="Start a session in any repo to see it here."
            />
          ) : (
            <div className="space-y-2">
              {activeSessions.length > 0 && (
                <SessionGroup title="Active" count={activeSessions.length} sessions={activeSessions} />
              )}
              {idleSessions.length > 0 && (
                <SessionGroup title="Idle" count={idleSessions.length} sessions={idleSessions} className="mt-4" />
              )}
              {completedSessions.length > 0 && (
                <SessionGroup title="Completed" count={completedSessions.length} sessions={completedSessions.slice(0, 20)} className="mt-4" />
              )}
            </div>
          )}
        </TabsContent>

        <TabsContent value="usage" className="mt-0 flex-1 min-h-0 overflow-y-auto p-4 pb-[calc(env(safe-area-inset-bottom)+56px)] sm:pb-4">
          {usageLoading ? (
            <LoadingSpinner />
          ) : (
            <UsagePanel stats={usageStats} />
          )}
        </TabsContent>

        <TabsContent value="pending" className="mt-0 flex-1 min-h-0 overflow-y-auto p-4 pb-[calc(env(safe-area-inset-bottom)+56px)] sm:pb-4">
          <div className="space-y-4">
            <div>
              <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2 px-1">
                Permissions ({pendingPermissions})
              </h3>
              {pendingPermissions === 0 ? (
                <Card className="border-dashed border-border/70">
                  <CardContent className="flex items-center gap-3 p-4">
                    <Shield className="h-5 w-5 text-muted-foreground" />
                    <p className="text-sm text-muted-foreground">No pending permission requests</p>
                  </CardContent>
                </Card>
              ) : (
                <Card className="border-amber-500/30 bg-amber-500/5">
                  <CardContent className="flex items-center gap-3 p-4">
                    <Shield className="h-5 w-5 text-amber-500" />
                    <div>
                      <p className="text-sm font-medium">{pendingPermissions} permission request{pendingPermissions !== 1 ? 's' : ''} pending</p>
                      <p className="text-xs text-muted-foreground">A permission dialog should appear automatically.</p>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>

            <div>
              <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2 px-1">
                Questions ({pendingQuestions})
              </h3>
              {pendingQuestions === 0 ? (
                <Card className="border-dashed border-border/70">
                  <CardContent className="flex items-center gap-3 p-4">
                    <HelpCircle className="h-5 w-5 text-muted-foreground" />
                    <p className="text-sm text-muted-foreground">No pending questions</p>
                  </CardContent>
                </Card>
              ) : (
                <Card className="border-amber-500/30 bg-amber-500/5">
                  <CardContent className="flex items-center gap-3 p-4">
                    <HelpCircle className="h-5 w-5 text-amber-500" />
                    <div>
                      <p className="text-sm font-medium">{pendingQuestions} question{pendingQuestions !== 1 ? 's' : ''} pending</p>
                      <p className="text-xs text-muted-foreground">Questions will appear in their respective sessions.</p>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}

function UsagePanel({ stats }: { stats: UsageStats }) {
  if (stats.totalSessions === 0) {
    return (
      <EmptyState
        icon={<BarChart3 className="h-8 w-8 text-muted-foreground" />}
        title="No usage data"
        description="Token and cost usage will appear here once sessions have been used."
      />
    )
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-3">
        <Card className="border-border/70 bg-card/60">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-muted-foreground mb-1">
              <DollarSign className="h-4 w-4" />
              <span className="text-xs font-medium uppercase tracking-wider">Total Cost</span>
            </div>
            <p className="text-2xl font-bold">{formatCost(stats.totalCost)}</p>
          </CardContent>
        </Card>
        <Card className="border-border/70 bg-card/60">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-muted-foreground mb-1">
              <TrendingUp className="h-4 w-4" />
              <span className="text-xs font-medium uppercase tracking-wider">Total Tokens</span>
            </div>
            <p className="text-2xl font-bold">{formatTokens(stats.totalTokens.input + stats.totalTokens.output)}</p>
            <p className="text-xs text-muted-foreground mt-1">
              {formatTokens(stats.totalTokens.input)} in · {formatTokens(stats.totalTokens.output)} out · {formatTokens(stats.totalTokens.reasoning)} reasoning
            </p>
          </CardContent>
        </Card>
        <Card className="border-border/70 bg-card/60">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-muted-foreground mb-1">
              <MessageSquare className="h-4 w-4" />
              <span className="text-xs font-medium uppercase tracking-wider">Sessions</span>
            </div>
            <p className="text-2xl font-bold">{stats.totalSessions}</p>
            <p className="text-xs text-muted-foreground mt-1">
              {formatTokens(stats.totalTokens.cache.read)} cache read · {formatTokens(stats.totalTokens.cache.write)} cache write
            </p>
          </CardContent>
        </Card>
      </div>

      {stats.byModel.length > 0 && (
        <Card className="border-border/70 bg-card/60">
          <CardContent className="p-4">
            <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-3">
              Usage by Model
            </h3>
            <div className="space-y-3">
              {stats.byModel.map(model => (
                <div key={`${model.providerID}/${model.modelID}`} className="flex items-center justify-between gap-4">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium truncate">{model.modelID}</p>
                    <p className="text-xs text-muted-foreground">{model.providerID}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-sm font-medium">{formatCost(model.totalCost)}</p>
                    <p className="text-xs text-muted-foreground">
                      {model.sessionCount} {model.sessionCount === 1 ? 'session' : 'sessions'} · {formatTokens(model.totalTokens.input + model.totalTokens.output)} tokens
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

function LoadingSpinner() {
  return (
    <div className="flex items-center justify-center py-12">
      <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
    </div>
  )
}

function EmptyState({ icon, title, description }: { icon: React.ReactNode; title: string; description: string }) {
  return (
    <div className="flex items-center justify-center py-12">
      <Card className="max-w-md border-dashed border-border/70">
        <CardContent className="flex flex-col items-center gap-4 p-8 text-center">
          <div className="rounded-full border border-border bg-muted/40 p-4">{icon}</div>
          <div className="space-y-2">
            <p className="text-lg font-semibold">{title}</p>
            <p className="text-sm text-muted-foreground">{description}</p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

function SessionGroup({ title, count, sessions, className }: { title: string; count: number; sessions: SessionActivity[]; className?: string }) {
  return (
    <div className={className}>
      <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2 px-1">
        {title} ({count})
      </h3>
      <div className="space-y-2">
        {sessions.map(session => (
          <SessionCard key={session.id} session={session} />
        ))}
      </div>
    </div>
  )
}

function SessionCard({ session }: { session: SessionActivity }) {
  return (
    <div className="flex items-center gap-3 p-3 rounded-lg border border-border/70 bg-card/60 hover:bg-card transition-colors">
      <div className={`flex items-center justify-center h-8 w-8 rounded-full shrink-0 ${getStatusColor(session.status)}`}>
        {getStatusIcon(session.status)}
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium truncate">{session.title}</p>
        <p className="text-xs text-muted-foreground truncate">
          {session.repoName}
          {session.agent && <span className="ml-1.5">· {session.agent}</span>}
          {session.model && <span className="ml-1.5">· {session.model}</span>}
        </p>
      </div>
      <div className="text-xs text-muted-foreground shrink-0 text-right">
        {formatTimestamp(session.lastActivity)}
      </div>
    </div>
  )
}
