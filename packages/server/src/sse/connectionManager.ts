import { Response } from 'express';
import { MAX_CONCURRENT_SSE_CONNECTIONS } from '@job-runner/shared';

export class SSEConnectionManager {
  private connections: Map<string, Set<Response>> = new Map();

  addConnection(jobId: string, res: Response): boolean {
    if (this.isAtLimit()) {
      return false;
    }

    let jobConnections = this.connections.get(jobId);
    if (!jobConnections) {
      jobConnections = new Set();
      this.connections.set(jobId, jobConnections);
    }

    jobConnections.add(res);
    return true;
  }

  removeConnection(jobId: string, res: Response): void {
    const jobConnections = this.connections.get(jobId);
    if (!jobConnections) {
      return;
    }

    jobConnections.delete(res);

    if (jobConnections.size === 0) {
      this.connections.delete(jobId);
    }
  }

  getConnectionCount(): number {
    let count = 0;
    for (const connections of this.connections.values()) {
      count += connections.size;
    }
    return count;
  }

  getConnectionCountForJob(jobId: string): number {
    const jobConnections = this.connections.get(jobId);
    return jobConnections ? jobConnections.size : 0;
  }

  isAtLimit(): boolean {
    return this.getConnectionCount() >= MAX_CONCURRENT_SSE_CONNECTIONS;
  }

  broadcast(jobId: string, event: string, data: unknown): void {
    const jobConnections = this.connections.get(jobId);
    if (!jobConnections) {
      return;
    }

    const message = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
    const deadConnections: Response[] = [];

    for (const res of jobConnections) {
      try {
        const writeResult = res.write(message);
        if (writeResult === false) {
          deadConnections.push(res);
        }
      } catch {
        deadConnections.push(res);
      }
    }

    for (const deadRes of deadConnections) {
      this.removeConnection(jobId, deadRes);
    }
  }

  closeAllForJob(jobId: string): void {
    const jobConnections = this.connections.get(jobId);
    if (!jobConnections) {
      return;
    }

    for (const res of jobConnections) {
      try {
        res.end();
      } catch {
        // Connection may already be closed, ignore
      }
    }

    this.connections.delete(jobId);
  }
}

export const sseConnectionManager = new SSEConnectionManager();
