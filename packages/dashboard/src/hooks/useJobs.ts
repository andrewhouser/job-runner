'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import type { Job, JobStatus } from '@job-runner/shared';
import { getJobs } from '@/lib/api';

export interface UseJobsReturn {
  jobs: Job[];
  isLoading: boolean;
  error: string | null;
  refetch: () => void;
}

export function useJobs(statusFilter?: JobStatus): UseJobsReturn {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const isFirstFetch = useRef(true);

  const fetchJobs = useCallback(async () => {
    if (isFirstFetch.current) {
      setIsLoading(true);
    }

    const response = await getJobs(statusFilter);

    if (response.success) {
      setJobs(response.data);
      setError(null);
    } else {
      setError(response.error.message);
    }

    if (isFirstFetch.current) {
      setIsLoading(false);
      isFirstFetch.current = false;
    }
  }, [statusFilter]);

  useEffect(() => {
    isFirstFetch.current = true;
    fetchJobs();

    const intervalId = setInterval(fetchJobs, 2000);

    return () => {
      clearInterval(intervalId);
    };
  }, [fetchJobs]);

  const refetch = useCallback(() => {
    fetchJobs();
  }, [fetchJobs]);

  return { jobs, isLoading, error, refetch };
}

export default useJobs;
