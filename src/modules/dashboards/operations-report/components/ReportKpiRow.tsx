import {
  ArrowDownRight,
  ArrowUpRight,
  Factory,
  IndianRupee,
  type LucideIcon,
  Minus,
  Trash2,
  Undo2,
  Users,
  Wallet,
  Zap,
} from 'lucide-react';

import { type AccentKey, ACCENTS } from '@/shared/components/dashboard';
import { cn } from '@/shared/utils';

import type { OperationsReport } from '../types';
import { change, compact, NIL, perLitre, rupeesCompact, sectionGap, whole } from '../utils';

/** Which way is better. Null for a figure that is neither — labour spend rises with output. */
type GoodWhen = 'up' | 'down' | null;

/** A change smaller than this is "level", not a rise or a fall. */
const LEVEL_PCT = 0.5;

interface Tile {
  label: string;
  icon: LucideIcon;
  accent: AccentKey;
  value: string;
  sub: string;
  change: number | null;
  goodWhen: GoodWhen;
  /** Extra grid classes, for the tile that has to fill out a short row. */
  className?: string;
}

function Delta({ pct, goodWhen, vs }: { pct: number | null; goodWhen: GoodWhen; vs: string }) {
  if (pct === null) {
    return <span className="text-muted-foreground">No figure for {vs} to compare</span>;
  }

  const level = Math.abs(pct) < LEVEL_PCT;
  const rose = pct > 0;
  const verdict =
    level || goodWhen === null ? null : rose === (goodWhen === 'up') ? 'better' : 'worse';
  const Icon = level ? Minus : rose ? ArrowUpRight : ArrowDownRight;

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1',
        verdict === 'better' && 'text-emerald-600 dark:text-emerald-400',
        verdict === 'worse' && 'text-rose-600 dark:text-rose-400',
        verdict === null && 'text-muted-foreground',
      )}
      title={verdict ? `${verdict} than ${vs}` : undefined}
    >
      <Icon className="h-3.5 w-3.5 shrink-0" aria-hidden />
      <span className="tabular-nums">{level ? 'level' : `${Math.abs(pct).toFixed(1)}%`}</span>
      <span className="text-muted-foreground">vs {vs}</span>
      {verdict && <span className="sr-only">({verdict})</span>}
    </span>
  );
}

/**
 * The headline figures, each against the period before.
 *
 * Every cost tile leads with its rupees, the units it was bought in (kWh, man-
 * days) under it. Production is the one tile in litres: it is what the money
 * bought, and the report has no rupee figure for it.
 *
 * Green and red only where the direction is a judgement — more litres, less
 * wastage, a cheaper litre. Labour, salary and power spend rise with output or
 * with the days in the span, so their change is drawn in grey; a busier day is
 * not a worse one.
 *
 * A figure that is not known says why under it rather than showing a zero.
 */
export function ReportKpiRow({ report }: { report: OperationsReport }) {
  const { totals: now, previous: was, view, meta } = report;
  const gap = (section: Parameters<typeof sectionGap>[1]) => sectionGap(meta, section);
  // A span with unread meter days holds less electricity than it used, so it is
  // not set against one that was read in full: the gap would read as a saving.
  const powerComparable = !now.powerUnreadDays && !was.powerUnreadDays;

  const labourSub = (() => {
    if (gap('labour')) return gap('labour') as string;
    const people = view === 'day' ? `${whole(now.heads)} people` : `${whole(now.heads)} a day`;
    const days = `${whole(now.manDays)} man-days`;
    if (now.labourCost === null && now.manDays) return `${people} · no labour rate`;
    return view === 'day' ? people : `${people} · ${days}`;
  })();

  const salarySub = (() => {
    if (gap('salary')) return gap('salary') as string;
    if (now.salaryCost === null) {
      return now.salaryUncostedDays
        ? `No salary rate on ${whole(now.salaryUncostedDays)} day${now.salaryUncostedDays === 1 ? '' : 's'}`
        : 'No salary rate';
    }
    // The day view is one day's share of the month, so it says of what.
    if (view === 'day') return `Staff · 1 day of ${rupeesCompact(now.salaryMonthly)} a month`;
    return `Staff · ${perLitre(now.perLitre.salary)} a litre`;
  })();

  const powerSub = (() => {
    if (gap('power')) return gap('power') as string;
    if (now.kwh === null) return 'No meter readings';
    const perKl = now.kwhPerKl === null ? NIL : whole(now.kwhPerKl);
    const unread = now.powerUnreadDays
      ? ` · ${now.powerUnreadDays} day${now.powerUnreadDays === 1 ? '' : 's'} unread`
      : '';
    return `${compact(now.kwh)} kWh · ${perKl} kWh per KL${unread}`;
  })();

  const costSub = (() => {
    if (now.perLitre.total !== null) return 'Labour, salary, power and wastage';
    if (now.litres === 0) return 'Nothing was filled';
    // Without litres every head is unknown per litre; say the cause, not the
    // four symptoms.
    if (now.litres === null) return 'Litres not known';
    const missing = [
      now.labourCost === null && 'labour',
      now.salaryCost === null && 'salary',
      now.powerCost === null && 'power',
      now.wastageValue === null && 'wastage',
    ].filter(Boolean);
    return missing.length ? `No ${missing.join(', ')} figure` : 'Not known';
  })();

  const grSub = (() => {
    if (now.grReturns === null) return NIL;
    if (now.grReturns === 0) return 'Nothing came back';
    const spoiled =
      now.grQuantity && now.grSpoiledQuantity !== null
        ? ` · ${Math.round((now.grSpoiledQuantity / now.grQuantity) * 100)}% not good`
        : '';
    return `${whole(now.grReturns)} return${now.grReturns === 1 ? '' : 's'} · ${whole(now.grQuantity)} pcs${spoiled}`;
  })();

  const tiles: Tile[] = [
    {
      label: 'Production',
      icon: Factory,
      accent: 'violet',
      value: now.litres === null ? NIL : `${compact(now.litres)} L`,
      sub: gap('production') ?? `${whole(now.cases)} cases · ${whole(now.runs)} runs`,
      change: change(now.litres, was.litres),
      goodWhen: 'up',
    },
    {
      label: 'Wastage',
      icon: Trash2,
      accent: 'teal',
      value: rupeesCompact(now.wastageValue),
      sub:
        gap('wastage') ??
        (now.wastageUnpriced
          ? `Packing waste · ${whole(now.wastageUnpriced)} rows unpriced`
          : `Packing waste · ${perLitre(now.perLitre.wastage)} a litre`),
      change: change(now.wastageValue, was.wastageValue),
      goodWhen: 'down',
    },
    {
      label: 'Labour',
      icon: Users,
      accent: 'blue',
      value:
        now.labourCost === null && now.manDays
          ? `${whole(now.manDays)} man-days`
          : rupeesCompact(now.labourCost),
      sub: labourSub,
      change: change(now.labourCost, was.labourCost),
      goodWhen: null,
    },
    {
      label: 'Salary',
      icon: Wallet,
      accent: 'amber',
      value: rupeesCompact(now.salaryCost),
      sub: salarySub,
      change: change(now.salaryCost, was.salaryCost),
      goodWhen: null,
    },
    {
      label: 'Electricity',
      icon: Zap,
      accent: 'orange',
      value: rupeesCompact(now.powerCost),
      sub: powerSub,
      change: powerComparable ? change(now.powerCost, was.powerCost) : null,
      goodWhen: null,
    },
    {
      label: 'Cost per litre',
      icon: IndianRupee,
      accent: 'slate',
      value: perLitre(now.perLitre.total),
      sub: costSub,
      change: powerComparable ? change(now.perLitre.total, was.perLitre.total) : null,
      goodWhen: 'down',
    },
    {
      // Last, and outside the cost per litre: a return is product that came
      // back, not a cost of making the litre.
      label: 'Goods Return (GR)',
      icon: Undo2,
      accent: 'pink',
      value: rupeesCompact(now.grValue),
      sub: gap('returns') ?? grSub,
      change: change(now.grValue, was.grValue),
      goodWhen: 'down',
      // Seven tiles leave the last row short at two, three and four across; the
      // returns tile, outside the cost per litre, is the one that widens to
      // close it.
      className: 'sm:col-span-2 lg:col-span-3 xl:col-span-2',
    },
  ];

  return (
    // Two across on a tablet, three at a laptop desk, four from xl — never seven
    // in a row: with the sidebar open even a 1920 screen leaves each tile too
    // narrow for its line under the figure.
    <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {tiles.map((tile) => {
        const tone = ACCENTS[tile.accent];
        return (
          <div
            key={tile.label}
            className={cn('min-w-0 rounded-xl border bg-card p-4 shadow-sm', tile.className)}
          >
            <div className="flex items-start justify-between gap-3">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                {tile.label}
              </p>
              <span
                className={cn('grid h-8 w-8 shrink-0 place-items-center rounded-lg', tone.iconBg)}
              >
                <tile.icon className={cn('h-4 w-4', tone.icon)} />
              </span>
            </div>
            <p className="mt-2 truncate text-2xl font-semibold tabular-nums tracking-tight">
              {tile.value}
            </p>
            <p className="mt-0.5 truncate text-xs text-muted-foreground" title={tile.sub}>
              {tile.sub}
            </p>
            <p className="mt-2 border-t pt-2 text-xs">
              <Delta pct={tile.change} goodWhen={tile.goodWhen} vs={report.previousLabel} />
            </p>
          </div>
        );
      })}
    </div>
  );
}
