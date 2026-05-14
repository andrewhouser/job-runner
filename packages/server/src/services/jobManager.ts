import { EventEmitter } from 'events';
import { v4 as uuidv4 } from 'uuid';
import {
  Job,
  JobStatus,
  JOB_DURATION_MIN_MS,
  JOB_DURATION_MAX_MS,
  FAILURE_RATE_MIN,
  FAILURE_RATE_MAX,
} from '@job-runner/shared';

export type JobUpdateCallback = (job: Job) => void;

export class JobManager {
  private jobs: Map<string, Job> = new Map();
  private willFailMap: Map<string, boolean> = new Map();
  private eventEmitter: EventEmitter = new EventEmitter();

  createJob(): Job {
    const id = uuidv4();
    const now = new Date().toISOString();
    const duration =
      Math.floor(Math.random() * (JOB_DURATION_MAX_MS - JOB_DURATION_MIN_MS + 1)) +
      JOB_DURATION_MIN_MS;

    // Randomly designate ~8-12% of jobs as will-fail
    const failureRate =
      Math.random() * (FAILURE_RATE_MAX - FAILURE_RATE_MIN) + FAILURE_RATE_MIN;
    const willFail = Math.random() < failureRate;

    const job: Job = {
      id,
      status: JobStatus.PENDING,
      percentage: 0,
      duration,
      createdAt: now,
      updatedAt: now,
      logs: [],
    };

    this.jobs.set(id, job);
    this.willFailMap.set(id, willFail);

    return job;
  }

  getJob(id: string): Job | undefined {
    return this.jobs.get(id);
  }

  getAllJobs(statusFilter?: JobStatus): Job[] {
    let jobs = Array.from(this.jobs.values());

    if (statusFilter) {
      jobs = jobs.filter((job) => job.status === statusFilter);
    }

    // Sort by createdAt descending (newest first)
    jobs.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    return jobs;
  }

  cancelJob(id: string): Job {
    const job = this.jobs.get(id);

    if (!job) {
      throw new Error(`Job with id '${id}' not found`);
    }

    if (
      job.status === JobStatus.COMPLETED ||
      job.status === JobStatus.FAILED ||
      job.status === JobStatus.CANCELLED
    ) {
      throw new Error(
        `Job cannot be cancelled: current status is '${job.status}'`
      );
    }

    job.status = JobStatus.CANCELLED;
    job.updatedAt = new Date().toISOString();
    this.jobs.set(id, job);
    this.emitJobUpdate(job);

    return job;
  }

  updateJob(id: string, updates: Partial<Omit<Job, 'id' | 'createdAt'>>): Job | undefined {
    const job = this.jobs.get(id);

    if (!job) {
      return undefined;
    }

    Object.assign(job, updates, { updatedAt: new Date().toISOString() });
    this.jobs.set(id, job);

    return job;
  }

  getWillFail(id: string): boolean {
    return this.willFailMap.get(id) ?? false;
  }

  onJobUpdate(callback: JobUpdateCallback): () => void {
    this.eventEmitter.on('jobUpdate', callback);
    return () => {
      this.eventEmitter.off('jobUpdate', callback);
    };
  }

  emitJobUpdate(job: Job): void {
    this.eventEmitter.emit('jobUpdate', job);
  }
}

export const jobManager = new JobManager();
