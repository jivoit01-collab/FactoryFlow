import { AlertTriangle, CheckCircle2, XCircle } from 'lucide-react';

export type ScanFeedbackKind = 'success' | 'error' | 'warning';

export interface ScanFeedback {
  kind: ScanFeedbackKind;
  message: string;
  detail?: string;
}

const STYLES: Record<ScanFeedbackKind, { box: string; Icon: typeof CheckCircle2 }> = {
  success: {
    box: 'border-emerald-400 bg-emerald-50 text-emerald-800 dark:border-emerald-500/50 dark:bg-emerald-950/40 dark:text-emerald-300',
    Icon: CheckCircle2,
  },
  warning: {
    box: 'border-amber-400 bg-amber-50 text-amber-800 dark:border-amber-500/50 dark:bg-amber-950/40 dark:text-amber-300',
    Icon: AlertTriangle,
  },
  error: {
    box: 'border-red-400 bg-red-50 text-red-800 dark:border-red-500/50 dark:bg-red-950/40 dark:text-red-300',
    Icon: XCircle,
  },
};

/** Color-coded banner for the outcome of the last scan (✅ / ⚠️ / ❌). */
export function MpScanFeedback({ feedback }: { feedback: ScanFeedback | null }) {
  if (!feedback) return null;
  const { box, Icon } = STYLES[feedback.kind];
  return (
    <div className={`flex items-start gap-2 rounded-md border p-3 text-sm ${box}`} role="status" aria-live="polite">
      <Icon className="mt-0.5 h-5 w-5 shrink-0" />
      <div className="min-w-0">
        <div className="font-medium">{feedback.message}</div>
        {feedback.detail ? (
          <div className="mt-0.5 break-words text-xs opacity-80">{feedback.detail}</div>
        ) : null}
      </div>
    </div>
  );
}
