import { DAILY_NEED_FLOW } from '../constants/entryFlowConfig';
import SharedDashboard from './shared/SharedDashboard';

export default function DailyNeedsPage() {
  return <SharedDashboard config={DAILY_NEED_FLOW} />;
}
