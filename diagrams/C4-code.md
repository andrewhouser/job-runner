# C4 - Code Diagram

The most detailed level, showing key class structures, interfaces, and data flow.

## Core Data Model

```mermaid
classDiagram
    class JobStatus {
        <<enumeration>>
        PENDING = "pending"
        RUNNING = "running"
        COMPLETED = "completed"
        FAILED = "failed"
        CANCELLED = "cancelled"
    }

    class Job {
        +string id
        +JobStatus status
        +number percentage
        +number duration
        +string createdAt
        +string updatedAt
        +string? error
        +LogEntry[] logs
    }

    class LogEntry {
        +string timestamp
        +string message
    }

    class ProgressEvent {
        +string jobId
        +number percentage
        +string status
        +JobStatus jobStatus
        +LogEntry[] logs
        +string? error
    }

    class ApiSuccessResponse~T~ {
        +true success
        +T data
    }

    class ApiErrorResponse {
        +false success
        +ErrorDetail error
    }

    class ErrorDetail {
        +string code
        +string message
        +Record~string,string~? details
    }

    Job --> JobStatus
    Job --> LogEntry
    ProgressEvent --> JobStatus
    ProgressEvent --> LogEntry
    ApiErrorResponse --> ErrorDetail
```

## Server - Job Manager

```mermaid
classDiagram
    class JobManager {
        -Map~string,Job~ jobs
        -Map~string,boolean~ willFailMap
        -EventEmitter eventEmitter
        +createJob() Job
        +getJob(id: string) Job|undefined
        +getAllJobs(statusFilter?: JobStatus) Job[]
        +cancelJob(id: string) Job
        +updateJob(id: string, updates: Partial~Job~) Job|undefined
        +getWillFail(id: string) boolean
        +onJobUpdate(callback: JobUpdateCallback) unsubscribe
        +emitJobUpdate(job: Job) void
    }

    class JobSimulator {
        -string jobId
        -NodeJS.Timeout|null timeoutHandle
        +start() void
        +cancel() void
        -scheduleTick() void
        -tick() void
        -calculateNextIncrement() number
        -calculateNextInterval() number
        -generateLogMessage(percentage: number) LogEntry
        -generateFailureLog() LogEntry
        -getFailurePoint() number
    }

    class SimulatorQueue {
        <<module>>
        -Map~string,JobSimulator~ activeSimulators
        -string[] pendingQueue
        +startSimulation(jobId: string) void
        +cancelSimulation(jobId: string) void
        -processQueue() void
    }

    class SSEConnectionManager {
        -Map~string,Set~Response~~ connections
        +addConnection(jobId: string, res: Response) boolean
        +removeConnection(jobId: string, res: Response) void
        +getConnectionCount() number
        +getConnectionCountForJob(jobId: string) number
        +isAtLimit() boolean
        +broadcast(jobId: string, event: string, data: unknown) void
        +closeAllForJob(jobId: string) void
    }

    SimulatorQueue --> JobSimulator : creates and manages
    JobSimulator --> JobManager : updates progress
    JobManager --> SSEConnectionManager : triggers broadcast via event
    SimulatorQueue --> JobManager : checks job state
```

## Server - Request Flow (with Concurrency Queue)

```mermaid
sequenceDiagram
    participant Browser
    participant Nginx
    participant Router as Jobs Router
    participant JM as JobManager
    participant Queue as Simulator Queue
    participant Sim as JobSimulator
    participant SSE as SSEConnectionManager

    Note over Browser,SSE: Job Creation Flow (slot available)
    Browser->>Nginx: POST /api/jobs (HTTPS/2)
    Nginx->>Router: POST /api/jobs (HTTP/1.1)
    Router->>JM: createJob()
    JM-->>Router: Job (status: pending)
    Router->>Queue: startSimulation(jobId)
    Queue->>Sim: new JobSimulator(jobId).start()
    Sim->>JM: updateJob(status: running)
    Router-->>Nginx: 201 { success: true, data: Job }
    Nginx-->>Browser: 201 (HTTPS/2)

    Note over Browser,SSE: Job Creation Flow (queue full, >5 running)
    Browser->>Nginx: POST /api/jobs (HTTPS/2)
    Nginx->>Router: POST /api/jobs (HTTP/1.1)
    Router->>JM: createJob()
    JM-->>Router: Job (status: pending)
    Router->>Queue: startSimulation(jobId)
    Queue->>Queue: pendingQueue.push(jobId)
    Router-->>Nginx: 201 { success: true, data: Job }
    Nginx-->>Browser: 201 (HTTPS/2, job stays pending)

    Note over Browser,SSE: Queue Promotion (job completes, slot frees)
    Sim->>JM: updateJob(status: completed)
    JM->>SSE: broadcast("progress", terminal event)
    Queue->>Queue: processQueue()
    Queue->>Sim: next pending job starts
    Sim->>JM: updateJob(status: running)
    JM->>SSE: broadcast("progress", running event)

    Note over Browser,SSE: SSE Stream Flow
    Browser->>Nginx: GET /api/jobs/:id/stream (HTTPS/2)
    Nginx->>Router: GET /api/jobs/:id/stream (HTTP/1.1, unbuffered)
    Router->>JM: getJob(id)
    Router->>SSE: addConnection(id, res)
    Router-->>Nginx: SSE headers + initial progress event
    Nginx-->>Browser: Streamed events (HTTP/2 multiplexed)
```

## Dashboard - Hook & Component Interaction

```mermaid
sequenceDiagram
    participant User
    participant Page as Home Page
    participant Hook as useJobs
    participant Stream as useJobStream
    participant API as API Library
    participant Nginx
    participant Server

    Note over User,Server: Initial Load
    User->>Page: Opens dashboard (https://localhost)
    Page->>Hook: useJobs()
    Hook->>API: getJobs()
    API->>Nginx: GET /api/jobs (HTTPS/2)
    Nginx->>Server: GET /api/jobs (HTTP/1.1)
    Server-->>Nginx: { success: true, data: Job[] }
    Nginx-->>API: Response (HTTPS/2)
    API-->>Hook: ApiResponse<Job[]>
    Hook-->>Page: { jobs, isLoading: false }

    Note over User,Server: Real-time Streaming (per active job, multiplexed)
    Page->>Stream: useJobStream(jobId)
    Stream->>Nginx: EventSource GET /api/jobs/:id/stream (HTTPS/2)
    Nginx->>Server: Proxy (HTTP/1.1, unbuffered)
    Server-->>Nginx: event: progress { percentage, logs, jobStatus }
    Nginx-->>Stream: Streamed via HTTP/2 (no connection limit)
    Stream-->>Page: { progressEvent }

    Note over User,Server: Multiple SSE streams multiplexed
    Page->>Stream: useJobStream(jobId2)
    Page->>Stream: useJobStream(jobId3)
    Note right of Stream: All streams share one HTTP/2 connection

    Note over User,Server: SSE Retry on Error
    Server--xStream: Connection lost
    Stream->>Stream: Wait 1s (exponential backoff, max 3 retries)
    Stream->>Nginx: Reconnect EventSource
    Nginx->>Server: Re-establish proxy
    Server-->>Stream: Resume events
```

## Nginx Configuration

```mermaid
flowchart LR
    subgraph Browser
        B[HTTPS/2 Client]
    end

    subgraph Nginx["Nginx (port 443)"]
        TLS[TLS Termination]
        H2[HTTP/2 Demux]
        LP[Location /]
        LA[Location /api/]
    end

    subgraph Internal["Docker Network"]
        D[Dashboard :3000]
        S[API Server :3001]
    end

    B -->|HTTPS/2| TLS
    TLS --> H2
    H2 --> LP
    H2 --> LA
    LP -->|HTTP/1.1| D
    LA -->|"HTTP/1.1 (unbuffered)"| S

    style Nginx fill:#f9f,stroke:#333
```

## Key Constants

```mermaid
classDiagram
    class SharedConstants {
        <<constants>>
        +JOB_DURATION_MIN_MS = 5000
        +JOB_DURATION_MAX_MS = 60000
        +PROGRESS_INCREMENT_MIN = 1
        +PROGRESS_INCREMENT_MAX = 15
        +PROGRESS_INTERVAL_MIN_MS = 500
        +FAILURE_RATE_MIN = 0.08
        +FAILURE_RATE_MAX = 0.12
        +MAX_CONCURRENT_JOBS = 5
        +MAX_CONCURRENT_SSE_CONNECTIONS = 20
        +HEARTBEAT_INTERVAL_MS = 15000
        +CONNECTION_TIMEOUT_MS = 30000
        +MAX_JOBS_RETURNED = 100
    }
```

## File Structure Map

```
job-runner/
├── nginx/
│   ├── Dockerfile        → Nginx Alpine + OpenSSL cert generation
│   └── nginx.conf        → HTTP/2, TLS, proxy rules, SSE buffering config
├── packages/
│   ├── shared/src/
│   │   ├── types.ts      → Job, JobStatus, ProgressEvent, ApiResponse
│   │   ├── constants.ts  → All numeric configuration values
│   │   └── index.ts      → Re-exports
│   ├── server/src/
│   │   ├── index.ts      → Express app setup, middleware, route mounting
│   │   ├── routes/
│   │   │   ├── jobs.ts   → CRUD endpoints (POST, GET, GET/:id, POST/:id/cancel)
│   │   │   └── stream.ts → SSE endpoint (GET /:id/stream)
│   │   ├── services/
│   │   │   ├── jobManager.ts → JobManager class (state + events)
│   │   │   └── simulator.ts  → JobSimulator class + concurrency queue
│   │   ├── sse/
│   │   │   ├── connectionManager.ts → SSEConnectionManager class
│   │   │   └── heartbeat.ts  → startHeartbeat / stopHeartbeat
│   │   └── middleware/
│   │       ├── errorHandler.ts → Global error middleware
│   │       └── validation.ts   → Query/body validation factories
│   └── dashboard/src/
│       ├── app/
│       │   ├── page.tsx       → Home page (client component)
│       │   ├── layout.tsx     → Root layout
│       │   └── globals.css    → Tailwind imports
│       ├── components/
│       │   ├── CreateJobButton.tsx
│       │   ├── JobList.tsx
│       │   ├── JobCard.tsx
│       │   ├── JobProgress.tsx
│       │   └── ErrorBanner.tsx
│       ├── hooks/
│       │   ├── useJobs.ts     → Polling hook
│       │   └── useJobStream.ts → SSE hook with exponential backoff
│       └── lib/
│           └── api.ts         → Typed fetch wrappers
├── docker-compose.yml         → Production: nginx + server + dashboard
└── docker-compose.dev.yml     → Development: hot-reload without nginx
```
