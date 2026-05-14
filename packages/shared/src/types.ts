export enum JobStatus {
  PENDING = 'pending',
  RUNNING = 'running',
  COMPLETED = 'completed',
  FAILED = 'failed',
  CANCELLED = 'cancelled',
}

export interface Job {
  id: string;
  status: JobStatus;
  percentage: number;
  duration: number;
  createdAt: string;
  updatedAt: string;
  error?: string;
  logs: LogEntry[];
}

export interface LogEntry {
  timestamp: string;
  message: string;
}

export interface ProgressEvent {
  jobId: string;
  percentage: number;
  status: string;
  jobStatus: JobStatus;
  logs: LogEntry[];
  error?: string;
}

export interface ApiSuccessResponse<T> {
  success: true;
  data: T;
}

export interface ApiErrorResponse {
  success: false;
  error: {
    code: string;
    message: string;
    details?: Record<string, string>;
  };
}

export type ApiResponse<T> = ApiSuccessResponse<T> | ApiErrorResponse;
