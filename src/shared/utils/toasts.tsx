import { AlertTriangle, Check, Info, Loader2, X } from 'lucide-react';
import { toast } from 'sonner';

import { SuccessCheck } from '@/shared/components/SuccessCheck';

/**
 * A toast that shows how long it has left.
 *
 * The plain `toast.success()` everywhere else is right for most things. This
 * is for an action whose result the operator may need to read back a moment
 * later — a printed gate pass, a posted entry — where a toast vanishing with
 * no warning means re-opening the record to check what it said. The bar is
 * the warning: it drains in step with the dismissal, so "it is about to go"
 * is visible rather than guessed.
 *
 * Under `prefers-reduced-motion` the bar holds full instead of draining (see
 * index.css) — the toast still dismisses itself on time.
 */

const VARIANTS = {
  success: { Icon: Check, className: 'text-emerald-600 dark:text-emerald-400' },
  error: { Icon: X, className: 'text-destructive' },
  warning: { Icon: AlertTriangle, className: 'text-amber-600 dark:text-amber-400' },
  info: { Icon: Info, className: 'text-primary' },
} as const;

export interface ToastWithTimerOptions {
  /** Second line, for the detail that does not fit the headline. */
  description?: string;
  /** Milliseconds the toast stays up, and the time the bar takes to drain. */
  duration?: number;
  variant?: keyof typeof VARIANTS;
}

export function toastWithTimer(message: string, options: ToastWithTimerOptions = {}) {
  const { description, duration = 5000, variant = 'success' } = options;
  const { Icon, className } = VARIANTS[variant];

  return toast.custom(
    (id) => (
      <div
        // `relative` so the timer bar can pin to the bottom edge; `overflow-hidden`
        // so it cannot escape the rounded corners as it drains.
        className="relative flex w-full items-start gap-3 overflow-hidden rounded-lg border bg-popover px-4 py-3 text-popover-foreground shadow-lg"
        role="status"
      >
        <Icon className={`mt-0.5 h-4 w-4 shrink-0 ${className}`} aria-hidden="true" />

        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium leading-snug">{message}</p>
          {description && <p className="mt-0.5 text-xs text-muted-foreground">{description}</p>}
        </div>

        <button
          type="button"
          onClick={() => toast.dismiss(id)}
          aria-label="Dismiss"
          className="-mr-1 -mt-1 shrink-0 rounded-md p-1 text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
        >
          <X className="h-3.5 w-3.5" aria-hidden="true" />
        </button>

        {/* Driven from `duration` so the bar and the dismissal cannot disagree. */}
        <span className="ff-toast-timer" style={{ animationDuration: `${duration}ms` }} />
      </div>
    ),
    { duration },
  );
}

/**
 * A toast that covers a wait, for work whose end the app can see but the user
 * cannot — the seconds between pressing Print and the print dialog appearing,
 * while a reprint is logged, refetched and rendered.
 *
 * Unlike `toastWithTimer` this does NOT dismiss itself. `estimatedMs` only
 * paces the bar; if the work runs long the bar holds empty (the animation is
 * `forwards`) and the toast stays up. A progress toast that disappeared while
 * the user was still waiting would be worse than none — they would press
 * Print again.
 *
 * Returns the toast id. The caller MUST dismiss it, on both the success and
 * the failure path:
 *
 *   const id = toastPending('Preparing gate pass…');
 *   try { await work(); } finally { toast.dismiss(id); }
 */
export function toastPending(
  message: string,
  options: { description?: string; estimatedMs?: number } = {},
) {
  const { description, estimatedMs = 4000 } = options;

  return toast.custom(
    () => (
      <div
        className="relative flex w-full items-start gap-3 overflow-hidden rounded-lg border bg-popover px-4 py-3 text-popover-foreground shadow-lg"
        role="status"
        aria-live="polite"
      >
        <Loader2 className="mt-0.5 h-4 w-4 shrink-0 animate-spin text-primary" aria-hidden="true" />

        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium leading-snug">{message}</p>
          {description && <p className="mt-0.5 text-xs text-muted-foreground">{description}</p>}
        </div>

        <span className="ff-toast-timer" style={{ animationDuration: `${estimatedMs}ms` }} />
      </div>
    ),
    // Infinity, not a timeout: the caller dismisses this when the work lands.
    { duration: Infinity },
  );
}

/**
 * The completion mark in the corner, rather than in the user's way.
 *
 * Same draw-on as the inline `SuccessCheck` — disc springs, tick draws,
 * message follows — but it lands in the toast stack, so the page underneath
 * stays usable and the next record can be started while it is still on screen.
 *
 * Reserve it for work that reached the server, as with the inline mark.
 */
export function toastSuccessMark(
  title: string,
  options: { description?: string; duration?: number } = {},
) {
  const { description, duration = 4000 } = options;

  return toast.custom(
    (id) => (
      <div className="relative flex w-full items-center gap-2 overflow-hidden rounded-lg border bg-popover px-4 py-3 text-popover-foreground shadow-lg">
        <SuccessCheck title={title} description={description} size="sm" className="flex-1" />

        <button
          type="button"
          onClick={() => toast.dismiss(id)}
          aria-label="Dismiss"
          className="-mr-1 shrink-0 self-start rounded-md p-1 text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
        >
          <X className="h-3.5 w-3.5" aria-hidden="true" />
        </button>

        <span className="ff-toast-timer" style={{ animationDuration: `${duration}ms` }} />
      </div>
    ),
    { duration },
  );
}
