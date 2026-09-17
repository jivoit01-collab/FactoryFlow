import { useParams } from 'react-router-dom';

import { BSTDetailView } from './BSTDetailView';

/**
 * The BST detail route. The page is only the route wrapper — everything it
 * shows lives in `BSTDetailView`, which the transfer-request page reuses inside
 * a modal.
 */
export default function BSTDetailPage() {
  const { transferId: idParam } = useParams<{ transferId: string }>();

  return <BSTDetailView transferId={Number(idParam)} mode="page" />;
}
