import { LOGISTICS_CONTROL_BEVERAGES_SCOPE } from '../constants';
import { LogisticsControlDashboardPage } from './LogisticsControlDashboardPage';

/**
 * The beverages plant's operations board.
 *
 * Its own route rather than a company switcher on the Oil board, which is the
 * distinction a wall screen makes: nobody is standing at one to click a toggle,
 * a reload would drop it back to whichever scope was the default, and the two
 * plants are watched by two different teams who want both up at once.
 *
 * Deliberately a wrapper and not a copy. Every tile, hue and caveat comes from
 * `LogisticsControlDashboardPage`, so a fix to how the freight funnel ages or
 * how the day plan is counted lands on both walls at once — which is the only
 * way two boards stay readable as one board.
 *
 * Three of its sixteen tiles have no source on this side of the plant and say
 * so rather than showing a zero: Beverages stock is not barcoded, no WMS floor
 * is mapped to BH-FG, and the transit read's route table has no Beverages leg.
 * See `LOGISTICS_CONTROL_BEVERAGES_SCOPE` for the evidence behind each.
 */
export function BeveragesControlDashboardPage() {
  return <LogisticsControlDashboardPage scope={LOGISTICS_CONTROL_BEVERAGES_SCOPE} />;
}

export default BeveragesControlDashboardPage;
