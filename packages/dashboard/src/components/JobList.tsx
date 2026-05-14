'use client';

import { JobStatus } from '@job-runner/shared';
import type { Job } from '@job-runner/shared';
import { JobCard } from './JobCard';

interface JobListProps {
  jobs: Job[];
  onJobCancelled: () => void;
}

const STATUS_ORDER: JobStatus[] = [
  JobStatus.RUNNING,
  JobStatus.PENDING,
  JobStatus.COMPLETED,
  JobStatus.FAILED,
  JobStatus.CANCELLED,
];

const STATUS_ICONS: Record<JobStatus, string> = {
  [JobStatus.RUNNING]: '▶',
  [JobStatus.PENDING]: '⏸',
  [JobStatus.COMPLETED]: '✓',
  [JobStatus.FAILED]: '✗',
  [JobStatus.CANCELLED]: '⊘',
};

const STATUS_HEADER_COLORS: Record<JobStatus, string> = {
  [JobStatus.PENDING]: 'text-amber-700',
  [JobStatus.RUNNING]: 'text-blue-700',
  [JobStatus.COMPLETED]: 'text-green-700',
  [JobStatus.FAILED]: 'text-red-700',
  [JobStatus.CANCELLED]: 'text-gray-600',
};

export function JobList({ jobs, onJobCancelled }: JobListProps) {
  if (jobs.length === 0) {
    return (
      <div className="text-center py-12 text-gray-500">
        <p className="text-lg">No jobs yet</p>
        <p className="text-sm mt-1">Create a new job to get started</p>
      </div>
    );
  }

  const grouped = STATUS_ORDER.map((status) => ({
    status,
    jobs: jobs.filter((job) => job.status === status),
  }));

  return (
    <div className="space-y-6">
      {grouped.map(({ status, jobs: statusJobs }) => (
        <div key={status}>
          <h2
            className={`flex items-center gap-2 text-sm font-semibold uppercase tracking-wide mb-3 ${STATUS_HEADER_COLORS[status]}`}
          >
            <span>{STATUS_ICONS[status]}</span>
            <span>{status}</span>
            <span className="text-gray-400 font-normal">({statusJobs.length})</span>
          </h2>

          {statusJobs.length === 0 ? (
            <p className="text-sm text-gray-400 italic pl-6">
              No jobs {status}
            </p>
          ) : (
            <div className="space-y-3">
              {statusJobs.map((job) => (
                <JobCard key={job.id} job={job} onCancelled={onJobCancelled} />
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

export default JobList;
