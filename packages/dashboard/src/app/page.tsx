'use client';

import { useState } from 'react';
import { useJobs } from '@/hooks/useJobs';
import { CreateJobButton } from '@/components/CreateJobButton';
import { JobList } from '@/components/JobList';
import { ErrorBanner } from '@/components/ErrorBanner';

export default function Home() {
  const { jobs, isLoading, error, refetch } = useJobs();
  const [errorDismissed, setErrorDismissed] = useState(false);

  function handleJobCreated() {
    refetch();
  }

  function handleJobCancelled() {
    refetch();
  }

  function handleDismissError() {
    setErrorDismissed(true);
  }

  function handleRetry() {
    setErrorDismissed(false);
    refetch();
  }

  // Reset dismissed state when error changes
  const showError = error && !errorDismissed;

  return (
    <main className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-2xl font-bold text-gray-900 sm:text-3xl">
          Job Runner Dashboard
        </h1>
        <CreateJobButton onJobCreated={handleJobCreated} />
      </div>

      {showError && (
        <div className="mb-6">
          <ErrorBanner
            message={error}
            onDismiss={handleDismissError}
            onRetry={handleRetry}
          />
        </div>
      )}

      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <div className="flex items-center gap-3 text-gray-500">
            <svg
              className="h-5 w-5 animate-spin"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
              />
            </svg>
            <span>Loading jobs...</span>
          </div>
        </div>
      ) : (
        <JobList jobs={jobs} onJobCancelled={handleJobCancelled} />
      )}
    </main>
  );
}
