import { LOGISTICS_CONTROL_OIL_SCOPE, type LogisticsControlScope } from '../constants';
import {
  AllocatedDrill,
  type Board,
  CostPerLitreDrill,
  DispatchedDrill,
  FleetDrill,
  FreightVendorsDrill,
  MonthDrill,
  NonMovingDrill,
  PendingDispatchDrill,
  StockDrill,
  TransitDrill,
  UnscannedDrill,
} from './drills';

/** Which tile's rows to show. One per openable tile. */
export type DrillKey =
  | 'stock'
  | 'non-moving'
  | 'pending'
  | 'allocated'
  | 'unscanned'
  | 'dispatched-today'
  | 'dispatched-month'
  | 'planned'
  | 'fleet'
  | 'transit'
  | 'freight-vendors'
  | 'cost-litre';

export interface BoardDrillProps {
  which: DrillKey;
  board: Board;
  /**
   * The board these rows belong to.
   *
   * Passed rather than imported, so a panel opened over the Beverages board
   * captions itself with BH-FG and reads Beverages bills. Defaulted to Oil for
   * the same reason the hook is: a caller that names no scope keeps its old
   * behaviour exactly.
   */
  scope?: LogisticsControlScope;
  onClose: () => void;
}

/**
 * The rows behind whichever tile was clicked.
 *
 * One switch over one panel component per tile. Every panel is the same two
 * questions asked in turn — "which ones", and then "which ones under that" —
 * because every figure on this board is a roll-up of a roll-up: a warehouse is
 * varieties and a variety is SKUs, a day is customers and a customer is bills.
 * A panel that stopped at the first question sent the reader to a register
 * screen to ask the second, which is where the board loses them.
 *
 * Two of the twelve stop at one level, and say why in `FreightDrills`: SAP
 * answers the freight questions per haulier and does not return the documents
 * underneath, so those rows do not offer a chevron rather than opening a blank.
 *
 * The dispatch panels are the exception that fetches — the board only ever
 * asked the dispatch feed for totals. Those fetches are deliberately mounted
 * with the panel, and with the ROW inside it, so opening a drill-down costs a
 * request and closing it stops the cost; the board's own load is unchanged.
 */
export function BoardDrill({
  which,
  board,
  scope = LOGISTICS_CONTROL_OIL_SCOPE,
  onClose,
}: BoardDrillProps) {
  switch (which) {
    case 'stock':
      return (
        <StockDrill
          warehouse={scope.warehouse}
          stockTonnage={board.warehouse.stockTonnage}
          stockRows={board.warehouse.stockRows}
          loading={board.warehouse.loading}
          onClose={onClose}
        />
      );

    case 'non-moving':
      return (
        <NonMovingDrill
          warehouse={scope.warehouse}
          nonMoving={board.warehouse.nonMoving}
          stockRows={board.warehouse.stockRows}
          loading={board.warehouse.loading}
          onClose={onClose}
        />
      );

    case 'pending':
    case 'planned':
      return (
        <PendingDispatchDrill
          which={which}
          pending={board.warehouse.pendingDispatch}
          onClose={onClose}
        />
      );

    case 'allocated':
      return (
        <AllocatedDrill
          warehouse={scope.warehouse}
          allocated={board.warehouse.allocated}
          onClose={onClose}
        />
      );

    case 'unscanned':
      return <UnscannedDrill unscanned={board.warehouse.unscanned} onClose={onClose} />;

    case 'dispatched-today':
      return (
        <DispatchedDrill
          from={board.today}
          to={board.today}
          title="Dispatched today"
          totalTonnes={board.dispatch.today.tonnes}
          companies={scope.dispatchCompanies}
          onClose={onClose}
        />
      );

    case 'dispatched-month':
      return (
        <MonthDrill board={board} companies={scope.dispatchCompanies} onClose={onClose} />
      );

    case 'fleet':
      return <FleetDrill fleet={board.fleet} onClose={onClose} />;

    case 'transit':
      return <TransitDrill transit={board.transit} onClose={onClose} />;

    case 'freight-vendors':
      return <FreightVendorsDrill account={board.freight.account} onClose={onClose} />;

    case 'cost-litre':
      return <CostPerLitreDrill costLitre={board.dispatch.costPerLitre} onClose={onClose} />;

    default:
      return null;
  }
}
