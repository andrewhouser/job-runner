import { Response } from 'express';
import { HEARTBEAT_INTERVAL_MS } from '@job-runner/shared';
import { sseConnectionManager } from './connectionManager';

/**
 * Starts a heartbeat interval that sends an SSE comment to keep the connection alive.
 * Detects write failures and triggers connection cleanup when the client is unresponsive.
 */
export function startHeartbeat(jobId: string, res: Response): NodeJS.Timeout {
  const handle = setInterval(() => {
    try {
      const writeResult = res.write(': heartbeat\n\n');
      if (writeResult === false) {
        clearInterval(handle);
        sseConnectionManager.removeConnection(jobId, res);
        try {
          res.end();
        } catch {
          // Connection already closed, ignore
        }
      }
    } catch {
      clearInterval(handle);
      sseConnectionManager.removeConnection(jobId, res);
      try {
        res.end();
      } catch {
        // Connection already closed, ignore
      }
    }
  }, HEARTBEAT_INTERVAL_MS);

  return handle;
}

/**
 * Stops a heartbeat interval.
 */
export function stopHeartbeat(handle: NodeJS.Timeout): void {
  clearInterval(handle);
}
