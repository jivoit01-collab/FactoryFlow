/**
 * The freight part of linking a truck: where it is going, the slab it runs as,
 * the benchmark for that, and the freight actually agreed.
 *
 * Shown in the linking sheet and in the truck card's Freight dialog. The
 * benchmark is worked out as the desk types; freight over it — or a slab with
 * no benchmark at all — asks for a reason, and waits in Admin > Freight
 * Approvals before the gate will let the truck in.
 */
import { AlertTriangle, CheckCircle2 } from 'lucide-react';
import { useEffect, useMemo } from 'react';

import { SearchableSelect } from '@/shared/components';
import { Input, Label, NativeSelect, SelectOption, Textarea } from '@/shared/components/ui';
import { cn } from '@/shared/utils';

import type { FreightDestination } from '../../types/freightBenchmark.types';
import { formatRate, slabBandHint } from '../freight-benchmarks/freightBenchmark';
import { draftFromApproval, type TruckFreightDraft } from './truckFreight';
import { formatRupees, KG, type TruckFreight } from './useTruckFreight';

function destinationLabel(destination: FreightDestination): string {
  const where = [destination.district, destination.state].filter(Boolean).join(', ');
  return where ? `${destination.name} — ${where}` : destination.name;
}

export function TruckFreightFields({
  idPrefix,
  draft,
  onChange,
  freight,
  loadKg,
  error,
}: {
  idPrefix: string;
  draft: TruckFreightDraft;
  onChange: (draft: TruckFreightDraft) => void;
  freight: TruckFreight;
  loadKg: number | null;
  error?: string;
}) {
  const { table, isLoading, isError, capacityKg, current, quote } = freight;

  // A truck that already has a freight opens with it, so adding a bill to it
  // does not mean typing the freight again.
  useEffect(() => {
    if (!draft.touched && current) onChange(draftFromApproval(current));
  }, [current, draft.touched, onChange]);

  const destinations = useMemo(
    () => (table?.destinations ?? []).filter((d) => d.is_active),
    [table],
  );
  const slabOptions = useMemo(() => {
    const slabs = (table?.slabs ?? []).filter((s) => s.is_active);
    const rates = new Map((quote.destination?.rates ?? []).map((r) => [r.slab, r]));
    // The destination's rated slabs first — those are the ones with a benchmark.
    return [...slabs.filter((s) => rates.has(s.id)), ...slabs.filter((s) => !rates.has(s.id))].map(
      (slab) => ({ slab, rate: rates.get(slab.id) ?? null }),
    );
  }, [table, quote.destination]);

  function set(patch: Partial<TruckFreightDraft>) {
    onChange({ ...draft, ...patch, touched: true });
  }

  return (
    <div className="space-y-3 rounded-md border p-4">
      <div>
        <h3 className="text-sm font-semibold">Freight</h3>
        <p className="text-xs text-muted-foreground">
          For the whole truck. It is split over the truck&apos;s bills by litres.
        </p>
      </div>

      <SearchableSelect<FreightDestination>
        value={draft.destinationId !== null ? String(draft.destinationId) : ''}
        defaultDisplayText={quote.destination ? destinationLabel(quote.destination) : ''}
        items={destinations}
        isLoading={isLoading}
        isError={isError}
        label="Dispatch location"
        required
        placeholder="Search a destination"
        inputId={`${idPrefix}-destination`}
        getItemKey={(d) => d.id}
        getItemLabel={destinationLabel}
        filterFn={(d, search) =>
          [d.name, d.district, d.state, d.pin_code].some((v) =>
            v.toLowerCase().includes(search.toLowerCase()),
          )
        }
        loadingText="Loading destinations…"
        emptyText="No destinations on the Freight Benchmarks"
        notFoundText="No destination matches — add it on Freight Benchmarks"
        errorText="The destinations could not be read"
        // A new place means a new benchmark, so the slab follows capacity again.
        onItemSelect={(d) => set({ destinationId: d.id, slabId: null })}
        onClear={() => set({ destinationId: null, slabId: null })}
      />

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label>Vehicle capacity</Label>
          <p className="flex h-9 items-center rounded-md border bg-muted/30 px-3 text-sm tabular-nums">
            {capacityKg !== null ? `${KG.format(capacityKg)} kg` : 'Not on the vehicle master'}
          </p>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor={`${idPrefix}-slab`}>Slab</Label>
          <NativeSelect
            id={`${idPrefix}-slab`}
            value={quote.slab ? String(quote.slab.id) : ''}
            onChange={(event) =>
              set({ slabId: event.target.value ? Number(event.target.value) : null })
            }
            disabled={!quote.destination}
          >
            <SelectOption value="">
              {quote.destination ? 'Pick a slab' : 'Pick a destination first'}
            </SelectOption>
            {slabOptions.map(({ slab, rate }) => (
              <SelectOption key={slab.id} value={String(slab.id)}>
                {slab.label}
                {slabBandHint(slab) ? ` (${slabBandHint(slab)})` : ''}
                {rate ? ` — ${formatRate(rate)}` : ' — no benchmark'}
                {slab.id === quote.suggestedSlab?.id ? ' · by capacity' : ''}
              </SelectOption>
            ))}
          </NativeSelect>
          {quote.slab && quote.suggestedSlab && quote.slab.id !== quote.suggestedSlab.id && (
            <p className="text-xs text-amber-700 dark:text-amber-400">
              The capacity puts this truck in {quote.suggestedSlab.label}; the approver is shown the
              change.
            </p>
          )}
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label>Calculated freight (benchmark)</Label>
          <p className="flex h-9 items-center rounded-md border bg-muted/30 px-3 text-sm tabular-nums">
            {quote.benchmark !== null
              ? formatRupees(quote.benchmark)
              : quote.slab
                ? 'No benchmark for this slab'
                : '—'}
          </p>
          {quote.rate?.basis === 'PER_KG' && quote.weightKg !== null && (
            <p className="text-xs text-muted-foreground">
              {formatRate(quote.rate)} × {KG.format(quote.weightKg)} kg
              {loadKg ? ' of bills' : ' capacity (the bills carry no weight)'}
            </p>
          )}
        </div>
        <div className="space-y-1.5">
          <Label htmlFor={`${idPrefix}-actual`}>Actual freight (₹)</Label>
          <Input
            id={`${idPrefix}-actual`}
            type="number"
            inputMode="decimal"
            min="0"
            step="0.01"
            value={draft.actual}
            onChange={(event) => set({ actual: event.target.value })}
            className="text-right"
            placeholder="Agreed with the transporter"
          />
        </div>
      </div>

      {quote.actual !== null && quote.slab && (
        <div
          className={cn(
            'flex items-start gap-2 rounded-md px-3 py-2 text-sm',
            quote.needsApproval
              ? 'bg-amber-50 text-amber-900 dark:bg-amber-500/10 dark:text-amber-200'
              : 'bg-emerald-50 text-emerald-900 dark:bg-emerald-500/10 dark:text-emerald-200',
          )}
        >
          {quote.needsApproval ? (
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          ) : (
            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
          )}
          <span>
            {!quote.needsApproval
              ? 'Within the benchmark — nothing to approve.'
              : quote.benchmark === null
                ? 'No benchmark to hold it against, so it needs approving in Admin before the truck can gate in.'
                : `${formatRupees(quote.actual - quote.benchmark)} over the benchmark (${(
                    ((quote.actual - quote.benchmark) / quote.benchmark) *
                    100
                  ).toFixed(1)}%). It needs approving in Admin before the truck can gate in.`}
          </span>
        </div>
      )}

      {quote.needsApproval && (
        <div className="space-y-1.5">
          <Label htmlFor={`${idPrefix}-reason`}>Why is it over? (for the approver)</Label>
          <Textarea
            id={`${idPrefix}-reason`}
            value={draft.reason}
            onChange={(event) => set({ reason: event.target.value })}
            rows={2}
            maxLength={500}
          />
        </div>
      )}

      {error && <p className="text-sm text-rose-600">{error}</p>}
    </div>
  );
}
