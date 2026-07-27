import { useState, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Header } from '@/components/ui/header'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { OPENCODE_API_ENDPOINT } from '@/config'
import { fetchWrapper } from '@/api/fetchWrapper'
import {
  Cpu,
  Settings,
  Loader2,
  CheckCircle2,
  XCircle,
  Search,
  Eye,
  EyeOff,
  Zap,
  Shield,
  Globe,
  RefreshCw,
} from 'lucide-react'

type NimTab = 'models' | 'configuration'

interface NimHealth {
  healthy: boolean
  state: string
  error?: string | null
}

interface NimProvider {
  id: string
  name: string
  models: Array<{ id: string; name: string }>
}

const STORAGE_KEY_MODEL = 'nim-selected-model'
const STORAGE_KEY_API_KEY = 'nim-api-key'
const STORAGE_KEY_BASE_URL = 'nim-base-url'

function getStoredApiKey(): string {
  try { return localStorage.getItem(STORAGE_KEY_API_KEY) ?? '' } catch { return '' }
}

function getStoredBaseUrl(): string {
  try { return localStorage.getItem(STORAGE_KEY_BASE_URL) ?? '' } catch { return '' }
}

function getStoredModel(): string {
  try { return localStorage.getItem(STORAGE_KEY_MODEL) ?? '' } catch { return '' }
}

function storeValue(key: string, value: string): void {
  try {
    if (value) {
      localStorage.setItem(key, value)
    } else {
      localStorage.removeItem(key)
    }
  } catch { /* ignore */ }
}

function useNimHealth() {
  return useQuery({
    queryKey: ['nim', 'health'],
    queryFn: () => fetchWrapper<NimHealth>(`${OPENCODE_API_ENDPOINT}/api/agents/nim/health`),
    staleTime: 15_000,
    refetchInterval: 30_000,
    retry: false,
  })
}

function useNimProviders() {
  const { data: health } = useNimHealth()
  return useQuery({
    queryKey: ['nim', 'providers'],
    queryFn: () => fetchWrapper<NimProvider[]>(`${OPENCODE_API_ENDPOINT}/api/agents/nim/providers`),
    enabled: health?.healthy === true,
    staleTime: 60_000,
    refetchInterval: false,
  })
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

export function NimSettings() {
  const [tab, setTab] = useState<NimTab>('models')
  const { data: health, isLoading: healthLoading, refetch: refetchHealth } = useNimHealth()

  const TAB_CLASS = "rounded-none border-b-2 border-transparent px-4 py-2.5 text-sm data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none whitespace-nowrap"

  return (
    <div className="h-dvh max-h-dvh overflow-hidden bg-background flex flex-col">
      <Header>
        <Header.BackButton to="/" />
        <Header.Title>NVIDIA NIM</Header.Title>
        <Header.Actions>
          <Button variant="ghost" size="icon" onClick={() => refetchHealth()}>
            <RefreshCw className="h-4 w-4" />
          </Button>
        </Header.Actions>
      </Header>

      <div className="border-b border-border px-4 flex items-center gap-3">
        <Tabs value={tab} onValueChange={(v) => setTab(v as NimTab)} className="flex-1">
          <TabsList className="h-auto gap-0 rounded-none border-0 bg-transparent p-0">
            <TabsTrigger value="models" className={TAB_CLASS}>
              <Cpu className="h-4 w-4 mr-1.5" />
              Models
            </TabsTrigger>
            <TabsTrigger value="configuration" className={TAB_CLASS}>
              <Settings className="h-4 w-4 mr-1.5" />
              Configuration
            </TabsTrigger>
          </TabsList>
        </Tabs>
        <div className="shrink-0 pb-2.5">
          {healthLoading ? (
            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
          ) : health ? (
            <HealthBadge healthy={health.healthy} state={health.state} />
          ) : null}
        </div>
      </div>

      <TabsContent value="models" className="mt-0 flex-1 min-h-0 overflow-y-auto p-4 pb-[calc(env(safe-area-inset-bottom)+56px)] sm:pb-4">
        <ModelsTab health={health} />
      </TabsContent>

      <TabsContent value="configuration" className="mt-0 flex-1 min-h-0 overflow-y-auto p-4 pb-[calc(env(safe-area-inset-bottom)+56px)] sm:pb-4">
        <ConfigurationTab onTestConnection={() => refetchHealth()} />
      </TabsContent>
    </div>
  )
}

function ModelsTab({ health }: { health?: NimHealth }) {
  const [search, setSearch] = useState('')
  const { data: providers = [], isLoading } = useNimProviders()
  const [selectedModel, setSelectedModel] = useState(getStoredModel)

  const allModels = useMemo(() => {
    return providers.flatMap((p) => p.models.map((m) => ({ ...m, provider: p.name })))
  }, [providers])

  const filteredModels = useMemo(() => {
    if (!search.trim()) return allModels
    const q = search.toLowerCase()
    return allModels.filter(
      (m) => m.name.toLowerCase().includes(q) || m.id.toLowerCase().includes(q)
    )
  }, [allModels, search])

  if (!health?.healthy) {
    return (
      <div className="flex items-center justify-center py-12">
        <Card className="max-w-md border-dashed border-border/70">
          <CardContent className="flex flex-col items-center gap-4 p-8 text-center">
            <div className="rounded-full border border-border bg-muted/40 p-4">
              <Shield className="h-8 w-8 text-muted-foreground" />
            </div>
            <div className="space-y-2">
              <p className="text-lg font-semibold">Not configured</p>
              <p className="text-sm text-muted-foreground">
                Set your NVIDIA API key in the Configuration tab to browse available models.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search models..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      <div className="text-xs text-muted-foreground">
        {allModels.length} models available
        {selectedModel && <span className="ml-2">· Selected: <code className="bg-muted px-1 py-0.5 rounded">{selectedModel}</code></span>}
      </div>

      {filteredModels.length === 0 ? (
        <div className="flex items-center justify-center py-12">
          <p className="text-sm text-muted-foreground">No models match your search.</p>
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {filteredModels.map((model) => (
            <ModelCard
              key={model.id}
              model={model}
              isSelected={model.id === selectedModel}
              onSelect={() => {
                setSelectedModel(model.id)
                storeValue(STORAGE_KEY_MODEL, model.id)
              }}
            />
          ))}
        </div>
      )}
    </div>
  )
}

function ModelCard({ model, isSelected, onSelect }: { model: { id: string; name: string; provider: string }; isSelected: boolean; onSelect: () => void }) {
  return (
    <Card
      className={`border-border/70 bg-card/60 transition-all hover:shadow-md cursor-pointer ${
        isSelected ? 'ring-2 ring-primary/50 border-primary/50' : ''
      }`}
      onClick={onSelect}
    >
      <CardContent className="p-4 space-y-2">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <h3 className="text-sm font-medium truncate">{model.name}</h3>
            <p className="mt-0.5 text-xs text-muted-foreground font-mono truncate">{model.id}</p>
          </div>
          {isSelected && (
            <Badge variant="default" className="shrink-0 text-[10px]">
              <Zap className="h-3 w-3 mr-0.5" />
              selected
            </Badge>
          )}
        </div>
        <div className="flex items-center gap-1.5">
          <Badge variant="secondary" className="text-[10px]">
            <Globe className="h-3 w-3 mr-0.5" />
            {model.provider}
          </Badge>
        </div>
      </CardContent>
    </Card>
  )
}

function ConfigurationTab({ onTestConnection }: { onTestConnection: () => void }) {
  const [apiKey, setApiKey] = useState(getStoredApiKey)
  const [baseUrl, setBaseUrl] = useState(getStoredBaseUrl)
  const [showKey, setShowKey] = useState(false)
  const [saved, setSaved] = useState(false)

  const handleSave = () => {
    storeValue(STORAGE_KEY_API_KEY, apiKey)
    storeValue(STORAGE_KEY_BASE_URL, baseUrl)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  return (
    <div className="space-y-4 max-w-lg">
      <Card className="border-border/70 bg-card/60">
        <CardContent className="p-4 space-y-4">
          <div className="flex items-center gap-2">
            <Shield className="h-4 w-4 text-muted-foreground" />
            <h3 className="text-sm font-medium">NVIDIA API Key</h3>
          </div>
          <div className="space-y-2">
            <div className="relative">
              <Input
                type={showKey ? 'text' : 'password'}
                placeholder="nvapi-..."
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                className="pr-10 font-mono text-sm"
              />
              <button
                type="button"
                onClick={() => setShowKey(!showKey)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                {showKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            <p className="text-xs text-muted-foreground">
              Get your API key from{' '}
              <a
                href="https://build.nvidia.com/"
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary hover:underline"
              >
                build.nvidia.com
              </a>
            </p>
          </div>
        </CardContent>
      </Card>

      <Card className="border-border/70 bg-card/60">
        <CardContent className="p-4 space-y-4">
          <div className="flex items-center gap-2">
            <Globe className="h-4 w-4 text-muted-foreground" />
            <h3 className="text-sm font-medium">Base URL</h3>
          </div>
          <Input
            type="text"
            placeholder="https://integrate.api.nvidia.com/v1"
            value={baseUrl}
            onChange={(e) => setBaseUrl(e.target.value)}
            className="font-mono text-sm"
          />
          <p className="text-xs text-muted-foreground">
            Default: https://integrate.api.nvidia.com/v1
          </p>
        </CardContent>
      </Card>

      <div className="flex gap-3">
        <Button onClick={handleSave} className="flex-1">
          {saved ? (
            <>
              <CheckCircle2 className="h-4 w-4 mr-2" />
              Saved
            </>
          ) : (
            'Save Configuration'
          )}
        </Button>
        <Button variant="outline" onClick={onTestConnection}>
          <RefreshCw className="h-4 w-4 mr-2" />
          Test Connection
        </Button>
      </div>
    </div>
  )
}
