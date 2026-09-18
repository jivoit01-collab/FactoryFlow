import type { PlantBoardResponse } from '../types';
import {
  BlowingDrill,
  DeclaredDrill,
  MonthlyPlanningDrill,
  OpenPosDrill,
  PmVehiclesDrill,
  PurchasedDrill,
  PurchasePlanDrill,
  ShippedDrill,
  StockSpaceDrill,
  StoreNonMovingDrill,
  TodayLinesDrill,
  TotalStockDrill,
  WastageDrill,
} from './drills';

/**
 * The rows behind a tile.
 *
 * WHY A WALL BOARD IS CLICKABLE AT ALL. This screen was drawn for a factory TV
 * — full screen, no clicks, re-reading on a timer — and none of that changes:
 * nobody presses a television, and a board left alone behaves exactly as it
 * did. But the same URL is open on desks all day, and there the question that
 * follows every figure is "which ones". Answering it in place is the difference
 * between a board people trust and a board people re-derive in Excel.
 *
 * AND THEN "WHICH ONES UNDER THAT". Every panel that has a second level opens
 * it underneath the row rather than over it: the shortage says what is on order
 * against it, the store says which measured block it stands on, the idle band
 * names its SKUs, the waste day breaks into the units it was logged in. The
 * list the reader was scanning stays where it was.
 *
 * WHAT A PANEL MAY AND MAY NOT SAY. It opens with the tile's own figures above
 * the rows that make them up, because a drill-down that quietly disagrees with
 * the tile that opened it is worse than no drill-down. Where this feed does not
 * carry the rows behind a figure, the panel SAYS SO and names the page that
 * does, rather than showing an empty table the reader has to interpret. The
 * same rule governs the second level: a row with nothing under it keeps its
 * figures and loses its chevron.
 */

/** Which tile's rows to show. One per openable tile. */
export type PlantDrillKey =
  | 'plan'
  | 'purchased'
  | 'benchmark'
  | 'open-pos'
  | 'stock-space'
  | 'non-moving'
  | 'pm-vehicles'
  | 'blowing'
  | 'today-lines'
  | 'monthly-planning'
  | 'total-stock'
  | 'wastage'
  | 'declared'
  | 'shipped';

export interface PlantBoardDrillProps {
  which: PlantDrillKey;
  data: PlantBoardResponse | undefined;
  onClose: () => void;
}

export function PlantBoardDrill({ which, data, onClose }: PlantBoardDrillProps) {
  const purchase = data?.purchase ?? null;
  const store = data?.store ?? null;
  const production = data?.production ?? null;
  const shifting = data?.shifting ?? null;

  switch (which) {
    // -------------------------------------------------------------- purchase
    case 'plan':
    case 'benchmark':
      return <PurchasePlanDrill which={which} purchase={purchase} onClose={onClose} />;

    case 'purchased':
      return <PurchasedDrill purchase={purchase} onClose={onClose} />;

    case 'open-pos':
      return <OpenPosDrill purchase={purchase} onClose={onClose} />;

    // ----------------------------------------------------------------- store
    case 'stock-space':
      return <StockSpaceDrill store={store} onClose={onClose} />;

    case 'non-moving':
      return <StoreNonMovingDrill store={store} onClose={onClose} />;

    case 'pm-vehicles':
      return <PmVehiclesDrill store={store} onClose={onClose} />;

    case 'blowing':
      return <BlowingDrill store={store} onClose={onClose} />;

    // ------------------------------------------------------------ production
    case 'today-lines':
      return <TodayLinesDrill production={production} onClose={onClose} />;

    case 'monthly-planning':
      return <MonthlyPlanningDrill production={production} onClose={onClose} />;

    case 'total-stock':
      return <TotalStockDrill production={production} onClose={onClose} />;

    case 'wastage':
      return <WastageDrill production={production} onClose={onClose} />;

    // -------------------------------------------------------------- shifting
    case 'declared':
      return <DeclaredDrill shifting={shifting} onClose={onClose} />;

    case 'shipped':
      return <ShippedDrill shifting={shifting} onClose={onClose} />;

    default:
      return null;
  }
}

export default PlantBoardDrill;
