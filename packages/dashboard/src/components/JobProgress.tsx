'use client';

import { JobStatus } from '@job-runner/shared';
import type { LogEntry } from '@job-runner/shared';

interface JobProgressProps {
  percentage: number;
  status: JobStatus;
  logs: LogEntry[];
}

const STATUS_BAR_COLORS: Record<JobStatus, string> = {
  [JobStatus.PENDING]: 'bg-amber-400',
  [JobStatus.RUNNING]: 'bg-blue-500',
  [JobStatus.COMPLETED]: 'bg-green-500',
  [JobStatus.FAILED]: 'bg-red-500',
  [JobStatus.CANCELLED]: 'bg-gray-400',
};

function formatTimestamp(iso: string): string {
  try {
    const date = new Date(iso);
    return date.toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  } catch {
    return iso;
  }
}

export function JobProgress({ percentage, status, logs }: JobProgressProps) {
  const barColor = STATUS_BAR_COLORS[status] || 'bg-gray-400';
  const recentLogs = logs.slice(-10);

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <div className="flex-1 h-3 bg-gray-200 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-300 ${barColor}`}
            style={{ width: `${Math.min(100, Math.max(0, percentage))}%` }}
          />
        </div>
        <span className="text-sm font-medium text-gray-700 w-12 text-right">
          {percentage}%
        </span>
      </div>

      {recentLogs.length > 0 && (
        <div className="max-h-32 overflow-y-auto rounded border border-gray-200 bg-gray-50 p-2 text-xs font-mono space-y-0.5">
          {recentLogs.map((log, index) => (
            <div key={index} className="text-gray-600">
              <span className="text-gray-400">{formatTimestamp(log.timestamp)}</span>{' '}
              {log.message}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default JobProgress;
