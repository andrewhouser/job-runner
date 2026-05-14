import { Request, Response, NextFunction } from 'express';
import { ApiErrorResponse } from '@job-runner/shared';

/**
 * Global error handler middleware.
 * Returns ApiErrorResponse format with appropriate HTTP status codes.
 * Must be registered as the LAST middleware after all routes.
 */
export function errorHandler(
  err: Error,
  _req: Request,
  res: Response,
  _next: NextFunction
): void {
  console.error('[ErrorHandler]', err.message, err.stack);

  // Handle JSON parse errors (bad request body)
  if (err instanceof SyntaxError && 'body' in err) {
    const response: ApiErrorResponse = {
      success: false,
      error: {
        code: 'INVALID_REQUEST_BODY',
        message: 'Malformed JSON in request body',
      },
    };
    res.status(400).json(response);
    return;
  }

  // Generic internal server error
  const response: ApiErrorResponse = {
    success: false,
    error: {
      code: 'INTERNAL_ERROR',
      message: 'An unexpected error occurred',
    },
  };
  res.status(500).json(response);
}
