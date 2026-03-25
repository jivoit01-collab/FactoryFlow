import { OUTBOUND_FLOW } from '../../constants/entryFlowConfig';
import SharedDashboard from '../shared/SharedDashboard';

export default function OutboundDashboard() {
  return <SharedDashboard config={OUTBOUND_FLOW} />;
}
