import { OUTBOUND_FLOW } from '../../constants/entryFlowConfig';
import SharedAllPage from '../shared/SharedAllPage';

export default function OutboundAllPage() {
  return <SharedAllPage config={OUTBOUND_FLOW} />;
}
