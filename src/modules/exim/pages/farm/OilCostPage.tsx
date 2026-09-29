/**
 * What the oil in the tanks cost, lot by lot. EXIM's In Tank Breakdown.
 *
 * An oil's lots in the tanks are lined up oldest first and taken from until
 * the litres its tanks hold are accounted for; the average is over those
 * litres. Litres no lot accounts for are left out of the average, and the page
 * says how many. The oil is in the address, so a breakdown can be sent on.
 */
import { AlertTriangle, Droplets, Hash, IndianRupee, RefreshCw, Scale, Weight } from 'lucide-react';
import { useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';

import { EXIM_PERMISSIONS } from '@/config/permissions/exim.permissions';
import { usePermission } from '@/core/auth/hooks/usePermission';
import {
  EmptyPanel,
  FilterBar,
  FilterField,
  PageHeader,
  ROW_CLASSES,
  StatTile,
  StatTileRow,
  TABLE_CLASSES,
  TableCard,
  TableEmpty,
  TableLoading,
  Td,
  Th,
  THEAD_CLASSES,
} from '@/shared/components';
import { Button, NativeSelect, SelectOption } from '@/shared/components/ui';
import { cn, formatDay, getErrorMessage } from '@/shared/utils';

import { useAverageCost, useAverageCosts } from '../../api';
import { LotLink } from '../../components/lots/LotBits';
import { fmtKg, fmtLitres, fmtMoney, fmtQty } from '../../utils';

const COLUMNS = 11;

export default function OilCostPage() {
  const canOpenLot = usePermission().hasPermission(EXIM_PERMISSIONS.LOT_VIEW);
  const list = useAverageCosts();
  const [searchParams, setSearchParams] = useSearchParams();

  const oils = useMemo(
    () => [...(list.data ?? [])].sort((a, b) => a.code.localeCompare(b.code)),
    [list.data],
  );
  const requested = Number(searchParams.get('oil')) || null;
  const selectedId = requested ?? oils[0]?.item ?? null;

  const single = useAverageCost(selectedId);
  // The list already carries every oil's breakdown, so it shows at once; the
  // oil's own read replaces it when it lands.
  const cost = single.data ?? oils.find((o) => o.item === selectedId) ?? null;
  const loading = !cost && (list.isLoading || single.isLoading);
  const notInTanks =
    requested !== null && !list.isLoading && !oils.some((o) => o.item === requested);

  function pick(value: string) {
    setSearchParams(
      (current) => {
        const next = new URLSearchParams(current);
        if (value) next.set('oil', value);
        else next.delete('oil');
        return next;
      },
      { replace: true },
    );
  }

  function refresh() {
    void list.refetch();
    if (selectedId) void single.refetch();
  }

  const refreshing = list.isFetching || single.isFetching;
  const lots = cost?.lots ?? [];
  const totals = lots.reduce(
    (sum, lot) => ({
      litres: sum.litres + lot.litres_in_tank,
      kg: sum.kg + lot.kg_in_tank,
      value: sum.value + lot.value,
    }),
    { litres: 0, kg: 0, value: 0 },
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Oil Cost"
        description="What the oil in the tanks cost, lot by lot. The tanks are taken to hold an oil's oldest lots, until its litres are accounted for."
        icon={IndianRupee}
        accent="teal"
      >
        <Button variant="outline" onClick={refresh} disabled={refreshing}>
          <RefreshCw className={cn('mr-1.5 h-4 w-4', refreshing && 'animate-spin')} />
          Refresh
        </Button>
      </PageHeader>

      <FilterBar label="Oil" isFetching={refreshing && !loading}>
        <FilterField label="Oil in the tanks" htmlFor="cost-oil" className="sm:min-w-80">
          <NativeSelect
            id="cost-oil"
            value={selectedId ? String(selectedId) : ''}
            onChange={(event) => pick(event.target.value)}
            disabled={list.isLoading || (oils.length === 0 && !notInTanks)}
          >
            {list.isLoading ? (
              <SelectOption value="">Loading the oils…</SelectOption>
            ) : oils.length === 0 && !notInTanks ? (
              <SelectOption value="">No oil is in the tanks</SelectOption>
            ) : null}
            {notInTanks && cost && (
              <SelectOption value={String(cost.item)}>
                {cost.code} · {cost.name} (not in the tanks now)
              </SelectOption>
            )}
            {oils.map((oil) => (
              <SelectOption key={oil.item} value={String(oil.item)}>
                {oil.code} · {oil.name}
              </SelectOption>
            ))}
          </NativeSelect>
        </FilterField>
      </FilterBar>

      {list.isError && !cost ? (
        <EmptyPanel
          icon={AlertTriangle}
          message="What the oils cost could not be read"
          hint={getErrorMessage(list.error, 'Try Refresh in a moment.')}
        />
      ) : !list.isLoading && !selectedId ? (
        <EmptyPanel
          icon={Droplets}
          message="No oil is in the tanks"
          hint="Once a dip puts an oil in a tank, its cost is worked out here."
        />
      ) : (
        <>
          <StatTileRow>
            <StatTile
              label="Lots"
              value={loading ? '…' : lots.length}
              sub="in the tanks for it"
              icon={Hash}
            />
            <StatTile
              label="Litres costed"
              value={loading || !cost ? '…' : `${fmtLitres(cost.matched_l)} L`}
              sub={cost ? `of ${fmtLitres(cost.tank_l)} L in the tanks` : undefined}
              icon={Droplets}
              accent="teal"
            />
            <StatTile
              label="Kilograms costed"
              value={loading || !cost ? '…' : `${fmtKg(cost.matched_kg)} kg`}
              sub={cost ? `${fmtQty(cost.matched_kg / 1000)} MT` : undefined}
              icon={Scale}
            />
            <StatTile
              label="Average per kg"
              value={loading || !cost ? '…' : `₹ ${fmtMoney(cost.matched_average_per_kg)}`}
              sub={
                cost && cost.unmatched_l > 0 && cost.matched_l > 0
                  ? `₹ ${fmtMoney(cost.average_per_kg)} over every kg in the tanks`
                  : 'over the lots'
              }
              icon={Weight}
              accent="indigo"
            />
            <StatTile
              label="Average per litre"
              value={loading || !cost ? '…' : `₹ ${fmtMoney(cost.matched_average_per_litre)}`}
              sub={
                cost && cost.unmatched_l > 0 && cost.matched_l > 0
                  ? `₹ ${fmtMoney(cost.average_per_litre)} over every litre in the tanks`
                  : 'over the lots'
              }
              icon={IndianRupee}
              accent="indigo"
            />
          </StatTileRow>

          {cost?.warning && (
            <p className="flex items-start gap-2 rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-800 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-300">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
              {cost.warning}
            </p>
          )}

          <TableCard
            summary={
              <span>
                {cost ? `${cost.code} · ${cost.name}` : 'Lots'} · {lots.length} lot
                {lots.length === 1 ? '' : 's'}
              </span>
            }
          >
            <table className={TABLE_CLASSES}>
              <thead className={THEAD_CLASSES}>
                <tr>
                  <Th className="w-10">#</Th>
                  <Th>Lot</Th>
                  <Th>Entered</Th>
                  <Th>Party</Th>
                  <Th>Vehicle</Th>
                  <Th>Transporter</Th>
                  <Th align="right">Rate per L (₹)</Th>
                  <Th align="right">Rate per kg (₹)</Th>
                  <Th align="right">In the tanks (L)</Th>
                  <Th align="right">In the tanks (kg)</Th>
                  <Th align="right">Value (₹)</Th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <TableLoading colSpan={COLUMNS} message="Lining up the lots…" />
                ) : single.isError && !cost ? (
                  <TableEmpty
                    colSpan={COLUMNS}
                    icon={AlertTriangle}
                    message="This oil's lots could not be read"
                    hint={getErrorMessage(single.error, 'Try Refresh in a moment.')}
                  />
                ) : lots.length === 0 ? (
                  <TableEmpty
                    colSpan={COLUMNS}
                    icon={Hash}
                    message="No lot is in the tanks for this oil"
                    hint="An opening stock on the Tank Farm gives it a cost to start from."
                  />
                ) : (
                  lots.map((lot, index) => (
                    <tr key={`${lot.lot}-${index}`} className={ROW_CLASSES}>
                      <Td className="tabular-nums text-muted-foreground">{index + 1}</Td>
                      <Td>
                        <LotLink id={lot.lot} canOpen={canOpenLot} />
                      </Td>
                      <Td className="whitespace-nowrap">{formatDay(new Date(lot.created_at))}</Td>
                      <Td className="min-w-52 font-medium">{lot.party || '—'}</Td>
                      <Td className="whitespace-nowrap font-mono">{lot.vehicle || '—'}</Td>
                      <Td>{lot.transporter || '—'}</Td>
                      <Td numeric>{fmtMoney(lot.rate_per_litre)}</Td>
                      <Td numeric>{fmtMoney(lot.rate_per_kg)}</Td>
                      <Td numeric>{fmtLitres(lot.litres_in_tank)}</Td>
                      <Td numeric>{fmtKg(lot.kg_in_tank)}</Td>
                      <Td numeric className="font-medium">
                        {fmtMoney(lot.value)}
                      </Td>
                    </tr>
                  ))
                )}
              </tbody>
              {!loading && lots.length > 1 && (
                <tfoot className="border-t bg-muted/40 font-semibold">
                  <tr>
                    <Td colSpan={8}>Total</Td>
                    <Td numeric>{fmtLitres(totals.litres)}</Td>
                    <Td numeric>{fmtKg(totals.kg)}</Td>
                    <Td numeric>{fmtMoney(totals.value)}</Td>
                  </tr>
                </tfoot>
              )}
            </table>
          </TableCard>
        </>
      )}
    </div>
  );
}
