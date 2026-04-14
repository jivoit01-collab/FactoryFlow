/**
 * Centralized status badge styling — single source of truth for "what color
 * does a pending/approved/rejected status look like" across the app.
 *
 * Each variant returns a Tailwind class string that combines light- and
 * dark-mode colors chosen to meet WCAG AA contrast (≥ 4.5:1) on both modes,
 * including readability on shop-floor tablets in sunlight.
 *
 * Usage:
 *   <Badge className={statusBadgeClass('pending')}>Pending</Badge>
 *   <span className={statusBadgeClass(isApproved ? 'approved' : 'rejected')}>
 *
 * When adding a new status, pick the closest semantic variant — don't invent
 * new colors inline in components.
 */

export type StatusVariant =
  | 'pending' // awaiting action — amber
  | 'inProgress' // actively being worked on — blue
  | 'approved' // positive outcome — green
  | 'rejected' // negative outcome — red
  | 'draft' // not yet submitted — neutral gray
  | 'completed' // fully done — green
  | 'failed' // errored — red
  | 'info' // informational — blue
  | 'neutral'; // default/unknown — gray

// Shared base: rounded pill, inline-flex, small font, consistent padding.
const BADGE_BASE =
  'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium';

/**
 * WCAG-AA-compliant color pairs. Light mode uses `-100` bg with `-900` text;
 * dark mode uses `-950` bg with `-100` text — both pass 4.5:1 contrast.
 * Avoid alpha fills like bg-COLOR-900 over slash 10 (they fail contrast) and
 * avoid `*-400` text on any dark background.
 */
const STATUS_PALETTE: Record<StatusVariant, string> = {
  pending:
    'bg-amber-100 text-amber-900 border border-amber-200 dark:bg-amber-950 dark:text-amber-100 dark:border-amber-900',
  inProgress:
    'bg-blue-100 text-blue-900 border border-blue-200 dark:bg-blue-950 dark:text-blue-100 dark:border-blue-900',
  approved:
    'bg-green-100 text-green-900 border border-green-200 dark:bg-green-950 dark:text-green-100 dark:border-green-900',
  rejected:
    'bg-red-100 text-red-900 border border-red-200 dark:bg-red-950 dark:text-red-100 dark:border-red-900',
  draft:
    'bg-gray-100 text-gray-800 border border-gray-200 dark:bg-gray-900 dark:text-gray-100 dark:border-gray-800',
  completed:
    'bg-green-100 text-green-900 border border-green-200 dark:bg-green-950 dark:text-green-100 dark:border-green-900',
  failed:
    'bg-red-100 text-red-900 border border-red-200 dark:bg-red-950 dark:text-red-100 dark:border-red-900',
  info: 'bg-blue-100 text-blue-900 border border-blue-200 dark:bg-blue-950 dark:text-blue-100 dark:border-blue-900',
  neutral:
    'bg-gray-100 text-gray-800 border border-gray-200 dark:bg-gray-900 dark:text-gray-100 dark:border-gray-800',
};

/**
 * Returns the Tailwind class string for a status badge.
 * @param variant — semantic status variant (see StatusVariant)
 */
export function statusBadgeClass(variant: StatusVariant): string {
  return `${BADGE_BASE} ${STATUS_PALETTE[variant]}`;
}

/**
 * Returns just the color (bg/text/border) classes for a status — without the
 * badge shape/padding. Use when composing into a differently-shaped element
 * (e.g. a card border, a table cell background).
 */
export function statusColorClass(variant: StatusVariant): string {
  return STATUS_PALETTE[variant];
}
