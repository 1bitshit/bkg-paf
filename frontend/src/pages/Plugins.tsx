import { useState, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Header } from '@/components/ui/header'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { OPENCODE_API_ENDPOINT } from '@/config'
import { fetchWrapper } from '@/api/fetchWrapper'
import {
  Plug,
  Sparkles,
  Shield,
  Layers,
  Loader2,
  CheckCircle2,
  ExternalLink,
  Cpu,
  Info,
  RotateCcw,
  KeyRound,
  Gauge,
  AlertTriangle,
  Settings,
} from 'lucide-react'

type PluginsTab = 'installed' | 'rate-limiter' | 'multi-account' | 'presets' | 'settings'

interface PluginEntry {
  name: string
  description: string
  npmPackage?: string
  options: Record<string, unknown> | null
}

interface ProviderEntry {
  id: string
  name: string
  models: Array<{ id: string; name: string; reasoning?: boolean }>
}

interface PluginsConfigResponse {
  plugins: PluginEntry[]
  providers: ProviderEntry[]
  config: {
    model?: string
    smallModel?: string
    defaultAgent?: string
  }
}

function usePluginsConfig() {
  return useQuery({
    queryKey: ['plugins', 'config'],
    queryFn: () => fetchWrapper<PluginsConfigResponse>(`${OPENCODE_API_ENDPOINT}/api/plugins/config`),
    refetchInterval: 30_000,
    staleTime: 10_000,
  })
}

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v)
}

function ConfigValue({ label, value }: { label: string; value: unknown }) {
  if (value === null || value === undefined) return null
  if (typeof value === 'boolean') {
    return (
      <div className="flex items-center justify-between text-xs py-1">
        <span className="text-muted-foreground">{label}</span>
        <Badge variant={value ? 'default' : 'secondary'} className="text-[10px]">
          {value ? 'enabled' : 'disabled'}
        </Badge>
      </div>
    )
  }
  if (typeof value === 'number') {
    return (
      <div className="flex items-center justify-between text-xs py-1">
        <span className="text-muted-foreground">{label}</span>
        <span className="font-mono text-foreground">{value.toLocaleString()}</span>
      </div>
    )
  }
  if (typeof value === 'string') {
    return (
      <div className="flex items-center justify-between text-xs py-1">
        <span className="text-muted-foreground">{label}</span>
        <span className="font-mono text-foreground truncate max-w-[200px]">{value}</span>
      </div>
    )
  }
  if (Array.isArray(value)) {
    return (
      <div className="text-xs py-1">
        <span className="text-muted-foreground">{label}</span>
        <div className="mt-1 flex flex-wrap gap-1">
          {value.map((item, i) => (
            <Badge key={i} variant="outline" className="text-[10px]">
              {typeof item === 'string' ? item : JSON.stringify(item)}
            </Badge>
          ))}
        </div>
      </div>
    )
  }
  if (isRecord(value)) {
    return (
      <div className="text-xs py-1">
        <span className="text-muted-foreground">{label}</span>
        <div className="mt-1 rounded bg-muted/40 p-2 font-mono text-[10px] text-foreground break-all">
          {JSON.stringify(value, null, 2)}
        </div>
      </div>
    )
  }
  return null
}

function ConfigSection({ options }: { options: Record<string, unknown> }) {
  const entries = Object.entries(options)
  if (entries.length === 0) {
    return (
      <div className="text-xs text-muted-foreground py-2">
        No configuration set.
      </div>
    )
  }
  return (
    <div className="space-y-1 divide-y divide-border/50">
      {entries.map(([key, value]) => (
        <ConfigValue key={key} label={key} value={value} />
      ))}
    </div>
  )
}

function RateLimiterPanel({ options }: { options: Record<string, unknown> | null }) {
  if (!options) {
    return (
      <EmptyState
        icon={<Shield className="h-8 w-8 text-muted-foreground" />}
        title="Rate Limiter not configured"
        description="Install and configure @crystalfluxay/opencode-rate-limiter in your opencode.json to enable rate limiting."
      />
    )
  }

  const limits = options.limits ?? options.rateLimits ?? options
  const circuitBreaker = options.circuitBreaker ?? options.breaker
  const backoff = options.backoff ?? options.backoffStrategy

  return (
    <div className="space-y-4">
      <Card className="border-border/70 bg-card/60">
        <CardContent className="p-4 space-y-3">
          <div className="flex items-center gap-2">
            <Gauge className="h-4 w-4 text-muted-foreground" />
            <h3 className="text-sm font-medium">Rate Limit Configuration</h3>
          </div>
          {isRecord(limits) ? (
            <ConfigSection options={limits} />
          ) : (
            <ConfigSection options={options} />
          )}
        </CardContent>
      </Card>

      {isRecord(circuitBreaker) && Object.keys(circuitBreaker).length > 0 && (
        <Card className="border-border/70 bg-card/60">
          <CardContent className="p-4 space-y-3">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-muted-foreground" />
              <h3 className="text-sm font-medium">Circuit Breaker</h3>
            </div>
            <ConfigSection options={circuitBreaker} />
          </CardContent>
        </Card>
      )}

      {isRecord(backoff) && Object.keys(backoff).length > 0 && (
        <Card className="border-border/70 bg-card/60">
          <CardContent className="p-4 space-y-3">
            <div className="flex items-center gap-2">
              <RotateCcw className="h-4 w-4 text-muted-foreground" />
              <h3 className="text-sm font-medium">Backoff Strategy</h3>
            </div>
            <ConfigSection options={backoff} />
          </CardContent>
        </Card>
      )}
    </div>
  )
}

function MultiAccountPanel({ options }: { options: Record<string, unknown> | null }) {
  if (!options) {
    return (
      <EmptyState
        icon={<Layers className="h-8 w-8 text-muted-foreground" />}
        title="Multi-Account not configured"
        description="Install and configure @rahadiana/opencode-multi-account in your opencode.json to enable API key rotation."
      />
    )
  }

  const keys = options.keys ?? options.accounts ?? options.providers
  const rotation = options.rotation ?? options.strategy
  const cooldown = options.cooldown ?? options.backoff

  return (
    <div className="space-y-4">
      <Card className="border-border/70 bg-card/60">
        <CardContent className="p-4 space-y-3">
          <div className="flex items-center gap-2">
            <KeyRound className="h-4 w-4 text-muted-foreground" />
            <h3 className="text-sm font-medium">Key Configuration</h3>
          </div>
          {isRecord(keys) ? (
            <ConfigSection options={keys} />
          ) : (
            <ConfigSection options={options} />
          )}
        </CardContent>
      </Card>

      {isRecord(rotation) && Object.keys(rotation).length > 0 && (
        <Card className="border-border/70 bg-card/60">
          <CardContent className="p-4 space-y-3">
            <div className="flex items-center gap-2">
              <RotateCcw className="h-4 w-4 text-muted-foreground" />
              <h3 className="text-sm font-medium">Rotation Strategy</h3>
            </div>
            <ConfigSection options={rotation} />
          </CardContent>
        </Card>
      )}

      {isRecord(cooldown) && Object.keys(cooldown).length > 0 && (
        <Card className="border-border/70 bg-card/60">
          <CardContent className="p-4 space-y-3">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-muted-foreground" />
              <h3 className="text-sm font-medium">Cooldown</h3>
            </div>
            <ConfigSection options={cooldown} />
          </CardContent>
        </Card>
      )}
    </div>
  )
}

function PresetsPanel({ options }: { options: Record<string, unknown> | null }) {
  if (!options) {
    return (
      <EmptyState
        icon={<Sparkles className="h-8 w-8 text-muted-foreground" />}
        title="No presets configured"
        description="Install and configure oh-my-opencode-slim in your opencode.json to define model presets."
      />
    )
  }

  const presets = options.presets ?? options.configurations ?? options.profiles

  return (
    <div className="space-y-4">
      {isRecord(presets) ? (
        Object.entries(presets).map(([name, preset]) => (
          <Card key={name} className="border-border/70 bg-card/60">
            <CardContent className="p-4 space-y-3">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <h3 className="font-medium flex items-center gap-2">
                    <Sparkles className="h-4 w-4 text-muted-foreground shrink-0" />
                    {name}
                  </h3>
                </div>
                <Badge variant="outline" className="shrink-0">
                  preset
                </Badge>
              </div>
              {isRecord(preset) ? (
                <ConfigSection options={preset} />
              ) : (
                <p className="text-xs text-muted-foreground">{String(preset)}</p>
              )}
            </CardContent>
          </Card>
        ))
      ) : (
        <Card className="border-border/70 bg-card/60">
          <CardContent className="p-4 space-y-3">
            <h3 className="text-sm font-medium flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-muted-foreground" />
              oh-my-opencode-slim Configuration
            </h3>
            <ConfigSection options={options} />
          </CardContent>
        </Card>
      )}
    </div>
  )
}

function SettingsPanel({ config, plugins }: { config: PluginsConfigResponse['config'] | undefined; plugins: PluginEntry[] }) {
  return (
    <div className="space-y-4">
      <Card className="border-border/70 bg-card/60">
        <CardContent className="p-4 space-y-3">
          <div className="flex items-center gap-2">
            <Cpu className="h-4 w-4 text-muted-foreground" />
            <h3 className="text-sm font-medium">Model Configuration</h3>
          </div>
          <ConfigSection options={{
            model: config?.model ?? '(not set)',
            small_model: config?.smallModel ?? '(not set)',
            default_agent: config?.defaultAgent ?? '(not set)',
          }} />
        </CardContent>
      </Card>

      {plugins.filter(p => p.options).map(plugin => (
        <Card key={plugin.name} className="border-border/70 bg-card/60">
          <CardContent className="p-4 space-y-3">
            <div className="flex items-center gap-2">
              <PluginIcon name={plugin.name} />
              <h3 className="text-sm font-medium">{plugin.name}</h3>
            </div>
            <ConfigSection options={plugin.options!} />
          </CardContent>
        </Card>
      ))}

      <Card className="border-border/70 bg-card/60">
        <CardContent className="p-4 space-y-3">
          <div className="flex items-center gap-2">
            <Settings className="h-4 w-4 text-muted-foreground" />
            <h3 className="text-sm font-medium">Configuration File</h3>
          </div>
          <p className="text-xs text-muted-foreground">
            Edit your <code className="bg-muted px-1 py-0.5 rounded">opencode.json</code> file directly to modify plugin settings,
            model configuration, and provider API keys.
          </p>
          <div className="rounded bg-muted/40 p-3 font-mono text-[10px] text-foreground whitespace-pre-wrap break-all">
            {JSON.stringify({
              model: config?.model,
              small_model: config?.smallModel,
              default_agent: config?.defaultAgent,
              pluginOptions: Object.fromEntries(
                plugins.filter(p => p.options).map(p => [p.name, p.options])
              ),
            }, null, 2)}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

export function Plugins() {
  const { data: pluginData, isLoading: configLoading } = usePluginsConfig()
  const [pluginsTab, setPluginsTab] = useState<PluginsTab>('installed')

  const plugins = useMemo(() => pluginData?.plugins ?? [], [pluginData?.plugins])
  const installedPluginNames = useMemo(() => new Set(plugins.map(p => p.name)), [plugins])
  const hasRateLimiter = installedPluginNames.has('@crystalfluxay/opencode-rate-limiter')
  const hasMultiAccount = installedPluginNames.has('@rahadiana/opencode-multi-account')
  const hasOhMyOpenCode = installedPluginNames.has('oh-my-opencode-slim')

  const rateLimiterOptions = useMemo(() => {
    return plugins.find(p => p.name === '@crystalfluxay/opencode-rate-limiter')?.options as Record<string, unknown> | null ?? null
  }, [plugins])

  const multiAccountOptions = useMemo(() => {
    return plugins.find(p => p.name === '@rahadiana/opencode-multi-account')?.options as Record<string, unknown> | null ?? null
  }, [plugins])

  const ohMyOpenCodeOptions = useMemo(() => {
    return plugins.find(p => p.name === 'oh-my-opencode-slim')?.options as Record<string, unknown> | null ?? null
  }, [plugins])

  const effectiveTab: PluginsTab = (() => {
    if (pluginsTab === 'rate-limiter' && !hasRateLimiter) return 'installed'
    if (pluginsTab === 'multi-account' && !hasMultiAccount) return 'installed'
    if (pluginsTab === 'presets' && !hasOhMyOpenCode) return 'installed'
    return pluginsTab
  })()

  const TAB_CLASS = "rounded-none border-b-2 border-transparent px-4 py-2.5 text-sm data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none whitespace-nowrap"

  return (
    <div className="h-dvh max-h-dvh overflow-hidden bg-background flex flex-col">
      <Header>
        <Header.BackButton to="/" />
        <Header.Title>Plugins</Header.Title>
      </Header>

      <Tabs value={effectiveTab} onValueChange={(v) => setPluginsTab(v as PluginsTab)} className="flex-1 min-h-0 flex flex-col overflow-hidden">
        <div className="border-b border-border px-4 overflow-x-auto">
          <TabsList className="h-auto gap-0 rounded-none border-0 bg-transparent p-0 w-max">
            <TabsTrigger value="installed" className={TAB_CLASS}>
              <Plug className="h-4 w-4 mr-1.5" />
              Installed
              {plugins.length > 0 && (
                <Badge variant="secondary" className="ml-1.5 h-5 px-1.5 text-xs">
                  {plugins.length}
                </Badge>
              )}
            </TabsTrigger>
            {hasRateLimiter && (
              <TabsTrigger value="rate-limiter" className={TAB_CLASS}>
                <Shield className="h-4 w-4 mr-1.5" />
                Rate Limiter
              </TabsTrigger>
            )}
            {hasMultiAccount && (
              <TabsTrigger value="multi-account" className={TAB_CLASS}>
                <KeyRound className="h-4 w-4 mr-1.5" />
                Multi-Account
              </TabsTrigger>
            )}
            {hasOhMyOpenCode && (
              <TabsTrigger value="presets" className={TAB_CLASS}>
                <Sparkles className="h-4 w-4 mr-1.5" />
                Presets
              </TabsTrigger>
            )}
            <TabsTrigger value="settings" className={TAB_CLASS}>
              <Settings className="h-4 w-4 mr-1.5" />
              Settings
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="installed" className="mt-0 flex-1 min-h-0 overflow-y-auto p-4 pb-[calc(env(safe-area-inset-bottom)+56px)] sm:pb-4">
          {configLoading ? (
            <LoadingSpinner />
          ) : plugins.length === 0 ? (
            <EmptyState
              icon={<Plug className="h-8 w-8 text-muted-foreground" />}
              title="No plugins installed"
              description="Add plugins to your opencode.json to extend functionality."
            />
          ) : (
            <div className="space-y-4">
              {plugins.map(plugin => (
                <Card key={plugin.name} className="border-border/70 bg-card/60">
                  <CardContent className="p-4 space-y-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <h3 className="font-medium flex items-center gap-2">
                          <PluginIcon name={plugin.name} />
                          <span className="truncate">{plugin.name}</span>
                        </h3>
                        <p className="mt-1 text-xs text-muted-foreground line-clamp-2">
                          {plugin.description}
                        </p>
                      </div>
                      <Badge
                        variant="outline"
                        className="bg-green-500/15 text-green-600 dark:text-green-400 border-green-500/30 shrink-0"
                      >
                        <CheckCircle2 className="h-3 w-3 mr-1" />
                        active
                      </Badge>
                    </div>
                    <div className="flex items-center justify-between text-xs text-muted-foreground pt-1 border-t border-border/50">
                      <span className="flex items-center gap-1">
                        <Info className="h-3 w-3" />
                        {plugin.npmPackage ?? 'Built-in'}
                      </span>
                      {plugin.npmPackage && (
                        <a
                          href={`https://www.npmjs.com/package/${plugin.npmPackage}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-1 hover:text-foreground transition-colors"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <ExternalLink className="h-3 w-3" />
                        </a>
                      )}
                    </div>
                    {plugin.options && (
                      <div className="pt-2 border-t border-border/50">
                        <ConfigSection options={plugin.options} />
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="rate-limiter" className="mt-0 flex-1 min-h-0 overflow-y-auto p-4 pb-[calc(env(safe-area-inset-bottom)+56px)] sm:pb-4">
          <RateLimiterPanel options={rateLimiterOptions} />
        </TabsContent>

        <TabsContent value="multi-account" className="mt-0 flex-1 min-h-0 overflow-y-auto p-4 pb-[calc(env(safe-area-inset-bottom)+56px)] sm:pb-4">
          <MultiAccountPanel options={multiAccountOptions} />
        </TabsContent>

        <TabsContent value="presets" className="mt-0 flex-1 min-h-0 overflow-y-auto p-4 pb-[calc(env(safe-area-inset-bottom)+56px)] sm:pb-4">
          <PresetsPanel options={ohMyOpenCodeOptions} />
        </TabsContent>

        <TabsContent value="settings" className="mt-0 flex-1 min-h-0 overflow-y-auto p-4 pb-[calc(env(safe-area-inset-bottom)+56px)] sm:pb-4">
          <SettingsPanel config={pluginData?.config} plugins={plugins} />
        </TabsContent>
      </Tabs>
    </div>
  )
}

function PluginIcon({ name }: { name: string }) {
  if (name.includes('rate-limiter')) return <Shield className="h-4 w-4 text-muted-foreground shrink-0" />
  if (name.includes('multi-account')) return <KeyRound className="h-4 w-4 text-muted-foreground shrink-0" />
  if (name.includes('oh-my-opencode')) return <Sparkles className="h-4 w-4 text-muted-foreground shrink-0" />
  return <Plug className="h-4 w-4 text-muted-foreground shrink-0" />
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
