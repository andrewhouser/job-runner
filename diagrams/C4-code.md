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

    JobSimulator --> JobManager : updates progress
    JobManager --> SSEConnectionManager : triggers broadcast via event
```

## Server - Request Flow

```mermaid
sequenceDiagram
    participant Client
    participant Router as Jobs Router
    participant JM as JobManager
    participant Sim as JobSimulator
    participant SSE as SSEConnectionManager

    Note over Client,SSE: Job Creation Flow
    Client->>Router: POST /api/jobs
    Router->>JM: createJob()
    JM-->>Router: Job (status: pending)
    Router->>Sim: startSimulation(jobId)
    Router-->>Client: 201 { success: true, data: Job }

    Note over Client,SSE: SSE Stream Flow
    Client->>Router: GET /api/jobs/:id/stream
    Router->>JM: getJob(id)
    Router->>SSE: addConnection(id, res)
    Router-->>Client: SSE headers + initial progress event

    Note over Client,SSE: Progress Update Flow
    Sim->>JM: updateJob(id, { percentage, logs })
    JM->>JM: emitJobUpdate(job)
    JM->>SSE: broadcast(id, "progress", event)
    SSE-->>Client: event: progress\ndata: {...}

    Note over Client,SSE: Job Cancellation Flow
    Client->>Router: POST /api/jobs/:id/cancel
    Router->>JM: cancelJob(id)
    Router->>Sim: cancelSimulation(id)
    JM->>JM: emitJobUpdate(job)
    JM->>SSE: broadcast + closeAllForJob(id)
    Router-->>Client: 200 { success: true, data: Job }
```

## Dashboard - Hook & Component Interaction

```mermaid
sequenceDiagram
    participant User
    participant Page as Home Page
    participant Hook as useJobs
    participant Stream as useJobStream
    participant API as API Library
    participant Server

    Note over User,Server: Initial Load
    User->>Page: Opens dashboard
    Page->>Hook: useJobs()
    Hook->>API: getJobs()
    API->>Server: GET /api/jobs
    Server-->>API: { success: true, data: Job[] }
    API-->>Hook: ApiResponse<Job[]>
    Hook-->>Page: { jobs, isLoading: false }

    Note over User,Server: Real-time Streaming (per active job)
    Page->>Stream: useJobStream(jobId)
    Stream->>Server: EventSource GET /api/jobs/:id/stream
    Server-->>Stream: event: progress { percentage, logs, jobStatus }
    Stream-->>Page: { progressEvent }

    Note over User,Server: Polling (every 2s)
    Hook->>API: getJobs()
    API->>Server: GET /api/jobs
    Server-->>API: Updated job list
    API-->>Hook: ApiResponse<Job[]>

    Note over User,Server: SSE Retry on Error
    Server--xStream: Connection lost
    Stream->>Stream: Wait 1s (exponential backoff)
    Stream->>Server: Reconnect EventSource
    Server-->>Stream: Resume events
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
        +MAX_CONCURRENT_SSE_CONNECTIONS = 20
        +HEARTBEAT_INTERVAL_MS = 15000
        +CONNECTION_TIMEOUT_MS = 30000
        +MAX_JOBS_RETURNED = 100
    }
```

## File Structure Map

```
packages/
├── shared/src/
│   ├── types.ts          → Job, JobStatus, ProgressEvent, ApiResponse
│   ├── constants.ts      → All numeric configuration values
│   └── index.ts          → Re-exports
├── server/src/
│   ├── index.ts          → Express app setup, middleware, route mounting
│   ├── routes/
│   │   ├── jobs.ts       → CRUD endpoints (POST, GET, GET/:id, POST/:id/cancel)
│   │   └── stream.ts     → SSE endpoint (GET /:id/stream)
│   ├── services/
│   │   ├── jobManager.ts → JobManager class (state + events)
│   │   └── simulator.ts  → JobSimulator class (progress engine)
│   ├── sse/
│   │   ├── connectionManager.ts → SSEConnectionManager class
│   │   └── heartbeat.ts  → startHeartbeat / stopHeartbeat
│   └── middleware/
│       ├── errorHandler.ts → Global error middleware
│       └── validation.ts   → Query/body validation factories
└── dashboard/src/
    ├── app/
    │   ├── page.tsx       → Home page (client component)
    │   ├── layout.tsx     → Root layout
    │   └── globals.css    → Tailwind imports
    ├── components/
    │   ├── CreateJobButton.tsx
    │   ├── JobList.tsx
    │   ├── JobCard.tsx
    │   ├── JobProgress.tsx
    │   └── ErrorBanner.tsx
    ├── hooks/
    │   ├── useJobs.ts     → Polling hook
    │   └── useJobStream.ts → SSE hook
    └── lib/
        └── api.ts         → Typed fetch wrappers
```
