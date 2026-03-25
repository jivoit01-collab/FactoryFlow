import { OUTBOUND_FLOW } from '../../constants/entryFlowConfig';
import SharedAttachmentsPage from '../shared/SharedAttachmentsPage';

export default function AttachmentsPage() {
  return <SharedAttachmentsPage config={OUTBOUND_FLOW} />;
}
