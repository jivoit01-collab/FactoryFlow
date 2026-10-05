/**
 * The pieces the four outstanding reports share: the sort header, the company
 * they are read for, Refresh, the error shown when SAP cannot be read, a party
 * cell and the transport cell. Their hooks and helpers are in
 * `outstandingSupport.ts`.
 */
import {
  AlertTriangle,
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  Building2,
  FileDown,
  type LucideIcon,
  RefreshCw,
} from 'lucide-react';
import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';

import { EmptyPanel, StatusPill, Th } from '@/shared/components/page';
import { Button } from '@/shared/components/ui';
import { cn, formatDay, getErrorMessage } from '@/shared/utils';

import type { TransportFields } from '../../api';
import { type SortState, useCompanyName } from './outstandingSupport';

/** A column header that sorts the table by its column. */
export function SortTh<K extends string>({
  column,
  children,
  align,
  sort,
  onSort,
  title,
}: {
  column: K;
  children: ReactNode;
  align?: 'right';
  sort: SortState<K>;
  onSort: (column: K) => void;
  title?: string;
}) {
  const active = sort.key === column;
  const Icon = !active ? ArrowUpDown : sort.dir === 'asc' ? ArrowUp : ArrowDown;
  return (
    <Th
      align={align}
      title={title}
      aria-sort={active ? (sort.dir === 'asc' ? 'ascending' : 'descending') : undefined}
    >
      <button
        type="button"
        onClick={() => onSort(column)}
        className={cn(
          'inline-flex items-center gap-1 uppercase tracking-wide hover:text-foreground',
          active && 'text-foreground',
          align === 'right' && 'flex-row-reverse',
        )}
      >
        {children}
        <Icon className={cn('h-3 w-3', !active && 'opacity-40')} />
      </button>
    </Th>
  );
}

export function CompanyPill() {
  const name = useCompanyName();
  if (!name) return null;
  return (
    <StatusPill tone="neutral" icon={Building2}>
      {name}
    </StatusPill>
  );
}

export function RefreshButton({ onClick, pending }: { onClick: () => void; pending: boolean }) {
  return (
    <Button variant="outline" onClick={onClick} disabled={pending} title="Read SAP again now">
      <RefreshCw className={cn('mr-1.5 h-4 w-4', pending && 'animate-spin')} />
      {pending ? 'Reading SAP…' : 'Refresh'}
    </Button>
  );
}

export function ExcelButton({
  onClick,
  disabled,
  busy,
}: {
  onClick: () => void;
  disabled?: boolean;
  busy?: boolean;
}) {
  return (
    <Button variant="outline" onClick={onClick} disabled={disabled || busy}>
      <FileDown className="mr-1.5 h-4 w-4" />
      {busy ? 'Preparing…' : 'Download Excel'}
    </Button>
  );
}

/** SAP could not be read and there is nothing to show: why, and a way to try again. */
export function SapReadError({
  what,
  error,
  onRetry,
  retrying,
}: {
  what: string;
  error: unknown;
  onRetry: () => void;
  retrying?: boolean;
}) {
  return (
    <EmptyPanel
      icon={AlertTriangle}
      message={`${what} could not be read from SAP`}
      hint={getErrorMessage(error, 'Try again in a moment.')}
      action={
        <Button variant="outline" onClick={onRetry} disabled={retrying}>
          <RefreshCw className={cn('mr-1.5 h-4 w-4', retrying && 'animate-spin')} />
          Try again
        </Button>
      }
    />
  );
}

/** A read failed while older figures are on screen: say so above them. */
export function StaleNotice({ error }: { error: unknown }) {
  return (
    <p
      role="alert"
      className="flex items-start gap-2 rounded-xl border border-rose-300 bg-rose-50 px-4 py-3 text-sm text-rose-800 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-300"
    >
      <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
      <span>
        SAP could not be read again: {getErrorMessage(error, 'try again in a moment.')} The figures
        below are from the last read.
      </span>
    </p>
  );
}

/** Two or three choices as one control, e.g. Vendors | Customers. */
export function Segmented<T extends string>({
  value,
  options,
  onChange,
  label,
}: {
  value: T;
  options: { value: T; label: string; icon?: LucideIcon }[];
  onChange: (value: T) => void;
  label: string;
}) {
  return (
    <div
      role="group"
      aria-label={label}
      className="inline-flex max-w-full flex-wrap rounded-lg border bg-card p-0.5 shadow-sm"
    >
      {options.map((option) => {
        const Icon = option.icon;
        const on = option.value === value;
        return (
          <button
            key={option.value}
            type="button"
            onClick={() => onChange(option.value)}
            aria-pressed={on}
            className={cn(
              'inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors',
              on
                ? 'bg-primary text-primary-foreground'
                : 'text-muted-foreground hover:text-foreground',
            )}
          >
            {Icon && <Icon className="h-3.5 w-3.5" />}
            {option.label}
          </button>
        );
      })}
    </div>
  );
}

/** A party's name over its SAP code; the name links to its ledger when there is one to open. */
export function PartyCell({
  name,
  code,
  to,
  extra,
}: {
  name: string;
  code: string;
  to?: string | null;
  extra?: ReactNode;
}) {
  return (
    <>
      {to ? (
        <Link
          to={to}
          onClick={(event) => event.stopPropagation()}
          className="block font-medium text-primary hover:underline"
          title="Open the ledger"
        >
          {name || code}
        </Link>
      ) : (
        <span className="block font-medium">{name || code}</span>
      )}
      <span className="block font-mono text-xs text-muted-foreground">
        {code}
        {extra}
      </span>
    </>
  );
}

/** Transporter, vehicle and bilty, as many as the document has. */
export function TransportCell({ row }: { row: TransportFields }) {
  const bilty = [
    row.bilty_number && `Bilty ${row.bilty_number}`,
    row.bilty_date && formatDay(row.bilty_date),
  ]
    .filter(Boolean)
    .join(' · ');
  const lr = row.lr_number && row.lr_number !== row.bilty_number ? `LR ${row.lr_number}` : '';
  if (!row.transporter && !row.vehicle_number && !bilty && !lr) {
    return <span className="text-muted-foreground">—</span>;
  }
  return (
    <>
      {row.transporter && <span className="block whitespace-nowrap">{row.transporter}</span>}
      {row.vehicle_number && (
        <span className="block whitespace-nowrap font-mono text-xs">{row.vehicle_number}</span>
      )}
      {(bilty || lr) && (
        <span className="block whitespace-nowrap text-xs text-muted-foreground">
          {[bilty, lr].filter(Boolean).join(' · ')}
        </span>
      )}
    </>
  );
}
