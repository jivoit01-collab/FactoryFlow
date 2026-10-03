import {
  ArrowDownRight,
  ArrowUpRight,
  Factory,
  IndianRupee,
  type LucideIcon,
  Minus,
  Trash2,
  Users,
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
 * The five headline figures, each against the period before.
 *
 * Green and red only where the direction is a judgement — more litres, less
 * wastage, a cheaper litre. Labour and power spend rise with output, so their
 * change is drawn in grey; a busier day is not a worse one.
 *
 * A figure that is not known says why under it rather than showing a zero.
 */
export function ReportKpiRow({ report }: { report: OperationsReport }) {
  const { totals: now, previous: was, view, meta } = report;
  const gap = (section: Parameters<typeof sectionGap>[1]) => sectionGap(meta, section);

  const labourSub = (() => {
    if (gap('labour')) return gap('labour') as string;
    const people = view === 'day' ? `${whole(now.heads)} people` : `${whole(now.heads)} a day`;
    const days = `${whole(now.manDays)} man-days`;
    if (now.labourCost === null && now.manDays) return `${people} · no labour rate`;
    return view === 'day' ? people : `${people} · ${days}`;
  })();

  const powerSub = (() => {
    if (gap('power')) return gap('power') as string;
    if (now.kwh === null) return 'No meter readings';
    const perKl = now.kwhPerKl === null ? NIL : whole(now.kwhPerKl);
    const unread = now.powerUnreadDays
      ? ` · ${now.powerUnreadDays} day${now.powerUnreadDays === 1 ? '' : 's'} unread`
      : '';
    return `${rupeesCompact(now.powerCost)} · ${perKl} kWh per KL${unread}`;
  })();

  const costSub = (() => {
    if (now.perLitre.total !== null) return 'Labour, power and wastage';
    if (now.litres === 0) return 'Nothing was filled';
    // Without litres every head is unknown per litre; say the cause, not the
    // three symptoms.
    if (now.litres === null) return 'Litres not known';
    const missing = [
      now.labourCost === null && 'labour',
      now.powerCost === null && 'power',
      now.wastageValue === null && 'wastage',
    ].filter(Boolean);
    return missing.length ? `No ${missing.join(', ')} figure` : 'Not known';
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
      label: 'Electricity',
      icon: Zap,
      accent: 'orange',
      value: now.kwh === null ? NIL : `${compact(now.kwh)} kWh`,
      sub: powerSub,
      change: change(now.kwh, was.kwh),
      goodWhen: null,
    },
    {
      label: 'Cost per litre',
      icon: IndianRupee,
      accent: 'slate',
      value: perLitre(now.perLitre.total),
      sub: costSub,
      change: change(now.perLitre.total, was.perLitre.total),
      goodWhen: 'down',
    },
  ];

  return (
    <div className="grid grid-cols-[repeat(auto-fit,minmax(200px,1fr))] gap-3.5">
      {tiles.map((tile) => {
        const tone = ACCENTS[tile.accent];
        return (
          <div key={tile.label} className="rounded-xl border bg-card p-4 shadow-sm">
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
