/**
 * The list one SAP transfer queue is shown as: a row per document, opened to
 * see its items.
 *
 * These queues are backlogs — twenty-odd documents at a time — and the question
 * asked of them is "what is sitting here, and how long has it sat", not "what
 * is on line 3 of the fourth one". So a row states the document, the route, the
 * age and how many items it carries; the items themselves are one click away.
 *
 * Shared by the approved-draft queue and the awaiting-transfer queue on purpose
 * — they are the same thing at two stages, and it is the same list the SAP
 * approvals tab already reads as, so the floor learns one layout for all three.
 */

import { ChevronDown, ChevronRight } from 'lucide-react';
import type { ReactNode } from 'react';

import { Card, CardContent } from '@/shared/components/ui';

export function RecordList({ children }: { children: ReactNode }) {
  return (
    <Card>
      <CardContent className="p-0">
        <ul className="divide-y">{children}</ul>
      </CardContent>
    </Card>
  );
}

export function RecordRow({
  open,
  onToggle,
  title,
  chip,
  meta,
  route,
  aside,
  note,
  flag,
  action,
  children,
}: {
  open: boolean;
  onToggle: () => void;
  title: ReactNode;
  chip?: ReactNode;
  meta: ReactNode;
  route: ReactNode;
  /** The one thing worth reading from across the room — usually how long it has sat. */
  aside?: ReactNode;
  /** SAP's own comment on the document, when it left one. */
  note?: ReactNode;
  /** Why this row needs attention, said without having to open it. */
  flag?: ReactNode;
  /** Shown on the row itself, for a queue whose action needs nothing filled in. */
  action?: ReactNode;
  /** The items and whatever can be done to them, revealed when open. */
  children: ReactNode;
}) {
  return (
    <li>
      <div
        className={`flex flex-wrap items-center gap-x-4 gap-y-2 px-3 py-2.5 transition-colors ${
          open ? 'bg-muted/40' : 'hover:bg-muted/30'
        }`}
      >
        {/* The whole left side toggles: a 3mm chevron is not a click target on
            a screen somebody is using in gloves. */}
        <button
          type="button"
          onClick={onToggle}
          aria-expanded={open}
          className="flex min-w-0 flex-1 items-center gap-3 text-left"
        >
          <span className="text-muted-foreground">
            {open ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
          </span>
          <span className="min-w-0">
            <span className="flex flex-wrap items-center gap-2 text-sm font-medium">
              {title}
              {chip}
            </span>
            <span className="mt-0.5 flex flex-wrap items-center gap-x-2 text-xs text-muted-foreground">
              {meta}
              {note ? <span className="truncate italic">· {note}</span> : null}
            </span>
          </span>
        </button>

        {/* Fixed slots from `lg` up, so the counts, routes, ages and buttons of
            twenty rows line up in columns instead of each row setting its own
            edges. Below that they collapse to their natural width and wrap. */}
        <div className="flex flex-wrap items-center justify-end gap-2 text-sm">
          <div className="flex items-center justify-end gap-2 lg:w-44">{flag}</div>
          <div className="flex items-center justify-end lg:w-36">{route}</div>
          <div className="flex items-center justify-end lg:w-32">{aside}</div>
          <div className="flex items-center justify-end lg:w-32">{action}</div>
        </div>
      </div>

      {open && <div className="border-t bg-background">{children}</div>}
    </li>
  );
}

/** How many items the row carries, so the count is known without opening it. */
export function LineCount({ lines }: { lines: number }) {
  return (
    <span className="whitespace-nowrap text-xs text-muted-foreground tabular-nums">
      {lines} item{lines === 1 ? '' : 's'}
    </span>
  );
}

export type LineColumn = {
  label: string;
  align?: 'left' | 'right';
  /** A width keeps the figures in a block beside the item, not at the far edge. */
  width?: string;
};

/**
 * The lines of one record.
 *
 * `table-fixed` with a width on every column but the first: without it the item
 * column takes whatever it likes and the figures drift apart from row to row.
 */
export function LineTable({ columns, children }: { columns: LineColumn[]; children: ReactNode }) {
  return (
    <table className="w-full table-fixed text-sm">
      <colgroup>
        {columns.map((col) => (
          <col key={col.label} style={col.width ? { width: col.width } : undefined} />
        ))}
      </colgroup>
      <thead className="border-b text-[11px] uppercase tracking-wide text-muted-foreground">
        <tr>
          {columns.map((col) => (
            <th
              key={col.label}
              className={`px-4 py-2 font-medium ${
                col.align === 'right' ? 'text-right' : 'text-left'
              }`}
            >
              {col.label}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>{children}</tbody>
    </table>
  );
}

/** The item cell every line starts with — code above, name under it. */
export function ItemCell({ code, name }: { code: string; name: string }) {
  return (
    <td className="px-4 py-2">
      <div className="font-mono text-xs">{code}</div>
      {/* Two lines, then an ellipsis: a full item name is worth reading on the
          floor, but one long one must not set the height of every row. */}
      <div className="line-clamp-2 text-xs text-muted-foreground" title={name}>
        {name}
      </div>
    </td>
  );
}

/**
 * The foot of an opened row: what the action will do on the left, the action
 * itself on the right, and anything that went wrong above both.
 */
export function RecordActions({
  hint,
  children,
  banners,
}: {
  hint?: ReactNode;
  children?: ReactNode;
  banners?: ReactNode;
}) {
  if (!hint && !children && !banners) return null;
  return (
    <div className="border-t bg-muted/20 px-4 py-3">
      {banners}
      {(hint || children) && (
        <div className="flex flex-wrap items-center justify-between gap-3">
          <span className="max-w-xl text-xs text-muted-foreground">{hint}</span>
          {children}
        </div>
      )}
    </div>
  );
}

/** A warning the record carries — SAP will refuse the post until it is dealt with. */
export function RecordWarning({ children }: { children: ReactNode }) {
  return (
    <div className="mb-2 flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 p-2 text-xs text-amber-900 dark:border-amber-900/50 dark:bg-amber-950/20 dark:text-amber-200">
      {children}
    </div>
  );
}
