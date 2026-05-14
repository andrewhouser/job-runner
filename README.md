# Job Runner

Real-time job progress streaming via Server-Sent Events (SSE). Create background jobs, watch their progress update live, and cancel them on the fly.

![TypeScript](https://img.shields.io/badge/TypeScript-5.4-blue)
![Express](https://img.shields.io/badge/Express-4.18-lightgrey)
![Next.js](https://img.shields.io/badge/Next.js-14-black)

## Overview

Job Runner is a proof-of-concept monorepo demonstrating real-time streaming with SSE. The server simulates background jobs that progress over time (5–60 seconds) with a configurable failure rate, and the dashboard renders live progress bars and logs as events arrive.

**Key features:**
- Real-time progress streaming via SSE with heartbeat keep-alive
- Polling fallback (every 2s) for the full job list
- Exponential backoff reconnection on stream errors
- Job creation, monitoring, and cancellation
- In-memory state — no database required

## Architecture

```
┌─────────────────────────────────────────────────────┐
│                   Job Runner System                  │
│                                                     │
│  ┌─────────────┐   REST / SSE    ┌──────────────┐  │
│  │  Dashboard  │ ◄─────────────► │  API Server  │  │
│  │  (Next.js)  │   :3001         │  (Express)   │  │
│  │  :3000      │                 │              │  │
│  └──────┬──────┘                 └──────┬───────┘  │
│         │                               │          │
│         └───────────┬───────────────────┘          │
│                     │                              │
│              ┌──────┴──────┐                       │
│              │   Shared    │                       │
│              │  (Types &   │                       │
│              │  Constants) │                       │
│              └─────────────┘                       │
└─────────────────────────────────────────────────────┘
```

See the [`diagrams/`](./diagrams) folder for full C4 model diagrams (Context, Container, Component, Code).

## Project Structure

```
job-runner/
├── packages/
│   ├── shared/       # Shared TypeScript types, enums, constants
│   ├── server/       # Express API server with SSE streaming
│   └── dashboard/    # Next.js frontend with real-time UI
├── diagrams/         # C4 architecture diagrams (Mermaid)
├── docker-compose.yml
└── docker-compose.dev.yml
```

## Getting Started

### Prerequisites

- Node.js 18+
- npm 9+ (uses npm workspaces)

### Installation

```bash
# Install all dependencies
npm install

# Build the shared library (required before running)
npm run build:shared
```

### Development

Run the server and dashboard in separate terminals:

```bash
# Terminal 1 — API Server (port 3001)
npm run dev --workspace=packages/server

# Terminal 2 — Dashboard (port 3000)
npm run dev --workspace=packages/dashboard
```

Or use Docker Compose for development with hot-reload:

```bash
docker compose -f docker-compose.yml -f docker-compose.dev.yml up
```

### Production (Docker)

```bash
docker compose up --build
```

The dashboard will be available at `http://localhost:3000` and the API at `http://localhost:3001`.

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/jobs` | Create a new job |
| `GET` | `/api/jobs` | List all jobs (optional `?status=` filter) |
| `GET` | `/api/jobs/:id` | Get a single job |
| `POST` | `/api/jobs/:id/cancel` | Cancel a running/pending job |
| `GET` | `/api/jobs/:id/stream` | SSE stream for real-time progress |
| `GET` | `/health` | Health check |

### SSE Events

The stream endpoint sends `progress` events with this shape:

```json
{
  "jobId": "uuid",
  "percentage": 45,
  "status": "Job in progress",
  "jobStatus": "running",
  "logs": [{ "timestamp": "...", "message": "..." }],
  "error": null
}
```

## Why SSE over WebSockets?

This project uses Server-Sent Events rather than WebSockets because the communication is strictly one-directional: the server pushes progress updates to the client, and the client never needs to send data back over the same channel (job creation and cancellation use regular REST calls).

SSE advantages for this use case:

- **Simpler implementation** — just write to an HTTP response; no upgrade handshake or frame protocol
- **Works over plain HTTP** — passes through proxies, load balancers, and CDNs without special configuration
- **Built-in browser reconnection** — the `EventSource` API handles reconnects natively (though this project manages retries manually for finer control)
- **Lightweight** — no per-frame overhead; just UTF-8 text over a long-lived HTTP connection
- **Easy to debug** — standard HTTP, visible in browser DevTools Network tab as a readable text stream

WebSockets would be the better choice if the client needed to send frequent messages back to the server over the same connection (e.g., multiplayer games, collaborative editing, chat applications).

## Connection Resilience

The dashboard uses two complementary strategies to stay up-to-date:

### SSE Stream (real-time updates per job)

When an active job's SSE connection drops (network loss, server restart, etc.):

1. The `useJobStream` hook closes the dead `EventSource` and begins retrying
2. Retries use exponential backoff: 1s → 2s → 4s (3 attempts max)
3. If the connection recovers within the retry window (~7 seconds total), streaming resumes seamlessly
4. If all retries are exhausted, `connectionState` is set to `'error'` and the stream stops

The hook does **not** rely on the browser's built-in `EventSource` auto-reconnect — it manages reconnection manually for more control over retry limits and state.

### Polling fallback (job list)

The `useJobs` hook polls `GET /api/jobs` every 2 seconds regardless of SSE state. This means:

- Even if the SSE stream dies permanently, the job list still refreshes
- The user loses real-time granularity (progress updates arrive every 2s instead of instantly) but never loses visibility entirely

### Server-side cleanup

When a client disconnects:

- The 15-second heartbeat detects failed writes and removes dead connections from the `SSEConnectionManager`
- The `res.on('close')` handler unsubscribes from job update events and stops the heartbeat interval
- Connection slots are freed immediately, staying within the 20-connection limit

### Known limitation

If the network is down for longer than ~7 seconds, the SSE stream will not automatically recover. The user would need to navigate away and back (re-mounting the component) to establish a fresh stream. Polling continues to work as a fallback in the meantime.

## Environment Variables

### Server (`packages/server/.env`)

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | `3001` | Server listen port |
| `CORS_ORIGIN` | `http://localhost:3000` | Allowed CORS origin |

### Dashboard (`packages/dashboard/.env.local`)

| Variable | Default | Description |
|----------|---------|-------------|
| `NEXT_PUBLIC_API_URL` | `http://localhost:3001` | API server base URL |

## Configuration Constants

Defined in `packages/shared/src/constants.ts`:

| Constant | Value | Description |
|----------|-------|-------------|
| `JOB_DURATION_MIN_MS` | 5000 | Minimum job duration |
| `JOB_DURATION_MAX_MS` | 60000 | Maximum job duration |
| `PROGRESS_INCREMENT_MIN` | 1 | Min progress per tick (%) |
| `PROGRESS_INCREMENT_MAX` | 15 | Max progress per tick (%) |
| `FAILURE_RATE_MIN` | 0.08 | Min probability a job will fail |
| `FAILURE_RATE_MAX` | 0.12 | Max probability a job will fail |
| `MAX_CONCURRENT_SSE_CONNECTIONS` | 20 | SSE connection limit |
| `HEARTBEAT_INTERVAL_MS` | 15000 | SSE heartbeat interval |

## Tech Stack

- **Monorepo**: npm workspaces
- **Server**: Express.js, TypeScript, uuid
- **Dashboard**: Next.js 14 (App Router), React 18, Tailwind CSS
- **Shared**: TypeScript library
- **Containerization**: Docker, Docker Compose
- **Real-time**: Server-Sent Events (native `EventSource` API)

## License

MIT
