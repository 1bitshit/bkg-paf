import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Header } from '@/components/ui/header'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useAgentsList, useAllAgentSessions, useCreateAgentSession } from '@/hooks/useAgent'
import {
  Bot,
  Cpu,
  Activity,
  MessageSquare,
  Zap,
  Clock,
  CheckCircle2,
  XCircle,
  Loader2,
  Globe,
  Wrench,
  DollarSign,
  SquarePlus,
} from 'lucide-react'

type AgentsTab = 'overview' | 'sessions'

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
  if (cents < 0.01) return '<$0.01'
  return `$${cents.toFixed(2)}`
}

function formatTokens(n: number): string {
  if (n === 0) return '0'
  if (n < 1_000) return n.toString()
  if (n < 1_000_000) return `${(n / 1_000).toFixed(1)}k`
  if (n < 1_000_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  return `${(n / 1_000_000_000).toFixed(1)}B`
}

function HealthBadge({ healthy, state }: { healthy: boolean; state: string }) {
  if (healthy) {
    return (
      <Badge variant="outline" className="bg-green-500/10 text-green-600 dark:text-green-400 border-green-500/30">
        <CheckCircle2 className="h-3 w-3 mr-1" />
        {state}
      </Badge>
    )
  }
  return (
    <Badge variant="outline" className="bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/30">
      <XCircle className="h-3 w-3 mr-1" />
      {state}
    </Badge>
  )
}

function CapabilityBadge({ name, enabled }: { name: string; enabled: boolean }) {
  if (!enabled) return null
  const icons: Record<string, typeof Bot> = {
    sessions: MessageSquare,
    messages: MessageSquare,
    streaming: Zap,
    tools: Wrench,
    mcp: Globe,
    permissions: Activity,
    costTracking: DollarSign,
  }
  const Icon = icons[name] ?? Cpu
  return (
    <Badge variant="secondary" className="text-xs">
      <Icon className="h-3 w-3 mr-1" />
      {name}
    </Badge>
  )
}

export function Agents() {
  const [tab, setTab] = useState<AgentsTab>('overview')
  const navigate = useNavigate()
  const { data: agents = [], isLoading } = useAgentsList()
  const { data: allSessions = [], isLoading: sessionsLoading } = useAllAgentSessions()
  const createSessionMutation = useCreateAgentSession()

  const totalSessions = allSessions.length
  const totalCost = allSessions.reduce((sum, s) => sum + (s.cost ?? 0), 0)
  const totalTokens = allSessions.reduce((sum, s) => {
    if (!s.tokens) return sum
    return sum + s.tokens.input + s.tokens.output
  }, 0)

  const handleCreateSession = (agentId: string) => {
    createSessionMutation.mutate(
      { agentId, title: 'New Session' },
      {
        onSuccess: (session) => {
          navigate(`/repos/0/sessions/${session.id}`)
        },
      }
    )
  }

  return (
    <div className="h-dvh max-h-dvh overflow-hidden bg-background flex flex-col">
      <Header>
        <Header.BackButton to="/" />
        <Header.Title>Agents</Header.Title>
      </Header>

      <Tabs value={tab} onValueChange={(v) => setTab(v as AgentsTab)} className="flex-1 min-h-0 flex flex-col overflow-hidden">
        <div className="border-b border-border px-4">
          <TabsList className="h-auto gap-0 rounded-none border-0 bg-transparent p-0">
            <TabsTrigger value="overview" className="rounded-none border-b-2 border-transparent px-4 py-2.5 text-sm data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none">
              <Cpu className="h-4 w-4 mr-1.5" />
              Overview
            </TabsTrigger>
            <TabsTrigger value="sessions" className="rounded-none border-b-2 border-transparent px-4 py-2.5 text-sm data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none">
              <MessageSquare className="h-4 w-4 mr-1.5" />
              Sessions
              {totalSessions > 0 && (
                <Badge variant="secondary" className="ml-1.5 h-5 px-1.5 text-xs">
                  {totalSessions}
                </Badge>
              )}
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="overview" className="mt-0 flex-1 min-h-0 overflow-y-auto p-4 pb-[calc(env(safe-area-inset-bottom)+56px)] sm:pb-4">
          {isLoading ? (
            <LoadingSpinner />
          ) : agents.length === 0 ? (
            <EmptyState
              icon={<Bot className="h-8 w-8 text-muted-foreground" />}
              title="No agents found"
              description="Agents will appear here when configured."
            />
          ) : (
            <div className="space-y-4">
              <div className="grid gap-3 sm:grid-cols-3">
                <Card className="border-border/70 bg-card/60">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2 text-muted-foreground mb-1">
                      <Cpu className="h-4 w-4" />
                      <span className="text-xs font-medium uppercase tracking-wider">Agents</span>
                    </div>
                    <p className="text-2xl font-bold">{agents.length}</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {agents.filter(a => a.health.healthy).length} healthy
                    </p>
                  </CardContent>
                </Card>
                <Card className="border-border/70 bg-card/60">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2 text-muted-foreground mb-1">
                      <MessageSquare className="h-4 w-4" />
                      <span className="text-xs font-medium uppercase tracking-wider">Sessions</span>
                    </div>
                    <p className="text-2xl font-bold">{totalSessions}</p>
                  </CardContent>
                </Card>
                <Card className="border-border/70 bg-card/60">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2 text-muted-foreground mb-1">
                      <DollarSign className="h-4 w-4" />
                      <span className="text-xs font-medium uppercase tracking-wider">Total Cost</span>
                    </div>
                    <p className="text-2xl font-bold">{formatCost(totalCost)}</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {formatTokens(totalTokens)} tokens
                    </p>
                  </CardContent>
                </Card>
              </div>

              <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
                {agents.map(agent => (
                  <AgentCard key={agent.id} agent={agent} onCreateSession={handleCreateSession} />
                ))}
              </div>
            </div>
          )}
        </TabsContent>

        <TabsContent value="sessions" className="mt-0 flex-1 min-h-0 overflow-y-auto p-4 pb-[calc(env(safe-area-inset-bottom)+56px)] sm:pb-4">
          {sessionsLoading ? (
            <LoadingSpinner />
          ) : allSessions.length === 0 ? (
            <EmptyState
              icon={<MessageSquare className="h-8 w-8 text-muted-foreground" />}
              title="No sessions"
              description="Start a session in any agent to see it here."
            />
          ) : (
            <div className="space-y-2">
              {allSessions.slice(0, 50).map(session => (
                <SessionCard key={`${session.agentId}-${session.id}`} session={session} />
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}

function AgentCard({ agent, onCreateSession }: { agent: import('@/api/agents').AgentInfo; onCreateSession: (agentId: string) => void }) {
  return (
    <Card className="border-border/70 bg-card/60 transition-all hover:shadow-md">
      <CardContent className="p-4 space-y-3">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <h3 className="font-medium flex items-center gap-2">
              <Bot className="h-4 w-4 text-muted-foreground shrink-0" />
              {agent.name}
            </h3>
            <p className="mt-1 text-xs text-muted-foreground line-clamp-2">{agent.description}</p>
          </div>
          <HealthBadge healthy={agent.health.healthy} state={agent.health.state} />
        </div>

        <div className="flex flex-wrap gap-1.5">
          {Object.entries(agent.capabilities).map(([key, enabled]) => (
            <CapabilityBadge key={key} name={key} enabled={enabled as boolean} />
          ))}
        </div>

        {agent.health.version && (
          <div className="text-xs text-muted-foreground pt-2 border-t border-border/50">
            Version: {agent.health.version}
          </div>
        )}

        {agent.health.error && (
          <div className="text-xs text-red-500 pt-2 border-t border-border/50">
            {agent.health.error}
          </div>
        )}

        <div className="pt-2 border-t border-border/50">
          <Button
            size="sm"
            variant="outline"
            className="w-full"
            onClick={() => onCreateSession(agent.id)}
          >
            <SquarePlus className="h-4 w-4 mr-1.5" />
            New Session
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

function SessionCard({ session }: { session: import('@/api/agents').AgentSession & { agentId: string } }) {
  const isActive = session.status === 'busy'
  const isIdle = session.status === 'idle'

  return (
    <div className="flex items-center gap-3 p-3 rounded-lg border border-border/70 bg-card/60 hover:bg-card transition-colors">
      <div className={`flex items-center justify-center h-8 w-8 rounded-full shrink-0 ${
        isActive
          ? 'bg-green-500/15 text-green-600 dark:text-green-400 border border-green-500/30'
          : isIdle
            ? 'bg-yellow-500/15 text-yellow-600 dark:text-yellow-400 border border-yellow-500/30'
            : 'bg-muted text-muted-foreground border border-border'
      }`}>
        {isActive ? <Zap className="h-3 w-3" /> : isIdle ? <Clock className="h-3 w-3" /> : <CheckCircle2 className="h-3 w-3" />}
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium truncate">{session.title}</p>
        <p className="text-xs text-muted-foreground truncate">
          {session.agentId}
          {session.model && <span className="ml-1.5">· {session.model}</span>}
        </p>
      </div>
      <div className="text-xs text-muted-foreground shrink-0 text-right">
        {session.cost !== undefined && session.cost > 0 && (
          <p className="font-medium">{formatCost(session.cost)}</p>
        )}
        <p>{formatTimestamp(session.updatedAt)}</p>
      </div>
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
