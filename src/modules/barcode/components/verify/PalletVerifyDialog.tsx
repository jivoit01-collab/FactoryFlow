import { ClipboardCheck } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';

import { SearchableSelect } from '@/shared/components/SearchableSelect';
import {
  Badge,
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/shared/components/ui';

import { useCreateVerifyRequest, usePallets } from '../../api';
import type { Pallet } from '../../types';
import { toastBarcodeError } from '../../utils/errors';
import ScanSearchButton from '../ScanSearchButton';
import PalletVerifyPanel from './PalletVerifyPanel';

interface PalletVerifyDialogProps {
  /** Disable the trigger (e.g. no session context). */
  disabled?: boolean;
  triggerClassName?: string;
  /** Expose the stock-moving apply controls. Off by default — in a dispatch
   * fallback you want verify + label recovery only, never mid-dispatch moves. */
  allowApply?: boolean;
}

/**
 * A reusable "barcode missing?" fallback: opens the pallet verify/reconcile panel
 * in a modal so an operator can confirm a pallet's contents and reprint a fallen-off
 * label without leaving their current flow (e.g. the dispatch scanner).
 */
export default function PalletVerifyDialog({
  disabled = false,
  triggerClassName,
  allowApply = false,
}: PalletVerifyDialogProps) {
  const [open, setOpen] = useState(false);
  const [palletId, setPalletId] = useState<number | null>(null);
  const [palletSearch, setPalletSearch] = useState('');
  const [scannedPalletSearch, setScannedPalletSearch] = useState('');

  const { data: pallets = [], isLoading } = usePallets(
    palletSearch.length >= 2 ? { search: palletSearch } : undefined,
    { enabled: palletSearch.length >= 2 },
  );
  const createMutation = useCreateVerifyRequest();

  const handleOpenChange = (next: boolean) => {
    setOpen(next);
    if (!next) {
      setPalletId(null);
      setPalletSearch('');
      setScannedPalletSearch('');
    }
  };

  const handleSubmit = async ({
    scannedBarcodes,
    unlabeledCount,
    reason,
  }: {
    scannedBarcodes: string[];
    unlabeledCount: number;
    reason: string;
  }) => {
    if (!palletId) return;
    try {
      await createMutation.mutateAsync({
        pallet_id: palletId,
        reason,
        source: 'DISPATCH',
        scanned_barcodes: scannedBarcodes,
        unlabeled_count: unlabeledCount,
      });
      toast.success('Submitted to the barcode team.');
      handleOpenChange(false);
    } catch (err) {
      toastBarcodeError(err, 'Unable to submit the request.');
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button type="button" variant="outline" className={triggerClassName} disabled={disabled}>
          <ClipboardCheck className="h-4 w-4" />
          Barcode missing?
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Verify pallet / recover label</DialogTitle>
          <DialogDescription>
            Scan the boxes on a pallet to confirm contents and reprint a fallen-off box label, then
            scan the fresh label into dispatch.
          </DialogDescription>
        </DialogHeader>

        {palletId ? (
          <div className="space-y-3">
            <Button variant="ghost" size="sm" onClick={() => setPalletId(null)}>
              ← Choose a different pallet
            </Button>
            <PalletVerifyPanel
              palletId={palletId}
              allowApply={allowApply}
              onSubmit={handleSubmit}
              submitting={createMutation.isPending}
            />
          </div>
        ) : (
          <SearchableSelect<Pallet>
            items={pallets}
            isLoading={isLoading && palletSearch.length >= 2}
            getItemKey={(p) => p.id}
            getItemLabel={(p) => `${p.pallet_id} — ${p.item_name || p.item_code}`}
            filterFn={() => true}
            renderItem={(p) => (
              <div className="flex items-center justify-between w-full">
                <div>
                  <span className="font-mono text-xs font-medium">{p.pallet_id}</span>
                  <span className="ml-2 text-sm">{p.item_name || p.item_code}</span>
                </div>
                <Badge className="bg-gray-100 text-gray-800">{p.box_count} boxes</Badge>
              </div>
            )}
            placeholder="Search pallet by ID, item, or batch..."
            label="Select Pallet to Verify"
            labelAction={<ScanSearchButton onScan={setScannedPalletSearch} expectedType="PALLET" />}
            scannedSearchValue={scannedPalletSearch}
            inputId="dispatch-verify-pallet-search"
            loadingText="Searching..."
            emptyText="Type at least 2 characters"
            notFoundText="No pallets found"
            onSearchChange={setPalletSearch}
            onItemSelect={(p) => setPalletId(p.id)}
            onClear={() => setPalletId(null)}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}
