import { LOGISTICS_CONTROL_BEVERAGES_SCOPE } from '../constants';
import { LogisticsControlConfigPage } from './LogisticsControlConfigPage';

/**
 * Settings for the beverages board — BH-FG's capacity, and the Beverages fleet.
 *
 * A separate route because the rows themselves are separate: both the warehouse
 * settings and the company figures are stored per company, and one screen
 * editing whichever company the viewer is signed into is how a Beverages
 * capacity would end up written against Oil.
 */
export function BeveragesControlConfigPage() {
  return <LogisticsControlConfigPage scope={LOGISTICS_CONTROL_BEVERAGES_SCOPE} />;
}

export default BeveragesControlConfigPage;
