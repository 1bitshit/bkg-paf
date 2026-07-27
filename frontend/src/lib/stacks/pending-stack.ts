export const pendingStackStorageKey = 'pendingStackFromFile'

export interface StackSourceFile {
  name: string
  path: string
  isDirectory?: boolean
  content?: string
}

export interface PendingStack {
  name: string
  composeYAML: string
}

const composeFileNames = new Set([
  'compose.yml',
  'compose.yaml',
  'docker-compose.yml',
  'docker-compose.yaml',
])

export function isStackSourceFile(file: Pick<StackSourceFile, 'name' | 'isDirectory'>): boolean {
  if (file.isDirectory) return false
  const fileName = file.name.toLowerCase()
  return fileName === 'dockerfile' || composeFileNames.has(fileName)
}

export function createPendingStackFromFile(file: StackSourceFile): PendingStack {
  const directory = getDirectory(file.path)
  const name = sanitizeStackName(getStackNameSource(file, directory))

  if (file.name.toLowerCase() === 'dockerfile') {
    return {
      name,
      composeYAML: [
        'services:',
        '  app:',
        '    build:',
        `      context: ${directory ? `./${directory}` : '.'}`,
        `      dockerfile: ${file.name}`,
      ].join('\n'),
    }
  }

  return {
    name,
    composeYAML: file.content ?? '',
  }
}

export function writePendingStack(pendingStack: PendingStack): void {
  sessionStorage.setItem(pendingStackStorageKey, JSON.stringify(pendingStack))
}

export function readPendingStack(): PendingStack | null {
  const rawValue = sessionStorage.getItem(pendingStackStorageKey)
  sessionStorage.removeItem(pendingStackStorageKey)
  if (!rawValue) return null

  try {
    const parsedValue: unknown = JSON.parse(rawValue)
    if (!isPendingStack(parsedValue)) return null
    return parsedValue
  } catch {
    return null
  }
}

function getDirectory(path: string): string {
  return path.replace(/\\/g, '/').replace(/\/[^/]*$/, '')
}

function getStackNameSource(file: StackSourceFile, directory: string): string {
  if (directory) {
    return directory.split('/').filter(Boolean).at(-1) ?? file.name
  }

  return file.name.replace(/\.[^.]+$/, '')
}

function sanitizeStackName(value: string): string {
  const sanitized = value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_-]+/g, '-')
    .replace(/^-+|-+$/g, '')

  return sanitized || 'stack'
}

function isPendingStack(value: unknown): value is PendingStack {
  if (!value || typeof value !== 'object') return false
  const candidate = value as Partial<PendingStack>
  return typeof candidate.name === 'string' && typeof candidate.composeYAML === 'string'
}
