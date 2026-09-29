/**
 * One stage of the Oil Stock: how much of each oil is in it, from which vendor,
 * and the lots that make it up. EXIM's stock dashboard detail page.
 *
 * Reached by clicking a stage on the Oil Stock matrix; the stage is in the URL
 * (`/exim/oil-stock/ON_THE_SEA`). "In tank" is the one stage that reads the tank
 * dips rather than the lots, as EXIM's in-factory view did, with the lots that
 * filled the tanks under it.
 */
import { useQueryClient } from '@tanstack/react-query';
import {
  AlertTriangle,
  Boxes,
  Cylinder,
  Gauge,
  IndianRupee,
  Layers,
  RefreshCw,
  Scale,
  Users,
} from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';

import { EXIM_PERMISSIONS } from '@/config/permissions/exim.permissions';
import { usePermission } from '@/core/auth/hooks/usePermission';
import {
  EmptyPanel,
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
import { Button } from '@/shared/components/ui';
import { cn, getErrorMessage } from '@/shared/utils';

import { FARM_KEYS, useLots, useStockDashboard, useTankSummary } from '../../api';
import { LOT_STATUS_LABEL } from '../../components';
import {
  fmtAmount,
  fromKg,
  fromLitres,
  num,
  OIL_STOCK_PATH,
  type OilUnit,
  STAGE_BLURB,
  STAGE_ICON,
  UNIT_WORD,
} from '../../components/reports/oilUnits';
import { StageLotsTable } from '../../components/reports/StageLotsTable';
import { StageNav } from '../../components/reports/StageNav';
import { UnitControls } from '../../components/reports/UnitControls';
import { useOilStockPrefs } from '../../components/reports/useOilStockPrefs';
import type { Lot, LotStatus } from '../../types';

interface Shown {
  unit: OilUnit;
  rounded: boolean;
}

function rupees(value: number) {
  return `₹ ${Math.round(value).toLocaleString('en-IN')}`;
}

/** Oil by vendor in one stage: EXIM's pivot for the stages before the factory. */
function StagePivot({ status, unit, rounded }: { status: LotStatus } & Shown) {
  const dashboard = useStockDashboard({ status });
  const outside = status === 'OUT_SIDE_FACTORY';
  const vendors = dashboard.data?.columns.find((c) => c.status === status)?.vendors ?? [];
  const columns = outside
    ? [{ key: 'outside', label: 'Quantity' }]
    : vendors.map((vendor) => ({ key: `${status}__${vendor}`, label: vendor }));

  const valueOf = (
    row: { outside_factory: number; values: Record<string, number> },
    key: string,
  ) => (outside ? num(row.outside_factory) : num(row.values[key]));

  const rows = (dashboard.data?.rows ?? [])
    .map((row) => ({
      ...row,
      cells: columns.map((column) => valueOf(row, column.key)),
    }))
    .filter((row) => row.cells.some((value) => value > 0));
  const columnTotals = columns.map((_, index) =>
    rows.reduce((sum, row) => sum + row.cells[index], 0),
  );
  const grand = columnTotals.reduce((sum, value) => sum + value, 0);
  const colSpan = columns.length + 2;
  const show = (kg: number) =>
    kg === 0 ? (
      <span className="text-muted-foreground/50">·</span>
    ) : (
      fmtAmount(fromKg(kg, unit), rounded)
    );

  return (
    <TableCard
      summary={
        <span>
          <span className="font-semibold text-foreground">By oil and vendor</span>
          {' · '}
          {rows.length} oil{rows.length === 1 ? '' : 's'} · in {UNIT_WORD[unit]}
        </span>
      }
    >
      <table className={TABLE_CLASSES}>
        <thead className={THEAD_CLASSES}>
          <tr>
            <Th>Oil</Th>
            {columns.map((column) => (
              <Th key={column.key} align="right">
                <span className="ml-auto block max-w-[12rem] truncate" title={column.label}>
                  {column.label}
                </span>
              </Th>
            ))}
            {!outside && <Th align="right">Total</Th>}
          </tr>
        </thead>
        <tbody>
          {dashboard.isLoading ? (
            <TableLoading colSpan={colSpan} message="Reading the stock…" />
          ) : dashboard.isError ? (
            <TableEmpty
              colSpan={colSpan}
              icon={AlertTriangle}
              message="The stock could not be read"
              hint={getErrorMessage(dashboard.error, 'Try again in a moment.')}
            />
          ) : rows.length === 0 ? (
            <TableEmpty colSpan={colSpan} icon={Layers} message="No oil is in this stage" />
          ) : (
            rows.map((row) => (
              <tr key={row.item} className={ROW_CLASSES}>
                <Td>
                  <span className="block font-medium">{row.name || row.code}</span>
                  <span className="block font-mono text-xs text-muted-foreground">{row.code}</span>
                </Td>
                {row.cells.map((value, index) => (
                  <Td key={columns[index].key} numeric>
                    {show(value)}
                  </Td>
                ))}
                {!outside && (
                  <Td numeric className="font-semibold">
                    {show(row.cells.reduce((sum, value) => sum + value, 0))}
                  </Td>
                )}
              </tr>
            ))
          )}
        </tbody>
        {!dashboard.isLoading && !dashboard.isError && rows.length > 0 && (
          <tfoot>
            <tr className="border-t-2 bg-muted/40 font-semibold">
              <Td>Total</Td>
              {columnTotals.map((value, index) => (
                <Td key={columns[index].key} numeric>
                  {show(value)}
                </Td>
              ))}
              {!outside && <Td numeric>{show(grand)}</Td>}
            </tr>
          </tfoot>
        )}
      </table>
    </TableCard>
  );
}

function LotTiles({ lots, unit, rounded }: { lots: Lot[] } & Shown) {
  const oils = new Set(lots.map((lot) => lot.item)).size;
  const vendors = new Set(lots.map((lot) => lot.vendor_code || lot.vendor_name)).size;
  const kg = lots.reduce((sum, lot) => sum + num(lot.quantity), 0);
  const value = lots.reduce((sum, lot) => sum + num(lot.total), 0);
  return (
    <StatTileRow>
      <StatTile
        label="Quantity"
        value={fmtAmount(fromKg(kg, unit), rounded)}
        sub={UNIT_WORD[unit]}
        icon={Scale}
        accent="teal"
      />
      <StatTile label="Oils" value={oils} sub={`in ${lots.length} lots`} icon={Layers} />
      <StatTile label="Vendors" value={vendors} icon={Users} accent="indigo" />
      <StatTile
        label="Value"
        value={rupees(value)}
        sub="at the lots' own rates"
        icon={IndianRupee}
        accent="amber"
      />
    </StatTileRow>
  );
}

/** The tanks, oil by oil: what EXIM's in-factory view showed. */
function TankStage({ unit, rounded }: Shown) {
  const summary = useTankSummary();
  const oils = [...(summary.data?.oils.items ?? [])].sort((a, b) =>
    (a.name || a.code).localeCompare(b.name || b.code),
  );
  const farm = summary.data?.farm;
  const totalL = num(summary.data?.oils.total_l);
  const capacityL = oils.reduce((sum, oil) => sum + num(oil.capacity_l), 0);
  const COLUMNS = 5;

  return (
    <>
      <StatTileRow>
        <StatTile
          label="In tank"
          value={summary.isLoading ? '—' : fmtAmount(fromLitres(totalL, unit), rounded)}
          sub={UNIT_WORD[unit]}
          icon={Cylinder}
          accent="teal"
        />
        <StatTile
          label="Oils"
          value={summary.isLoading ? '—' : oils.length}
          sub={`in ${farm?.tank_count ?? 0} tanks`}
          icon={Layers}
        />
        <StatTile
          label="Farm used"
          value={farm ? `${num(farm.used_pct).toFixed(1)}%` : '—'}
          sub={
            farm
              ? `of ${fmtAmount(fromLitres(num(farm.capacity_l), unit), true)} ${UNIT_WORD[unit]}`
              : undefined
          }
          icon={Gauge}
          accent="indigo"
        />
      </StatTileRow>

      <TableCard
        summary={
          <span>
            <span className="font-semibold text-foreground">By oil</span>
            {' · '}
            as last dipped, in {UNIT_WORD[unit]}
          </span>
        }
      >
        <table className={TABLE_CLASSES}>
          <thead className={THEAD_CLASSES}>
            <tr>
              <Th>Oil</Th>
              <Th>Tanks</Th>
              <Th align="right">Capacity</Th>
              <Th align="right">In tank</Th>
              <Th align="right">Used</Th>
            </tr>
          </thead>
          <tbody>
            {summary.isLoading ? (
              <TableLoading colSpan={COLUMNS} message="Reading the tanks…" />
            ) : summary.isError ? (
              <TableEmpty
                colSpan={COLUMNS}
                icon={AlertTriangle}
                message="The tanks could not be read"
                hint={getErrorMessage(summary.error, 'Try again in a moment.')}
              />
            ) : oils.length === 0 ? (
              <TableEmpty colSpan={COLUMNS} icon={Cylinder} message="No oil is in the tanks" />
            ) : (
              oils.map((oil) => {
                const capacity = num(oil.capacity_l);
                const level = num(oil.level_l);
                return (
                  <tr key={oil.item} className={ROW_CLASSES}>
                    <Td>
                      <span className="inline-flex items-center gap-2">
                        <span
                          className="h-2.5 w-2.5 shrink-0 rounded-full border"
                          style={{ backgroundColor: oil.color || undefined }}
                          aria-hidden="true"
                        />
                        <span>
                          <span className="block font-medium">{oil.name || oil.code}</span>
                          <span className="block font-mono text-xs text-muted-foreground">
                            {oil.code}
                          </span>
                        </span>
                      </span>
                    </Td>
                    <Td className="max-w-[16rem] text-xs text-muted-foreground">
                      {oil.tanks.join(', ')}
                    </Td>
                    <Td numeric>{fmtAmount(fromLitres(capacity, unit), rounded)}</Td>
                    <Td numeric className="font-medium">
                      {fmtAmount(fromLitres(level, unit), rounded)}
                    </Td>
                    <Td numeric className="text-muted-foreground">
                      {capacity > 0 ? `${((level / capacity) * 100).toFixed(1)}%` : '—'}
                    </Td>
                  </tr>
                );
              })
            )}
          </tbody>
          {!summary.isLoading && !summary.isError && oils.length > 0 && (
            <tfoot>
              <tr className="border-t-2 bg-muted/40 font-semibold">
                <Td colSpan={2}>Total</Td>
                <Td numeric>{fmtAmount(fromLitres(capacityL, unit), rounded)}</Td>
                <Td numeric>{fmtAmount(fromLitres(totalL, unit), rounded)}</Td>
                <Td numeric className="text-muted-foreground">
                  {capacityL > 0 ? `${((totalL / capacityL) * 100).toFixed(1)}%` : '—'}
                </Td>
              </tr>
            </tfoot>
          )}
        </table>
      </TableCard>
    </>
  );
}

function Breakdown({ status }: { status: LotStatus }) {
  const { hasPermission } = usePermission();
  const canSeeTanks = hasPermission(EXIM_PERMISSIONS.TANK_VIEW);
  const prefs = useOilStockPrefs();
  const { unit, rounded } = prefs;
  const queryClient = useQueryClient();
  const lots = useLots({ status: [status] });
  const inTank = status === 'IN_TANK';
  const lotError = lots.isError ? getErrorMessage(lots.error, 'Try again in a moment.') : null;

  return (
    <div className="space-y-6">
      <PageHeader
        title={LOT_STATUS_LABEL[status]}
        description={STAGE_BLURB[status]}
        icon={STAGE_ICON[status]}
        accent="teal"
        backTo={OIL_STOCK_PATH}
        backLabel="Oil Stock"
      >
        <UnitControls
          unit={unit}
          onUnitChange={prefs.setUnit}
          rounded={rounded}
          onRoundedChange={prefs.setRounded}
        />
        <Button
          variant="outline"
          onClick={() => void queryClient.invalidateQueries({ queryKey: FARM_KEYS.all })}
          disabled={lots.isFetching}
        >
          <RefreshCw className={cn('mr-1.5 h-4 w-4', lots.isFetching && 'animate-spin')} />
          Refresh
        </Button>
      </PageHeader>

      <StageNav current={status} />

      {inTank && canSeeTanks ? (
        <TankStage unit={unit} rounded={rounded} />
      ) : (
        <LotTiles lots={lots.data ?? []} unit={unit} rounded={rounded} />
      )}

      {inTank && !canSeeTanks && (
        <p className="text-sm text-muted-foreground">
          The tank levels need the right to see the tanks; below are the lots that went into them.
        </p>
      )}

      {!inTank && <StagePivot status={status} unit={unit} rounded={rounded} />}

      <StageLotsTable
        title={inTank ? 'Lots in the tanks' : 'Lots'}
        lots={lots.data ?? []}
        unit={unit}
        rounded={rounded}
        isLoading={lots.isLoading}
        error={lotError}
      />
    </div>
  );
}

export default function StockStatusBreakdownPage() {
  const { status } = useParams<{ status: string }>();
  const navigate = useNavigate();

  if (!status || !(status in LOT_STATUS_LABEL)) {
    return (
      <EmptyPanel
        icon={Boxes}
        message="There is no such stage"
        hint="The link may be old. Pick a stage from the Oil Stock matrix."
        action={
          <Button variant="outline" onClick={() => navigate(OIL_STOCK_PATH)}>
            Back to Oil Stock
          </Button>
        }
      />
    );
  }
  return <Breakdown key={status} status={status as LotStatus} />;
}
