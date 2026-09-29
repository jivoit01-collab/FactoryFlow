/**
 * Director Inventory: all the oil the company owns, stage by stage, in litres
 * and tonnes: the packed oil in SAP's warehouses, the oil at the factory (in the
 * tanks and waiting outside), and every stage it is still travelling through,
 * back to what is only on contract. EXIM's Director Dashboard.
 *
 * The packed oil is read from SAP as the page opens. When SAP does not answer
 * the rest still stands, and the page says what is missing from the total.
 */
import {
  AlertTriangle,
  ChevronDown,
  ChevronRight,
  Download,
  Droplets,
  Layers,
  PackageCheck,
  RefreshCw,
  Scale,
} from 'lucide-react';
import { Fragment, useId, useMemo, useState } from 'react';
import { toast } from 'sonner';

import { EXIM_PERMISSIONS } from '@/config/permissions/exim.permissions';
import { usePermission } from '@/core/auth/hooks/usePermission';
import {
  PageHeader,
  ROW_CLASSES,
  StatTile,
  StatTileRow,
  StatusPill,
  TABLE_CLASSES,
  TableCard,
  TableEmpty,
  TableLoading,
  Td,
  Th,
  THEAD_CLASSES,
} from '@/shared/components';
import { Button, Switch } from '@/shared/components/ui';
import { cn, formatDateTimeShort, formatDay, getErrorMessage } from '@/shared/utils';

import { useDirectorInventory } from '../../api';
import { LOT_STATUS_LABEL } from '../../components';
import { exportDirectorInventory } from '../../components/reports/directorExcel';
import { num } from '../../components/reports/oilUnits';
import { StageVehicles } from '../../components/reports/StageVehicles';
import type { LotStatus } from '../../types';
import { fmtLitres, fmtQty, todayISO } from '../../utils';

/** EXIM's words for two of its stages, kept: they are what the directors read. */
const STAGE_LABEL: Partial<Record<LotStatus, string>> = {
  MUNDRA_PORT: 'At Mundra port',
  IN_CONTRACT: 'In contract / booking',
};

interface Part {
  label: string;
  litres: number;
  mt: number;
}

interface Row extends Part {
  key: string;
  /** A stage whose trucks can be opened under it. */
  status?: LotStatus;
  parts?: Part[];
  /** Packed oil SAP did not report: no figure, and left out of the total. */
  missing?: boolean;
}

const COLUMNS = 3;

export default function DirectorInventoryPage() {
  const { hasPermission } = usePermission();
  const canSeeTrucks = hasPermission(EXIM_PERMISSIONS.VEHICLE_REPORT);
  const inventory = useDirectorInventory();
  const data = inventory.data;
  const reportId = useId();

  const [open, setOpen] = useState<Set<string>>(() => new Set());
  const [report, setReport] = useState(false);

  const rows = useMemo<Row[]>(() => {
    if (!data) return [];
    const finished: Row = data.finished
      ? {
          key: 'finished',
          label: 'Finished goods',
          litres: num(data.finished.total.litres),
          mt: num(data.finished.total.mt),
          parts: data.finished.warehouses.map((w) => ({
            label: w.warehouse,
            litres: num(w.litres),
            mt: num(w.mt),
          })),
        }
      : { key: 'finished', label: 'Finished goods', litres: 0, mt: 0, missing: true };
    const atFactory: Row = {
      key: 'at_factory',
      label: 'At factory',
      litres: num(data.at_factory.litres),
      mt: num(data.at_factory.mt),
      parts: [
        {
          label: 'In tank',
          litres: num(data.at_factory.in_tank.litres),
          mt: num(data.at_factory.in_tank.mt),
        },
        {
          label: 'Outside factory',
          litres: num(data.at_factory.outside_factory.litres),
          mt: num(data.at_factory.outside_factory.mt),
        },
      ],
    };
    const stages: Row[] = data.stages.map((stage) => ({
      key: stage.status,
      label: STAGE_LABEL[stage.status] ?? LOT_STATUS_LABEL[stage.status] ?? stage.label,
      litres: num(stage.litres),
      mt: num(stage.mt),
      status: stage.status,
    }));
    return [finished, atFactory, ...stages];
  }, [data]);

  const total = rows.reduce(
    (sum, row) => (row.missing ? sum : { litres: sum.litres + row.litres, mt: sum.mt + row.mt }),
    { litres: 0, mt: 0 },
  );
  const holding = rows.filter((row) => !row.missing && (row.litres > 0 || row.mt > 0)).length;
  const packed = rows.find((row) => row.key === 'finished');
  const day = formatDay(todayISO());
  const readAt = inventory.dataUpdatedAt
    ? formatDateTimeShort(new Date(inventory.dataUpdatedAt))
    : null;
  const sapNote =
    data && !data.finished ? 'Finished goods are left out: SAP did not answer.' : null;

  function toggle(key: string) {
    setOpen((current) => {
      const next = new Set(current);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  function download() {
    exportDirectorInventory(rows, total, sapNote ?? undefined);
    toast.success('Director Inventory downloaded');
  }

  const ready = !inventory.isLoading && !inventory.isError && rows.length > 0;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Director Inventory"
        description="All the oil the company owns, stage by stage: packed, at the factory, and still on its way, in litres and tonnes."
        icon={Droplets}
        accent="teal"
      >
        <label htmlFor={reportId} className="flex items-center gap-2 text-sm text-muted-foreground">
          <Switch id={reportId} checked={report} onChange={setReport} />
          Report view
        </label>
        <Button variant="outline" onClick={download} disabled={!ready}>
          <Download className="mr-1.5 h-4 w-4" />
          Excel
        </Button>
        <Button
          variant="outline"
          onClick={() => void inventory.refetch()}
          disabled={inventory.isFetching}
        >
          <RefreshCw className={cn('mr-1.5 h-4 w-4', inventory.isFetching && 'animate-spin')} />
          Refresh
        </Button>
      </PageHeader>

      {!report && (
        <StatTileRow>
          <StatTile
            label="Total"
            value={ready ? fmtLitres(total.litres) : '—'}
            sub={sapNote ? 'litres · without the packed oil' : 'litres'}
            icon={Droplets}
            accent="teal"
          />
          <StatTile
            label="Total"
            value={ready ? fmtQty(total.mt) : '—'}
            sub={sapNote ? 'MT · without the packed oil' : 'MT'}
            icon={Scale}
            accent="indigo"
          />
          <StatTile
            label="Stages holding oil"
            value={ready ? holding : '—'}
            sub={ready ? `of ${rows.length}` : undefined}
            icon={Layers}
          />
          <StatTile
            label="Packed"
            value={packed && !packed.missing ? fmtQty(packed.mt) : '—'}
            sub={packed?.missing ? 'SAP is not answering' : 'MT of finished goods, from SAP'}
            icon={PackageCheck}
            accent={packed?.missing ? 'amber' : 'emerald'}
          />
        </StatTileRow>
      )}

      <TableCard
        className={cn(report && 'max-w-2xl')}
        summary={
          report ? (
            <span className="font-semibold uppercase tracking-wide text-foreground">
              Oil status {day}
            </span>
          ) : (
            <span>
              {rows.length} stages{readAt ? ` · read ${readAt}` : ''}
              {inventory.isFetching && !inventory.isLoading ? ' · refreshing…' : ''}
            </span>
          )
        }
      >
        <table className={cn(TABLE_CLASSES, report && 'text-base')}>
          <thead className={THEAD_CLASSES}>
            <tr>
              <Th>Stage</Th>
              <Th align="right">Litres</Th>
              <Th align="right">MT</Th>
            </tr>
          </thead>
          <tbody>
            {inventory.isLoading ? (
              <TableLoading
                colSpan={COLUMNS}
                message="Reading the stock, and the packed oil from SAP…"
              />
            ) : inventory.isError ? (
              <TableEmpty
                colSpan={COLUMNS}
                icon={AlertTriangle}
                message="The inventory could not be read"
                hint={getErrorMessage(inventory.error, 'Try Refresh in a moment.')}
              />
            ) : (
              rows.map((row) => {
                const canOpen = !report && (!!row.parts?.length || (!!row.status && canSeeTrucks));
                const isOpen = canOpen && open.has(row.key);
                return (
                  <Fragment key={row.key}>
                    <tr className={ROW_CLASSES}>
                      <Td className="font-medium">
                        {canOpen ? (
                          <button
                            type="button"
                            aria-expanded={isOpen}
                            onClick={() => toggle(row.key)}
                            className="inline-flex items-center gap-2 text-left hover:text-primary"
                          >
                            {isOpen ? (
                              <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" />
                            ) : (
                              <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
                            )}
                            {row.label}
                          </button>
                        ) : (
                          <span className={cn(!report && 'pl-6')}>{row.label}</span>
                        )}
                        {row.missing && (
                          <StatusPill tone="warn" className="ml-2 align-middle">
                            SAP not answering
                          </StatusPill>
                        )}
                      </Td>
                      <Td numeric>{row.missing || !row.litres ? '—' : fmtLitres(row.litres)}</Td>
                      <Td numeric>{row.missing || !row.mt ? '—' : fmtQty(row.mt)}</Td>
                    </tr>
                    {isOpen &&
                      row.parts?.map((part) => (
                        <tr key={`${row.key}-${part.label}`} className="border-b bg-muted/20">
                          <Td className="pl-14 text-muted-foreground">{part.label}</Td>
                          <Td numeric className="text-muted-foreground">
                            {fmtLitres(part.litres)}
                          </Td>
                          <Td numeric className="text-muted-foreground">
                            {fmtQty(part.mt)}
                          </Td>
                        </tr>
                      ))}
                    {isOpen && row.status && !row.parts && (
                      <tr className="border-b bg-muted/20">
                        <td colSpan={COLUMNS} className="px-4 py-3">
                          <StageVehicles status={row.status} />
                        </td>
                      </tr>
                    )}
                  </Fragment>
                );
              })
            )}
          </tbody>
          {ready && (
            <tfoot>
              <tr className="border-t-2 bg-muted/40 font-semibold">
                <Td>Total</Td>
                <Td numeric>{fmtLitres(total.litres)}</Td>
                <Td numeric>{fmtQty(total.mt)}</Td>
              </tr>
            </tfoot>
          )}
        </table>
      </TableCard>

      {data && !data.finished && (
        <p className="flex items-start gap-2 text-sm text-muted-foreground">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400" />
          <span>
            {sapNote} The totals above are everything else.
            {data.finished_reason ? ` SAP said: ${data.finished_reason}` : ''}
          </span>
        </p>
      )}
    </div>
  );
}
