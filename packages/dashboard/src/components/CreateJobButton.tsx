'use client';

import { useState } from 'react';
import { createJob } from '@/lib/api';

interface CreateJobButtonProps {
  onJobCreated: () => void;
}

export function CreateJobButton({ onJobCreated }: CreateJobButtonProps) {
  const [isLoading, setIsLoading] = useState(false);

  async function handleClick() {
    setIsLoading(true);
    try {
      const response = await createJob();
      if (response.success) {
        onJobCreated();
      }
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <button
      onClick={handleClick}
      disabled={isLoading}
      className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
    >
      {isLoading ? 'Creating...' : '+ New Job'}
    </button>
  );
}

export default CreateJobButton;
