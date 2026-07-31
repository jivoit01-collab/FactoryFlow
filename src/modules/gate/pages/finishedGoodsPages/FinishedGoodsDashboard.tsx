import { FINISHED_GOODS_FLOW } from '../../constants/entryFlowConfig';
import SharedDashboard from '../shared/SharedDashboard';

export default function FinishedGoodsDashboard() {
  return <SharedDashboard config={FINISHED_GOODS_FLOW} />;
}
