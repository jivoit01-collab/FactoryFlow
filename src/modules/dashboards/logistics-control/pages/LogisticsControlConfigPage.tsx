import { ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';

import { BoardFigures, BoardWarehouses, WarehouseStaffing } from '../components';
import { type LogisticsControlScope } from '../constants';
import { useLogisticsControlScope } from '../hooks';
import { companyLabel } from '../utils';

/**
 * What the board counts, and the figures no system holds.
 *
 * First, per company, which warehouses the warehouse band counts, each with the
 * two warehouse facts SAP does not hold. There is no tonnage capacity anywhere
 * in SAP, and WMS knows only pallet slots — a different question, since a
 * half-empty pallet still occupies a whole slot. And a clean WMS cycle count
 * writes no movement row at all, so an audit date inferred from the movement
 * log would really mean "the last count that found a discrepancy".
 *
 * Then the warehouse staff of any company other than the board's own, and the
 * board's own fleet, salaries and labour rate.
 *
 * Empty is a valid answer throughout, and a meaningful one: it makes the board
 * say the figure is not configured rather than showing a number nobody set.
 *
 * One screen for both boards, told apart by the scope — which follows the
 * company the viewer is signed into. Everything here is stored per company,
 * and every read and write is pinned to the company it belongs to: it is what
 * stops a Beverages capacity being written against Oil.
 */
export function LogisticsControlConfigPage({
  scope: scopeOverride,
}: {
  scope?: LogisticsControlScope;
} = {}) {
  const scope = useLogisticsControlScope(scopeOverride);
  const split = scope.warehouseSides.length > 1;
  const otherSides = scope.warehouseSides.filter(
    (side) => side.companyCode !== scope.settingsCompany,
  );

  return (
    <div className="mx-auto max-w-4xl space-y-5 p-4 sm:p-6">
      <header className="space-y-2">
        <Link
          to={scope.boardPath}
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to the board
        </Link>
        <div>
          <h1 className="text-xl font-bold tracking-tight sm:text-2xl">Board settings</h1>
          <p className="mt-0.5 text-sm text-muted-foreground">
            Tick the warehouses the warehouse band counts
            {split
              ? ` — ${scope.warehouseSides.map((side) => companyLabel(side.companyCode)).join(' and ')} each have their own`
              : ''}
            . Capacity and audit date come from you: SAP holds neither.
          </p>
        </div>
      </header>

      {scope.warehouseSides.map((side) => (
        <BoardWarehouses key={side.companyCode} companyCode={side.companyCode} />
      ))}

      {otherSides.map((side) => (
        <WarehouseStaffing key={side.companyCode} companyCode={side.companyCode} />
      ))}

      <BoardFigures
        companyCode={scope.settingsCompany}
        warehouseLabel={split ? `${companyLabel(scope.settingsCompany)} warehouse` : undefined}
      />
    </div>
  );
}

export default LogisticsControlConfigPage;
