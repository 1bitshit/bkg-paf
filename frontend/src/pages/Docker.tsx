import { useState, useEffect, useCallback, useRef } from "react";
import { Header } from "@/components/ui/header";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  readPendingStack,
  type PendingStack,
} from "@/lib/stacks/pending-stack";
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
  FileCode,
  Download,
  Upload,
  Settings,
  Plus,
  AlertTriangle,
  Check,
  Copy,
} from "lucide-react";

type DockerTab = "containers" | "images" | "stacks";

interface Container {
  id: string;
  name: string;
  image: string;
  status: string;
  ports: string;
  state: string;
  created: string;
  size: string;
}

interface DockerImage {
  id: string;
  repository: string;
  tag: string;
  size: string;
  created: string;
}

interface DockerInfo {
  version: string;
  os: string;
  arch: string;
  containers: number;
  containersRunning: number;
  containersStopped: number;
  images: number;
  driver: string;
  dockerRootDir: string;
}

interface ServiceInfo {
  name: string;
  status: string;
  health: string;
  container: string;
}

interface StackInfo {
  name: string;
  status: "running" | "stopped" | "unknown" | "error";
  composeFile: string;
  composeYAML: string;
  envContent: string;
  services: ServiceInfo[];
}

interface OperationResult {
  ok: boolean;
  exitCode: number | null;
  stdout: string;
  stderr: string;
  stackName: string;
  operation: string;
}

function StackStatusBadge({ status }: { status: StackInfo["status"] }) {
  if (status === "running")
    return (
      <Badge className="bg-emerald-500/15 text-emerald-400 border-emerald-500/20">
        <CheckCircle2 className="w-3 h-3 mr-1" />
        Running
      </Badge>
    );
  if (status === "stopped")
    return (
      <Badge className="bg-red-500/15 text-red-400 border-red-500/20">
        <XCircle className="w-3 h-3 mr-1" />
        Stopped
      </Badge>
    );
  if (status === "error")
    return (
      <Badge className="bg-orange-500/15 text-orange-400 border-orange-500/20">
        <AlertTriangle className="w-3 h-3 mr-1" />
        Error
      </Badge>
    );
  return (
    <Badge variant="outline">
      <Loader2 className="w-3 h-3 mr-1" />
      Unknown
    </Badge>
  );
}

function ContainerStateBadge({ state }: { state: string }) {
  if (state === "running")
    return (
      <Badge className="bg-emerald-500/15 text-emerald-400 border-emerald-500/20">
        <CheckCircle2 className="w-3 h-3 mr-1" />
        Running
      </Badge>
    );
  if (state === "exited")
    return (
      <Badge className="bg-red-500/15 text-red-400 border-red-500/20">
        <XCircle className="w-3 h-3 mr-1" />
        Stopped
      </Badge>
    );
  if (state === "created")
    return (
      <Badge className="bg-yellow-500/15 text-yellow-400 border-yellow-500/20">
        <Loader2 className="w-3 h-3 mr-1" />
        Created
      </Badge>
    );
  return <Badge variant="outline">{state}</Badge>;
}

function LogsModal({
  containerId,
  containerName,
  onClose,
}: {
  containerId: string;
  containerName: string;
  onClose: () => void;
}) {
  const [logs, setLogs] = useState("");
  const [loading, setLoading] = useState(true);
  const logsRef = useRef<HTMLPreElement>(null);

  const fetchLogs = useCallback(async () => {
    try {
      const res = await fetch(
        `/api/docker/containers/${containerId}/logs?lines=200`,
      );
      const data = await res.json();
      setLogs(data.logs || data.error || "No logs");
    } catch {
      setLogs("Failed to fetch logs");
    } finally {
      setLoading(false);
    }
  }, [containerId]);

  useEffect(() => {
    fetchLogs();
    const interval = setInterval(fetchLogs, 5000);
    return () => clearInterval(interval);
  }, [fetchLogs]);

  useEffect(() => {
    if (logsRef.current) {
      logsRef.current.scrollTop = logsRef.current.scrollHeight;
    }
  }, [logs]);

  return (
    <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
      <Card className="w-full max-w-4xl max-h-[80vh] flex flex-col">
        <div className="flex items-center justify-between p-4 border-b">
          <div className="flex items-center gap-2">
            <Terminal className="w-4 h-4" />
            <span className="font-medium">Logs: {containerName}</span>
          </div>
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="w-4 h-4" />
          </Button>
        </div>
        <div className="flex-1 overflow-auto p-4">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin" />
            </div>
          ) : (
            <pre
              ref={logsRef}
              className="text-xs font-mono whitespace-pre-wrap text-muted-foreground bg-muted/30 rounded p-4 max-h-[60vh] overflow-auto"
            >
              {logs}
            </pre>
          )}
        </div>
      </Card>
    </div>
  );
}

function ContainerCard({
  container,
  onAction,
}: {
  container: Container;
  onAction: (id: string, action: string) => void;
}) {
  const [showLogs, setShowLogs] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const isRunning = container.state === "running";

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
              <div className="text-sm text-muted-foreground truncate">
                {container.image}
              </div>
              <div className="text-xs text-muted-foreground mt-1">
                {container.status}
              </div>
              {expanded && (
                <div className="mt-2 text-xs text-muted-foreground space-y-1">
                  <div>
                    <span className="font-medium">ID:</span> {container.id}
                  </div>
                  {container.ports && (
                    <div>
                      <span className="font-medium">Ports:</span>{" "}
                      {container.ports}
                    </div>
                  )}
                  {container.created && (
                    <div>
                      <span className="font-medium">Created:</span>{" "}
                      {container.created}
                    </div>
                  )}
                </div>
              )}
            </div>
            <div className="flex items-center gap-1 shrink-0">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setExpanded(!expanded)}
                className="h-7 w-7 p-0"
              >
                {expanded ? (
                  <ChevronUp className="w-3 h-3" />
                ) : (
                  <ChevronDown className="w-3 h-3" />
                )}
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowLogs(true)}
                className="h-7 w-7 p-0"
              >
                <Eye className="w-3 h-3" />
              </Button>
              {!isRunning ? (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onAction(container.id, "start")}
                  className="h-7 w-7 p-0 text-emerald-500"
                >
                  <Play className="w-3 h-3" />
                </Button>
              ) : (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onAction(container.id, "stop")}
                  className="h-7 w-7 p-0 text-yellow-500"
                >
                  <Square className="w-3 h-3" />
                </Button>
              )}
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onAction(container.id, "restart")}
                className="h-7 w-7 p-0"
              >
                <RotateCw className="w-3 h-3" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onAction(container.id, "delete")}
                className="h-7 w-7 p-0 text-red-500"
              >
                <Trash2 className="w-3 h-3" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
      {showLogs && (
        <LogsModal
          containerId={container.id}
          containerName={container.name}
          onClose={() => setShowLogs(false)}
        />
      )}
    </>
  );
}

function StackCard({
  stack,
  onSelect,
}: {
  stack: StackInfo;
  onSelect: (name: string) => void;
}) {
  return (
    <Card
      className="group cursor-pointer hover:bg-accent/50 transition-colors"
      onClick={() => onSelect(stack.name)}
    >
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <FileCode className="w-4 h-4 text-muted-foreground shrink-0" />
              <span className="font-medium truncate">{stack.name}</span>
              <StackStatusBadge status={stack.status} />
            </div>
            {stack.composeFile && (
              <div className="text-xs text-muted-foreground">
                {stack.composeFile}
              </div>
            )}
            {stack.services.length > 0 && (
              <div className="text-xs text-muted-foreground mt-1">
                {stack.services.length} service
                {stack.services.length !== 1 ? "s" : ""}
              </div>
            )}
          </div>
          <ChevronDown className="w-4 h-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
        </div>
      </CardContent>
    </Card>
  );
}

function CreateStackDialog({
  initialStack,
  onClose,
  onCreated,
}: {
  initialStack?: PendingStack | null;
  onClose: () => void;
  onCreated: (name: string) => void;
}) {
  const [name, setName] = useState(initialStack?.name ?? "");
  const [composeYAML, setComposeYAML] = useState(
    initialStack?.composeYAML ??
      'services:\n  app:\n    image: nginx:alpine\n    ports:\n      - "8080:80"',
  );
  const [envContent, setEnvContent] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleCreate = async () => {
    if (!name.trim()) return;
    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/stacks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim(), composeYAML, envContent }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Failed to create stack");
        return;
      }
      onCreated(data.name);
    } catch {
      setError("Network error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
      <Card className="w-full max-w-2xl max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between p-4 border-b">
          <div className="flex items-center gap-2">
            <Plus className="w-4 h-4" />
            <span className="font-medium">Create New Stack</span>
          </div>
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="w-4 h-4" />
          </Button>
        </div>
        <div className="flex-1 overflow-auto p-4 space-y-4">
          <div>
            <label className="text-sm font-medium mb-1 block">Stack Name</label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="my-stack"
              pattern="[a-z0-9_-]+"
            />
            <div className="text-xs text-muted-foreground mt-1">
              Only lowercase letters, numbers, underscores, and hyphens
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-sm font-medium">compose.yaml</label>
            </div>
            <Textarea
              value={composeYAML}
              onChange={(e) => setComposeYAML(e.target.value)}
              className="font-mono text-sm min-h-[200px]"
              spellCheck={false}
            />
          </div>

          <div>
            <label className="text-sm font-medium mb-1 block">
              .env (optional)
            </label>
            <Textarea
              value={envContent}
              onChange={(e) => setEnvContent(e.target.value)}
              placeholder="KEY=value"
              className="font-mono text-sm min-h-[80px]"
              spellCheck={false}
            />
          </div>

          {error && (
            <div className="text-sm text-red-400 bg-red-500/10 rounded p-2">
              {error}
            </div>
          )}
        </div>
        <div className="flex justify-end gap-2 p-4 border-t">
          <Button variant="outline" onClick={onClose} disabled={loading}>
            Cancel
          </Button>
          <Button onClick={handleCreate} disabled={loading || !name.trim()}>
            {loading ? (
              <Loader2 className="w-4 h-4 animate-spin mr-2" />
            ) : (
              <Plus className="w-4 h-4 mr-2" />
            )}
            Create Stack
          </Button>
        </div>
      </Card>
    </div>
  );
}

function StackDetail({
  stackName,
  onBack,
}: {
  stackName: string;
  onBack: () => void;
}) {
  const [stack, setStack] = useState<StackInfo | null>(null);
  const [composeYAML, setComposeYAML] = useState("");
  const [envContent, setEnvContent] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [operating, setOperating] = useState<string | null>(null);
  const [output, setOutput] = useState("");
  const [showOutput, setShowOutput] = useState(false);
  const [showLogs, setShowLogs] = useState(false);
  const [logs, setLogs] = useState("");
  const [logsLoading, setLogsLoading] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [validation, setValidation] = useState<{
    valid: boolean;
    parsed?: string;
    error?: string;
  } | null>(null);
  const outputRef = useRef<HTMLPreElement>(null);
  const logsRef = useRef<HTMLPreElement>(null);

  const fetchStack = useCallback(async () => {
    try {
      const res = await fetch(`/api/stacks/${stackName}`);
      if (!res.ok) {
        onBack();
        return;
      }
      const data = await res.json();
      setStack(data);
      setComposeYAML(data.composeYAML);
      setEnvContent(data.envContent);
      setDirty(false);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, [stackName, onBack]);

  useEffect(() => {
    fetchStack();
  }, [fetchStack]);

  useEffect(() => {
    if (outputRef.current) {
      outputRef.current.scrollTop = outputRef.current.scrollHeight;
    }
  }, [output]);

  useEffect(() => {
    if (logsRef.current) {
      logsRef.current.scrollTop = logsRef.current.scrollHeight;
    }
  }, [logs]);

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch(`/api/stacks/${stackName}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ composeYAML, envContent }),
      });
      if (res.ok) {
        setDirty(false);
        await fetchStack();
      }
    } catch {
      // ignore
    } finally {
      setSaving(false);
    }
  };

  const handleValidate = async () => {
    setValidation(null);
    try {
      const res = await fetch(`/api/stacks/${stackName}/validate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ composeYAML }),
      });
      const data = await res.json();
      setValidation(data);
    } catch {
      setValidation({ valid: false, error: "Network error" });
    }
  };

  const handleOperation = async (operation: string, method = "POST") => {
    setOperating(operation);
    setShowOutput(true);
    setOutput(`Running: docker compose ${operation}...\n`);

    try {
      const endpoint = operation === "logs" ? "logs" : operation;
      const res = await fetch(`/api/stacks/${stackName}/${endpoint}`, {
        method,
      });
      const data: OperationResult = await res.json();

      setOutput((prev) => {
        let out = prev;
        if (data.stdout) out += data.stdout;
        if (data.stderr) out += data.stderr;
        if (data.ok) {
          out += `\n✅ ${operation} completed successfully\n`;
        } else {
          out += `\n❌ ${operation} failed (exit code: ${data.exitCode})\n`;
        }
        return out;
      });

      await fetchStack();
    } catch {
      setOutput((prev) => prev + `\n❌ Network error during ${operation}\n`);
    } finally {
      setOperating(null);
    }
  };

  const handleDelete = async () => {
    if (
      !confirm(
        `Delete stack "${stackName}"? This will stop all services and remove the compose files.`,
      )
    )
      return;
    setOperating("delete");
    setOutput("Deleting stack...\n");
    setShowOutput(true);

    try {
      const res = await fetch(`/api/stacks/${stackName}`, { method: "DELETE" });
      const data = await res.json();

      setOutput((prev) => {
        let out = prev;
        if (data.stderr) out += data.stderr;
        if (data.ok) {
          out += `\n✅ Stack "${stackName}" deleted\n`;
        } else {
          out += `\n❌ Delete failed: ${data.error || data.message}\n`;
        }
        return out;
      });

      if (data.ok) {
        setTimeout(onBack, 1500);
      }
    } catch {
      setOutput((prev) => prev + "\n❌ Network error during delete\n");
    } finally {
      setOperating(null);
    }
  };

  const fetchLogs = useCallback(async () => {
    setLogsLoading(true);
    try {
      const res = await fetch(`/api/stacks/${stackName}/logs?lines=150`);
      const data = await res.json();
      setLogs(data.logs || "No logs");
    } catch {
      setLogs("Failed to fetch logs");
    } finally {
      setLogsLoading(false);
    }
  }, [stackName]);

  const handleShowLogs = async () => {
    setShowLogs(true);
    await fetchLogs();
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text).catch(() => {});
  };

  if (loading) {
    return (
      <div className="h-full flex flex-col">
        <Header>
          <Header.Title>Stack</Header.Title>
          <Button variant="outline" size="sm" onClick={onBack}>
            Back
          </Button>
        </Header>
        <div className="flex-1 flex items-center justify-center">
          <Loader2 className="w-6 h-6 animate-spin" />
        </div>
      </div>
    );
  }

  if (!stack) {
    return (
      <div className="h-full flex flex-col">
        <Header>
          <Header.Title>Stack Not Found</Header.Title>
          <Button variant="outline" size="sm" onClick={onBack}>
            Back
          </Button>
        </Header>
        <div className="flex-1 flex items-center justify-center text-muted-foreground">
          Stack "{stackName}" not found
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      <Header>
        <Header.Title>Stack: {stack.name}</Header.Title>
        <div className="flex items-center gap-2">
          <StackStatusBadge status={stack.status} />
          <Button variant="outline" size="sm" onClick={onBack}>
            Back
          </Button>
        </div>
      </Header>
      <div className="px-4 pt-2 text-xs text-muted-foreground font-mono">
        /workspace/stacks/{stack.name} → {stack.composeFile}
      </div>

      <div className="flex-1 overflow-auto p-4 space-y-4">
        <div className="flex flex-wrap gap-2">
          {stack.status === "stopped" || stack.status === "unknown" ? (
            <Button
              size="sm"
              onClick={() => handleOperation("start")}
              disabled={operating !== null}
              className="bg-emerald-600 hover:bg-emerald-700"
            >
              {operating === "start" ? (
                <Loader2 className="w-4 h-4 animate-spin mr-1" />
              ) : (
                <Play className="w-4 h-4 mr-1" />
              )}
              Start
            </Button>
          ) : (
            <Button
              size="sm"
              variant="outline"
              onClick={() => handleOperation("stop")}
              disabled={operating !== null}
              className="text-yellow-500 border-yellow-500/30 hover:bg-yellow-500/10"
            >
              {operating === "stop" ? (
                <Loader2 className="w-4 h-4 animate-spin mr-1" />
              ) : (
                <Square className="w-4 h-4 mr-1" />
              )}
              Stop
            </Button>
          )}

          <Button
            size="sm"
            variant="outline"
            onClick={() => handleOperation("restart")}
            disabled={operating !== null}
          >
            {operating === "restart" ? (
              <Loader2 className="w-4 h-4 animate-spin mr-1" />
            ) : (
              <RotateCw className="w-4 h-4 mr-1" />
            )}
            Restart
          </Button>

          <Button
            size="sm"
            variant="outline"
            onClick={() => handleOperation("down")}
            disabled={operating !== null}
          >
            {operating === "down" ? (
              <Loader2 className="w-4 h-4 animate-spin mr-1" />
            ) : (
              <Square className="w-4 h-4 mr-1" />
            )}
            Down
          </Button>

          <Button
            size="sm"
            variant="outline"
            onClick={() => handleOperation("pull")}
            disabled={operating !== null}
          >
            {operating === "pull" ? (
              <Loader2 className="w-4 h-4 animate-spin mr-1" />
            ) : (
              <Download className="w-4 h-4 mr-1" />
            )}
            Pull
          </Button>

          <Button
            size="sm"
            variant="outline"
            onClick={() => handleOperation("update")}
            disabled={operating !== null}
          >
            {operating === "update" ? (
              <Loader2 className="w-4 h-4 animate-spin mr-1" />
            ) : (
              <RefreshCw className="w-4 h-4 mr-1" />
            )}
            Update
          </Button>

          <Button
            size="sm"
            onClick={() => handleOperation("deploy")}
            disabled={operating !== null}
            className="bg-blue-600 hover:bg-blue-700"
          >
            {operating === "deploy" ? (
              <Loader2 className="w-4 h-4 animate-spin mr-1" />
            ) : (
              <Upload className="w-4 h-4 mr-1" />
            )}
            Deploy
          </Button>

          <Button size="sm" variant="outline" onClick={handleShowLogs}>
            <Eye className="w-4 h-4 mr-1" />
            Logs
          </Button>

          <Button
            size="sm"
            variant="outline"
            onClick={() => handleOperation("logs")}
            disabled={operating !== null}
          >
            <Terminal className="w-4 h-4 mr-1" />
            Output
          </Button>

          <Button
            size="sm"
            variant="outline"
            onClick={handleDelete}
            disabled={operating !== null}
            className="text-red-500 border-red-500/30 hover:bg-red-500/10 ml-auto"
          >
            {operating === "delete" ? (
              <Loader2 className="w-4 h-4 animate-spin mr-1" />
            ) : (
              <Trash2 className="w-4 h-4 mr-1" />
            )}
            Delete
          </Button>
        </div>

        {stack.services.length > 0 && (
          <Card>
            <CardContent className="p-4">
              <h3 className="text-sm font-medium mb-3 flex items-center gap-2">
                <Settings className="w-4 h-4" />
                Services
              </h3>
              <div className="space-y-2">
                {stack.services.map((svc) => (
                  <div
                    key={svc.name}
                    className="flex items-center justify-between p-2 rounded bg-muted/30"
                  >
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-sm">{svc.name}</span>
                      <Badge
                        variant={
                          svc.status === "running" ? "default" : "outline"
                        }
                        className="text-xs"
                      >
                        {svc.status}
                      </Badge>
                      {svc.health && (
                        <Badge
                          variant={
                            svc.health === "healthy" ? "default" : "destructive"
                          }
                          className="text-xs"
                        >
                          {svc.health}
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-1">
                      {svc.status !== "running" ? (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 w-6 p-0 text-emerald-500"
                          onClick={async () => {
                            await fetch(
                              `/api/stacks/${stackName}/services/${svc.name}/start`,
                              { method: "POST" },
                            );
                            await fetchStack();
                          }}
                        >
                          <Play className="w-3 h-3" />
                        </Button>
                      ) : (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 w-6 p-0 text-yellow-500"
                          onClick={async () => {
                            await fetch(
                              `/api/stacks/${stackName}/services/${svc.name}/stop`,
                              { method: "POST" },
                            );
                            await fetchStack();
                          }}
                        >
                          <Square className="w-3 h-3" />
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 w-6 p-0"
                        onClick={async () => {
                          await fetch(
                            `/api/stacks/${stackName}/services/${svc.name}/restart`,
                            { method: "POST" },
                          );
                          await fetchStack();
                        }}
                      >
                        <RotateCw className="w-3 h-3" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-medium flex items-center gap-2">
                <FileCode className="w-4 h-4" />
                {stack.composeFile}
                {dirty && (
                  <Badge variant="outline" className="text-xs">
                    Modified
                  </Badge>
                )}
              </h3>
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7"
                  onClick={() => copyToClipboard(composeYAML)}
                >
                  <Copy className="w-3 h-3 mr-1" />
                  Copy
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7"
                  onClick={handleValidate}
                >
                  <Check className="w-3 h-3 mr-1" />
                  Validate
                </Button>
                <Button
                  size="sm"
                  className="h-7"
                  onClick={handleSave}
                  disabled={!dirty || saving}
                >
                  {saving ? (
                    <Loader2 className="w-3 h-3 animate-spin mr-1" />
                  ) : (
                    <Upload className="w-3 h-3 mr-1" />
                  )}
                  Save
                </Button>
              </div>
            </div>
            <Textarea
              value={composeYAML}
              onChange={(e) => {
                setComposeYAML(e.target.value);
                setDirty(true);
                setValidation(null);
              }}
              className="font-mono text-sm min-h-[300px] resize-y"
              spellCheck={false}
            />
            {validation && (
              <div
                className={`mt-2 text-xs p-2 rounded ${validation.valid ? "text-emerald-400 bg-emerald-500/10" : "text-red-400 bg-red-500/10"}`}
              >
                {validation.valid
                  ? "✅ YAML is valid"
                  : `❌ ${validation.error || "Invalid YAML"}`}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-medium flex items-center gap-2">
                <Settings className="w-4 h-4" />
                .env
                {dirty && envContent !== (stack?.envContent || "") && (
                  <Badge variant="outline" className="text-xs">
                    Modified
                  </Badge>
                )}
              </h3>
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7"
                  onClick={() => copyToClipboard(envContent)}
                >
                  <Copy className="w-3 h-3 mr-1" />
                  Copy
                </Button>
              </div>
            </div>
            <Textarea
              value={envContent}
              onChange={(e) => {
                setEnvContent(e.target.value);
                setDirty(true);
              }}
              placeholder="KEY=value"
              className="font-mono text-sm min-h-[100px] resize-y"
              spellCheck={false}
            />
          </CardContent>
        </Card>

        {showOutput && (
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-medium flex items-center gap-2">
                  <Terminal className="w-4 h-4" />
                  Output
                </h3>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowOutput(false)}
                >
                  <X className="w-3 h-3" />
                </Button>
              </div>
              <pre
                ref={outputRef}
                className="text-xs font-mono whitespace-pre-wrap text-muted-foreground bg-muted/30 rounded p-4 max-h-[300px] overflow-auto"
              >
                {output}
              </pre>
            </CardContent>
          </Card>
        )}
      </div>

      {showLogs && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
          <Card className="w-full max-w-4xl max-h-[80vh] flex flex-col">
            <div className="flex items-center justify-between p-4 border-b">
              <div className="flex items-center gap-2">
                <Terminal className="w-4 h-4" />
                <span className="font-medium">Logs: {stackName}</span>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={fetchLogs}
                  disabled={logsLoading}
                >
                  <RefreshCw
                    className={`w-3 h-3 mr-1 ${logsLoading ? "animate-spin" : ""}`}
                  />
                  Refresh
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowLogs(false)}
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
            </div>
            <div className="flex-1 overflow-auto p-4">
              <pre
                ref={logsRef}
                className="text-xs font-mono whitespace-pre-wrap text-muted-foreground bg-muted/30 rounded p-4 max-h-[60vh] overflow-auto"
              >
                {logsLoading ? "Loading..." : logs}
              </pre>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}

export function Docker() {
  const [activeTab, setActiveTab] = useState<DockerTab>("containers");
  const [containers, setContainers] = useState<Container[]>([]);
  const [images, setImages] = useState<DockerImage[]>([]);
  const [dockerInfo, setDockerInfo] = useState<DockerInfo | null>(null);
  const [stacks, setStacks] = useState<StackInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedStack, setSelectedStack] = useState<string | null>(null);
  const [showCreateStack, setShowCreateStack] = useState(false);
  const [initialStack, setInitialStack] = useState<PendingStack | null>(null);

  const fetchContainers = useCallback(async () => {
    try {
      const res = await fetch("/api/docker/containers");
      const data = await res.json();
      setContainers(data.containers || []);
      setError(null);
    } catch {
      setError("Failed to fetch containers");
    }
  }, []);

  const fetchImages = useCallback(async () => {
    try {
      const res = await fetch("/api/docker/images");
      const data = await res.json();
      setImages(data.images || []);
    } catch {
      // ignore
    }
  }, []);

  const fetchInfo = useCallback(async () => {
    try {
      const res = await fetch("/api/docker/info");
      const data = await res.json();
      setDockerInfo(data);
    } catch {
      // ignore
    }
  }, []);

  const fetchStacks = useCallback(async () => {
    try {
      const res = await fetch("/api/stacks");
      const data = await res.json();
      setStacks(data.stacks || []);
    } catch {
      // ignore
    }
  }, []);

  const refresh = useCallback(async () => {
    setLoading(true);
    await Promise.all([
      fetchContainers(),
      fetchImages(),
      fetchInfo(),
      fetchStacks(),
    ]);
    setLoading(false);
  }, [fetchContainers, fetchImages, fetchInfo, fetchStacks]);

  useEffect(() => {
    refresh();
    const interval = setInterval(fetchContainers, 10_000);
    return () => clearInterval(interval);
  }, [refresh, fetchContainers]);

  useEffect(() => {
    const pendingStack = readPendingStack();
    if (!pendingStack) return;

    setInitialStack(pendingStack);
    setActiveTab("stacks");
    setShowCreateStack(true);
  }, []);

  const handleContainerAction = async (id: string, action: string) => {
    if (action === "delete") {
      if (!confirm("Force remove this container?")) return;
    }
    try {
      const method = action === "delete" ? "DELETE" : "POST";
      await fetch(`/api/docker/containers/${id}/${action}`, { method });
      setTimeout(fetchContainers, 1000);
    } catch {
      // ignore
    }
  };

  if (selectedStack) {
    return (
      <StackDetail
        stackName={selectedStack}
        onBack={() => {
          setSelectedStack(null);
          fetchStacks();
        }}
      />
    );
  }

  return (
    <div className="h-full flex flex-col">
      <Header>
        <Header.Title>Docker</Header.Title>
        <Button variant="outline" size="sm" onClick={refresh}>
          <RefreshCw
            className={`w-4 h-4 mr-2 ${loading ? "animate-spin" : ""}`}
          />
          Refresh
        </Button>
      </Header>

      <div className="flex-1 overflow-auto p-4 space-y-4">
        {error && (
          <Card className="border-red-500/20 bg-red-500/5">
            <CardContent className="p-3 text-sm text-red-400">
              {error}
            </CardContent>
          </Card>
        )}

        {dockerInfo && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <Card>
              <CardContent className="p-3 flex items-center gap-3">
                <Server className="w-5 h-5 text-muted-foreground" />
                <div>
                  <div className="text-xs text-muted-foreground">Docker</div>
                  <div className="font-medium text-sm">
                    v{dockerInfo.version}
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-3 flex items-center gap-3">
                <Activity className="w-5 h-5 text-emerald-500" />
                <div>
                  <div className="text-xs text-muted-foreground">Running</div>
                  <div className="font-medium text-sm">
                    {dockerInfo.containersRunning}
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-3 flex items-center gap-3">
                <Square className="w-5 h-5 text-muted-foreground" />
                <div>
                  <div className="text-xs text-muted-foreground">Stopped</div>
                  <div className="font-medium text-sm">
                    {dockerInfo.containersStopped}
                  </div>
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

        <Tabs
          value={activeTab}
          onValueChange={(v) => setActiveTab(v as DockerTab)}
        >
          <TabsList>
            <TabsTrigger value="stacks">
              <FileCode className="w-4 h-4 mr-2" />
              Stacks ({stacks.length})
            </TabsTrigger>
            <TabsTrigger value="containers">
              <Container className="w-4 h-4 mr-2" />
              Containers ({containers.length})
            </TabsTrigger>
            <TabsTrigger value="images">
              <Box className="w-4 h-4 mr-2" />
              Images ({images.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="stacks" className="space-y-2 mt-3">
            <div className="flex justify-end">
              <Button size="sm" onClick={() => setShowCreateStack(true)}>
                <Plus className="w-4 h-4 mr-1" />
                New Stack
              </Button>
            </div>
            {loading && stacks.length === 0 ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-6 h-6 animate-spin" />
              </div>
            ) : stacks.length === 0 ? (
              <Card>
                <CardContent className="p-8 text-center text-muted-foreground">
                  No stacks found. Create one to get started.
                </CardContent>
              </Card>
            ) : (
              stacks.map((stack) => (
                <StackCard
                  key={stack.name}
                  stack={stack}
                  onSelect={setSelectedStack}
                />
              ))
            )}
          </TabsContent>

          <TabsContent value="containers" className="space-y-2 mt-3">
            {loading && containers.length === 0 ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-6 h-6 animate-spin" />
              </div>
            ) : containers.length === 0 ? (
              <Card>
                <CardContent className="p-8 text-center text-muted-foreground">
                  No containers found
                </CardContent>
              </Card>
            ) : (
              containers.map((c) => (
                <ContainerCard
                  key={c.id}
                  container={c}
                  onAction={handleContainerAction}
                />
              ))
            )}
          </TabsContent>

          <TabsContent value="images" className="space-y-2 mt-3">
            {loading && images.length === 0 ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-6 h-6 animate-spin" />
              </div>
            ) : images.length === 0 ? (
              <Card>
                <CardContent className="p-8 text-center text-muted-foreground">
                  No images found
                </CardContent>
              </Card>
            ) : (
              images.map((img) => (
                <Card key={img.id}>
                  <CardContent className="p-3 flex items-center justify-between">
                    <div className="flex items-center gap-3 min-w-0">
                      <Box className="w-4 h-4 text-muted-foreground shrink-0" />
                      <div className="min-w-0">
                        <div className="font-medium text-sm truncate">
                          {img.repository}:{img.tag}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {img.size} &middot; {img.created}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </TabsContent>
        </Tabs>
      </div>

      {showCreateStack && (
        <CreateStackDialog
          initialStack={initialStack}
          onClose={() => setShowCreateStack(false)}
          onCreated={(name) => {
            setShowCreateStack(false);
            setInitialStack(null);
            fetchStacks();
            setSelectedStack(name);
          }}
        />
      )}
    </div>
  );
}
