---
name: repo-management
description: List repos available to OpenCode Manager via the internal HTTP API
---

## When to Load

Load this skill when you need to discover repos, look up repo IDs, or need to reference repo information before managing schedules. Load it before the schedule-management skill if you don't know the repo ID.

## Authentication

All API calls require a bearer token. Read the token from `.opencode/internal-token` (relative to the assistant workspace cwd) and pass it as:

```
Authorization: Bearer <token>
```

## Base URL

`http://localhost:5003/api/internal`

## Endpoints

### GET /repos

List all repos available to OpenCode Manager. The repos are returned in the order configured by the user (respecting `repoOrder` preference).

**Example:**
```bash
curl -H "Authorization: Bearer <token>" "http://localhost:5003/api/internal/repos"
```

**Response:**
```ts
{
  repos: Array<{
    id: number          // Use as :repoId in other endpoints
    repoUrl?: string   // Git remote URL if cloned
    localPath: string  // Relative path under repos root
    fullPath: string   // Absolute local path
    sourcePath?: string // Source path for worktrees
    branch?: string    // Current branch (not always available)
    defaultBranch: string
    cloneStatus: 'cloning' | 'ready' | 'error'
    clonedAt: number   // Unix timestamp
    lastPulled?: number
    lastAccessedAt?: number
    openCodeConfigName?: string
    isWorktree?: boolean
    isLocal?: boolean
  }>
}
```

## Notes

- Use `id` as `:repoId` in other API endpoints (e.g., `/repos/:repoId/schedules`)
- `fullPath` is the absolute local path - use it for file operations
- This endpoint is read-only - there are no POST/PUT/DELETE operations for repos
- `currentBranch` is not included in the response - it requires git operations to determine
- Repo order is controlled by the `repoOrder` preference in settings
