import {
  JobStatus,
  LogEntry,
  PROGRESS_INCREMENT_MIN,
  PROGRESS_INCREMENT_MAX,
  PROGRESS_INTERVAL_MIN_MS,
} from '@job-runner/shared';
import { jobManager } from './jobManager.js';

const LOG_MESSAGES: string[] = [
  'Initializing resources',
  'Loading configuration',
  'Connecting to data source',
  'Validating input parameters',
  'Processing batch records',
  'Transforming data',
  'Running computation pipeline',
  'Aggregating results',
  'Writing output to buffer',
  'Compressing artifacts',
  'Verifying checksums',
  'Syncing state',
  'Optimizing indexes',
  'Flushing cache',
  'Finalizing output',
  'Cleaning up temporary files',
  'Generating report',
  'Uploading results',
  'Notifying downstream services',
  'Completing job',
];

const FAILURE_REASONS: string[] = [
  'Connection timeout during batch processing',
  'Out of memory while transforming data',
  'Upstream service returned unexpected error',
  'Data validation failed: corrupt input detected',
  'Disk write failure during artifact compression',
  'Network partition detected',
  'Rate limit exceeded on external API',
  'Authentication token expired mid-operation',
];

export class JobSimulator {
  private jobId: string;
  private timeoutHandle: NodeJS.Timeout | null = null;

  constructor(jobId: string) {
    this.jobId = jobId;
  }

  start(): void {
    const job = jobManager.getJob(this.jobId);
    if (!job) {
      return;
    }

    jobManager.updateJob(this.jobId, { status: JobStatus.RUNNING });
    const updatedJob = jobManager.getJob(this.jobId)!;
    jobManager.emitJobUpdate(updatedJob);

    this.scheduleTick();
  }

  cancel(): void {
    if (this.timeoutHandle) {
      clearTimeout(this.timeoutHandle);
      this.timeoutHandle = null;
    }
  }

  private scheduleTick(): void {
    const interval = this.calculateNextInterval();
    this.timeoutHandle = setTimeout(() => this.tick(), interval);
  }

  private tick(): void {
    const job = jobManager.getJob(this.jobId);
    if (!job || job.status !== JobStatus.RUNNING) {
      this.cancel();
      return;
    }

    const willFail = jobManager.getWillFail(this.jobId);
    const failurePoint = willFail ? this.getFailurePoint() : 101;

    let increment = this.calculateNextIncrement();
    let newPercentage = job.percentage + increment;

    // Check failure condition
    if (willFail && newPercentage >= failurePoint) {
      newPercentage = Math.min(newPercentage, failurePoint);
      const failureLog = this.generateFailureLog();
      const logs = [...job.logs, failureLog];

      jobManager.updateJob(this.jobId, {
        status: JobStatus.FAILED,
        percentage: newPercentage,
        error: failureLog.message,
        logs,
      });

      const updatedJob = jobManager.getJob(this.jobId)!;
      jobManager.emitJobUpdate(updatedJob);
      this.timeoutHandle = null;
      activeSimulators.delete(this.jobId);
      return;
    }

    // Check completion
    if (newPercentage >= 100) {
      newPercentage = 100;
      const logEntry = this.generateLogMessage(newPercentage);
      const logs = [...job.logs, logEntry];

      jobManager.updateJob(this.jobId, {
        status: JobStatus.COMPLETED,
        percentage: 100,
        logs,
      });

      const updatedJob = jobManager.getJob(this.jobId)!;
      jobManager.emitJobUpdate(updatedJob);
      this.timeoutHandle = null;
      activeSimulators.delete(this.jobId);
      return;
    }

    // Normal progress tick
    const logEntry = this.generateLogMessage(newPercentage);
    const logs = [...job.logs, logEntry];

    jobManager.updateJob(this.jobId, {
      percentage: newPercentage,
      logs,
    });

    const updatedJob = jobManager.getJob(this.jobId)!;
    jobManager.emitJobUpdate(updatedJob);

    this.scheduleTick();
  }

  private calculateNextIncrement(): number {
    return (
      Math.floor(Math.random() * (PROGRESS_INCREMENT_MAX - PROGRESS_INCREMENT_MIN + 1)) +
      PROGRESS_INCREMENT_MIN
    );
  }

  private calculateNextInterval(): number {
    const job = jobManager.getJob(this.jobId);
    if (!job) {
      return PROGRESS_INTERVAL_MIN_MS;
    }

    const remainingPercentage = 100 - job.percentage;
    if (remainingPercentage <= 0) {
      return PROGRESS_INTERVAL_MIN_MS;
    }

    // Estimate how many ticks remain based on average increment
    const avgIncrement = (PROGRESS_INCREMENT_MIN + PROGRESS_INCREMENT_MAX) / 2;
    const estimatedTicksRemaining = Math.max(1, Math.ceil(remainingPercentage / avgIncrement));

    // Distribute remaining duration across estimated ticks with some randomness
    const elapsed = Date.now() - new Date(job.createdAt).getTime();
    const remainingDuration = Math.max(0, job.duration - elapsed);
    const baseInterval = remainingDuration / estimatedTicksRemaining;

    // Add randomness: vary between 0.5x and 1.5x the base interval
    const randomFactor = 0.5 + Math.random();
    const interval = baseInterval * randomFactor;

    // Enforce minimum interval
    return Math.max(PROGRESS_INTERVAL_MIN_MS, Math.round(interval));
  }

  private generateLogMessage(percentage: number): LogEntry {
    // Pick a message based on progress stage
    const index = Math.min(
      Math.floor((percentage / 100) * LOG_MESSAGES.length),
      LOG_MESSAGES.length - 1
    );
    const message = `${LOG_MESSAGES[index]} (${percentage}% complete)`;

    return {
      timestamp: new Date().toISOString(),
      message,
    };
  }

  private generateFailureLog(): LogEntry {
    const reason = FAILURE_REASONS[Math.floor(Math.random() * FAILURE_REASONS.length)];
    return {
      timestamp: new Date().toISOString(),
      message: reason,
    };
  }

  private getFailurePoint(): number {
    // Deterministic failure point per job - use jobId hash for consistency
    // Failure between 40-80% as suggested in the task description
    let hash = 0;
    for (let i = 0; i < this.jobId.length; i++) {
      hash = (hash * 31 + this.jobId.charCodeAt(i)) | 0;
    }
    return 40 + Math.abs(hash % 41); // 40 to 80
  }
}

// Track active simulators
const activeSimulators: Map<string, JobSimulator> = new Map();

export function startSimulation(jobId: string): void {
  const simulator = new JobSimulator(jobId);
  activeSimulators.set(jobId, simulator);
  simulator.start();
}

export function cancelSimulation(jobId: string): void {
  const simulator = activeSimulators.get(jobId);
  if (simulator) {
    simulator.cancel();
    activeSimulators.delete(jobId);
  }
}
