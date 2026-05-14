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
