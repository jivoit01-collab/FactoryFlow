/** Smart Supply Chain — the "single brain" the August 2026 brief asks for.
 *
 * Shows steps 6 and 7 of the brief: WHEN each material must be ordered, and
 * whether the plan can actually be run on the lines we have. Steps 1-5 (demand,
 * floor, FG gap, BOM explosion, material requirement) come from the ERP via
 * `sales_planning_requirement` and are not recomputed here.
 */
import { Bell, RefreshCw, Upload } from 'lucide-react';
import { useRef, useState } from 'react';

import { DASHBOARDS_PERMISSIONS } from '@/config/permissions';
import { usePermission } from '@/core/auth';
import { DashboardHeader } from '@/shared/components/dashboard/DashboardHeader';
import { Badge, Button, Card, CardContent, CardHeader } from '@/shared/components/ui';
import { getErrorMessage } from '@/shared/utils';

import {
  useSendAlarms,
  useSupplyChainDashboard,
  useUploadReferenceTemplate,
} from '../api/supply-chain.queries';
import {
  CapacityPanel,
  FeasibilityBanner,
  ProcurementTable,
  SupplyChainHeadline,
} from '../components';

type TabKey = 'procurement' | 'capacity' | 'floors';

export default function SupplyChainDashboardPage() {
  const { hasPermission } = usePermission();
  const canManage = hasPermission(DASHBOARDS_PERMISSIONS.MANAGE_SUPPLY_CHAIN_REFERENCE);

  const [tab, setTab] = useState<TabKey>('procurement');
  const fileInput = useRef<HTMLInputElement>(null);

  const dashboard = useSupplyChainDashboard();
  const sendAlarms = useSendAlarms();
  const upload = useUploadReferenceTemplate();

  if (dashboard.isLoading) {
    return (
      <div className="p-6">
        <DashboardHeader title="Smart Supply Chain" description="Loading the plan…" />
      </div>
    );
  }

  if (dashboard.isError || !dashboard.data) {
    return (
      <div className="p-6">
        <DashboardHeader title="Smart Supply Chain" />
        <p className="mt-4 text-sm text-destructive">
          {getErrorMessage(dashboard.error, 'Could not load the supply chain dashboard.')}
        </p>
      </div>
    );
  }

  const data = dashboard.data;
  const procurement = data.procurement;
  const production = data.production;

  // The dashboard is driven entirely by lead times. With none on file the alarms
  // are structurally inert, and saying so beats showing an empty, healthy-looking
  // table that hides the fact nobody has returned the sheet.
  const noLeadTimesAtAll =
    procurement.totals.materials > 0 &&
    procurement.totals.no_lead_time === procurement.totals.materials;

  const tabs: { key: TabKey; label: string; count?: number }[] = [
    { key: 'procurement', label: 'Procurement', count: procurement.totals.materials },
    { key: 'capacity', label: 'Production capacity', count: production.totals.machines },
    { key: 'floors', label: 'Stock buffers', count: data.floors.totals.compared },
  ];

  return (
    <div className="space-y-4 p-4 sm:p-6">
      <DashboardHeader
        title="Smart Supply Chain"
        description="What to order today, and whether the plan can actually be run."
      >
        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => void dashboard.refetch()}
            disabled={dashboard.isFetching}
          >
            <RefreshCw
              className={`mr-2 h-4 w-4 ${dashboard.isFetching ? 'animate-spin' : ''}`}
            />
            Refresh
          </Button>
          {canManage && (
            <>
              <input
                ref={fileInput}
                type="file"
                accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) upload.mutate(file);
                  // Reset so re-uploading the same corrected file still fires.
                  e.target.value = '';
                }}
              />
              <Button
                variant="outline"
                size="sm"
                onClick={() => fileInput.current?.click()}
                disabled={upload.isPending}
              >
                <Upload className="mr-2 h-4 w-4" />
                {upload.isPending ? 'Reading…' : 'Reference template'}
              </Button>
              <Button
                size="sm"
                onClick={() => sendAlarms.mutate(false)}
                disabled={sendAlarms.isPending}
              >
                <Bell className="mr-2 h-4 w-4" />
                {sendAlarms.isPending ? 'Sending…' : 'Send alarms'}
              </Button>
            </>
          )}
        </div>
      </DashboardHeader>

      <SupplyChainHeadline data={data} />
      <FeasibilityBanner data={data} />

      {noLeadTimesAtAll && (
        <div className="rounded-md border border-amber-500/40 bg-amber-500/5 p-3 text-sm">
          <p className="font-medium">No lead times are on file.</p>
          <p className="text-muted-foreground">
            Every material is un-timeable until Procurement returns sheet 1 of the reference
            template, so no ordering alarm can be raised.
          </p>
        </div>
      )}

      <div className="flex flex-wrap gap-1 border-b">
          {tabs.map((t) => (
            <button
              key={t.key}
              type="button"
              onClick={() => setTab(t.key)}
              className={`-mb-px border-b-2 px-3 py-2 text-sm ${
                tab === t.key
                  ? 'border-primary font-medium'
                  : 'border-transparent text-muted-foreground'
              }`}
            >
              {t.label}
              {typeof t.count === 'number' && (
                <span className="ml-1.5 text-xs text-muted-foreground">({t.count})</span>
              )}
            </button>
        ))}
      </div>

      {tab === 'procurement' && (
        <Card>
          <CardHeader className="flex flex-row flex-wrap items-center gap-2 pb-2">
            <Badge className="bg-destructive text-destructive-foreground">
              {procurement.totals.overdue} overdue
            </Badge>
            <Badge className="bg-orange-500 text-white">
              {procurement.totals.order_now} order now
            </Badge>
            <Badge className="bg-amber-500 text-white">
              {procurement.totals.no_lead_time} no lead time
            </Badge>
            <Badge variant="outline">{procurement.totals.scheduled} scheduled</Badge>
            <Badge variant="outline">{procurement.totals.covered} covered</Badge>
          </CardHeader>
          <CardContent className="p-0">
            <ProcurementTable rows={procurement.rows} />
          </CardContent>
        </Card>
      )}

      {tab === 'capacity' && (
        <Card>
          <CardContent className="p-4">
            <CapacityPanel lines={production.machines} />
          </CardContent>
        </Card>
      )}

      {tab === 'floors' && (
        <Card>
          <CardContent className="space-y-3 p-4">
            <div className="text-sm text-muted-foreground">
              Policy floor is {data.policy.floor_percent}% of the{' '}
              {data.policy.floor_basis === 'MONTHLY_AVERAGE'
                ? 'monthly average'
                : 'three-month total'}
              . {data.floors.totals.no_trend_on_file} item(s) have no sales trend on file and
              keep the ERP&apos;s own minimum.
            </div>

            {/* The brief contradicts itself on whether the floor is added to demand
                or subtracted from it. This is what the ERP actually does. */}
            <div className="rounded-md border p-3 text-sm">
              <p className="font-medium">Floor convention in the ERP data</p>
              <p className="text-muted-foreground">
                {data.floor_convention.verdict === 'ADDITIVE' &&
                  'Additive — required = demand + floor − stock (the brief’s step 3).'}
                {data.floor_convention.verdict === 'SUBTRACTIVE' &&
                  'Subtractive — required = demand − floor − stock (the brief’s step 5).'}
                {data.floor_convention.verdict === 'INDETERMINATE' &&
                  'Cannot be determined from the current rows.'}{' '}
                Checked {data.floor_convention.totals.checked} row(s):{' '}
                {data.floor_convention.totals.additive} additive,{' '}
                {data.floor_convention.totals.subtractive} subtractive,{' '}
                {data.floor_convention.totals.indeterminate} indeterminate.
              </p>
            </div>

            {data.floors.rows.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No sales trend loaded, so the ERP&apos;s minimum stock cannot be checked
                against the {data.policy.floor_percent}% rule.
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[40rem] text-sm">
                  <thead>
                    <tr className="border-b text-left text-xs uppercase text-muted-foreground">
                      <th className="px-3 py-2 font-medium">Item</th>
                      <th className="px-3 py-2 text-right font-medium">3-month sales</th>
                      <th className="px-3 py-2 text-right font-medium">Policy floor</th>
                      <th className="px-3 py-2 text-right font-medium">ERP minimum</th>
                      <th className="px-3 py-2 text-right font-medium">Difference</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.floors.rows.map((row) => (
                      <tr key={row.item_code} className="border-b last:border-0">
                        <td className="px-3 py-2 font-medium">{row.item_code}</td>
                        <td className="px-3 py-2 text-right tabular-nums">
                          {row.three_month_sales}
                        </td>
                        <td className="px-3 py-2 text-right tabular-nums">{row.policy_floor}</td>
                        <td className="px-3 py-2 text-right tabular-nums">
                          {row.procedure_min_stock}
                        </td>
                        <td
                          className={`px-3 py-2 text-right tabular-nums ${
                            row.matches_policy ? 'text-muted-foreground' : 'text-destructive'
                          }`}
                        >
                          {row.difference}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
