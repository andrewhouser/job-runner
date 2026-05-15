# C2 - Container Diagram

Shows the high-level technology choices and how the containers communicate.

```mermaid
C4Container
    title Container Diagram - Job Runner

    Person(user, "User", "Creates and monitors jobs")

    Container_Boundary(system, "Job Runner System") {
        Container(nginx, "Nginx Reverse Proxy", "Nginx, OpenSSL", "Terminates TLS, serves HTTP/2 to browsers, proxies requests to internal services")
        Container(dashboard, "Dashboard", "Next.js 14, React 18, Tailwind CSS", "Single-page application that displays job status, progress bars, and logs in real-time")
        Container(server, "API Server", "Express.js, TypeScript, Node.js", "REST API and SSE endpoint for job management, concurrency queue, and real-time progress streaming")
        Container(shared, "Shared Library", "TypeScript", "Shared types, enums, and constants used by both dashboard and server at build time")
    }

    Rel(user, nginx, "Views jobs, creates jobs, cancels jobs", "HTTPS/2 :443")
    Rel(nginx, dashboard, "Proxies page requests", "HTTP/1.1 :3000")
    Rel(nginx, server, "Proxies API and SSE requests", "HTTP/1.1 :3001")
    Rel(dashboard, shared, "Imports types & constants", "pnpm workspace")
    Rel(server, shared, "Imports types & constants", "pnpm workspace")
```

## Container Details

| Container | Technology | Purpose |
|-----------|-----------|---------|
| Nginx Reverse Proxy | Nginx (Alpine), OpenSSL | TLS termination, HTTP/2 multiplexing, reverse proxy to internal services, HTTP→HTTPS redirect |
| Dashboard | Next.js 14 (App Router), React 18, Tailwind CSS | Client-side rendered SPA that polls for job lists and subscribes to SSE streams for active job progress |
| API Server | Express.js 4, TypeScript, Node.js | Handles REST endpoints for CRUD operations, manages job concurrency queue (max 5), and serves SSE streams for real-time progress updates |
| Shared Library | TypeScript | Build-time dependency providing `Job`, `JobStatus`, `ProgressEvent`, `ApiResponse` types and configuration constants |

## Communication Patterns

1. **Browser → Nginx**: All traffic enters via HTTPS on port 443 (HTTP/2). Port 80 redirects to HTTPS.
2. **Nginx → Dashboard**: Proxies `/` to Next.js on port 3000 (HTTP/1.1 internal)
3. **Nginx → API Server**: Proxies `/api/*` and `/health` to Express on port 3001 (HTTP/1.1 internal, buffering disabled for SSE)
4. **REST API**: `POST /api/jobs`, `GET /api/jobs`, `GET /api/jobs/:id`, `POST /api/jobs/:id/cancel`
5. **SSE Stream**: `GET /api/jobs/:id/stream` — pushes `progress` events with percentage, status, and logs
6. **Polling Fallback**: Dashboard polls `GET /api/jobs` every 2 seconds for the full job list

## Why HTTP/2?

Under HTTP/1.1, browsers limit concurrent connections to 6 per origin. Each SSE stream holds an open connection, so monitoring more than 6 jobs simultaneously would cause new streams to queue. HTTP/2 multiplexes all requests over a single TCP connection, removing this limit entirely.

## Deployment

All containers are Dockerized and orchestrated via Docker Compose on a shared bridge network (`job-runner-network`):
- Nginx depends on the server health check and dashboard being started
- Self-signed TLS certificate is generated at Docker build time
- No ports are exposed directly from the server or dashboard containers
