---
name: notifications
description: Send push notifications to the user's registered devices via the internal HTTP API
---

## When to Load

Load this skill when you need to notify the user about important events, completed tasks, or questions that require their attention.

## Authentication

All API calls require a bearer token. Read the token from `.opencode/internal-token` (relative to the assistant workspace cwd) and pass it as:

```
Authorization: Bearer <token>
```

## Base URL

`http://localhost:5003/api/internal`

## Endpoint

### POST /notifications/send

Send a push notification to all of the user's registered devices.

**Query Parameters:**
- `userId` (optional): User ID. Defaults to `"default"`.

**Request Body:**
```ts
{
  title: string       // 1-120 characters
  body: string        // 1-500 characters
  url?: string        // Optional: deep link to navigate to (1-500 chars)
  tag?: string        // Optional: notification tag for deduplication (max 80 chars)
  priority?: 'normal' | 'high'  // Defaults to 'normal'
}
```

**Example:**
```bash
curl -X POST -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"title":"Task Complete","body":"The build has finished successfully","url":"/repos/my-repo","priority":"high"}' \
  "http://localhost:5003/api/internal/notifications/send?userId=default"
```

**Response:**
```ts
{
  delivered: number       // Number of successfully delivered notifications
  expired: number         // Number of expired subscriptions removed
  failed: number          // Number of failed deliveries
  noSubscriptions: boolean // True if user has no registered devices
}
```

## Rate Limiting

The endpoint enforces a rate limit of **10 requests per minute per token**. If exceeded, you'll receive a `429 Too Many Requests` response with a `Retry-After` header.

## Notes

- Notifications are only sent if the user has registered devices (browser push subscriptions)
- If VAPID is not configured on the server, the endpoint returns `503 Service Unavailable`
- Use `priority: 'high'` for urgent notifications that should interrupt the user
