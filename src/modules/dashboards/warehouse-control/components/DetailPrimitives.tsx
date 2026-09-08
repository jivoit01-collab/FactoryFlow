import type { ReactNode } from 'react';

import { cn } from '@/shared/utils';

export interface DetailFieldSpec {
  label: string;
  /** Rendered as-is when a node; an empty string falls back to a dash. */
  value: ReactNode;
  /** Let a long value (an address, an item summary) span the whole row. */
  wide?: boolean;
}

/** Whether a field carries anything worth printing. */
function isEmpty(value: ReactNode): boolean {
  return value === null || value === undefined || value === '' || value === '-';
}

function DetailField({ label, value, wide }: DetailFieldSpec) {
  return (
    <div className={cn('min-w-0', wide && 'sm:col-span-2')}>
      <dt className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </dt>
      <dd className={cn('mt-0.5 break-words text-sm', isEmpty(value) && 'text-muted-foreground')}>
        {isEmpty(value) ? '—' : value}
      </dd>
    </div>
  );
}

export interface DetailSectionProps {
  title: string;
  fields: DetailFieldSpec[];
  /**
   * Drop the whole section when every field is empty. SAP snapshot blocks are
   * routinely blank, and a card of nothing but dashes is worse than no card.
   */
  hideWhenEmpty?: boolean;
  children?: ReactNode;
}

/**
 * One labelled block of fields inside a detail dialog.
 *
 * Two columns from `sm` up, one on a phone. Labels sit above their values in
 * small caps so a long value can wrap without dragging its label with it.
 */
export function DetailSection({
  title,
  fields,
  hideWhenEmpty = false,
  children,
}: DetailSectionProps) {
  if (hideWhenEmpty && fields.every((field) => isEmpty(field.value)) && !children) return null;

  return (
    <section className="rounded-lg border p-3">
      <h4 className="mb-2.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        {title}
      </h4>
      {fields.length > 0 && (
        <dl className="grid grid-cols-1 gap-x-4 gap-y-2.5 sm:grid-cols-2">
          {fields.map((field) => (
            <DetailField key={field.label} {...field} />
          ))}
        </dl>
      )}
      {children}
    </section>
  );
}

/** A run of headline figures across the top of a dialog. */
export function DetailTotals({ items }: { items: { label: string; value: string }[] }) {
  return (
    <dl className="grid grid-cols-2 gap-2 sm:grid-cols-4">
      {items.map((item) => (
        <div key={item.label} className="rounded-lg border bg-muted/30 px-3 py-2">
          <dt className="truncate text-[11px] text-muted-foreground">{item.label}</dt>
          <dd className="truncate text-sm font-semibold tabular-nums">{item.value}</dd>
        </div>
      ))}
    </dl>
  );
}
