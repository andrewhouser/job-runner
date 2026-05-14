import { Request, Response, NextFunction } from 'express';
import { JobStatus, ApiErrorResponse } from '@job-runner/shared';

/**
 * Middleware that validates the ?status query parameter against JobStatus enum values.
 * If invalid, returns 400 ApiErrorResponse. If valid or absent, calls next().
 */
export function validateStatusQuery(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  const statusParam = req.query.status as string | undefined;

  if (statusParam === undefined || statusParam === '') {
    next();
    return;
  }

  const validStatuses = Object.values(JobStatus) as string[];

  if (!validStatuses.includes(statusParam)) {
    const response: ApiErrorResponse = {
      success: false,
      error: {
        code: 'INVALID_STATUS_FILTER',
        message: `Invalid status filter '${statusParam}'. Accepted values: ${validStatuses.join(', ')}`,
      },
    };
    res.status(400).json(response);
    return;
  }

  next();
}

/**
 * Factory function that returns middleware checking the request body
 * has all required fields. If missing, returns 400 ApiErrorResponse
 * with details about which fields are missing.
 */
export function validateRequestBody(requiredFields: string[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const body = req.body;

    if (!body || typeof body !== 'object') {
      const response: ApiErrorResponse = {
        success: false,
        error: {
          code: 'INVALID_REQUEST_BODY',
          message: 'Request body is required',
        },
      };
      res.status(400).json(response);
      return;
    }

    const missingFields = requiredFields.filter(
      (field) => !(field in body) || body[field] === undefined
    );

    if (missingFields.length > 0) {
      const details: Record<string, string> = {};
      for (const field of missingFields) {
        details[field] = `'${field}' is required`;
      }

      const response: ApiErrorResponse = {
        success: false,
        error: {
          code: 'INVALID_REQUEST_BODY',
          message: `Missing required fields: ${missingFields.join(', ')}`,
          details,
        },
      };
      res.status(400).json(response);
      return;
    }

    next();
  };
}
