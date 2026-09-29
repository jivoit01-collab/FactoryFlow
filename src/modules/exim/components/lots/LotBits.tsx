/**
 * The small pieces the oil lot screens share: the oil's name with its colour,
 * the quantity bar, the ETA / arrival cell with its countdown, the contract
 * chip, the map link, and one change from a lot's history.
 */
import { ArrowRight, MapPin } from 'lucide-react';
import { Link } from 'react-router-dom';

import { StatusPill } from '@/shared/components/page';
import { Button } from '@/shared/components/ui';
import { cn, formatDay } from '@/shared/utils';

import type { Lot, LotChange } from '../../types';
import { daysUntil, fmtKg } from '../../utils';
import {
  changeValue,
  contractDays,
  contractLeft,
  createdValues,
  dayCountdown,
  fieldLabel,
  mapUrl,
} from './lotFormat';

/** The oil a lot is of: a dot in the colour the tank drawings use, the name, the code. */
export function OilName({
  name,
  code,
  color,
}: {
  name: string;
  code: string;
  color?: string | null;
}) {
  return (
    <span className="inline-flex min-w-0 items-center gap-2">
      <span
        aria-hidden="true"
        className="h-2.5 w-2.5 shrink-0 rounded-full border border-black/10"
        style={{ backgroundColor: color || undefined }}
      />
      <span className="min-w-0">
        <span className="block whitespace-nowrap font-medium">{name}</span>
        <span className="block font-mono text-xs text-muted-foreground">{code}</span>
      </span>
    </span>
  );
}

/** Kilograms, with a bar showing how the lot compares with the largest one listed. */
export function QuantityBar({ kg, max }: { kg: string | number; max: number }) {
  const share = max > 0 ? Math.min(100, (Number(kg) / max) * 100) : 0;
  return (
    <span className="block min-w-24">
      <span className="block whitespace-nowrap font-semibold">{fmtKg(kg)}</span>
      <span className="mt-1 block h-1 overflow-hidden rounded-full bg-muted">
        <span className="block h-full rounded-full bg-primary/50" style={{ width: `${share}%` }} />
      </span>
    </span>
  );
}

/** A contract's days left: expired, under a week, or plenty. */
export function ContractChip({ end }: { end?: string | null }) {
  const days = daysUntil(end);
  if (days === null) return null;
  const tone = days < 0 ? 'blocked' : days <= 7 ? 'warn' : 'neutral';
  return <StatusPill tone={tone}>{contractLeft(days)}</StatusPill>;
}

/**
 * EXIM's "ETA / Arrival" column: the day it came, or the day it is due with how
 * far off that is. A contract not loaded yet shows when the contract ends.
 */
export function ArrivalCell({ lot }: { lot: Lot }) {
  if (lot.arrival_date) {
    return (
      <span className="flex flex-col items-start gap-1">
        <span className="whitespace-nowrap text-sm">{formatDay(lot.arrival_date)}</span>
        <StatusPill tone="done">Arrived</StatusPill>
      </span>
    );
  }
  const days = daysUntil(lot.eta);
  if (lot.eta && days !== null) {
    const tone = days === 0 ? 'warn' : days === 1 ? 'info' : days > 1 ? 'progress' : 'neutral';
    return (
      <span className="flex flex-col items-start gap-1">
        <span className="whitespace-nowrap text-sm">{formatDay(lot.eta)}</span>
        <StatusPill tone={tone}>{dayCountdown(days)}</StatusPill>
      </span>
    );
  }
  if (lot.status === 'IN_CONTRACT' && lot.contract_end) {
    return (
      <span className="flex flex-col items-start gap-1">
        <span className="whitespace-nowrap text-sm">
          <span className="text-muted-foreground">Contract to </span>
          {formatDay(lot.contract_end)}
        </span>
        <ContractChip end={lot.contract_end} />
      </span>
    );
  }
  return <span className="text-muted-foreground">—</span>;
}

/** A contract's period and days left, under its two dates in a form or on a lot's page. */
export function ContractPeriod({ start, end }: { start?: string | null; end?: string | null }) {
  const { periodDays, daysLeft } = contractDays(start, end);
  if (periodDays === null && daysLeft === null) return null;
  return (
    <div className="grid grid-cols-2 gap-3 rounded-lg border bg-muted/40 px-3 py-2 text-sm">
      <p>
        <span className="text-muted-foreground">Period </span>
        <span
          className={cn(
            'font-semibold',
            periodDays !== null && periodDays < 0 && 'text-rose-600 dark:text-rose-400',
          )}
        >
          {periodDays === null
            ? '—'
            : periodDays < 0
              ? 'ends before it starts'
              : `${periodDays} days`}
        </span>
      </p>
      <p>
        <span className="text-muted-foreground">Left </span>
        <span
          className={cn(
            'font-semibold',
            daysLeft !== null && daysLeft < 0 && 'text-rose-600 dark:text-rose-400',
            daysLeft !== null &&
              daysLeft >= 0 &&
              daysLeft <= 7 &&
              'text-amber-700 dark:text-amber-400',
          )}
        >
          {daysLeft === null ? '—' : contractLeft(daysLeft)}
        </span>
      </p>
    </div>
  );
}

/** A location, on the map. Labelled: an sr-only span here would widen a scrolling table. */
export function MapLink({ location }: { location: string }) {
  if (!location.trim()) return null;
  return (
    <Button variant="ghost" size="icon" asChild>
      <a
        href={mapUrl(location)}
        target="_blank"
        rel="noopener noreferrer"
        aria-label={`${location} on the map`}
        title={location}
        onClick={(event) => event.stopPropagation()}
      >
        <MapPin className="h-4 w-4 text-sky-600 dark:text-sky-400" />
      </a>
    </Button>
  );
}

/** A lot's number, as a link to its page when the reader may open it. */
export function LotLink({ id, canOpen = true }: { id: number; canOpen?: boolean }) {
  if (!canOpen) return <span className="font-mono">#{id}</span>;
  return (
    <Link
      to={`/exim/lots/${id}`}
      className="font-mono font-medium text-primary hover:underline"
      onClick={(event) => event.stopPropagation()}
    >
      #{id}
    </Link>
  );
}

export interface Choice<T extends string> {
  value: T;
  label: string;
  hint?: string;
  /** Why it cannot be chosen; the option shows, greyed, with this under it. */
  disabledReason?: string;
}

/** A small set of either-or answers (paid or unpaid, retain or tolerate), side by side. */
export function ChoiceGroup<T extends string>({
  label,
  value,
  onChange,
  options,
  error,
}: {
  label: string;
  value: T | '';
  onChange: (value: T) => void;
  options: Choice<T>[];
  error?: string;
}) {
  return (
    <div className="space-y-1.5">
      <p className="text-sm font-medium leading-none">{label}</p>
      <div
        role="radiogroup"
        aria-label={label}
        className={cn('grid gap-2', options.length > 1 && 'sm:grid-cols-2')}
      >
        {options.map((option) => {
          const selected = value === option.value;
          const disabled = !!option.disabledReason;
          return (
            <button
              key={option.value}
              type="button"
              role="radio"
              aria-checked={selected}
              disabled={disabled}
              onClick={() => onChange(option.value)}
              className={cn(
                'rounded-lg border px-3 py-2 text-left text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                selected ? 'border-primary bg-primary/5 ring-1 ring-primary' : 'hover:bg-muted/60',
                disabled && 'cursor-not-allowed opacity-60 hover:bg-transparent',
              )}
            >
              <span className="block font-medium">{option.label}</span>
              {(option.disabledReason || option.hint) && (
                <span className="mt-0.5 block text-xs text-muted-foreground">
                  {option.disabledReason ?? option.hint}
                </span>
              )}
            </button>
          );
        })}
      </div>
      {error && <p className="text-xs text-rose-600">{error}</p>}
    </div>
  );
}

/** What one change did: each field from its old value to its new, or the lot's first values. */
export function ChangeLines({ change }: { change: LotChange }) {
  const created = createdValues(change);
  const lines = change.changed_fields.filter((f) => f.field !== '__create__');
  if (!created.length && !lines.length) {
    return <p className="text-sm text-muted-foreground">No tracked field changed.</p>;
  }
  return (
    <div className="space-y-1.5">
      {created.length > 0 && (
        <dl className="flex flex-wrap gap-x-4 gap-y-1 text-sm">
          {created.map((entry) => (
            <div key={entry.field} className="flex gap-1.5">
              <dt className="text-muted-foreground">{fieldLabel(entry.field)}</dt>
              <dd className="font-medium">{entry.value}</dd>
            </div>
          ))}
        </dl>
      )}
      {lines.map((line, index) => (
        <div
          key={`${line.field}-${index}`}
          className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-sm"
        >
          <span className="text-muted-foreground">{fieldLabel(line.field)}</span>
          <span className="text-muted-foreground line-through decoration-rose-400/70">
            {changeValue(line.field, line.old)}
          </span>
          <ArrowRight className="h-3.5 w-3.5 text-muted-foreground" aria-hidden="true" />
          <span className="font-medium">{changeValue(line.field, line.new)}</span>
        </div>
      ))}
    </div>
  );
}
