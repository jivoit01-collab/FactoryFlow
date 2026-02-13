/**
 * Loading spinner component for wizard steps.
 * Displays a centered spinner while data is loading.
 */
export function StepLoadingSpinner() {
  return (
    <div className="flex items-center justify-center h-64">
      <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
    </div>
  );
}
