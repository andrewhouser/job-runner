'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import type { ProgressEvent } from '@job-runner/shared';
import { JobStatus } from '@job-runner/shared';
import { getStreamUrl } from '@/lib/api';

export type ConnectionState = 'connecting' | 'open' | 'closed' | 'error';

export interface UseJobStreamReturn {
  progressEvent: ProgressEvent | null;
  connectionState: ConnectionState;
}

const TERMINAL_STATUSES: JobStatus[] = [
  JobStatus.COMPLETED,
  JobStatus.FAILED,
  JobStatus.CANCELLED,
];

const MAX_RETRIES = 3;
const BASE_DELAY_MS = 1000;

function useJobStream(jobId: string | null | undefined): UseJobStreamReturn {
  const [progressEvent, setProgressEvent] = useState<ProgressEvent | null>(null);
  const [connectionState, setConnectionState] = useState<ConnectionState>('closed');

  const retryCountRef = useRef(0);
  const eventSourceRef = useRef<EventSource | null>(null);
  const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isTerminalRef = useRef(false);

  const cleanup = useCallback(() => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
  }, []);

  useEffect(() => {
    if (!jobId) {
      cleanup();
      setConnectionState('closed');
      setProgressEvent(null);
      return;
    }

    isTerminalRef.current = false;
    retryCountRef.current = 0;

    function connect() {
      cleanup();

      const url = getStreamUrl(jobId!);
      const es = new EventSource(url);
      eventSourceRef.current = es;
      setConnectionState('connecting');

      es.onopen = () => {
        setConnectionState('open');
        retryCountRef.current = 0;
      };

      es.addEventListener('progress', (event: MessageEvent) => {
        try {
          const data = JSON.parse(event.data) as ProgressEvent;
          setProgressEvent(data);

          if (TERMINAL_STATUSES.includes(data.jobStatus)) {
            isTerminalRef.current = true;
            es.close();
            eventSourceRef.current = null;
            setConnectionState('closed');
          }
        } catch {
          // Ignore malformed JSON
        }
      });

      es.onerror = () => {
        es.close();
        eventSourceRef.current = null;

        if (isTerminalRef.current) {
          setConnectionState('closed');
          return;
        }

        if (retryCountRef.current < MAX_RETRIES) {
          const delay = BASE_DELAY_MS * Math.pow(2, retryCountRef.current);
          retryCountRef.current += 1;
          setConnectionState('connecting');

          reconnectTimeoutRef.current = setTimeout(() => {
            reconnectTimeoutRef.current = null;
            connect();
          }, delay);
        } else {
          setConnectionState('error');
        }
      };
    }

    connect();

    return () => {
      cleanup();
    };
  }, [jobId, cleanup]);

  return { progressEvent, connectionState };
}

export { useJobStream };
export default useJobStream;
