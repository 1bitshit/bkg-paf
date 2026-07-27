import { describe, expect, it } from 'vitest'
import {
  createPendingStackFromFile,
  isStackSourceFile,
  pendingStackStorageKey,
  readPendingStack,
  writePendingStack,
} from './pending-stack'

describe('pending stack helpers', () => {
  it('recognizes Dockerfile and compose files', () => {
    expect(isStackSourceFile({ name: 'Dockerfile', isDirectory: false })).toBe(true)
    expect(isStackSourceFile({ name: 'docker-compose.yml', isDirectory: false })).toBe(true)
    expect(isStackSourceFile({ name: 'compose.yaml', isDirectory: false })).toBe(true)
    expect(isStackSourceFile({ name: 'README.md', isDirectory: false })).toBe(false)
    expect(isStackSourceFile({ name: 'docker-compose.yml', isDirectory: true })).toBe(false)
  })

  it('wraps Dockerfile content in a compose stack payload', () => {
    const pendingStack = createPendingStackFromFile({
      name: 'Dockerfile',
      path: 'apps/api/Dockerfile',
      content: 'FROM node:22-alpine',
    })

    expect(pendingStack).toEqual({
      name: 'api',
      composeYAML: 'services:\n  app:\n    build:\n      context: ./apps/api\n      dockerfile: Dockerfile',
    })
  })

  it('uses compose file content directly', () => {
    const pendingStack = createPendingStackFromFile({
      name: 'docker-compose.yml',
      path: 'apps/api/docker-compose.yml',
      content: 'services:\n  api:\n    image: node',
    })

    expect(pendingStack).toEqual({
      name: 'api',
      composeYAML: 'services:\n  api:\n    image: node',
    })
  })

  it('round trips pending stack data through session storage', () => {
    sessionStorage.removeItem(pendingStackStorageKey)

    writePendingStack({ name: 'api', composeYAML: 'services: {}' })

    expect(readPendingStack()).toEqual({ name: 'api', composeYAML: 'services: {}' })
    expect(sessionStorage.getItem(pendingStackStorageKey)).toBeNull()
  })
})
