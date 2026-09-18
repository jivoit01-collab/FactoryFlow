import { Inbox, Loader2 } from 'lucide-react';
import type { ReactNode } from 'react';

import { cn } from '@/shared/utils';

/**
 * The table card the module's list pages are built from. One card, one
 * toolbar, one header rule — so Bill Selection, Plans, Open Bilties and the
 * GRPO queues stop each inventing their own padding, header tint and empty
 * state.
 *
 * The table itself stays the caller's: pass the `<table>` with `TABLE_CLASSES`
 * and use the `Th`/`Td` helpers, so column widths and cell content remain the
 * page's business while the chrome stays shared.
 */
export function TableCard({
  /** Left of the toolbar — usually a count ("89 bills · 3 selected"). */
  summary,
  /** Right of the toolbar — the page's actions. */
  actions,
  children,
  className,
  bodyClassName,
}: {
  summary?: ReactNode;
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
  bodyClassName?: string;
}) {
  return (
    <div className={cn('overflow-hidden rounded-xl border bg-card shadow-sm', className)}>
      {(summary || actions) && (
        <div className="flex flex-wrap items-center justify-between gap-2 border-b px-4 py-3">
          <div className="text-sm text-muted-foreground">{summary}</div>
          {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
        </div>
      )}
      <div className={cn('overflow-x-auto', bodyClassName)}>{children}</div>
    </div>
  );
}

/** Base classes for a `<table>` inside a `TableCard`. */
export const TABLE_CLASSES = 'w-full text-sm';

/** Classes for the `<thead>` — a quiet tinted band with a rule under it. */
export const THEAD_CLASSES = 'border-b bg-muted/40';

/** Classes for a `<tbody>` row. */
export const ROW_CLASSES = 'border-b last:border-0 transition-colors hover:bg-muted/40';

export function Th({
  children,
  align = 'left',
  className,
  ...props
}: React.ThHTMLAttributes<HTMLTableCellElement> & { align?: 'left' | 'right' | 'center' }) {
  return (
    <th
      scope="col"
      className={cn(
        'whitespace-nowrap px-4 py-2.5 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground',
        align === 'right' && 'text-right',
        align === 'center' && 'text-center',
        align === 'left' && 'text-left',
        className,
      )}
      {...props}
    >
      {children}
    </th>
  );
}

export function Td({
  children,
  align = 'left',
  numeric,
  className,
  ...props
}: React.TdHTMLAttributes<HTMLTableCellElement> & {
  align?: 'left' | 'right' | 'center';
  /** Right-aligns and figures-aligns the cell — for any column of numbers. */
  numeric?: boolean;
}) {
  return (
    <td
      className={cn(
        'px-4 py-2.5 align-middle',
        (numeric || align === 'right') && 'text-right tabular-nums',
        align === 'center' && 'text-center',
        className,
      )}
      {...props}
    >
      {children}
    </td>
  );
}

/** The "nothing here" row — says what is missing rather than showing a blank. */
export function TableEmpty({
  colSpan,
  message = 'Nothing to show',
  hint,
  icon: Icon = Inbox,
}: {
  colSpan: number;
  message?: string;
  hint?: ReactNode;
  icon?: typeof Inbox;
}) {
  return (
    <tr>
      <td colSpan={colSpan} className="px-4 py-14 text-center">
        <span className="mx-auto grid h-11 w-11 place-items-center rounded-full bg-muted">
          <Icon className="h-5 w-5 text-muted-foreground" />
        </span>
        <p className="mt-3 text-sm font-medium">{message}</p>
        {hint && <p className="mt-1 text-sm text-muted-foreground">{hint}</p>}
      </td>
    </tr>
  );
}

/** The loading row, so a slow query does not read as an empty list. */
export function TableLoading({
  colSpan,
  message = 'Loading…',
}: {
  colSpan: number;
  message?: string;
}) {
  return (
    <tr>
      <td colSpan={colSpan} className="px-4 py-14 text-center text-sm text-muted-foreground">
        <Loader2 className="mx-auto h-5 w-5 animate-spin" />
        <span className="mt-3 block">{message}</span>
      </td>
    </tr>
  );
}
