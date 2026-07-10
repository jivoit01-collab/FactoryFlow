import { ArrowLeft } from 'lucide-react';
import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';

import { DashboardHeader } from '@/shared/components/dashboard/DashboardHeader';
import { Button, Card, CardContent } from '@/shared/components/ui';

import { useCreateVerifyRequest } from '../api';
import PalletPicker from '../components/verify/PalletPicker';
import PalletVerifyPanel from '../components/verify/PalletVerifyPanel';
import { toastBarcodeError } from '../utils/errors';

export default function PalletVerifyNewPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const initialId = Number.parseInt(searchParams.get('palletId') ?? '', 10);
  const [selectedPalletId, setSelectedPalletId] = useState<number | null>(
    Number.isFinite(initialId) && initialId > 0 ? initialId : null,
  );

  const createMutation = useCreateVerifyRequest();

  const handleSubmit = async ({
    scannedBarcodes,
    unlabeledCount,
    reason,
  }: {
    scannedBarcodes: string[];
    unlabeledCount: number;
    reason: string;
  }) => {
    if (!selectedPalletId) return;
    try {
      const req = await createMutation.mutateAsync({
        pallet_id: selectedPalletId,
        reason,
        source: 'MANUAL',
        scanned_barcodes: scannedBarcodes,
        unlabeled_count: unlabeledCount,
      });
      toast.success('Request submitted to the barcode team.');
      navigate(`/barcode/verify/${req.id}`);
    } catch (err) {
      toastBarcodeError(err, 'Unable to submit the request.');
    }
  };

  return (
    <div className="space-y-6">
      <DashboardHeader
        title="New Verify Request"
        description="Scan a pallet's boxes, then submit it to the barcode team"
      />

      <Button variant="ghost" size="sm" onClick={() => navigate('/barcode/verify')}>
        <ArrowLeft className="h-4 w-4 mr-1" /> Back to dashboard
      </Button>

      {selectedPalletId ? (
        <>
          <Button variant="ghost" size="sm" onClick={() => setSelectedPalletId(null)}>
            Choose a different pallet
          </Button>
          <PalletVerifyPanel
            palletId={selectedPalletId}
            onSubmit={handleSubmit}
            submitting={createMutation.isPending}
          />
        </>
      ) : (
        <Card>
          <CardContent className="p-4">
            <PalletPicker
              label="Select Pallet to Verify"
              inputId="new-verify-pallet-search"
              onSelect={(p) => setSelectedPalletId(p.id)}
            />
          </CardContent>
        </Card>
      )}
    </div>
  );
}
