'use client';

import { useState } from 'react';
import { JobStatus } from '@job-runner/shared';
import type { Job } from '@job-runner/shared';
import { cancelJob } from '@/lib/api';
import { useJobStream } from '@/hooks/useJobStream';
import { JobProgress } from './JobProgress';

interface JobCardProps {
  job: Job;
  onCancelled: () => void;
}

const STATUS_BADGE_STYLES: Record<JobStatus, string> = {
  [JobStatus.PENDING]: 'bg-amber-100 text-amber-800',
  [JobStatus.RUNNING]: 'bg-blue-100 text-blue-800',
  [JobStatus.COMPLETED]: 'bg-green-100 text-green-800',
  [JobStatus.FAILED]: 'bg-red-100 text-red-800',
  [JobStatus.CANCELLED]: 'bg-gray-100 text-gray-800',
};

function isActiveStatus(status: JobStatus): boolean {
  return status === JobStatus.PENDING || status === JobStatus.RUNNING;
}

function truncateId(id: string): string {
  return id.length > 8 ? `${id.slice(0, 8)}...` : id;
}

function formatCreatedAt(iso: string): string {
  try {
    const date = new Date(iso);
    return date.toLocaleString([], {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return iso;
  }
}

export function JobCard({ job, onCancelled }: JobCardProps) {
  const [isCancelling, setIsCancelling] = useState(false);

  const isActive = isActiveStatus(job.status);
  const { progressEvent } = useJobStream(isActive ? job.id : null);

  const percentage = progressEvent?.percentage ?? job.percentage;
  const logs = progressEvent?.logs ?? job.logs;
  const currentStatus = progressEvent?.jobStatus ?? job.status;
  const error = progressEvent?.error ?? job.error;

  async function handleCancel() {
    setIsCancelling(true);
    try {
      const response = await cancelJob(job.id);
      if (response.success) {
        onCancelled();
      }
    } finally {
      setIsCancelling(false);
    }
  }

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="text-sm font-mono text-gray-500" title={job.id}>
            {truncateId(job.id)}
          </span>
          <span
            className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUS_BADGE_STYLES[currentStatus]}`}
          >
            {currentStatus}
          </span>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs text-gray-400">
            {formatCreatedAt(job.createdAt)}
          </span>
          {isActiveStatus(currentStatus) && (
            <button
              onClick={handleCancel}
              disabled={isCancelling}
              className="rounded px-2.5 py-1 text-xs font-medium text-red-600 border border-red-200 hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-red-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isCancelling ? 'Cancelling...' : 'Cancel'}
            </button>
          )}
        </div>
      </div>

      <JobProgress percentage={percentage} status={currentStatus} logs={logs} />

      {error && (
        <div className="rounded-md bg-red-50 border border-red-200 p-3 text-sm text-red-700">
          <span className="font-medium">Error:</span> {error}
        </div>
      )}
    </div>
  );
}

export default JobCard;
