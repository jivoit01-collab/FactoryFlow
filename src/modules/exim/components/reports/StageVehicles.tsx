/**
 * The trucks and oils behind one stage of the Director Inventory, opened under
 * its row: EXIM's vehicle report for that status. Only read when opened.
 */
import { Loader2 } from 'lucide-react';

import { Th } from '@/shared/components';
import { formatDay, getErrorMessage } from '@/shared/utils';

import { useVehicleReport } from '../../api';
import type { LotStatus } from '../../types';
import { fmtLitres, fmtQty } from '../../utils';

/** Where EXIM showed the truck, its ETA and the refinery it came from. */
const ON_THE_ROAD: LotStatus[] = ['ON_THE_WAY', 'UNDER_LOADING'];

const SUB_TD = 'px-3 py-2';

export function StageVehicles({ status }: { status: LotStatus }) {
  const report = useVehicleReport(status);
  const road = ON_THE_ROAD.includes(status);
  const rows = (report.data ?? []).flatMap((truck) =>
    truck.items.map((item, index) => ({ ...item, key: `${truck.vehicle_number}-${index}`, truck })),
  );
  const span = road ? 7 : 4;

  return (
    <div className="overflow-x-auto rounded-lg border bg-card">
      <table className="w-full text-sm">
        <thead className="border-b bg-muted/40">
          <tr>
            <Th className="px-3 py-2">Oil</Th>
            <Th className="px-3 py-2">Vendor</Th>
            <Th align="right" className="px-3 py-2">
              Litres
            </Th>
            <Th align="right" className="px-3 py-2">
              MT
            </Th>
            {road && (
              <>
                <Th className="px-3 py-2">Vehicle</Th>
                <Th className="px-3 py-2">ETA</Th>
                <Th className="px-3 py-2">Refinery</Th>
              </>
            )}
          </tr>
        </thead>
        <tbody>
          {report.isLoading ? (
            <tr>
              <td colSpan={span} className="px-3 py-4 text-center text-muted-foreground">
                <Loader2 className="mx-auto h-4 w-4 animate-spin" />
              </td>
            </tr>
          ) : report.isError ? (
            <tr>
              <td colSpan={span} className="px-3 py-4 text-center text-muted-foreground">
                {getErrorMessage(report.error, 'The trucks could not be read.')}
              </td>
            </tr>
          ) : rows.length === 0 ? (
            <tr>
              <td colSpan={span} className="px-3 py-4 text-center text-muted-foreground">
                No lot is in this stage
              </td>
            </tr>
          ) : (
            rows.map((row) => (
              <tr key={row.key} className="border-b last:border-0">
                <td className={SUB_TD}>{row.item_name || row.item_code}</td>
                <td className={`${SUB_TD} text-muted-foreground`}>
                  {row.vendor_name || row.vendor_code || '—'}
                </td>
                <td className={`${SUB_TD} text-right tabular-nums`}>{fmtLitres(row.litres)}</td>
                <td className={`${SUB_TD} text-right tabular-nums`}>{fmtQty(row.mt)}</td>
                {road && (
                  <>
                    <td className={`${SUB_TD} whitespace-nowrap font-mono text-xs`}>
                      {row.truck.vehicle_number || '—'}
                    </td>
                    <td className={`${SUB_TD} whitespace-nowrap`}>
                      {row.eta ? formatDay(row.eta) : '—'}
                    </td>
                    <td className={SUB_TD}>{row.job_work || '—'}</td>
                  </>
                )}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
