import { ChevronDown, ChevronRight } from 'lucide-react';
import { useState } from 'react';

import { Badge, Button, Input } from '@/shared/components/ui';
import { cn } from '@/shared/utils';

import type { CoverVerdict, DailyRunRow, VerdictOutcome } from '../types';

const VERDICT_STYLE: Record<CoverVerdict, { label: string; className: string }> = {
  RED: { label: 'Order today', className: 'bg-destructive text-destructive-foreground' },
  AMBER: { label: 'Getting close', className: 'bg-amber-500 text-white' },
  GREEN: { label: 'Fine', className: 'bg-emerald-600 text-white' },
  UNKNOWN: { label: 'Cannot judge', className: 'bg-muted text-muted-foreground' },
};

const OUTCOMES: { value: VerdictOutcome; label: string }[] = [
  { value: 'REAL', label: 'Real' },
  { value: 'WRONG_DATA', label: 'Wrong data' },
  { value: 'ALREADY_HANDLED', label: 'Already handled' },
];

interface Props {
  rows: DailyRunRow[];
  canAct: boolean;
  onSetOwner: (rowId: number, owner: string) => void;
  onSetVerdict: (rowId: number, outcome: VerdictOutcome, note: string) => void;
}

/** The working, shown. The method's whole claim is that anyone can redo it on
 *  paper, which is only true if the intermediate numbers are on screen. */
function Working({ row }: { row: DailyRunRow }) {
  return (
    <div className="space-y-1 rounded-md bg-muted/40 p-3 text-xs">
      <div className="grid gap-x-6 gap-y-1 sm:grid-cols-2">
        <span>
          1. {row.units_per_day} units/day × {row.quantity_per_unit} per unit ={' '}
          <b>{row.consumption_per_day}</b> {row.unit}/day
        </span>
        <span>
          2. {row.on_hand} on hand − {row.committed} committed = <b>{row.free_stock}</b> free
        </span>
        <span>
          3. {row.free_stock} ÷ {row.consumption_per_day} = <b>{row.days_of_cover}</b>{' '}
          production days
        </span>
        <span>
          4. = <b>{row.cover_calendar_days}</b> calendar days of cover
        </span>
        <span>
          5. lead time <b>{row.lead_time_days ?? '—'}d</b>{' '}
          {row.lead_time_source === 'MEASURED'
            ? `(measured from ${row.lead_time_samples} deliveries)`
            : row.lead_time_source === 'TEMPLATE'
              ? '(typed in — no delivery history)'
              : '(unknown)'}
        </span>
        <span>
          6. runs out <b>{row.stockout_date ?? '—'}</b>, order by{' '}
          <b>{row.order_by_date ?? '—'}</b>
        </span>
      </div>
    </div>
  );
}

export function DailyRunRows({ rows, canAct, onSetOwner, onSetVerdict }: Props) {
  const [open, setOpen] = useState<number | null>(null);
  const [owners, setOwners] = useState<Record<number, string>>({});
  const [notes, setNotes] = useState<Record<number, string>>({});

  if (rows.length === 0) {
    return <p className="p-6 text-center text-sm text-muted-foreground">Nothing to show.</p>;
  }

  return (
    <div className="divide-y">
      {rows.map((row) => {
        const style = VERDICT_STYLE[row.verdict];
        const expanded = open === row.id;
        const needsVerdict = row.verdict === 'RED' && !row.row_verdict;

        return (
          <div key={row.id} className={cn('p-3', row.verdict === 'RED' && 'bg-destructive/5')}>
            <div className="flex flex-wrap items-start justify-between gap-2">
              <button
                type="button"
                className="flex items-start gap-2 text-left"
                onClick={() => setOpen(expanded ? null : row.id)}
              >
                {expanded ? (
                  <ChevronDown className="mt-1 h-4 w-4 shrink-0" />
                ) : (
                  <ChevronRight className="mt-1 h-4 w-4 shrink-0" />
                )}
                <span>
                  <span className="font-medium">{row.material_code}</span>
                  {row.material_name && (
                    <span className="text-muted-foreground"> · {row.material_name}</span>
                  )}
                  <span className="block text-xs text-muted-foreground">
                    {row.days_of_cover} days of cover vs {row.lead_time_days ?? '—'}d lead
                    {row.days_late > 0 && (
                      <span className="text-destructive"> · {row.days_late} days late</span>
                    )}
                    {row.supplier_name && ` · ${row.supplier_name}`}
                  </span>
                </span>
              </button>
              <div className="flex items-center gap-2">
                {row.row_verdict && (
                  <Badge variant="outline">
                    {OUTCOMES.find((o) => o.value === row.row_verdict?.outcome)?.label}
                  </Badge>
                )}
                <Badge className={style.className}>{style.label}</Badge>
              </div>
            </div>

            {expanded && (
              <div className="mt-3 space-y-3 pl-6">
                <Working row={row} />

                {row.verdict === 'RED' && (
                  <div className="flex flex-wrap items-end gap-2">
                    <div>
                      <label className="text-xs text-muted-foreground">Owner</label>
                      <Input
                        className="h-8 w-44"
                        placeholder="Who is calling?"
                        value={owners[row.id] ?? row.owner}
                        onChange={(e) =>
                          setOwners({ ...owners, [row.id]: e.target.value })
                        }
                      />
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={!canAct}
                      onClick={() => onSetOwner(row.id, owners[row.id] ?? row.owner)}
                    >
                      Set owner
                    </Button>
                  </div>
                )}

                {row.verdict === 'RED' && (
                  <div className="space-y-2 rounded-md border p-3">
                    <p className="text-sm font-medium">
                      After the call — what actually happened?
                    </p>
                    {/* This log is the whole point of the trial: without it nobody
                        ever learns whether the alarms were worth raising. */}
                    <Input
                      className="h-8"
                      placeholder="What the supplier said"
                      value={notes[row.id] ?? row.row_verdict?.note ?? ''}
                      onChange={(e) => setNotes({ ...notes, [row.id]: e.target.value })}
                    />
                    <div className="flex flex-wrap gap-2">
                      {OUTCOMES.map((o) => (
                        <Button
                          key={o.value}
                          size="sm"
                          variant={
                            row.row_verdict?.outcome === o.value ? 'default' : 'outline'
                          }
                          onClick={() =>
                            onSetVerdict(
                              row.id,
                              o.value,
                              notes[row.id] ?? row.row_verdict?.note ?? '',
                            )
                          }
                        >
                          {o.label}
                        </Button>
                      ))}
                    </div>
                    {row.row_verdict && (
                      <p className="text-xs text-muted-foreground">
                        Recorded by {row.row_verdict.recorded_by || 'someone'} on{' '}
                        {new Date(row.row_verdict.recorded_at).toLocaleDateString()}
                      </p>
                    )}
                  </div>
                )}
              </div>
            )}

            {!expanded && needsVerdict && (
              <p className="mt-1 pl-6 text-xs text-amber-600">
                No verdict recorded yet.
              </p>
            )}
          </div>
        );
      })}
    </div>
  );
}
