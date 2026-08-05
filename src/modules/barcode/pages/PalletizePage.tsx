import { PackagePlus } from 'lucide-react';
import { useCallback, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';

import { useWmsPalletSync } from '@/modules/wms/store';
import { DashboardHeader } from '@/shared/components/dashboard/DashboardHeader';
import { PaginationControls } from '@/shared/components/PaginationControls';
import { SearchableSelect } from '@/shared/components/SearchableSelect';
import { Badge, Button, Card, CardContent, Input } from '@/shared/components/ui';

import { barcodeApi, useAddBoxesToPallet, useBoxesPage, usePallets } from '../api';
import ScanSearchButton from '../components/ScanSearchButton';
import type { Box, Pallet } from '../types';
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

function sameText(left?: string | null, right?: string | null) {
  return (left ?? '') === (right ?? '');
}

function sameContext(box: Box, other: Box) {
  return (
    sameText(box.item_code, other.item_code) &&
    sameText(box.batch_number, other.batch_number) &&
    sameText(box.uom, other.uom)
  );
}

export default function PalletizePage() {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  // Full Box objects (not just ids) so a selection survives page/search changes
  // and keeps the item/batch/uom context needed to pick a compatible pallet.
  const [selectedBoxes, setSelectedBoxes] = useState<Box[]>([]);
  const [targetSearch, setTargetSearch] = useState('');
  const [scannedTargetSearch, setScannedTargetSearch] = useState('');
  const [targetPalletId, setTargetPalletId] = useState<number | null>(null);

  const applyBoxSearch = useCallback((value: string) => {
    setSearch(value);
    setPage(1);
  }, []);

  const { data: boxPage, isLoading: loadingBoxes } = useBoxesPage({
    unpalletized: 'true',
    status: 'ACTIVE,PARTIAL',
    search: search.trim() || undefined,
    page,
    page_size: pageSize,
  });
  const boxes = boxPage?.results ?? [];

  const contextBox = selectedBoxes[0] ?? null;
  const selectedIds = selectedBoxes.map((box) => box.id);

  const { data: targetPallets = [], isLoading: loadingTargetPallets } = usePallets(
    { search: targetSearch.trim() || undefined, status: 'ACTIVE,CLEARED' },
    { enabled: selectedBoxes.length > 0 },
  );

  const eligibleTargetPallets = (Array.isArray(targetPallets) ? targetPallets : []).filter(
    (pallet) => {
      if (!contextBox) {
        return false;
      }

      const isEmpty = pallet.box_count === 0;
      const matchesContext =
        sameText(pallet.item_code, contextBox.item_code) &&
        sameText(pallet.batch_number, contextBox.batch_number) &&
        sameText(pallet.uom, contextBox.uom);
      const canReceiveByStatus =
        pallet.status === 'ACTIVE' || (pallet.status === 'CLEARED' && isEmpty);
      const canReceiveByContext = matchesContext || isEmpty;
      // Palletize goes through the add-boxes endpoint, which enforces max_box_count.
      const hasSpace = getRemainingSpace(pallet) >= selectedBoxes.length;

      return canReceiveByStatus && canReceiveByContext && hasSpace;
    },
  );

  // A scan (or typed search) that resolves to exactly one eligible pallet acts
  // as the selection without an extra click — derived, not stored.
  const exactSearchMatch =
    targetSearch.trim() &&
    eligibleTargetPallets.length === 1 &&
    eligibleTargetPallets[0].pallet_id.toLowerCase() === targetSearch.trim().toLowerCase()
      ? eligibleTargetPallets[0]
      : null;
  const targetPallet =
    eligibleTargetPallets.find((pallet) => pallet.id === targetPalletId) ?? exactSearchMatch;

  const addBoxesMutation = useAddBoxesToPallet();
  const syncToWms = useWmsPalletSync();

  const handleTargetSearchChange = useCallback((value: string) => {
    setTargetSearch(value);
  }, []);

  const toggleBox = (box: Box) => {
    setSelectedBoxes((prev) =>
      prev.some((b) => b.id === box.id) ? prev.filter((b) => b.id !== box.id) : [...prev, box],
    );
    setTargetPalletId(null);
  };

  const selectablePageBoxes = boxes.filter((box) => !contextBox || sameContext(box, contextBox));
  const allPageSelected =
    selectablePageBoxes.length > 0 &&
    selectablePageBoxes.every((box) => selectedIds.includes(box.id));

  const toggleSelectPage = () => {
    setTargetPalletId(null);
    if (allPageSelected) {
      const pageIds = selectablePageBoxes.map((box) => box.id);
      setSelectedBoxes((prev) => prev.filter((box) => !pageIds.includes(box.id)));
      return;
    }
    setSelectedBoxes((prev) => {
      const next = [...prev];
      for (const box of selectablePageBoxes) {
        if (!next.some((b) => b.id === box.id)) {
          next.push(box);
        }
      }
      return next;
    });
  };

  const handlePalletize = async () => {
    if (!targetPallet || selectedBoxes.length === 0) {
      return;
    }

    try {
      await addBoxesMutation.mutateAsync({
        palletId: targetPallet.id,
        data: { box_ids: selectedIds },
      });
      toast.success(`Assigned ${selectedBoxes.length} boxes to ${targetPallet.pallet_id}`);

      // Reconcile the pallet into Warehouse Ops (best effort): its box count and
      // quantity changed. Awaited before navigating so WMS is up to date.
      try {
        const detail = await barcodeApi.getPalletDetail(targetPallet.id);
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
        // Non-fatal: the palletize already succeeded.
      }

      navigate(`/barcode/pallets/${targetPallet.id}`);
    } catch (err: unknown) {
      toastBarcodeError(err, 'Unable to assign boxes to the pallet.');
    }
  };

  const selectedQty = selectedBoxes.reduce((sum, box) => sum + (Number(box.qty) || 0), 0);

  return (
    <div className="space-y-6">
      <DashboardHeader
        title="Palletize"
        description="Assign loose (unpalletized) boxes — from dismantle, dispatch removal, or splits — back onto a pallet"
      />

      <Card>
        <CardContent className="p-4 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold">
              Unpalletized boxes {boxPage ? `(${boxPage.count})` : ''}
            </h3>
            <ScanSearchButton onScan={applyBoxSearch} expectedType="BOX" />
          </div>
          <Input
            placeholder="Search by barcode, item, or batch..."
            value={search}
            onChange={(e) => applyBoxSearch(e.target.value)}
          />

          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">
              {selectedBoxes.length > 0 && contextBox
                ? `Selected ${selectedBoxes.length} boxes — ${
                    contextBox.item_name || contextBox.item_code
                  }, batch ${contextBox.batch_number || '—'}`
                : 'Select boxes of one item and batch to palletize together'}
            </span>
            <div className="flex gap-2">
              {selectedBoxes.length > 0 && (
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => {
                    setSelectedBoxes([]);
                    setTargetPalletId(null);
                  }}
                >
                  Clear selection
                </Button>
              )}
              <Button
                size="sm"
                variant="ghost"
                onClick={toggleSelectPage}
                disabled={selectablePageBoxes.length === 0}
              >
                {allPageSelected ? 'Deselect page' : 'Select page'}
              </Button>
            </div>
          </div>

          {loadingBoxes ? (
            <p className="text-sm text-muted-foreground py-4">Loading boxes...</p>
          ) : boxes.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4">
              No unpalletized boxes{search.trim() ? ' match this search' : ''}.
            </p>
          ) : (
            <div className="max-h-96 overflow-y-auto space-y-1">
              {boxes.map((box) => {
                const checked = selectedIds.includes(box.id);
                const incompatible = !!contextBox && !checked && !sameContext(box, contextBox);
                return (
                  <label
                    key={box.id}
                    className={`flex flex-wrap items-center gap-3 p-2 bg-muted/30 rounded ${
                      incompatible
                        ? 'opacity-50 cursor-not-allowed'
                        : 'cursor-pointer hover:bg-muted/50'
                    }`}
                    title={
                      incompatible
                        ? 'Different item, batch, or UOM than the selected boxes'
                        : undefined
                    }
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      disabled={incompatible}
                      onChange={() => toggleBox(box)}
                    />
                    <span className="font-mono text-xs">{box.box_barcode}</span>
                    <span className="text-sm">{box.item_name || box.item_code}</span>
                    <span className="text-xs text-muted-foreground">
                      Batch {box.batch_number || '—'} | {box.qty} {box.uom} |{' '}
                      {box.current_warehouse}
                      {box.current_bin ? `/${box.current_bin}` : ''}
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
                    {box.removed_from_pallet_reason && (
                      <span className="text-xs text-muted-foreground italic">
                        {box.removed_from_pallet_reason}
                      </span>
                    )}
                  </label>
                );
              })}
            </div>
          )}

          <PaginationControls
            page={boxPage?.page ?? page}
            pageSize={boxPage?.page_size ?? pageSize}
            total={boxPage?.count ?? 0}
            totalPages={boxPage?.total_pages ?? 1}
            isLoading={loadingBoxes}
            onPageChange={setPage}
            onPageSizeChange={(size) => {
              setPageSize(size);
              setPage(1);
            }}
          />
        </CardContent>
      </Card>

      {selectedBoxes.length > 0 && (
        <Card>
          <CardContent className="p-4 space-y-4">
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
                    {pallet.box_count === 0 && (
                      <Badge className="ml-2 bg-gray-100 text-gray-800">Empty</Badge>
                    )}
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
              inputId="palletize-target"
              loadingText="Searching..."
              emptyText="No compatible pallets available"
              notFoundText="No matching pallet with enough space"
              value={targetPallet?.pallet_id || ''}
              defaultDisplayText={targetPallet?.pallet_id || ''}
              onSearchChange={handleTargetSearchChange}
              onItemSelect={(pallet) => setTargetPalletId(pallet.id)}
              onClear={() => setTargetPalletId(null)}
            />
            <p className="text-xs text-muted-foreground">
              Compatible pallets carry the same item, batch, and UOM — or are empty (an empty
              pallet adopts the boxes&apos; item and batch). Boxes take the pallet&apos;s
              warehouse and bin.
            </p>

            <div className="p-3 bg-blue-50 rounded-lg text-sm">
              <strong>Assign:</strong> {selectedBoxes.length} boxes, {selectedQty}{' '}
              {contextBox?.uom}
              <br />
              <strong>Target:</strong> {targetPallet?.pallet_id || 'Select a pallet'}
              {targetPallet && (
                <>
                  {' '}
                  ({targetPallet.current_warehouse}
                  {targetPallet.current_bin ? `/${targetPallet.current_bin}` : ''})
                </>
              )}
            </div>

            <Button
              onClick={handlePalletize}
              disabled={addBoxesMutation.isPending || !targetPallet || selectedBoxes.length === 0}
            >
              <PackagePlus className="h-4 w-4 mr-1" />
              {addBoxesMutation.isPending
                ? 'Assigning...'
                : `Assign ${selectedBoxes.length} boxes to pallet`}
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
