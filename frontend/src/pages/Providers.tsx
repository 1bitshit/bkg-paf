import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Header } from '@/components/ui/header'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Plus,
  Trash2,
  Loader2,
  CheckCircle2,
  XCircle,
  Eye,
  EyeOff,
  Server,
  Key,
  Globe,
} from 'lucide-react'
import { providerManagementApi, type ProviderManagementEntry } from '@/api/provider-management'
import { providerCredentialsApi } from '@/api/providers'
import { toast } from 'sonner'

const BUILTIN_PROVIDERS = [
  'openai', 'anthropic', 'google', 'azure', 'groq', 'fireworks', 'together', 'bedrock',
]

function isBuiltin(id: string): boolean {
  return BUILTIN_PROVIDERS.includes(id.toLowerCase())
}

interface AddProviderFormData {
  id: string
  name: string
  source: string
  envVars: string
  optionsBaseURL: string
}

const emptyFormData: AddProviderFormData = {
  id: '',
  name: '',
  source: 'custom',
  envVars: '',
  optionsBaseURL: '',
}

export function Providers() {
  const queryClient = useQueryClient()
  const [showAddDialog, setShowAddDialog] = useState(false)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [showApiKeyDialog, setShowApiKeyDialog] = useState(false)
  const [selectedProvider, setSelectedProvider] = useState<ProviderManagementEntry | null>(null)
  const [formData, setFormData] = useState<AddProviderFormData>(emptyFormData)
  const [apiKeyValue, setApiKeyValue] = useState('')
  const [showApiKey, setShowApiKey] = useState(false)

  const { data: providers, isLoading } = useQuery({
    queryKey: ['provider-management'],
    queryFn: providerManagementApi.list,
    refetchInterval: 30_000,
  })

  const addMutation = useMutation({
    mutationFn: (data: AddProviderFormData) => {
      const envArr = data.envVars.split(',').map(s => s.trim()).filter(Boolean)
      return providerManagementApi.add({
        id: data.id,
        name: data.name || data.id,
        source: data.source,
        env: envArr.length > 0 ? envArr : undefined,
        options: data.optionsBaseURL ? { baseURL: data.optionsBaseURL } : undefined,
      })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['provider-management'] })
      toast.success('Provider added')
      setShowAddDialog(false)
      setFormData(emptyFormData)
    },
    onError: (err: Error) => {
      toast.error(`Failed to add provider: ${err.message}`)
    },
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => providerManagementApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['provider-management'] })
      toast.success('Provider removed')
      setShowDeleteDialog(false)
      setSelectedProvider(null)
    },
    onError: (err: Error) => {
      toast.error(`Failed to delete provider: ${err.message}`)
    },
  })

  const setApiKeyMutation = useMutation({
    mutationFn: async ({ providerId, apiKey }: { providerId: string; apiKey: string }) => {
      await providerCredentialsApi.set(providerId, apiKey)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['provider-management'] })
      toast.success('API key saved')
      setShowApiKeyDialog(false)
      setSelectedProvider(null)
      setApiKeyValue('')
    },
    onError: (err: Error) => {
      toast.error(`Failed to save API key: ${err.message}`)
    },
  })

  const deleteApiKeyMutation = useMutation({
    mutationFn: (providerId: string) => providerCredentialsApi.delete(providerId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['provider-management'] })
      toast.success('API key removed')
    },
    onError: (err: Error) => {
      toast.error(`Failed to remove API key: ${err.message}`)
    },
  })

  function handleAddSubmit() {
    if (!formData.id.trim()) return
    addMutation.mutate(formData)
  }

  function handleDeleteConfirm() {
    if (!selectedProvider) return
    deleteMutation.mutate(selectedProvider.id)
  }

  function handleApiKeySubmit() {
    if (!selectedProvider || !apiKeyValue.trim()) return
    setApiKeyMutation.mutate({ providerId: selectedProvider.id, apiKey: apiKeyValue.trim() })
  }

  function handleDeleteApiKey(providerId: string) {
    deleteApiKeyMutation.mutate(providerId)
  }

  function openAddDialog() {
    setFormData(emptyFormData)
    setShowAddDialog(true)
  }

  function openApiKeyDialog(provider: ProviderManagementEntry) {
    setSelectedProvider(provider)
    setApiKeyValue('')
    setShowApiKey(true)
    setShowApiKeyDialog(true)
  }

  function openDeleteDialog(provider: ProviderManagementEntry) {
    setSelectedProvider(provider)
    setShowDeleteDialog(true)
  }

  return (
    <div className="flex-1 overflow-y-auto">
      <Header>
        <Header.BackButton to="/" />
        <Header.Title>Providers</Header.Title>
      </Header>
      <div className="px-4 pb-8 space-y-4">
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            {providers?.length ?? 0} provider{(providers?.length ?? 0) !== 1 ? 's' : ''} configured
          </p>
          <Button size="sm" onClick={openAddDialog}>
            <Plus className="h-4 w-4 mr-1.5" />
            Add Provider
          </Button>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : !providers?.length ? (
          <Card>
            <CardContent className="py-12 text-center">
              <Server className="h-8 w-8 text-muted-foreground mx-auto mb-3" />
              <p className="text-sm text-muted-foreground">
                No providers configured. Add a provider to get started.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-2">
            {providers.map((provider) => {
              const builtin = isBuiltin(provider.id)
              const modelCount = Object.keys(provider.models).length
              return (
                <Card key={provider.id}>
                  <CardContent className="py-3 px-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3 min-w-0">
                        <Server className="h-4 w-4 text-muted-foreground shrink-0" />
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-sm truncate">{provider.name || provider.id}</span>
                            {provider.name && provider.name !== provider.id && (
                              <span className="text-xs text-muted-foreground">{provider.id}</span>
                            )}
                          </div>
                          <div className="flex items-center gap-3 mt-0.5">
                            <Badge variant={builtin ? 'secondary' : 'outline'} className="text-[10px] px-1.5 py-0">
                              {builtin ? 'builtin' : provider.source || 'custom'}
                            </Badge>
                            <span className="text-xs text-muted-foreground">
                              {modelCount} model{modelCount !== 1 ? 's' : ''}
                            </span>
                            <div className="flex items-center gap-1">
                              {provider.hasApiKey ? (
                                <CheckCircle2 className="h-3 w-3 text-green-500" />
                              ) : (
                                <XCircle className="h-3 w-3 text-muted-foreground" />
                              )}
                              <span className="text-xs text-muted-foreground">
                                {provider.hasApiKey ? 'Key set' : 'No key'}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7"
                          onClick={() => openApiKeyDialog(provider)}
                          title={provider.hasApiKey ? 'Update API key' : 'Set API key'}
                        >
                          <Key className="h-3.5 w-3.5" />
                        </Button>
                        {!builtin && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-destructive"
                            onClick={() => openDeleteDialog(provider)}
                            title="Remove provider"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        )}

        <Card className="border-dashed">
          <CardContent className="pt-6">
            <div className="text-center space-y-2">
              <Globe className="h-8 w-8 text-muted-foreground mx-auto" />
              <p className="text-sm text-muted-foreground">
                Add custom providers like NVIDIA NIM, Ollama, or any OpenAI-compatible endpoint.
              </p>
              <p className="text-xs text-muted-foreground">
                Configure the provider, then set its API key to enable it.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Provider</DialogTitle>
            <DialogDescription>
              Add a custom AI provider to OpenCode. The provider will be written to opencode.json.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Provider ID *</Label>
              <Input
                placeholder="e.g. nim, ollama, together"
                value={formData.id}
                onChange={(e) => setFormData(prev => ({ ...prev, id: e.target.value }))}
              />
              <p className="text-xs text-muted-foreground">
                Alphanumeric with hyphens/underscores. Used in model references.
              </p>
            </div>
            <div className="space-y-2">
              <Label>Display Name</Label>
              <Input
                placeholder="e.g. NVIDIA NIM"
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label>Source</Label>
              <Select
                value={formData.source}
                onValueChange={(v) => setFormData(prev => ({ ...prev, source: v }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="custom">Custom</SelectItem>
                  <SelectItem value="env">Environment Variable</SelectItem>
                  <SelectItem value="config">Config</SelectItem>
                  <SelectItem value="api">API</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>API Base URL</Label>
              <Input
                placeholder="e.g. https://integrate.api.nvidia.com/v1"
                value={formData.optionsBaseURL}
                onChange={(e) => setFormData(prev => ({ ...prev, optionsBaseURL: e.target.value }))}
              />
              <p className="text-xs text-muted-foreground">
                Required for OpenAI-compatible endpoints.
              </p>
            </div>
            <div className="space-y-2">
              <Label>Environment Variables (comma-separated)</Label>
              <Input
                placeholder="e.g. NVIDIA_API_KEY, NIM_BASE_URL"
                value={formData.envVars}
                onChange={(e) => setFormData(prev => ({ ...prev, envVars: e.target.value }))}
              />
              <p className="text-xs text-muted-foreground">
                Env var names that hold the API key for this provider.
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddDialog(false)}>Cancel</Button>
            <Button
              onClick={handleAddSubmit}
              disabled={!formData.id.trim() || addMutation.isPending}
            >
              {addMutation.isPending && <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />}
              Add Provider
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Remove Provider</DialogTitle>
            <DialogDescription>
              This will remove <strong>{selectedProvider?.name || selectedProvider?.id}</strong> from opencode.json. 
              Existing sessions using this provider will not be affected until they are restarted.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDeleteDialog(false)}>Cancel</Button>
            <Button
              variant="destructive"
              onClick={handleDeleteConfirm}
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending && <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />}
              Remove
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showApiKeyDialog} onOpenChange={setShowApiKeyDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>API Key — {selectedProvider?.name || selectedProvider?.id}</DialogTitle>
            <DialogDescription>
              Set the API key for this provider. Stored securely in the backend credential store.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>API Key</Label>
              <div className="relative">
                <Input
                  type={showApiKey ? 'text' : 'password'}
                  placeholder="sk-..."
                  value={apiKeyValue}
                  onChange={(e) => setApiKeyValue(e.target.value)}
                  className="pr-10"
                />
                <button
                  type="button"
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  onClick={() => setShowApiKey(prev => !prev)}
                >
                  {showApiKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
            {selectedProvider?.hasApiKey && (
              <Button
                variant="ghost"
                size="sm"
                className="text-destructive"
                onClick={() => {
                  if (selectedProvider) handleDeleteApiKey(selectedProvider.id)
                }}
              >
                <Trash2 className="h-3.5 w-3.5 mr-1.5" />
                Remove current key
              </Button>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowApiKeyDialog(false)}>Cancel</Button>
            <Button
              onClick={handleApiKeySubmit}
              disabled={!apiKeyValue.trim() || setApiKeyMutation.isPending}
            >
              {setApiKeyMutation.isPending && <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />}
              Save Key
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
