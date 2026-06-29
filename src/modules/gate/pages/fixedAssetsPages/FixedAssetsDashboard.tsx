import { FIXED_ASSET_FLOW } from '../../constants/entryFlowConfig';
import SharedDashboard from '../shared/SharedDashboard';

export default function FixedAssetsDashboard() {
  return <SharedDashboard config={FIXED_ASSET_FLOW} />;
}
