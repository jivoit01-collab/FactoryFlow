import { useState } from 'react';
import { toast } from 'sonner';

import { useBSTGateOutwards, useMarkBSTGateOut } from '@/modules/warehouse/api';
import { getErrorMessage } from '@/shared/utils';

import { BSTGateList } from './BSTGateList';

export default function BSTGateOutwardsPage() {
  const { data = [], isLoading } = useBSTGateOutwards();
  const markOut = useMarkBSTGateOut();
  const [pendingId, setPendingId] = useState<number | null>(null);

  const handleMarkOut = async (id: number) => {
    setPendingId(id);
    try {
      await markOut.mutateAsync(id);
      toast.success('Vehicle marked out');
    } catch (err) {
      toast.error(getErrorMessage(err, 'Could not mark out'));
    } finally {
      setPendingId(null);
    }
  };

  return (
    <BSTGateList
      title="BST — Expected Outwards"
      description="Branch-transfer vehicles dispatched and awaiting gate-out"
      emptyLabel="No vehicles awaiting gate-out"
      transfers={data}
      isLoading={isLoading}
      actionLabel="Mark Out"
      pendingId={pendingId}
      onAction={handleMarkOut}
    />
  );
}
