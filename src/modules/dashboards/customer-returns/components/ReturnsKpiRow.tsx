import {
  AlertTriangle,
  Droplets,
  IndianRupee,
  PackageX,
  Truck,
  Undo2,
  Users,
} from 'lucide-react';

import { type AccentKey,ACCENTS } from '@/shared/components/dashboard';
import { Card } from '@/shared/components/ui';
import { cn } from '@/shared/utils';

import type { ReturnsConditionRow, ReturnsTotals } from '../types';
import { compactMoney, compactQty, exactQty, percent } from '../utils/format';

interface TileProps {
  label: string;
  value: string;
  /** The second line. One fact that qualifies the number above it. */
  note: string;
  icon: typeof Undo2;
  accent: AccentKey;
  /** Shown on hover / focus as the browser tooltip — the exact figure, or a caveat. */
  title?: string;
}

function Tile({ label, value, note, icon: Icon, accent, title }: TileProps) {
  const tone = ACCENTS[accent];

  return (
    <Card
      title={title}
      className={cn(
        'group relative overflow-hidden border-border/60 bg-gradient-to-br to-transparent p-4',
        tone.wash,
        'transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg',
        tone.glow,
      )}
    >
      <span
        className={cn(
          'absolute inset-x-0 top-0 h-0.5 scale-x-0 transition-transform duration-200 group-hover:scale-x-100',
          tone.bar,
        )}
      />
      <div className="flex items-start justify-between gap-3">
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          {label}
        </p>
        <span
          className={cn(
            'flex h-8 w-8 shrink-0 items-center justify-center rounded-lg transition-transform duration-200 group-hover:scale-110',
            tone.iconBg,
          )}
        >
          <Icon className={cn('h-4 w-4', tone.icon)} />
        </span>
      </div>
      <p className="mt-2 text-2xl font-bold tabular-nums tracking-tight">{value}</p>
      <p className="mt-1 text-xs leading-snug text-muted-foreground">{note}</p>
    </Card>
  );
}

interface ReturnsKpiRowProps {
  totals: ReturnsTotals;
  /** For the two named conditions that get a tile of their own. */
  conditions: ReturnsConditionRow[];
}

/**
 * The eight numbers somebody wants before they look at anything else.
 *
 * Ordered as the question is actually asked: how much came back, how much of it
 * is unsellable, and then the two specific answers people come to this board
 * for — how much leaked and how much was damaged. The commercial figures follow,
 * and the only forward-looking tile is deliberately last: it is a workload, not
 * a result.
 *
 * "Unsellable" and the two beneath it are different cuts and must not be added
 * together — unsellable is everything that is not Good, and Leaked and Damaged
 * are two of the states inside it.
 */
export function ReturnsKpiRow({ totals, conditions }: ReturnsKpiRowProps) {
  const damaged = conditions.find((row) => row.condition === 'DAMAGED');

  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      <Tile
        label="Returns"
        value={String(totals.returns)}
        note={
          totals.cancelled
            ? `${totals.arrived} arrived · ${totals.cancelled} cancelled`
            : `${totals.arrived} arrived at the gate`
        }
        icon={Undo2}
        accent="indigo"
        title="Cancelled returns are counted here but excluded from every other figure on the board."
      />
      <Tile
        label="Quantity back"
        value={compactQty(totals.quantity)}
        note={`${totals.lines} line${totals.lines === 1 ? '' : 's'} keyed in`}
        icon={PackageX}
        accent="sky"
        title={`${exactQty(totals.quantity)} — in each line's own invoice unit, so cases and pieces are added together.`}
      />
      <Tile
        label="Unsellable"
        value={percent(totals.damaged_share)}
        note={`${compactQty(totals.damaged_quantity)} of everything that came back`}
        icon={AlertTriangle}
        accent="rose"
        title="Everything that came back as anything other than Good — leaked, damaged, expired or other."
      />
      <Tile
        label="Leaked"
        value={compactQty(totals.leaked_quantity)}
        note={
          totals.leaked_inferred > 0
            ? `${compactQty(totals.leaked_recorded)} keyed · ${compactQty(totals.leaked_inferred)} from the reason text`
            : `${percent(totals.leaked_share)} of everything that came back`
        }
        icon={Droplets}
        accent="violet"
        title={
          totals.leaked_inferred > 0
            ? 'Counted once either way: returns booked before "Leaked" was a condition are Damaged with the word in their reason, and are read from that text. That second figure should fall to zero as those returns age out of the window.'
            : 'Every leak in this window was keyed on the condition itself.'
        }
      />
      <Tile
        label="Damaged"
        value={compactQty(damaged?.quantity ?? 0)}
        note={`${percent(damaged?.share ?? 0)} — dents, tears, packing`}
        icon={PackageX}
        accent="orange"
        title="The Damaged condition specifically, not the whole unsellable figure above."
      />
      <Tile
        label="Credited value"
        value={compactMoney(totals.value)}
        note="Invoice-basis lines only"
        icon={IndianRupee}
        accent="amber"
        title="A debit-note or letter-pad line carries no price, so it adds nothing here — this is the floor, not the total."
      />
      <Tile
        label="Customers"
        value={String(totals.customers)}
        note={`returning ${totals.skus} different SKU${totals.skus === 1 ? '' : 's'}`}
        icon={Users}
        accent="teal"
      />
      <Tile
        label="Still on the road"
        value={String(totals.awaiting_arrival)}
        note={
          totals.pending_approval
            ? `${totals.pending_approval} also awaiting approval`
            : 'booked, not yet gated in'
        }
        icon={Truck}
        accent="cyan"
        title="Booked returns whose truck has not been marked in at the gate yet."
      />
    </div>
  );
}
