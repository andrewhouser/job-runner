import { Router, Request, Response } from 'express';
import {
  Job,
  JobStatus,
  ApiSuccessResponse,
  ApiErrorResponse,
} from '@job-runner/shared';
import { jobManager } from '../services/jobManager.js';
import { startSimulation, cancelSimulation } from '../services/simulator.js';

const router = Router();

// POST /api/jobs - Create a new job
router.post('/', (_req: Request, res: Response) => {
  const job = jobManager.createJob();

  // Start simulation asynchronously
  startSimulation(job.id);

  const response: ApiSuccessResponse<Job> = {
    success: true,
    data: job,
  };

  res.status(201).json(response);
});

// GET /api/jobs - List all jobs with optional status filter
router.get('/', (req: Request, res: Response) => {
  const statusParam = req.query.status as string | undefined;

  if (statusParam) {
    const validStatuses = Object.values(JobStatus) as string[];
    if (!validStatuses.includes(statusParam)) {
      const errorResponse: ApiErrorResponse = {
        success: false,
        error: {
          code: 'INVALID_STATUS_FILTER',
          message: `Invalid status filter '${statusParam}'. Accepted values: ${validStatuses.join(', ')}`,
        },
      };
      res.status(400).json(errorResponse);
      return;
    }
  }

  const statusFilter = statusParam as JobStatus | undefined;
  const jobs = jobManager.getAllJobs(statusFilter);

  const response: ApiSuccessResponse<Job[]> = {
    success: true,
    data: jobs,
  };

  res.status(200).json(response);
});

// GET /api/jobs/:id - Get a single job
router.get('/:id', (req: Request, res: Response) => {
  const { id } = req.params;
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

  const response: ApiSuccessResponse<Job> = {
    success: true,
    data: job,
  };

  res.status(200).json(response);
});

// POST /api/jobs/:id/cancel - Cancel a job
router.post('/:id/cancel', (req: Request, res: Response) => {
  const { id } = req.params;

  try {
    const job = jobManager.cancelJob(id);

    // Stop the simulation
    cancelSimulation(id);

    const response: ApiSuccessResponse<Job> = {
      success: true,
      data: job,
    };

    res.status(200).json(response);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';

    if (message.includes('not found')) {
      const errorResponse: ApiErrorResponse = {
        success: false,
        error: {
          code: 'JOB_NOT_FOUND',
          message,
        },
      };
      res.status(404).json(errorResponse);
      return;
    }

    if (message.includes('cannot be cancelled')) {
      const errorResponse: ApiErrorResponse = {
        success: false,
        error: {
          code: 'JOB_NOT_CANCELLABLE',
          message,
        },
      };
      res.status(409).json(errorResponse);
      return;
    }

    const errorResponse: ApiErrorResponse = {
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message,
      },
    };
    res.status(500).json(errorResponse);
  }
});

export default router;
