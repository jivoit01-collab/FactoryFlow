import { Package } from 'lucide-react';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';

import { ENTRY_STATUS } from '@/config/constants';
import type { ApiError } from '@/core/api/types';
import { Button, Card } from '@/shared/components/ui';

import { useCompleteFGEntry, useFGReceipts } from '../../api/fg/fg.queries';
import { useVehicleEntry } from '../../api/vehicle/vehicleEntry.queries';
import { GateStatusBadge, GateSuccessScreen, StepHeader, StepLoadingSpinner } from '../../components';
import { FINISHED_GOODS_FLOW } from '../../constants/entryFlowConfig';
import { useEntryId, useEntryStepTracker } from '../../hooks';

export default function ReviewPage() {
  const navigate = useNavigate();
  const { entryIdNumber } = useEntryId();
  useEntryStepTracker();

  const { data: entry, isLoading: isLoadingEntry } = useVehicleEntry(entryIdNumber);
  const { data: receipts = [], isLoading: isLoadingReceipts } = useFGReceipts(entryIdNumber);
  const completeEntry = useCompleteFGEntry();

  const [showSuccess, setShowSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isCompleted =
    entry?.status === ENTRY_STATUS.COMPLETED || entry?.status === ENTRY_STATUS.QC_COMPLETED;
  const hasItems = receipts.some((r) => r.items.length > 0);

  const handleComplete = async () => {
    if (!entryIdNumber) return;
    setError(null);
    try {
      await completeEntry.mutateAsync(entryIdNumber);
      toast.success('Finished-goods gate entry completed');
      setShowSuccess(true);
    } catch (err) {
      const apiError = err as ApiError;
      setError(apiError.message || 'Failed to complete gate entry.');
    }
  };

  if (isLoadingEntry || isLoadingReceipts) {
    return <StepLoadingSpinner />;
  }

  if (showSuccess) {
    return (
      <GateSuccessScreen
        title="Gate Entry Completed"
        subtitle="This finished-goods entry is ready for material GRPO."
        dashboardLabel="Finished Goods Dashboard"
        dashboardIcon={Package}
        onNavigateToDashboard={() => navigate(FINISHED_GOODS_FLOW.routePrefix)}
        onNavigateToHome={() => navigate('/')}
      />
    );
  }

  return (
    <div className="mx-auto max-w-5xl p-4">
      <StepHeader
        currentStep={FINISHED_GOODS_FLOW.totalSteps}
        totalSteps={FINISHED_GOODS_FLOW.totalSteps}
        title={FINISHED_GOODS_FLOW.headerTitle}
        error={error}
      />

      <div className="space-y-4">
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold">{entry?.entry_no}</h3>
              <p className="text-sm text-muted-foreground">
                {entry?.vehicle?.vehicle_number} · {entry?.driver?.name}
              </p>
            </div>
            {entry?.status && <GateStatusBadge status={entry.status} />}
          </div>
        </Card>

        {receipts.map((receipt) => (
          <Card key={receipt.id} className="p-4">
            <div className="mb-2">
              <h4 className="font-semibold">PO {receipt.po_number}</h4>
              <p className="text-sm text-muted-foreground">
                {receipt.supplier_name} ({receipt.supplier_code})
              </p>
            </div>
            <div className="overflow-x-auto rounded-md border">
              <table className="w-full min-w-[600px] text-sm">
                <thead className="bg-muted/50">
                  <tr>
                    <th className="p-2 text-left font-medium">Item Code</th>
                    <th className="p-2 text-left font-medium">Item Name</th>
                    <th className="p-2 text-right font-medium">Received</th>
                    <th className="p-2 text-left font-medium">UOM</th>
                  </tr>
                </thead>
                <tbody>
                  {receipt.items.map((it) => (
                    <tr key={it.id} className="border-t">
                      <td className="p-2 whitespace-nowrap font-medium">{it.po_item_code}</td>
                      <td className="p-2">{it.item_name}</td>
                      <td className="p-2 text-right">{it.received_qty}</td>
                      <td className="p-2 whitespace-nowrap">{it.uom}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        ))}

        {receipts.length === 0 && (
          <Card className="p-6 text-center text-muted-foreground">
            No PO received yet. Go back and add a finished-goods PO.
          </Card>
        )}

        <div className="flex items-center justify-between gap-2">
          <Button
            variant="outline"
            onClick={() =>
              navigate(`${FINISHED_GOODS_FLOW.routePrefix}/edit/${entryIdNumber}/step2`)
            }
          >
            ← Previous
          </Button>

          {isCompleted ? (
            <span className="text-sm font-medium text-green-600">Already completed</span>
          ) : (
            <Button
              onClick={handleComplete}
              disabled={!hasItems || completeEntry.isPending}
            >
              {completeEntry.isPending ? 'Completing…' : 'Complete Entry'}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
