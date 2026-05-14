# C3 - Component Diagram

Zooms into each container to show internal components and their responsibilities.

## API Server Components

```mermaid
C4Component
    title Component Diagram - API Server

    Container_Boundary(server, "API Server") {
        Component(jobsRouter, "Jobs Router", "Express Router", "Handles POST /api/jobs, GET /api/jobs, GET /api/jobs/:id, POST /api/jobs/:id/cancel")
        Component(streamRouter, "Stream Router", "Express Router", "Handles GET /api/jobs/:id/stream — sets up SSE connections")
        Component(jobManager, "Job Manager", "TypeScript Class", "In-memory job store (Map), CRUD operations, EventEmitter for pub/sub job updates")
        Component(simulator, "Job Simulator", "TypeScript Class", "Simulates job progress with randomized increments and configurable failure rate (8-12%)")
        Component(sseManager, "SSE Connection Manager", "TypeScript Class", "Tracks active SSE connections per job, enforces max 20 limit, broadcasts events, detects dead connections")
        Component(heartbeat, "Heartbeat", "TypeScript Module", "Sends SSE comments every 15s to keep connections alive, triggers cleanup on write failure")
        Component(errorHandler, "Error Handler", "Express Middleware", "Global error handler returning ApiErrorResponse format")
        Component(validation, "Validation Middleware", "Express Middleware", "Validates query params and request bodies")
    }

    Rel(jobsRouter, jobManager, "Creates, reads, cancels jobs")
    Rel(jobsRouter, simulator, "Starts/stops simulations")
    Rel(streamRouter, jobManager, "Reads job state, subscribes to updates")
    Rel(streamRouter, sseManager, "Registers connections, triggers broadcasts")
    Rel(streamRouter, heartbeat, "Starts/stops heartbeat intervals")
    Rel(simulator, jobManager, "Updates job progress, emits events")
    Rel(jobManager, sseManager, "Job update events trigger broadcasts")
    Rel(heartbeat, sseManager, "Removes dead connections on write failure")
```

## Dashboard Components

```mermaid
C4Component
    title Component Diagram - Dashboard

    Container_Boundary(dashboard, "Dashboard") {
        Component(homePage, "Home Page", "Next.js Page (Client)", "Main page orchestrating job list display, creation, and error handling")
        Component(jobList, "JobList", "React Component", "Groups and renders jobs by status: Running → Pending → Completed → Failed → Cancelled")
        Component(jobCard, "JobCard", "React Component", "Displays individual job with status badge, progress bar, cancel button, and error display")
        Component(jobProgress, "JobProgress", "React Component", "Animated progress bar with log viewer showing last 10 entries")
        Component(createBtn, "CreateJobButton", "React Component", "Button that triggers POST /api/jobs and refreshes the list")
        Component(errorBanner, "ErrorBanner", "React Component", "Dismissible error banner with retry action")
        Component(useJobs, "useJobs Hook", "React Hook", "Polls GET /api/jobs every 2s, manages loading/error state")
        Component(useJobStream, "useJobStream Hook", "React Hook", "EventSource connection to SSE stream with exponential backoff retry (max 3)")
        Component(apiLib, "API Library", "TypeScript Module", "Typed fetch wrappers for all REST endpoints, network error handling")
    }

    Rel(homePage, jobList, "Renders job list")
    Rel(homePage, createBtn, "Renders create button")
    Rel(homePage, errorBanner, "Shows errors")
    Rel(homePage, useJobs, "Fetches job data")
    Rel(jobList, jobCard, "Renders each job")
    Rel(jobCard, jobProgress, "Shows progress")
    Rel(jobCard, useJobStream, "Subscribes to SSE for active jobs")
    Rel(useJobs, apiLib, "Calls getJobs()")
    Rel(useJobStream, apiLib, "Gets stream URL")
    Rel(createBtn, apiLib, "Calls createJob()")
    Rel(jobCard, apiLib, "Calls cancelJob()")
```

## Component Responsibilities

### Server Components

| Component | Responsibility |
|-----------|---------------|
| Jobs Router | REST CRUD endpoints for job lifecycle management |
| Stream Router | SSE endpoint setup, initial event dispatch, connection lifecycle |
| Job Manager | Central state store, event bus for job updates, UUID generation |
| Job Simulator | Async progress simulation with setTimeout chains, random failure injection |
| SSE Connection Manager | Connection pooling, limit enforcement (max 20), fan-out broadcasting |
| Heartbeat | Keep-alive mechanism, dead client detection |
| Error Handler | Consistent error response formatting |
| Validation Middleware | Input sanitization for query params and request bodies |

### Dashboard Components

| Component | Responsibility |
|-----------|---------------|
| Home Page | Top-level orchestration, state management |
| JobList | Status-based grouping and ordering |
| JobCard | Individual job UI with real-time updates |
| JobProgress | Visual progress indicator and log display |
| CreateJobButton | Job creation trigger |
| ErrorBanner | User-facing error communication |
| useJobs | Polling-based data fetching |
| useJobStream | SSE connection management with retry logic |
| API Library | HTTP abstraction layer with typed responses |
