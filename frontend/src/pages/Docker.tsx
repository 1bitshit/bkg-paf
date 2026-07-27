import { useState, useEffect, useCallback } from 'react'
import { Header } from '@/components/ui/header'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Container,
  Play,
  Square,
  RotateCw,
  Trash2,
  RefreshCw,
  Server,
  HardDrive,
  Activity,
  Eye,
  X,
  Terminal,
  CheckCircle2,
  XCircle,
  Loader2,
  Box,
  ChevronDown,
  ChevronUp,
} from 'lucide-react'

type DockerTab = 'containers' | 'images' | 'stacks'

interface Container {
  id: string
  name: string
  image: string
  status: string
  ports: string
  state: string
  created: string
  size: string
}

interface DockerImage {
  id: string
  repository: string
  tag: string
  size: string
  created: string
}

interface DockerInfo {
  version: string
  os: string
  arch: string
  containers: number
  containersRunning: number
  containersStopped: number
  images: number
  driver: string
  dockerRootDir: string
}

function ContainerStateBadge({ state }: { state: string }) {
  if (state === 'running') return <Badge className="bg-emerald-500/15 text-emerald-400 border-emerald-500/20"><CheckCircle2 className="w-3 h-3 mr-1" />Running</Badge>
  if (state === 'exited') return <Badge className="bg-red-500/15 text-red-400 border-red-500/20"><XCircle className="w-3 h-3 mr-1" />Stopped</Badge>
  if (state === 'created') return <Badge className="bg-yellow-500/15 text-yellow-400 border-yellow-500/20"><Loader2 className="w-3 h-3 mr-1" />Created</Badge>
  return <Badge variant="outline">{state}</Badge>
}

function LogsModal({ containerId, containerName, onClose }: { containerId: string; containerName: string; onClose: () => void }) {
  const [logs, setLogs] = useState('')
  const [loading, setLoading] = useState(true)

  const fetchLogs = useCallback(async () => {
    try {
      const res = await fetch(`/api/docker/containers/${containerId}/logs?lines=200`)
      const data = await res.json()
      setLogs(data.logs || data.error || 'No logs')
    } catch {
      setLogs('Failed to fetch logs')
    } finally {
      setLoading(false)
    }
  }, [containerId])

  useEffect(() => {
    fetchLogs()
    const interval = setInterval(fetchLogs, 5000)
    return () => clearInterval(interval)
  }, [fetchLogs])

  return (
    <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
      <Card className="w-full max-w-4xl max-h-[80vh] flex flex-col">
        <div className="flex items-center justify-between p-4 border-b">
          <div className="flex items-center gap-2">
            <Terminal className="w-4 h-4" />
            <span className="font-medium">Logs: {containerName}</span>
          </div>
          <Button variant="ghost" size="sm" onClick={onClose}><X className="w-4 h-4" /></Button>
        </div>
        <div className="flex-1 overflow-auto p-4">
          {loading ? (
            <div className="flex items-center justify-center py-8"><Loader2 className="w-6 h-6 animate-spin" /></div>
          ) : (
            <pre className="text-xs font-mono whitespace-pre-wrap text-muted-foreground bg-muted/30 rounded p-4 max-h-[60vh] overflow-auto">{logs}</pre>
          )}
        </div>
      </Card>
    </div>
  )
}

function ContainerCard({ container, onAction }: { container: Container; onAction: (id: string, action: string) => void }) {
  const [showLogs, setShowLogs] = useState(false)
  const [expanded, setExpanded] = useState(false)
  const isRunning = container.state === 'running'

  return (
    <>
      <Card className="group">
        <CardContent className="p-4">
          <div className="flex items-start justify-between">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <Container className="w-4 h-4 text-muted-foreground shrink-0" />
                <span className="font-medium truncate">{container.name}</span>
                <ContainerStateBadge state={container.state} />
              </div>
              <div className="text-sm text-muted-foreground truncate">{container.image}</div>
              <div className="text-xs text-muted-foreground mt-1">{container.status}</div>
              {expanded && (
                <div className="mt-2 text-xs text-muted-foreground space-y-1">
                  <div><span className="font-medium">ID:</span> {container.id}</div>
                  {container.ports && <div><span className="font-medium">Ports:</span> {container.ports}</div>}
                  {container.created && <div><span className="font-medium">Created:</span> {container.created}</div>}
                </div>
              )}
            </div>
            <div className="flex items-center gap-1 shrink-0">
              <Button variant="ghost" size="sm" onClick={() => setExpanded(!expanded)} className="h-7 w-7 p-0">
                {expanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
              </Button>
              <Button variant="ghost" size="sm" onClick={() => setShowLogs(true)} className="h-7 w-7 p-0">
                <Eye className="w-3 h-3" />
              </Button>
              {!isRunning ? (
                <Button variant="ghost" size="sm" onClick={() => onAction(container.id, 'start')} className="h-7 w-7 p-0 text-emerald-500">
                  <Play className="w-3 h-3" />
                </Button>
              ) : (
                <Button variant="ghost" size="sm" onClick={() => onAction(container.id, 'stop')} className="h-7 w-7 p-0 text-yellow-500">
                  <Square className="w-3 h-3" />
                </Button>
              )}
              <Button variant="ghost" size="sm" onClick={() => onAction(container.id, 'restart')} className="h-7 w-7 p-0">
                <RotateCw className="w-3 h-3" />
              </Button>
              <Button variant="ghost" size="sm" onClick={() => onAction(container.id, 'delete')} className="h-7 w-7 p-0 text-red-500">
                <Trash2 className="w-3 h-3" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
      {showLogs && (
        <LogsModal containerId={container.id} containerName={container.name} onClose={() => setShowLogs(false)} />
      )}
    </>
  )
}

export function Docker() {
  const [activeTab, setActiveTab] = useState<DockerTab>('containers')
  const [containers, setContainers] = useState<Container[]>([])
  const [images, setImages] = useState<DockerImage[]>([])
  const [dockerInfo, setDockerInfo] = useState<DockerInfo | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchContainers = useCallback(async () => {
    try {
      const res = await fetch('/api/docker/containers')
      const data = await res.json()
      setContainers(data.containers || [])
      setError(null)
    } catch {
      setError('Failed to fetch containers')
    }
  }, [])

  const fetchImages = useCallback(async () => {
    try {
      const res = await fetch('/api/docker/images')
      const data = await res.json()
      setImages(data.images || [])
    } catch {
      // ignore
    }
  }, [])

  const fetchInfo = useCallback(async () => {
    try {
      const res = await fetch('/api/docker/info')
      const data = await res.json()
      setDockerInfo(data)
    } catch {
      // ignore
    }
  }, [])

  const refresh = useCallback(async () => {
    setLoading(true)
    await Promise.all([fetchContainers(), fetchImages(), fetchInfo()])
    setLoading(false)
  }, [fetchContainers, fetchImages, fetchInfo])

  useEffect(() => {
    refresh()
    const interval = setInterval(fetchContainers, 10_000)
    return () => clearInterval(interval)
  }, [refresh, fetchContainers])

  const handleAction = async (id: string, action: string) => {
    if (action === 'delete') {
      if (!confirm('Force remove this container?')) return
    }
    try {
      const method = action === 'delete' ? 'DELETE' : 'POST'
      await fetch(`/api/docker/containers/${id}/${action}`, { method })
      setTimeout(fetchContainers, 1000)
    } catch {
      // ignore
    }
  }

  return (
    <div className="h-full flex flex-col">
      <Header title="Docker">
        <Button variant="outline" size="sm" onClick={refresh}>
          <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </Header>

      <div className="flex-1 overflow-auto p-4 space-y-4">
        {error && (
          <Card className="border-red-500/20 bg-red-500/5">
            <CardContent className="p-3 text-sm text-red-400">{error}</CardContent>
          </Card>
        )}

        {dockerInfo && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <Card>
              <CardContent className="p-3 flex items-center gap-3">
                <Server className="w-5 h-5 text-muted-foreground" />
                <div>
                  <div className="text-xs text-muted-foreground">Docker</div>
                  <div className="font-medium text-sm">v{dockerInfo.version}</div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-3 flex items-center gap-3">
                <Activity className="w-5 h-5 text-emerald-500" />
                <div>
                  <div className="text-xs text-muted-foreground">Running</div>
                  <div className="font-medium text-sm">{dockerInfo.containersRunning}</div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-3 flex items-center gap-3">
                <Square className="w-5 h-5 text-muted-foreground" />
                <div>
                  <div className="text-xs text-muted-foreground">Stopped</div>
                  <div className="font-medium text-sm">{dockerInfo.containersStopped}</div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-3 flex items-center gap-3">
                <HardDrive className="w-5 h-5 text-muted-foreground" />
                <div>
                  <div className="text-xs text-muted-foreground">Images</div>
                  <div className="font-medium text-sm">{dockerInfo.images}</div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as DockerTab)}>
          <TabsList>
            <TabsTrigger value="containers">
              <Container className="w-4 h-4 mr-2" />
              Containers ({containers.length})
            </TabsTrigger>
            <TabsTrigger value="images">
              <Box className="w-4 h-4 mr-2" />
              Images ({images.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="containers" className="space-y-2 mt-3">
            {loading && containers.length === 0 ? (
              <div className="flex items-center justify-center py-12"><Loader2 className="w-6 h-6 animate-spin" /></div>
            ) : containers.length === 0 ? (
              <Card><CardContent className="p-8 text-center text-muted-foreground">No containers found</CardContent></Card>
            ) : (
              containers.map((c) => (
                <ContainerCard key={c.id} container={c} onAction={handleAction} />
              ))
            )}
          </TabsContent>

          <TabsContent value="images" className="space-y-2 mt-3">
            {loading && images.length === 0 ? (
              <div className="flex items-center justify-center py-12"><Loader2 className="w-6 h-6 animate-spin" /></div>
            ) : images.length === 0 ? (
              <Card><CardContent className="p-8 text-center text-muted-foreground">No images found</CardContent></Card>
            ) : (
              images.map((img) => (
                <Card key={img.id}>
                  <CardContent className="p-3 flex items-center justify-between">
                    <div className="flex items-center gap-3 min-w-0">
                      <Box className="w-4 h-4 text-muted-foreground shrink-0" />
                      <div className="min-w-0">
                        <div className="font-medium text-sm truncate">{img.repository}:{img.tag}</div>
                        <div className="text-xs text-muted-foreground">{img.size} &middot; {img.created}</div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}
