import { useState } from 'react';
import { toast } from 'sonner';

import { useBSTGateInwards, useMarkBSTGateIn } from '@/modules/warehouse/api';
import { getErrorMessage } from '@/shared/utils';

import { BSTGateList } from './BSTGateList';

export default function BSTGateInwardsPage() {
  const { data = [], isLoading } = useBSTGateInwards();
  const markIn = useMarkBSTGateIn();
  const [pendingId, setPendingId] = useState<number | null>(null);

  const handleMarkIn = async (id: number) => {
    setPendingId(id);
    try {
      await markIn.mutateAsync(id);
      toast.success('Vehicle marked in');
    } catch (err) {
      toast.error(getErrorMessage(err, 'Could not mark in'));
    } finally {
      setPendingId(null);
    }
  };

  return (
    <BSTGateList
      title="BST — Expected Inwards"
      description="Branch-transfer vehicles in transit and awaiting gate-in"
      emptyLabel="No vehicles awaiting gate-in"
      transfers={data}
      isLoading={isLoading}
      actionLabel="Mark In"
      pendingId={pendingId}
      onAction={handleMarkIn}
    />
  );
}
