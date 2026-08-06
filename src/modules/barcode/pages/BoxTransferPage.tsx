import { ArrowRightLeft } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';

import { useWmsPalletSync } from '@/modules/wms/store';
import { DashboardHeader } from '@/shared/components/dashboard/DashboardHeader';
import { SearchableSelect } from '@/shared/components/SearchableSelect';
import { Badge, Button, Card, CardContent } from '@/shared/components/ui';

import { barcodeApi, usePalletDetail, usePallets, useTransferBoxes } from '../api';
import ScanSearchButton from '../components/ScanSearchButton';
import type { Pallet } from '../types';
import { toastBarcodeError } from '../utils/errors';

function getRemainingSpace(pallet: Pallet) {
  if (!pallet.max_box_count) {
    return Number.POSITIVE_INFINITY;
  }
  return Math.max(pallet.max_box_count - pallet.box_count, 0);
}

function formatRemainingSpace(pallet: Pallet) {
  if (!pallet.max_box_count) {
    return 'Open capacity';
  }
  return `${getRemainingSpace(pallet)} free of ${pallet.max_box_count}`;
}

function asList<T>(value: T[] | undefined): T[] {
  return Array.isArray(value) ? value : [];
}

function sameText(left?: string | null, right?: string | null) {
  return (left ?? '') === (right ?? '');
}

export default function BoxTransferPage() {
  const navigate = useNavigate();
  const [sourceSearch, setSourceSearch] = useState('');
  const [targetSearch, setTargetSearch] = useState('');
  const [scannedSourceSearch, setScannedSourceSearch] = useState('');
  const [scannedTargetSearch, setScannedTargetSearch] = useState('');
  const [sourcePalletId, setSourcePalletId] = useState<number | null>(null);
  const [targetPalletId, setTargetPalletId] = useState<number | null>(null);
  const [selectedBoxIds, setSelectedBoxIds] = useState<number[]>([]);

  const { data: sourcePallets = [], isLoading: loadingSourcePallets } = usePallets({
    search: sourceSearch.trim() || undefined,
    // A PARTIAL pallet (some boxes dispatched, some still live) is a valid box
    // source too -- its active boxes can move -- so don't restrict to ACTIVE.
    status: 'ACTIVE,PARTIAL',
  });
  const { data: sourcePallet } = usePalletDetail(sourcePalletId);
  const { data: targetPallets = [], isLoading: loadingTargetPallets } = usePallets(
    { search: targetSearch.trim() || undefined },
    { enabled: selectedBoxIds.length > 0 && !!sourcePallet },
  );
  const { data: selectedTargetPallet } = usePalletDetail(targetPalletId);
  const transferMutation = useTransferBoxes();
  const syncToWms = useWmsPalletSync();

  const sourcePalletOptions = asList(sourcePallets);
  const targetPalletOptions = asList(targetPallets);
  const sourceBoxes = asList(sourcePallet?.boxes);
  const activeBoxes = sourceBoxes.filter(
    (box) => box.status === 'ACTIVE' || box.status === 'PARTIAL',
  );
  const selectedBoxes = activeBoxes.filter((box) => selectedBoxIds.includes(box.id));
  const targetPallet =
    selectedTargetPallet ?? targetPalletOptions.find((pallet) => pallet.id === targetPalletId);

  const eligibleTargetPallets = targetPalletOptions.filter((pallet) => {
    if (!sourcePallet || pallet.id === sourcePalletId) {
      return false;
    }

    const isEmpty = pallet.box_count === 0;
    const hasNoContext = !pallet.item_code && !pallet.batch_number && !pallet.uom;
    const isReusableClearedPallet = pallet.status === 'CLEARED' && isEmpty;
    const matchesSourceContext =
      sameText(pallet.item_code, sourcePallet.item_code) &&
      sameText(pallet.batch_number, sourcePallet.batch_number) &&
      sameText(pallet.uom, sourcePallet.uom);
    const canReceiveByStatus =
      pallet.status === 'CLEARED' ||
      (pallet.status === 'ACTIVE' && (isEmpty || matchesSourceContext));
    const canReceiveByContext =
      isReusableClearedPallet || (isEmpty && hasNoContext) || matchesSourceContext;

    // Capacity is intentionally NOT gated here: a transfer may consolidate boxes onto
    // a pallet past its nominal max_box_count (the backend skips the cap for transfers
    // too). The item/batch/uom compatibility above still applies.
    return canReceiveByStatus && canReceiveByContext;
  });

  const handleSourceSearchChange = useCallback((search: string) => {
    setSourceSearch(search);
  }, []);

  const handleTargetSearchChange = useCallback((search: string) => {
    setTargetSearch(search);
  }, []);

  useEffect(() => {
    if (!sourceSearch.trim() || sourcePalletOptions.length !== 1) return;
    const [pallet] = sourcePalletOptions;
    if (pallet.pallet_id.toLowerCase() !== sourceSearch.trim().toLowerCase()) return;
    if (sourcePalletId === pallet.id) return;

    setSourcePalletId(pallet.id);
    setTargetPalletId(null);
    setSelectedBoxIds([]);
  }, [sourcePalletId, sourcePalletOptions, sourceSearch]);

  useEffect(() => {
    if (!targetSearch.trim() || eligibleTargetPallets.length !== 1) return;
    const [pallet] = eligibleTargetPallets;
    if (pallet.pallet_id.toLowerCase() !== targetSearch.trim().toLowerCase()) return;
    if (targetPalletId === pallet.id) return;

    setTargetPalletId(pallet.id);
  }, [eligibleTargetPallets, targetPalletId, targetSearch]);

  const toggleBox = (id: number) => {
    setSelectedBoxIds((prev) =>
      prev.includes(id) ? prev.filter((boxId) => boxId !== id) : [...prev, id],
    );
    setTargetPalletId(null);
  };

  const handleTransfer = async () => {
    if (!targetPallet || selectedBoxIds.length === 0) {
      return;
    }

    try {
      await transferMutation.mutateAsync({
        box_ids: selectedBoxIds,
        to_warehouse: targetPallet.current_warehouse,
        // Boxes adopt the destination pallet's location/bin (its warehouse may be
        // an own/WMS warehouse with internal bins).
        to_bin: targetPallet.current_bin || undefined,
        to_pallet_id: targetPallet.id,
      });
      toast.success(`Transferred ${selectedBoxIds.length} boxes to ${targetPallet.pallet_id}`);

      // Reconcile both pallets into Warehouse Ops (best effort): box counts and
      // quantities changed, so re-read their fresh state and sync each. A pallet
      // sitting in a WMS-managed warehouse will reflect the new contents; one in
      // a non-WMS warehouse is left untouched (or dropped if it was in the WMS).
      // Awaited before navigating so WMS is up to date when the next page loads.
      const ids = [sourcePalletId, targetPallet.id].filter((id): id is number => id != null);
      for (const id of ids) {
        try {
          const detail = await barcodeApi.getPalletDetail(id);
          await syncToWms({
            licensePlate: detail.pallet_id,
            warehouseCode: detail.current_warehouse,
            binCode: detail.current_bin,
            itemCode: detail.item_code,
            itemName: detail.item_name,
            lotNumber: detail.batch_number,
            boxCount: detail.box_count,
            totalUnits: Number(detail.total_qty) || 0,
            uom: detail.uom,
          });
        } catch {
          // Non-fatal: the barcode transfer already succeeded.
        }
      }

      navigate(`/barcode/pallets/${targetPallet.id}`);
    } catch (err: unknown) {
      toastBarcodeError(err, 'Unable to transfer boxes. Check target capacity and pallet details.');
    }
  };

  const selectedQty = selectedBoxes.reduce((sum, box) => sum + (Number(box.qty) || 0), 0);
  const targetRemainingAfterTransfer = targetPallet
    ? getRemainingSpace(targetPallet) - selectedBoxIds.length
    : null;

  return (
    <div className="space-y-6">
      <DashboardHeader
        title="Box Transfer"
        description="Move selected boxes from one pallet to another pallet with available space"
      />

      <Card>
        <CardContent className="p-4 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <SearchableSelect<Pallet>
              items={sourcePalletOptions}
              isLoading={loadingSourcePallets}
              getItemKey={(pallet) => pallet.id}
              getItemLabel={(pallet) => pallet.pallet_id}
              filterFn={() => true}
              renderItem={(pallet) => (
                <div className="flex items-center justify-between w-full">
                  <div>
                    <span className="font-mono text-xs font-medium">{pallet.pallet_id}</span>
                    <span className="ml-2 text-sm">{pallet.item_name || pallet.item_code}</span>
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {pallet.box_count} boxes | {pallet.current_warehouse}
                  </span>
                </div>
              )}
              placeholder="Search source pallet..."
              label="Source Pallet"
              labelAction={
                <ScanSearchButton onScan={setScannedSourceSearch} expectedType="PALLET" />
              }
              scannedSearchValue={scannedSourceSearch}
              required
              inputId="box-transfer-source"
              loadingText="Searching..."
              emptyText="No active pallets available"
              notFoundText="No active pallets found"
              value={sourcePallet?.pallet_id || ''}
              defaultDisplayText={sourcePallet?.pallet_id || ''}
              onSearchChange={handleSourceSearchChange}
              onItemSelect={(pallet) => {
                setSourcePalletId(pallet.id);
                setTargetPalletId(null);
                setSelectedBoxIds([]);
              }}
              onClear={() => {
                setSourcePalletId(null);
                setTargetPalletId(null);
                setSelectedBoxIds([]);
              }}
            />

            <SearchableSelect<Pallet>
              items={eligibleTargetPallets}
              isLoading={loadingTargetPallets}
              getItemKey={(pallet) => pallet.id}
              getItemLabel={(pallet) => pallet.pallet_id}
              filterFn={() => true}
              renderItem={(pallet) => (
                <div className="flex items-center justify-between w-full">
                  <div>
                    <span className="font-mono text-xs font-medium">{pallet.pallet_id}</span>
                    <Badge className="ml-2 bg-blue-100 text-blue-800">
                      {pallet.current_warehouse}
                    </Badge>
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {formatRemainingSpace(pallet)}
                  </span>
                </div>
              )}
              placeholder="Search target pallet..."
              label="Target Pallet"
              labelAction={
                <ScanSearchButton onScan={setScannedTargetSearch} expectedType="PALLET" />
              }
              scannedSearchValue={scannedTargetSearch}
              required
              inputId="box-transfer-target"
              loadingText="Searching..."
              emptyText={
                selectedBoxIds.length > 0
                  ? 'No compatible target pallets available'
                  : 'Select boxes before choosing target'
              }
              notFoundText="No matching pallet with enough space"
              value={targetPallet?.pallet_id || ''}
              defaultDisplayText={targetPallet?.pallet_id || ''}
              onSearchChange={handleTargetSearchChange}
              onItemSelect={(pallet) => setTargetPalletId(pallet.id)}
              onClear={() => setTargetPalletId(null)}
            />
          </div>
        </CardContent>
      </Card>

      {sourcePallet && activeBoxes.length > 0 && (
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold">
                Select boxes to transfer ({selectedBoxIds.length} of {activeBoxes.length})
              </h3>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => {
                  setSelectedBoxIds(
                    selectedBoxIds.length === activeBoxes.length
                      ? []
                      : activeBoxes.map((box) => box.id),
                  );
                  setTargetPalletId(null);
                }}
              >
                {selectedBoxIds.length === activeBoxes.length ? 'Deselect all' : 'Select all'}
              </Button>
            </div>

            <div className="max-h-64 overflow-y-auto space-y-1 mb-4">
              {activeBoxes.map((box) => (
                <label
                  key={box.id}
                  className="flex items-center gap-3 p-2 bg-muted/30 rounded cursor-pointer hover:bg-muted/50"
                >
                  <input
                    type="checkbox"
                    checked={selectedBoxIds.includes(box.id)}
                    onChange={() => toggleBox(box.id)}
                  />
                  <span className="font-mono text-xs">{box.box_barcode}</span>
                  <span className="text-sm">
                    {box.qty} {box.uom}
                  </span>
                  <Badge
                    className={
                      box.status === 'ACTIVE'
                        ? 'bg-green-100 text-green-800'
                        : 'bg-amber-100 text-amber-800'
                    }
                  >
                    {box.status}
                  </Badge>
                </label>
              ))}
            </div>

            {selectedBoxIds.length > 0 && (
              <div className="p-3 bg-blue-50 rounded-lg mb-4 text-sm">
                <strong>Transfer:</strong> {selectedBoxIds.length} boxes, {selectedQty}{' '}
                {sourcePallet.uom}
                <br />
                <strong>Target:</strong> {targetPallet?.pallet_id || 'Select a pallet'}{' '}
                {targetPallet &&
                  targetRemainingAfterTransfer != null &&
                  (targetRemainingAfterTransfer === Number.POSITIVE_INFINITY
                    ? '(open capacity)'
                    : targetRemainingAfterTransfer < 0
                      ? `(over capacity by ${Math.abs(targetRemainingAfterTransfer)} after transfer)`
                      : `(${targetRemainingAfterTransfer} spaces left after transfer)`)}
              </div>
            )}

            <Button
              onClick={handleTransfer}
              disabled={transferMutation.isPending || !targetPallet || selectedBoxIds.length === 0}
            >
              <ArrowRightLeft className="h-4 w-4 mr-1" />
              {transferMutation.isPending
                ? 'Transferring...'
                : `Transfer ${selectedBoxIds.length} boxes to target pallet`}
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
