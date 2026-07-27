import { Hono } from 'hono'
import { spawn } from 'child_process'
import { readdir, readFile, writeFile, mkdir, rm, stat, access } from 'fs/promises'
import path from 'path'

const STACKS_DIR = process.env.STACKS_DIR || '/workspace/stacks'
const COMPOSE_FILENAMES = ['compose.yaml', 'compose.yml', 'docker-compose.yaml', 'docker-compose.yml']
const COMPOSE_TIMEOUT = 120_000

interface StackInfo {
  name: string
  status: 'running' | 'stopped' | 'unknown' | 'error'
  composeFile: string
  composeYAML: string
  envContent: string
  services: ServiceInfo[]
}

interface ServiceInfo {
  name: string
  status: string
  health: string
  container: string
}

function runCompose(stackDir: string, args: string[], timeout = COMPOSE_TIMEOUT): Promise<{ stdout: string; stderr: string; exitCode: number | null }> {
  return new Promise((resolve, reject) => {
    const proc = spawn('docker', ['compose', ...args], {
      cwd: stackDir,
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

async function findComposeFile(stackDir: string): Promise<string | null> {
  for (const name of COMPOSE_FILENAMES) {
    try {
      await access(path.join(stackDir, name))
      return name
    } catch {
      continue
    }
  }
  return null
}

async function getStackStatus(stackDir: string): Promise<StackInfo['status']> {
  const result = await runCompose(stackDir, ['ps', '--format', 'json'], 10_000)
  if (result.exitCode !== 0 || !result.stdout.trim()) return 'unknown'

  const lines = result.stdout.trim().split('\n').filter(l => l.trim())
  if (lines.length === 0) return 'stopped'

  let hasRunning = false
  for (const line of lines) {
    try {
      const svc = JSON.parse(line)
      if (svc.State === 'running' || svc.State === 'Up') hasRunning = true
    } catch {
      continue
    }
  }

  return hasRunning ? 'running' : 'stopped'
}

async function getStackServices(stackDir: string): Promise<ServiceInfo[]> {
  const result = await runCompose(stackDir, ['ps', '--format', 'json'], 10_000)
  if (result.exitCode !== 0 || !result.stdout.trim()) return []

  const lines = result.stdout.trim().split('\n').filter(l => l.trim())
  const services: ServiceInfo[] = []

  for (const line of lines) {
    try {
      const svc = JSON.parse(line)
      services.push({
        name: svc.Service || svc.Name,
        status: svc.State || 'unknown',
        health: svc.Health || '',
        container: svc.Name || '',
      })
    } catch {
      continue
    }
  }

  return services
}

async function listStacks(): Promise<StackInfo[]> {
  const stacks: StackInfo[] = []

  try {
    const entries = await readdir(STACKS_DIR, { withFileTypes: true })

    for (const entry of entries) {
      if (!entry.isDirectory()) continue

      const stackDir = path.join(STACKS_DIR, entry.name)
      const composeFile = await findComposeFile(stackDir)
      if (!composeFile) continue

      let composeYAML = ''
      let envContent = ''

      try {
        composeYAML = await readFile(path.join(stackDir, composeFile), 'utf-8')
      } catch {
        composeYAML = ''
      }

      try {
        envContent = await readFile(path.join(stackDir, '.env'), 'utf-8')
      } catch {
        envContent = ''
      }

      const status = await getStackStatus(stackDir)
      const services = await getStackServices(stackDir)

      stacks.push({
        name: entry.name,
        status,
        composeFile,
        composeYAML,
        envContent,
        services,
      })
    }
  } catch {
    // stacks directory doesn't exist or can't be read
  }

  // Also add any docker compose stacks not in the stacks directory
  try {
    const result = await runCompose(STACKS_DIR, ['ls', '--all', '--format', 'json'], 10_000)
    if (result.exitCode === 0 && result.stdout.trim()) {
      const lines = result.stdout.trim().split('\n').filter(l => l.trim())
      for (const line of lines) {
        try {
          const info = JSON.parse(line)
          if (!stacks.find(s => s.name === info.Name)) {
            stacks.push({
              name: info.Name,
              status: info.Status?.includes('running') ? 'running' : 'stopped',
              composeFile: info.ConfigFiles || '',
              composeYAML: '',
              envContent: '',
              services: [],
            })
          }
        } catch {
          continue
        }
      }
    }
  } catch {
    // ignore
  }

  return stacks.sort((a, b) => a.name.localeCompare(b.name))
}

function sanitizeStackName(name: string): string {
  return name.replace(/[^a-z0-9_-]/g, '').toLowerCase()
}

export function createStacksRoutes(): Hono {
  const stacks = new Hono()

  stacks.get('/', async (c) => {
    try {
      const stackList = await listStacks()
      return c.json({ stacks: stackList })
    } catch (err) {
      return c.json({ error: 'Failed to list stacks', detail: String(err) }, 500)
    }
  })

  stacks.get('/:name', async (c) => {
    const name = sanitizeStackName(c.req.param('name'))
    const stackDir = path.join(STACKS_DIR, name)

    try {
      const dirStat = await stat(stackDir)
      if (!dirStat.isDirectory()) {
        return c.json({ error: 'Stack not found' }, 404)
      }
    } catch {
      return c.json({ error: 'Stack not found' }, 404)
    }

    const composeFile = await findComposeFile(stackDir)
    if (!composeFile) {
      return c.json({ error: 'No compose file found in stack' }, 404)
    }

    let composeYAML = ''
    let envContent = ''

    try {
      composeYAML = await readFile(path.join(stackDir, composeFile), 'utf-8')
    } catch {
      composeYAML = ''
    }

    try {
      envContent = await readFile(path.join(stackDir, '.env'), 'utf-8')
    } catch {
      envContent = ''
    }

    const status = await getStackStatus(stackDir)
    const services = await getStackServices(stackDir)

    return c.json({
      name,
      status,
      composeFile,
      composeYAML,
      envContent,
      services,
    })
  })

  stacks.post('/', async (c) => {
    const body = await c.req.json()
    const name = sanitizeStackName(body.name)

    if (!name || name.length < 1) {
      return c.json({ error: 'Stack name is required' }, 400)
    }

    const stackDir = path.join(STACKS_DIR, name)

    try {
      await stat(stackDir)
      return c.json({ error: 'Stack already exists' }, 409)
    } catch {
      // directory doesn't exist, good
    }

    try {
      await mkdir(stackDir, { recursive: true })

      const composeContent = body.composeYAML || 'services:\n  app:\n    image: nginx:alpine\n    ports:\n      - "8080:80"'
      const composeFile = body.composeFile || 'compose.yaml'

      await writeFile(path.join(stackDir, composeFile), composeContent, 'utf-8')

      if (body.envContent) {
        await writeFile(path.join(stackDir, '.env'), body.envContent, 'utf-8')
      }

      return c.json({
        ok: true,
        name,
        composeFile,
        message: `Stack "${name}" created`,
      })
    } catch (err) {
      return c.json({ error: 'Failed to create stack', detail: String(err) }, 500)
    }
  })

  stacks.put('/:name', async (c) => {
    const name = sanitizeStackName(c.req.param('name'))
    const body = await c.req.json()
    const stackDir = path.join(STACKS_DIR, name)

    try {
      await stat(stackDir)
    } catch {
      return c.json({ error: 'Stack not found' }, 404)
    }

    const composeFile = await findComposeFile(stackDir) || body.composeFile || 'compose.yaml'

    try {
      if (body.composeYAML !== undefined) {
        await writeFile(path.join(stackDir, composeFile), body.composeYAML, 'utf-8')
      }

      if (body.envContent !== undefined) {
        await writeFile(path.join(stackDir, '.env'), body.envContent, 'utf-8')
      }

      return c.json({
        ok: true,
        name,
        message: `Stack "${name}" updated`,
      })
    } catch (err) {
      return c.json({ error: 'Failed to update stack', detail: String(err) }, 500)
    }
  })

  stacks.delete('/:name', async (c) => {
    const name = sanitizeStackName(c.req.param('name'))
    const stackDir = path.join(STACKS_DIR, name)

    try {
      await stat(stackDir)
    } catch {
      return c.json({ error: 'Stack not found' }, 404)
    }

    const composeFile = await findComposeFile(stackDir)
    if (composeFile) {
      const downResult = await runCompose(stackDir, ['down', '--remove-orphans'])
      if (downResult.exitCode !== 0 && downResult.stderr) {
        return c.json({
          ok: false,
          exitCode: downResult.exitCode,
          stderr: downResult.stderr,
          message: `Failed to stop stack "${name}" before deletion`,
        })
      }
    }

    try {
      await rm(stackDir, { recursive: true, force: true })
      return c.json({
        ok: true,
        name,
        message: `Stack "${name}" deleted`,
      })
    } catch (err) {
      return c.json({ error: 'Failed to delete stack directory', detail: String(err) }, 500)
    }
  })

  stacks.post('/:name/start', async (c) => {
    const name = sanitizeStackName(c.req.param('name'))
    const stackDir = path.join(STACKS_DIR, name)

    try {
      await stat(stackDir)
    } catch {
      return c.json({ error: 'Stack not found' }, 404)
    }

    const result = await runCompose(stackDir, ['up', '-d', '--remove-orphans'])
    return c.json({
      ok: result.exitCode === 0,
      exitCode: result.exitCode,
      stdout: result.stdout,
      stderr: result.stderr,
      stackName: name,
      operation: 'start',
    })
  })

  stacks.post('/:name/stop', async (c) => {
    const name = sanitizeStackName(c.req.param('name'))
    const stackDir = path.join(STACKS_DIR, name)

    try {
      await stat(stackDir)
    } catch {
      return c.json({ error: 'Stack not found' }, 404)
    }

    const result = await runCompose(stackDir, ['stop'])
    return c.json({
      ok: result.exitCode === 0,
      exitCode: result.exitCode,
      stdout: result.stdout,
      stderr: result.stderr,
      stackName: name,
      operation: 'stop',
    })
  })

  stacks.post('/:name/restart', async (c) => {
    const name = sanitizeStackName(c.req.param('name'))
    const stackDir = path.join(STACKS_DIR, name)

    try {
      await stat(stackDir)
    } catch {
      return c.json({ error: 'Stack not found' }, 404)
    }

    const result = await runCompose(stackDir, ['restart'])
    return c.json({
      ok: result.exitCode === 0,
      exitCode: result.exitCode,
      stdout: result.stdout,
      stderr: result.stderr,
      stackName: name,
      operation: 'restart',
    })
  })

  stacks.post('/:name/down', async (c) => {
    const name = sanitizeStackName(c.req.param('name'))
    const stackDir = path.join(STACKS_DIR, name)

    try {
      await stat(stackDir)
    } catch {
      return c.json({ error: 'Stack not found' }, 404)
    }

    const result = await runCompose(stackDir, ['down', '--remove-orphans'])
    return c.json({
      ok: result.exitCode === 0,
      exitCode: result.exitCode,
      stdout: result.stdout,
      stderr: result.stderr,
      stackName: name,
      operation: 'down',
    })
  })

  stacks.post('/:name/pull', async (c) => {
    const name = sanitizeStackName(c.req.param('name'))
    const stackDir = path.join(STACKS_DIR, name)

    try {
      await stat(stackDir)
    } catch {
      return c.json({ error: 'Stack not found' }, 404)
    }

    const result = await runCompose(stackDir, ['pull'])
    return c.json({
      ok: result.exitCode === 0,
      exitCode: result.exitCode,
      stdout: result.stdout,
      stderr: result.stderr,
      stackName: name,
      operation: 'pull',
    })
  })

  stacks.post('/:name/update', async (c) => {
    const name = sanitizeStackName(c.req.param('name'))
    const stackDir = path.join(STACKS_DIR, name)

    try {
      await stat(stackDir)
    } catch {
      return c.json({ error: 'Stack not found' }, 404)
    }

    const pullResult = await runCompose(stackDir, ['pull'])

    const status = await getStackStatus(stackDir)
    if (status !== 'running') {
      return c.json({
        ok: pullResult.exitCode === 0,
        exitCode: pullResult.exitCode,
        stdout: pullResult.stdout,
        stderr: pullResult.stderr,
        stackName: name,
        operation: 'update',
        note: 'Images pulled but stack was not running, so not restarted',
      })
    }

    const upResult = await runCompose(stackDir, ['up', '-d', '--remove-orphans'])
    return c.json({
      ok: pullResult.exitCode === 0 && upResult.exitCode === 0,
      exitCode: upResult.exitCode,
      stdout: pullResult.stdout + '\n' + upResult.stdout,
      stderr: pullResult.stderr + '\n' + upResult.stderr,
      stackName: name,
      operation: 'update',
    })
  })

  stacks.post('/:name/deploy', async (c) => {
    const name = sanitizeStackName(c.req.param('name'))
    const stackDir = path.join(STACKS_DIR, name)

    try {
      await stat(stackDir)
    } catch {
      return c.json({ error: 'Stack not found' }, 404)
    }

    const result = await runCompose(stackDir, ['up', '-d', '--remove-orphans'])
    return c.json({
      ok: result.exitCode === 0,
      exitCode: result.exitCode,
      stdout: result.stdout,
      stderr: result.stderr,
      stackName: name,
      operation: 'deploy',
    })
  })

  stacks.get('/:name/logs', async (c) => {
    const name = sanitizeStackName(c.req.param('name'))
    const stackDir = path.join(STACKS_DIR, name)
    const lines = c.req.query('lines') || '100'
    const service = c.req.query('service')

    try {
      await stat(stackDir)
    } catch {
      return c.json({ error: 'Stack not found' }, 404)
    }

    const args = ['logs', '--tail', lines, '--no-color']
    if (service) args.push(service)

    const result = await runCompose(stackDir, args, 15_000)
    return c.json({
      logs: result.stdout + result.stderr,
      stackName: name,
    })
  })

  stacks.get('/:name/services', async (c) => {
    const name = sanitizeStackName(c.req.param('name'))
    const stackDir = path.join(STACKS_DIR, name)

    try {
      await stat(stackDir)
    } catch {
      return c.json({ error: 'Stack not found' }, 404)
    }

    const services = await getStackServices(stackDir)
    return c.json({ services, stackName: name })
  })

  stacks.post('/:name/services/:service/start', async (c) => {
    const name = sanitizeStackName(c.req.param('name'))
    const service = c.req.param('service')
    const stackDir = path.join(STACKS_DIR, name)

    try {
      await stat(stackDir)
    } catch {
      return c.json({ error: 'Stack not found' }, 404)
    }

    const result = await runCompose(stackDir, ['up', '-d', service])
    return c.json({
      ok: result.exitCode === 0,
      exitCode: result.exitCode,
      stdout: result.stdout,
      stderr: result.stderr,
      stackName: name,
      service,
      operation: 'start',
    })
  })

  stacks.post('/:name/services/:service/stop', async (c) => {
    const name = sanitizeStackName(c.req.param('name'))
    const service = c.req.param('service')
    const stackDir = path.join(STACKS_DIR, name)

    try {
      await stat(stackDir)
    } catch {
      return c.json({ error: 'Stack not found' }, 404)
    }

    const result = await runCompose(stackDir, ['stop', service])
    return c.json({
      ok: result.exitCode === 0,
      exitCode: result.exitCode,
      stdout: result.stdout,
      stderr: result.stderr,
      stackName: name,
      service,
      operation: 'stop',
    })
  })

  stacks.post('/:name/services/:service/restart', async (c) => {
    const name = sanitizeStackName(c.req.param('name'))
    const service = c.req.param('service')
    const stackDir = path.join(STACKS_DIR, name)

    try {
      await stat(stackDir)
    } catch {
      return c.json({ error: 'Stack not found' }, 404)
    }

    const result = await runCompose(stackDir, ['restart', service])
    return c.json({
      ok: result.exitCode === 0,
      exitCode: result.exitCode,
      stdout: result.stdout,
      stderr: result.stderr,
      stackName: name,
      service,
      operation: 'restart',
    })
  })

  stacks.post('/:name/validate', async (c) => {
    const name = sanitizeStackName(c.req.param('name'))
    const body = await c.req.json()
    const stackDir = path.join(STACKS_DIR, name)

    if (!body.composeYAML) {
      return c.json({ error: 'composeYAML is required' }, 400)
    }

    try {
      await mkdir(stackDir, { recursive: true })
    } catch {
      // directory may already exist
    }

    const tempFile = `compose.validate.${Date.now()}.yaml`
    const tempPath = path.join(stackDir, tempFile)

    try {
      await writeFile(tempPath, body.composeYAML, 'utf-8')

      const result = await runCompose(stackDir, ['-f', tempFile, 'config'], 10_000)

      return c.json({
        valid: result.exitCode === 0,
        parsed: result.stdout,
        error: result.stderr,
      })
    } catch (err) {
      return c.json({ valid: false, error: String(err) }, 500)
    } finally {
      try {
        await rm(tempPath, { force: true })
      } catch {
        // ignore cleanup errors
      }
    }
  })

  return stacks
}
