import { Hono } from 'hono'
import { spawn } from 'child_process'

function runDocker(args: string[], timeout = 30_000): Promise<{ stdout: string; stderr: string; exitCode: number | null }> {
  return new Promise((resolve, reject) => {
    const proc = spawn('docker', args, {
      stdio: ['ignore', 'pipe', 'pipe'],
      timeout,
    })

    let stdout = ''
    let stderr = ''

    proc.stdout?.on('data', (chunk: Buffer) => { stdout += chunk.toString() })
    proc.stderr?.on('data', (chunk: Buffer) => { stderr += chunk.toString() })

    proc.on('error', reject)
    proc.on('close', (exitCode) => { resolve({ stdout, stderr, exitCode }) })
  })
}

export function createDockerRoutes(): Hono {
  const docker = new Hono()

  docker.get('/containers', async (c) => {
    const result = await runDocker([
      'ps', '-a', '--format', '{"id":"{{.ID}}","name":"{{.Names}}","image":"{{.Image}}","status":"{{.Status}}","ports":"{{.Ports}}","state":"{{.State}}","created":"{{.CreatedAt}}","size":"{{.Size}}"}',
    ])

    if (result.exitCode !== 0) {
      return c.json({ error: result.stderr || 'Failed to list containers' }, 500)
    }

    const containers = result.stdout
      .split('\n')
      .filter((l) => l.trim())
      .map((line) => {
        try {
          return JSON.parse(line)
        } catch {
          return null
        }
      })
      .filter(Boolean)

    return c.json({ containers })
  })

  docker.get('/containers/:id/logs', async (c) => {
    const id = c.req.param('id')
    const lines = c.req.query('lines') ?? '100'
    const result = await runDocker(['logs', '--tail', lines, id], 10_000)

    if (result.exitCode !== 0 && !result.stdout) {
      return c.json({ error: result.stderr || 'Failed to get logs' }, 500)
    }

    return c.json({ logs: result.stdout + result.stderr })
  })

  docker.post('/containers/:id/start', async (c) => {
    const id = c.req.param('id')
    const result = await runDocker(['start', id], 30_000)

    if (result.exitCode !== 0) {
      return c.json({ error: result.stderr || 'Failed to start container' }, 500)
    }

    return c.json({ ok: true })
  })

  docker.post('/containers/:id/stop', async (c) => {
    const id = c.req.param('id')
    const result = await runDocker(['stop', id], 30_000)

    if (result.exitCode !== 0) {
      return c.json({ error: result.stderr || 'Failed to stop container' }, 500)
    }

    return c.json({ ok: true })
  })

  docker.post('/containers/:id/restart', async (c) => {
    const id = c.req.param('id')
    const result = await runDocker(['restart', id], 30_000)

    if (result.exitCode !== 0) {
      return c.json({ error: result.stderr || 'Failed to restart container' }, 500)
    }

    return c.json({ ok: true })
  })

  docker.delete('/containers/:id', async (c) => {
    const id = c.req.param('id')
    const result = await runDocker(['rm', '-f', id], 30_000)

    if (result.exitCode !== 0) {
      return c.json({ error: result.stderr || 'Failed to remove container' }, 500)
    }

    return c.json({ ok: true })
  })

  docker.get('/images', async (c) => {
    const result = await runDocker([
      'images', '--format', '{"id":"{{.ID}}","repository":"{{.Repository}}","tag":"{{.Tag}}","size":"{{.Size}}","created":"{{.CreatedSince}}"}',
    ], 10_000)

    if (result.exitCode !== 0) {
      return c.json({ error: result.stderr || 'Failed to list images' }, 500)
    }

    const images = result.stdout
      .split('\n')
      .filter((l) => l.trim())
      .map((line) => {
        try {
          return JSON.parse(line)
        } catch {
          return null
        }
      })
      .filter(Boolean)

    return c.json({ images })
  })

  docker.get('/info', async (c) => {
    const result = await runDocker(['info', '--format', '{{json .}}'], 10_000)

    if (result.exitCode !== 0) {
      return c.json({ error: result.stderr || 'Failed to get Docker info' }, 500)
    }

    try {
      const info = JSON.parse(result.stdout)
      return c.json({
        version: info.ServerVersion,
        os: info.OperatingSystem,
        arch: info.Architecture,
        containers: info.Containers,
        containersRunning: info.ContainersRunning,
        containersStopped: info.ContainersStopped,
        images: info.Images,
        driver: info.Driver,
        dockerRootDir: info.DockerRootDir,
      })
    } catch {
      return c.json({ raw: result.stdout })
    }
  })

  return docker
}
