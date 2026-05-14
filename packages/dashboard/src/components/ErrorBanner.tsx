'use client';

interface ErrorBannerProps {
  message: string;
  onDismiss: () => void;
  onRetry?: () => void;
}

export function ErrorBanner({ message, onDismiss, onRetry }: ErrorBannerProps) {
  return (
    <div className="rounded-md bg-red-50 border border-red-200 p-4 flex items-center justify-between gap-4">
      <div className="flex items-center gap-3 min-w-0">
        <span className="text-red-500 flex-shrink-0" aria-hidden="true">
          ⚠
        </span>
        <p className="text-sm text-red-700 truncate">{message}</p>
      </div>
      <div className="flex items-center gap-2 flex-shrink-0">
        {onRetry && (
          <button
            onClick={onRetry}
            className="rounded px-3 py-1.5 text-xs font-medium text-red-700 border border-red-300 hover:bg-red-100 focus:outline-none focus:ring-2 focus:ring-red-500"
          >
            Retry
          </button>
        )}
        <button
          onClick={onDismiss}
          className="rounded p-1 text-red-400 hover:text-red-600 hover:bg-red-100 focus:outline-none focus:ring-2 focus:ring-red-500"
          aria-label="Dismiss error"
        >
          <svg
            className="h-4 w-4"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth="2"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        </button>
      </div>
    </div>
  );
}

export default ErrorBanner;
