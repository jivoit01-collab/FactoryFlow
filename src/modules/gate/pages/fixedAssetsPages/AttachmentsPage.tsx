import { FIXED_ASSET_FLOW } from '../../constants/entryFlowConfig';
import SharedAttachmentsPage from '../shared/SharedAttachmentsPage';

export default function AttachmentsPage() {
  return (
    <SharedAttachmentsPage
      config={FIXED_ASSET_FLOW}
      requiredDocumentLabel="Invoice / Bill Document"
      requiredDocumentDescription="Vendor invoice, bill, challan, or asset purchase document"
      requiredDocumentError="Invoice upload is required before review."
    />
  );
}
