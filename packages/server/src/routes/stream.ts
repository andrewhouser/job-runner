import { Router, Request, Response } from 'express';
import {
  JobStatus,
  ProgressEvent,
  ApiErrorResponse,
  Job,
} from '@job-runner/shared';
import { jobManager } from '../services/jobManager.js';
import { sseConnectionManager } from '../sse/connectionManager.js';
import { startHeartbeat, stopHeartbeat } from '../sse/heartbeat.js';

const router = Router();

const TERMINAL_STATUSES: JobStatus[] = [
  JobStatus.COMPLETED,
  JobStatus.FAILED,
  JobStatus.CANCELLED,
];

function buildProgressEvent(job: Job): ProgressEvent {
  const event: ProgressEvent = {
    jobId: job.id,
    percentage: job.percentage,
    status: job.error
      ? `Job failed: ${job.error}`
      : job.status === JobStatus.COMPLETED
        ? 'Job completed successfully'
        : job.status === JobStatus.CANCELLED
          ? 'Job cancelled'
          : job.status === JobStatus.RUNNING
            ? 'Job in progress'
            : 'Job pending',
    jobStatus: job.status,
    logs: job.logs,
  };

  if (job.error) {
    event.error = job.error;
  }

  return event;
}

function sendSSEEvent(res: Response, event: string, data: unknown): void {
  res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
}

// GET /api/jobs/:id/stream
router.get('/:id/stream', (req: Request, res: Response) => {
  const { id } = req.params;

  // 1. Validate job exists
  const job = jobManager.getJob(id);
  if (!job) {
    const errorResponse: ApiErrorResponse = {
      success: false,
      error: {
        code: 'JOB_NOT_FOUND',
        message: `Job with id '${id}' not found`,
      },
    };
    res.status(404).json(errorResponse);
    return;
  }

  // 2. Check connection limit
  if (sseConnectionManager.isAtLimit()) {
    const errorResponse: ApiErrorResponse = {
      success: false,
      error: {
        code: 'CONNECTION_LIMIT_REACHED',
        message: 'Maximum number of SSE connections reached. Please try again later.',
      },
    };
    res.status(503).json(errorResponse);
    return;
  }

  // 3. Set SSE headers
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no');

  // 4. Flush headers
  res.flushHeaders();

  // 5. Build initial progress event
  const progressEvent = buildProgressEvent(job);

  // 6. Handle terminal jobs
  if (TERMINAL_STATUSES.includes(job.status)) {
    sendSSEEvent(res, 'progress', progressEvent);
    res.end();
    return;
  }

  // 7. Handle active jobs (PENDING or RUNNING)
  // Send initial progress event
  sendSSEEvent(res, 'progress', progressEvent);

  // Register connection
  sseConnectionManager.addConnection(id, res);

  // Start heartbeat
  const heartbeatHandle = startHeartbeat(id, res);

  // Subscribe to job updates
  const unsubscribe = jobManager.onJobUpdate((updatedJob: Job) => {
    if (updatedJob.id !== id) {
      return;
    }

    const event = buildProgressEvent(updatedJob);
    sseConnectionManager.broadcast(id, 'progress', event);

    // If job reaches terminal state, close all connections for this job
    if (TERMINAL_STATUSES.includes(updatedJob.status)) {
      sseConnectionManager.closeAllForJob(id);
    }
  });

  // Handle client disconnect
  res.on('close', () => {
    stopHeartbeat(heartbeatHandle);
    sseConnectionManager.removeConnection(id, res);
    unsubscribe();
  });
});

export default router;
