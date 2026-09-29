/**
 * The lots in one stage, truck by truck: EXIM's vehicle breakdown under a
 * status, with the dates and rate a lot carries.
 */
import { AlertTriangle, Truck } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

import {
  ROW_CLASSES,
  TABLE_CLASSES,
  TableCard,
  TableEmpty,
  TableLoading,
  Td,
  Th,
  THEAD_CLASSES,
} from '@/shared/components';
import { cn, formatDay } from '@/shared/utils';

import type { Lot } from '../../types';
import { fmtMoney } from '../../utils';
import { PaymentMark } from '../LotStatusPill';
import { fmtAmount, fromKg, num, type OilUnit, UNIT_WORD } from './oilUnits';

const COLUMNS = 8;

function Dates({ lot }: { lot: Lot }) {
  const parts = [
    lot.contract_end ? `Contract ends ${formatDay(lot.contract_end)}` : null,
    lot.eta ? `ETA ${formatDay(lot.eta)}` : null,
    lot.arrival_date ? `Arrived ${formatDay(lot.arrival_date)}` : null,
  ].filter(Boolean);
  if (!parts.length) return <span className="text-muted-foreground">—</span>;
  return (
    <span className="block leading-tight">
      {parts.map((part) => (
        <span key={part} className="block whitespace-nowrap">
          {part}
        </span>
      ))}
    </span>
  );
}

export function StageLotsTable({
  title,
  lots,
  unit,
  rounded,
  isLoading,
  error,
}: {
  title: string;
  lots: Lot[];
  unit: OilUnit;
  rounded: boolean;
  isLoading: boolean;
  error: string | null;
}) {
  const navigate = useNavigate();
  const rows = [...lots].sort(
    (a, b) =>
      (a.item_name || a.item_code).localeCompare(b.item_name || b.item_code) ||
      (a.vendor_name || a.vendor_code).localeCompare(b.vendor_name || b.vendor_code),
  );
  const totalKg = rows.reduce((sum, lot) => sum + num(lot.quantity), 0);
  const totalValue = rows.reduce((sum, lot) => sum + num(lot.total), 0);

  return (
    <TableCard
      summary={
        <span>
          <span className="font-semibold text-foreground">{title}</span>
          {' · '}
          {rows.length} lot{rows.length === 1 ? '' : 's'}
        </span>
      }
    >
      <table className={TABLE_CLASSES}>
        <thead className={THEAD_CLASSES}>
          <tr>
            <Th className="w-10">#</Th>
            <Th>Oil</Th>
            <Th>Vendor</Th>
            <Th>Vehicle</Th>
            <Th>Dates</Th>
            <Th align="right">Quantity ({UNIT_WORD[unit]})</Th>
            <Th align="right">Rate (₹/kg)</Th>
            <Th align="right">Value (₹)</Th>
          </tr>
        </thead>
        <tbody>
          {isLoading ? (
            <TableLoading colSpan={COLUMNS} message="Reading the lots…" />
          ) : error ? (
            <TableEmpty
              colSpan={COLUMNS}
              icon={AlertTriangle}
              message="The lots could not be read"
              hint={error}
            />
          ) : rows.length === 0 ? (
            <TableEmpty colSpan={COLUMNS} icon={Truck} message="No lot is in this stage" />
          ) : (
            rows.map((lot, index) => (
              <tr
                key={lot.id}
                className={cn(ROW_CLASSES, 'cursor-pointer')}
                onClick={() => navigate(`/exim/lots/${lot.id}`)}
              >
                <Td className="text-muted-foreground tabular-nums">{index + 1}</Td>
                <Td>
                  <span className="block font-medium">{lot.item_name || lot.item_code}</span>
                  <span className="block font-mono text-xs text-muted-foreground">
                    {lot.item_code}
                  </span>
                </Td>
                <Td>
                  <span className="inline-flex items-center gap-2">
                    <span>{lot.vendor_name || lot.vendor_code || '—'}</span>
                    <PaymentMark status={lot.status} payment={lot.payment_status} />
                  </span>
                </Td>
                <Td>
                  {lot.vehicle_number ? (
                    <span className="block font-mono text-xs">{lot.vehicle_number}</span>
                  ) : (
                    <span className="text-muted-foreground">—</span>
                  )}
                  {lot.transporter && (
                    <span className="block text-xs text-muted-foreground">{lot.transporter}</span>
                  )}
                </Td>
                <Td className="text-xs">
                  <Dates lot={lot} />
                </Td>
                <Td numeric className="font-medium">
                  {fmtAmount(fromKg(num(lot.quantity), unit), rounded)}
                </Td>
                <Td numeric>{fmtMoney(lot.rate)}</Td>
                <Td numeric>{fmtMoney(lot.total)}</Td>
              </tr>
            ))
          )}
        </tbody>
        {!isLoading && !error && rows.length > 0 && (
          <tfoot>
            <tr className="border-t-2 bg-muted/40 font-semibold">
              <Td colSpan={5}>Total</Td>
              <Td numeric>{fmtAmount(fromKg(totalKg, unit), rounded)}</Td>
              <Td />
              <Td numeric>{fmtMoney(totalValue)}</Td>
            </tr>
          </tfoot>
        )}
      </table>
    </TableCard>
  );
}
