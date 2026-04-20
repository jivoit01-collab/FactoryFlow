import { useState, useCallback } from 'react';
import { Package, Boxes, Scissors } from 'lucide-react';
import { toast } from 'sonner';

import { DashboardHeader } from '@/shared/components/dashboard/DashboardHeader';
import { SearchableSelect } from '@/shared/components/SearchableSelect';
import { Card, CardContent, Button, Badge } from '@/shared/components/ui';

import { usePallets, useBoxes, usePalletDetail, useBoxDetail, useDismantlePallet, useDismantleBox } from '../api';
import type { DismantleReason, Pallet, Box } from '../types';

const REASONS: { value: DismantleReason; label: string }[] = [
  { value: 'REPACK', label: 'Repack' },
  { value: 'SAMPLE', label: 'Sample' },
  { value: 'DAMAGED', label: 'Damaged' },
  { value: 'RETURN', label: 'Return' },
  { value: 'OTHER', label: 'Other' },
];

export default function DismantlePage() {
  const [mode, setMode] = useState<'pallet' | 'box'>('pallet');
  const [palletSearch, setPalletSearch] = useState('');
  const [boxSearch, setBoxSearch] = useState('');
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [selectedBoxIds, setSelectedBoxIds] = useState<number[]>([]);
  const [reason, setReason] = useState<DismantleReason>('OTHER');
  const [reasonNotes, setReasonNotes] = useState('');
  const [looseQty, setLooseQty] = useState('');

  const { data: pallets = [], isLoading: loadingPallets } = usePallets(
    mode === 'pallet' && palletSearch.length >= 2 ? { search: palletSearch, status: 'ACTIVE' } : undefined
  );
  const { data: boxes = [], isLoading: loadingBoxes } = useBoxes(
    mode === 'box' && boxSearch.length >= 2 ? { search: boxSearch, status: 'ACTIVE' } : undefined
  );

  const handlePalletSearch = useCallback((s: string) => setPalletSearch(s), []);
  const handleBoxSearch = useCallback((s: string) => setBoxSearch(s), []);
  const { data: palletDetail } = usePalletDetail(mode === 'pallet' ? selectedId : null);
  const { data: boxDetail } = useBoxDetail(mode === 'box' ? selectedId : null);

  const dismantlePalletMutation = useDismantlePallet();
  const dismantleBoxMutation = useDismantleBox();

  const toggleBoxSelect = (boxId: number) => {
    setSelectedBoxIds((prev) =>
      prev.includes(boxId) ? prev.filter((id) => id !== boxId) : [...prev, boxId]
    );
  };

  const handleDismantlePallet = async () => {
    if (!selectedId) return;
    try {
      await dismantlePalletMutation.mutateAsync({
        palletId: selectedId,
        data: {
          box_ids: selectedBoxIds.length > 0 ? selectedBoxIds : null,
          reason,
          reason_notes: reasonNotes,
        },
      });
      toast.success(`Pallet dismantled — ${selectedBoxIds.length || 'all'} boxes removed`);
      setSelectedId(null);
      setSelectedBoxIds([]);
      setReasonNotes('');
    } catch (err: unknown) {
      toast.error((err as { response?: { data?: { error?: string } } })?.response?.data?.error || 'Failed');
    }
  };

  const handleDismantleBox = async () => {
    if (!selectedId) return;
    try {
      await dismantleBoxMutation.mutateAsync({
        boxId: selectedId,
        data: {
          qty: looseQty ? Number(looseQty) : null,
          reason,
          reason_notes: reasonNotes,
        },
      });
      toast.success('Box dismantled into loose stock');
      setSelectedId(null);
      setLooseQty('');
      setReasonNotes('');
    } catch (err: unknown) {
      toast.error((err as { response?: { data?: { error?: string } } })?.response?.data?.error || 'Failed');
    }
  };

  return (
    <div className="space-y-6">
      <DashboardHeader title="Dismantle" subtitle="Break down pallets into boxes, or boxes into loose items" />

      {/* Mode + Search */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-wrap gap-4 items-end">
            <div>
              <label className="text-xs font-medium text-muted-foreground">Dismantle Type</label>
              <div className="flex gap-2 mt-1">
                <Button
                  size="sm"
                  variant={mode === 'pallet' ? 'default' : 'outline'}
                  onClick={() => { setMode('pallet'); setSelectedId(null); }}
                >
                  <Package className="h-4 w-4 mr-1" /> Pallet
                </Button>
                <Button
                  size="sm"
                  variant={mode === 'box' ? 'default' : 'outline'}
                  onClick={() => { setMode('box'); setSelectedId(null); }}
                >
                  <Boxes className="h-4 w-4 mr-1" /> Box
                </Button>
              </div>
            </div>
            <div className="flex-1 min-w-[300px]">
              {mode === 'pallet' ? (
                <SearchableSelect<Pallet>
                  key="pallet-search"
                  items={pallets}
                  isLoading={loadingPallets && palletSearch.length >= 2}
                  getItemKey={(p) => p.id}
                  getItemLabel={(p) => `${p.pallet_id} — ${p.item_name || p.item_code}`}
                  filterFn={() => true}
                  renderItem={(p) => (
                    <div className="flex items-center justify-between w-full">
                      <div>
                        <span className="font-mono text-xs font-medium">{p.pallet_id}</span>
                        <span className="ml-2 text-sm">{p.item_name || p.item_code}</span>
                        <span className="ml-1 text-xs text-muted-foreground">Batch: {p.batch_number}</span>
                      </div>
                      <span className="text-xs text-muted-foreground">{p.box_count} boxes · {p.current_warehouse}</span>
                    </div>
                  )}
                  placeholder="Search pallet by ID, item, or batch..."
                  label="Select Pallet"
                  required
                  inputId="dismantle-pallet"
                  loadingText="Searching..."
                  emptyText="Type at least 2 characters to search"
                  notFoundText="No active pallets found"
                  onSearchChange={handlePalletSearch}
                  onItemSelect={(p) => setSelectedId(p.id)}
                  onClear={() => setSelectedId(null)}
                />
              ) : (
                <SearchableSelect<Box>
                  key="box-search"
                  items={boxes}
                  isLoading={loadingBoxes && boxSearch.length >= 2}
                  getItemKey={(b) => b.id}
                  getItemLabel={(b) => `${b.box_barcode} — ${b.item_name || b.item_code}`}
                  filterFn={() => true}
                  renderItem={(b) => (
                    <div className="flex items-center justify-between w-full">
                      <div>
                        <span className="font-mono text-xs font-medium">{b.box_barcode}</span>
                        <span className="ml-2 text-sm">{b.item_name || b.item_code}</span>
                        <span className="ml-1 text-xs text-muted-foreground">Batch: {b.batch_number}</span>
                      </div>
                      <span className="text-xs text-muted-foreground">{b.qty} {b.uom} · {b.current_warehouse}</span>
                    </div>
                  )}
                  placeholder="Search box by barcode, item, or batch..."
                  label="Select Box"
                  required
                  inputId="dismantle-box"
                  loadingText="Searching..."
                  emptyText="Type at least 2 characters to search"
                  notFoundText="No active boxes found"
                  onSearchChange={handleBoxSearch}
                  onItemSelect={(b) => setSelectedId(b.id)}
                  onClear={() => setSelectedId(null)}
                />
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Pallet Detail — select boxes to dismantle */}
      {mode === 'pallet' && palletDetail && selectedId && (
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="font-semibold">{palletDetail.pallet_id}</h3>
                <p className="text-sm text-muted-foreground">
                  {palletDetail.item_name} — Batch: {palletDetail.batch_number} — {palletDetail.box_count} boxes
                </p>
              </div>
              <Badge className="bg-blue-100 text-blue-800">{palletDetail.status}</Badge>
            </div>

            {/* Box selection */}
            <div className="mb-4">
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs font-medium text-muted-foreground">
                  Select boxes to remove (leave empty to dismantle all)
                </label>
                <Button size="sm" variant="ghost" onClick={() =>
                  setSelectedBoxIds(
                    selectedBoxIds.length === (palletDetail.boxes?.length || 0)
                      ? []
                      : (palletDetail.boxes || []).filter((b) => b.status === 'ACTIVE').map((b) => b.id)
                  )
                }>
                  {selectedBoxIds.length === (palletDetail.boxes?.filter((b) => b.status === 'ACTIVE').length || 0) ? 'Deselect all' : 'Select all'}
                </Button>
              </div>
              <div className="max-h-48 overflow-y-auto space-y-1">
                {palletDetail.boxes?.filter((b) => b.status === 'ACTIVE').map((box) => (
                  <label key={box.id} className="flex items-center gap-2 p-2 bg-muted/30 rounded cursor-pointer hover:bg-muted/50">
                    <input
                      type="checkbox"
                      checked={selectedBoxIds.includes(box.id)}
                      onChange={() => toggleBoxSelect(box.id)}
                    />
                    <span className="font-mono text-xs">{box.box_barcode}</span>
                    <span className="text-xs text-muted-foreground">{box.qty} {box.uom}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Reason */}
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div>
                <label className="text-xs font-medium text-muted-foreground">Reason *</label>
                <select className="w-full border rounded px-3 py-2 text-sm mt-1" value={reason} onChange={(e) => setReason(e.target.value as DismantleReason)}>
                  {REASONS.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground">Notes</label>
                <input className="w-full border rounded px-3 py-2 text-sm mt-1" value={reasonNotes} onChange={(e) => setReasonNotes(e.target.value)} placeholder="Optional details..." />
              </div>
            </div>

            <Button onClick={handleDismantlePallet} disabled={dismantlePalletMutation.isPending}>
              <Scissors className="h-4 w-4 mr-1" />
              {dismantlePalletMutation.isPending ? 'Dismantling...' : `Dismantle ${selectedBoxIds.length || 'All'} Boxes from Pallet`}
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Box Detail — choose qty to dismantle */}
      {mode === 'box' && boxDetail && selectedId && (
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="font-semibold">{boxDetail.box_barcode}</h3>
                <p className="text-sm text-muted-foreground">
                  {boxDetail.item_name} — Batch: {boxDetail.batch_number} — {boxDetail.qty} {boxDetail.uom}
                </p>
              </div>
              <Badge className={boxDetail.status === 'ACTIVE' ? 'bg-green-100 text-green-800' : 'bg-amber-100 text-amber-800'}>
                {boxDetail.status}
              </Badge>
            </div>

            <div className="grid grid-cols-3 gap-4 mb-4">
              <div>
                <label className="text-xs font-medium text-muted-foreground">Qty to Dismantle</label>
                <input
                  type="number"
                  className="w-full border rounded px-3 py-2 text-sm mt-1"
                  value={looseQty}
                  onChange={(e) => setLooseQty(e.target.value)}
                  placeholder={`All (${boxDetail.qty})`}
                  max={Number(boxDetail.qty)}
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Leave empty for full dismantle ({boxDetail.qty} {boxDetail.uom})
                </p>
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground">Reason *</label>
                <select className="w-full border rounded px-3 py-2 text-sm mt-1" value={reason} onChange={(e) => setReason(e.target.value as DismantleReason)}>
                  {REASONS.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground">Notes</label>
                <input className="w-full border rounded px-3 py-2 text-sm mt-1" value={reasonNotes} onChange={(e) => setReasonNotes(e.target.value)} placeholder="Optional..." />
              </div>
            </div>

            <Button onClick={handleDismantleBox} disabled={dismantleBoxMutation.isPending}>
              <Scissors className="h-4 w-4 mr-1" />
              {dismantleBoxMutation.isPending ? 'Dismantling...' : `Dismantle ${looseQty || boxDetail.qty} ${boxDetail.uom} → Loose`}
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
