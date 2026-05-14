import type { Job, ApiResponse, ApiErrorResponse } from '@job-runner/shared';
import { JobStatus } from '@job-runner/shared';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

function networkError(message: string): ApiErrorResponse {
  return {
    success: false,
    error: {
      code: 'NETWORK_ERROR',
      message,
    },
  };
}

export async function createJob(): Promise<ApiResponse<Job>> {
  try {
    const res = await fetch(`${API_BASE}/api/jobs`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    });
    return (await res.json()) as ApiResponse<Job>;
  } catch (err) {
    return networkError(err instanceof Error ? err.message : 'Unknown network error');
  }
}

export async function getJobs(status?: JobStatus): Promise<ApiResponse<Job[]>> {
  try {
    const url = new URL(`${API_BASE}/api/jobs`);
    if (status) {
      url.searchParams.set('status', status);
    }
    const res = await fetch(url.toString());
    return (await res.json()) as ApiResponse<Job[]>;
  } catch (err) {
    return networkError(err instanceof Error ? err.message : 'Unknown network error');
  }
}

export async function getJob(id: string): Promise<ApiResponse<Job>> {
  try {
    const res = await fetch(`${API_BASE}/api/jobs/${encodeURIComponent(id)}`);
    return (await res.json()) as ApiResponse<Job>;
  } catch (err) {
    return networkError(err instanceof Error ? err.message : 'Unknown network error');
  }
}

export async function cancelJob(id: string): Promise<ApiResponse<Job>> {
  try {
    const res = await fetch(`${API_BASE}/api/jobs/${encodeURIComponent(id)}/cancel`, {
      method: 'POST',
    });
    return (await res.json()) as ApiResponse<Job>;
  } catch (err) {
    return networkError(err instanceof Error ? err.message : 'Unknown network error');
  }
}

export function getStreamUrl(id: string): string {
  return `${API_BASE}/api/jobs/${encodeURIComponent(id)}/stream`;
}
