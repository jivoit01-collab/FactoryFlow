/**
 * The completion mark: a disc springs in, the tick draws on it, the message
 * follows. Compact and inline — it sits inside the dialog or panel that did
 * the work, rather than taking the screen the way `GateSuccessScreen` does.
 *
 * Reserve it for work that actually reached the server. Played on a local
 * validation pass it teaches people to distrust it, and then it is worth
 * nothing on the save that really did post.
 *
 * Under `prefers-reduced-motion` the whole thing lands finished — see the
 * guard in index.css. The mark states a result, so it has to be there either
 * way; an undrawn tick beside "saved" would be a lie.
 */
const SIZES = {
  /** Inside a toast, where it shares the corner with the rest of the stack. */
  sm: { gap: 'gap-3', disc: 'h-10 w-10', tick: 'h-6 w-6', title: 'text-sm', body: 'text-xs' },
  /** On its own in a panel or page. */
  md: { gap: 'gap-4', disc: 'h-16 w-16', tick: 'h-9 w-9', title: 'text-lg', body: 'text-sm' },
} as const;

export function SuccessCheck({
  title,
  description,
  size = 'md',
  className,
}: {
  title: string;
  description?: string;
  size?: keyof typeof SIZES;
  className?: string;
}) {
  const s = SIZES[size];

  return (
    <div
      className={`flex items-center ${s.gap} ${className ?? ''}`}
      role="status"
      aria-live="polite"
    >
      <span
        className={`ff-success-disc grid ${s.disc} shrink-0 place-items-center rounded-full bg-emerald-100 dark:bg-emerald-500/15`}
      >
        <svg
          viewBox="0 0 100 100"
          className={`${s.tick} text-emerald-600 dark:text-emerald-400`}
          aria-hidden="true"
        >
          <path
            d="M26 52 L44 70 L74 32"
            fill="none"
            stroke="currentColor"
            strokeWidth="9"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="ff-success-draw"
          />
        </svg>
      </span>

      <div className="ff-success-message min-w-0">
        <p className={`${s.title} font-semibold leading-tight`}>{title}</p>
        {description && (
          <p className={`mt-1 ${s.body} text-muted-foreground`}>{description}</p>
        )}
      </div>
    </div>
  );
}
