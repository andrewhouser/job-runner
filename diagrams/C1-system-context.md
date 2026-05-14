# C1 - System Context Diagram

The highest-level view showing the Job Runner system and its interactions with external actors.

```mermaid
C4Context
    title System Context Diagram - Job Runner

    Person(user, "User", "A developer or operator who creates and monitors background jobs")

    System(jobRunner, "Job Runner System", "Real-time job progress streaming application using Server-Sent Events (SSE). Allows users to create, monitor, and cancel simulated background jobs.")

    Rel(user, jobRunner, "Creates jobs, monitors progress, cancels jobs", "HTTPS / SSE")
```

## Description

The Job Runner is a self-contained proof-of-concept system that demonstrates real-time job progress streaming via Server-Sent Events. It has no external system dependencies — all state is held in-memory.

### Actors

| Actor | Description |
|-------|-------------|
| User  | A developer or operator who interacts with the dashboard to create background jobs, watch their real-time progress, and optionally cancel them |

### External Systems

None. The Job Runner is entirely self-contained with no database, message queue, or third-party service integrations.
