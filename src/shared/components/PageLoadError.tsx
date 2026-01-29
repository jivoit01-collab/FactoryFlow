/**
 * PageLoadError component
 *
 * Displays a user-friendly error message with a reload button.
 * Used as a fallback for Suspense boundaries and error states.
 */
export function PageLoadError() {
  return (
    <div className="flex h-[50vh] flex-col items-center justify-center gap-4 px-4 text-center">
      <div className="rounded-full bg-destructive/10 p-3">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="h-8 w-8 text-destructive"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
          />
        </svg>
      </div>
      <h2 className="text-xl font-semibold text-foreground">An error occurred</h2>
      <p className="max-w-md text-muted-foreground">
        Please check your internet connection or try reloading the page.
      </p>
      <button
        onClick={() => window.location.reload()}
        className="mt-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
      >
        Reload Page
      </button>
    </div>
  )
}
