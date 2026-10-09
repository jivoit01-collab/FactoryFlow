import { Info } from 'lucide-react';
import type { ReactNode } from 'react';

import type { ProductionDispatchReport } from '../types';
import { dayLabel, fmtPallet, fmtWhole, type ItemRow, type Totals } from '../utils';

function Notice({ children }: { children: ReactNode }) {
  return (
    <li className="flex gap-2">
      <Info className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
      <span>{children}</span>
    </li>
  );
}

function codes(rows: ItemRow[]) {
  const shown = rows.slice(0, 8).map((row) => row.item.item_code);
  return `${shown.join(', ')}${rows.length > shown.length ? ` and ${rows.length - shown.length} more` : ''}`;
}

/**
 * What the figures leave out and how they were judged, said once above them
 * rather than discovered: group companies' sales, the FAST / SLOW window, and
 * any SKU SAP has not classified or given a litre factor.
 */
export function ReportNotices({
  report,
  items,
  totals,
}: {
  report: ProductionDispatchReport;
  items: ItemRow[];
  totals: Totals;
}) {
  const { settings, movement_window: window } = report;
  const noPacking = items.filter((row) => row.item.packing_type === null);
  const noLitres = items.filter((row) => row.item.litres_per_unit <= 0);

  return (
    <ul className="space-y-1.5 rounded-xl border bg-muted/30 p-3 text-sm text-muted-foreground">
      {totals.groupDispatch.qty > 0 && (
        <Notice>
          <span className="font-medium text-foreground">
            {fmtPallet(totals.groupDispatch.pallet)} pallets (
            {fmtWhole(totals.groupDispatch.litres)} L)
          </span>{' '}
          went to Jivo Mart and the other group companies in this range. They are not counted as
          dispatch anywhere on this page.
        </Notice>
      )}
      <Notice>
        FAST / SLOW is judged over the {settings.movement_window_days} days {dayLabel(window.from)}{' '}
        – {dayLabel(window.to)}, whatever range is shown: a SKU is FAST when a month of its
        production is dispatched within {settings.fast_days} days — it sold at least what it made.
        Sold but not made is FAST; not sold is SLOW.
      </Notice>
      <Notice>
        PALLET = litres ÷ {settings.pallet_litres}; Ton = litres × {settings.oil_density} ÷ 1000
        (net oil). Box and litre factors are SAP&apos;s own.
      </Notice>
      {noPacking.length > 0 && (
        <Notice>
          {noPacking.length} {noPacking.length === 1 ? 'SKU has' : 'SKUs have'} no packing type in
          SAP ({codes(noPacking)}) and {noPacking.length === 1 ? 'is' : 'are'} grouped as “Not set
          in SAP”.
        </Notice>
      )}
      {noLitres.length > 0 && (
        <Notice>
          {noLitres.length} {noLitres.length === 1 ? 'SKU has' : 'SKUs have'} no litre factor in SAP
          ({codes(noLitres)}), so {noLitres.length === 1 ? 'it adds' : 'they add'} boxes but no
          litres, tons or pallets.
        </Notice>
      )}
    </ul>
  );
}
