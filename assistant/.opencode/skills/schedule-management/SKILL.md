---
name: schedule-management
description: Manage schedule jobs and runs across any repo via the internal HTTP API
---

## When to Load

Load this skill when the user asks about managing schedules, schedule jobs, schedule runs, or anything related to automated task execution across repos.

## Authentication

All API calls require a bearer token. Read the token from `.opencode/internal-token` (relative to the assistant workspace cwd) and pass it as:

```
Authorization: Bearer <token>
```

## Base URL

`http://localhost:5003/api/internal`

## Assistant Schedules

Use repo ID `0` for the built-in Assistant. For example, use `/repos/0/schedules` to list or create schedule jobs that run in the Assistant workspace.

## Endpoints

### GET /schedules/all
List all schedule jobs across all repos.

```bash
curl -H "Authorization: Bearer <token>" http://localhost:5003/api/internal/schedules/all
```

### GET /schedules/all/runs
List all schedule runs across all repos with optional filtering.

Query params: `limit`, `offset`, `status`, `repoId`, `jobId`, `triggerSource`

```bash
curl -H "Authorization: Bearer <token>" "http://localhost:5003/api/internal/schedules/all/runs?limit=20"
```

### GET /repos/:repoId/schedules
List all schedule jobs for a specific repo.

```bash
curl -H "Authorization: Bearer <token>" http://localhost:5003/api/internal/repos/:repoId/schedules
```

### POST /repos/:repoId/schedules
Create a new schedule job.

Body matches `CreateScheduleJobRequest` schema (discriminated union with `scheduleMode: 'interval' | 'cron'`).

```bash
curl -X POST -H "Authorization: Bearer <token>" -H "Content-Type: application/json" \
  -d '{"name":"my-job","prompt":"do something","scheduleMode":"interval","intervalMinutes":60}' \
  http://localhost:5003/api/internal/repos/:repoId/schedules
```

### GET /repos/:repoId/schedules/:jobId
Get a specific schedule job.

```bash
curl -H "Authorization: Bearer <token>" http://localhost:5003/api/internal/repos/:repoId/schedules/:jobId
```

### PATCH /repos/:repoId/schedules/:jobId
Update an existing schedule job.

Body matches `UpdateScheduleJobRequest` schema.

```bash
curl -X PATCH -H "Authorization: Bearer <token>" -H "Content-Type: application/json" \
  -d '{"enabled":false}' \
  http://localhost:5003/api/internal/repos/:repoId/schedules/:jobId
```

### DELETE /repos/:repoId/schedules/:jobId
Delete a schedule job.

```bash
curl -X DELETE -H "Authorization: Bearer <token>" http://localhost:5003/api/internal/repos/:repoId/schedules/:jobId
```

### POST /repos/:repoId/schedules/:jobId/run
Manually trigger a schedule job.

```bash
curl -X POST -H "Authorization: Bearer <token>" http://localhost:5003/api/internal/repos/:repoId/schedules/:jobId/run
```

### GET /repos/:repoId/schedules/:jobId/runs
List runs for a specific job.

Query params: `limit`

```bash
curl -H "Authorization: Bearer <token>" http://localhost:5003/api/internal/repos/:repoId/schedules/:jobId/runs?limit=20
```

### GET /repos/:repoId/schedules/:jobId/runs/:runId
Get a specific schedule run.

```bash
curl -H "Authorization: Bearer <token>" http://localhost:5003/api/internal/repos/:repoId/schedules/:jobId/runs/:runId
```

### POST /repos/:repoId/schedules/:jobId/runs/:runId/cancel
Cancel a running schedule run.

```bash
curl -X POST -H "Authorization: Bearer <token>" http://localhost:5003/api/internal/repos/:repoId/schedules/:jobId/runs/:runId/cancel
```

## Safety

Always confirm destructive operations (`DELETE` jobs, `cancel` runs) with the user before executing.
