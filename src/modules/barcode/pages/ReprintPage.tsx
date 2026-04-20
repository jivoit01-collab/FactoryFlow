import { useState, useRef, useCallback } from 'react';
import { useReactToPrint } from 'react-to-print';
import { Printer } from 'lucide-react';
import { toast } from 'sonner';

import { DashboardHeader } from '@/shared/components/dashboard/DashboardHeader';
import { SearchableSelect } from '@/shared/components/SearchableSelect';
import { Card, CardContent, Button, Badge } from '@/shared/components/ui';

import { useBoxes, usePallets, usePrintBoxLabel, usePrintPalletLabel } from '../api';
import BoxLabel from '../components/BoxLabel';
import PalletLabel from '../components/PalletLabel';
import type { LabelData, Box, Pallet } from '../types';
import type { BoxLabelData } from '../components/BoxLabel';
import type { PalletLabelData } from '../components/PalletLabel';

export default function ReprintPage() {
  const [searchType, setSearchType] = useState<'BOX' | 'PALLET'>('BOX');
  const [boxSearch, setBoxSearch] = useState('');
  const [palletSearch, setPalletSearch] = useState('');
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [selectedLabel, setSelectedLabel] = useState<string>('');
  const [reprintReason, setReprintReason] = useState('');
  const [currentLabel, setCurrentLabel] = useState<LabelData | null>(null);
  const printRef = useRef<HTMLDivElement>(null);

  const handlePrint = useReactToPrint({ contentRef: printRef, documentTitle: 'Reprint Label' });

  const { data: boxes = [], isLoading: loadingBoxes } = useBoxes(
    searchType === 'BOX' && boxSearch.length >= 2 ? { search: boxSearch } : undefined
  );
  const { data: pallets = [], isLoading: loadingPallets } = usePallets(
    searchType === 'PALLET' && palletSearch.length >= 2 ? { search: palletSearch } : undefined
  );

  const handleBoxSearch = useCallback((s: string) => setBoxSearch(s), []);
  const handlePalletSearch = useCallback((s: string) => setPalletSearch(s), []);

  const printBoxMutation = usePrintBoxLabel();
  const printPalletMutation = usePrintPalletLabel();

  const handleReprint = async () => {
    if (!selectedId) return;
    if (!reprintReason.trim()) {
      toast.error('Please enter a reprint reason.');
      return;
    }

    try {
      let label: LabelData;
      if (searchType === 'BOX') {
        label = await printBoxMutation.mutateAsync({
          boxId: selectedId,
          data: { print_type: 'REPRINT', reprint_reason: reprintReason },
        });
      } else {
        label = await printPalletMutation.mutateAsync({
          palletId: selectedId,
          data: { print_type: 'REPRINT', reprint_reason: reprintReason },
        });
      }
      setCurrentLabel(label);
      toast.success('Label ready — printing...');
      setTimeout(() => handlePrint(), 300);
    } catch (err: unknown) {
      toast.error((err as { response?: { data?: { error?: string } } })?.response?.data?.error || 'Failed to print');
    }
  };

  return (
    <div className="space-y-6">
      <DashboardHeader title="Reprint Labels" subtitle="Search and reprint box or pallet labels" />

      <Card>
        <CardContent className="p-4 space-y-4">
          {/* Type toggle + search */}
          <div className="flex flex-wrap gap-4 items-end">
            <div>
              <label className="text-xs font-medium text-muted-foreground">Label Type</label>
              <div className="flex gap-2 mt-1">
                <Button
                  size="sm"
                  variant={searchType === 'BOX' ? 'default' : 'outline'}
                  onClick={() => { setSearchType('BOX'); setSelectedId(null); setSelectedLabel(''); }}
                >
                  Box
                </Button>
                <Button
                  size="sm"
                  variant={searchType === 'PALLET' ? 'default' : 'outline'}
                  onClick={() => { setSearchType('PALLET'); setSelectedId(null); setSelectedLabel(''); }}
                >
                  Pallet
                </Button>
              </div>
            </div>

            <div className="flex-1 min-w-[300px]">
              {searchType === 'BOX' ? (
                <SearchableSelect<Box>
                  key="reprint-box"
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
                      <div className="flex items-center gap-2">
                        <span className="text-xs">{b.qty} {b.uom}</span>
                        <Badge className={b.status === 'ACTIVE' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}>{b.status}</Badge>
                      </div>
                    </div>
                  )}
                  placeholder="Search box by barcode, item, or batch..."
                  label="Select Box"
                  required
                  inputId="reprint-box-search"
                  loadingText="Searching..."
                  emptyText="Type at least 2 characters"
                  notFoundText="No boxes found"
                  onSearchChange={handleBoxSearch}
                  onItemSelect={(b) => { setSelectedId(b.id); setSelectedLabel(b.box_barcode); }}
                  onClear={() => { setSelectedId(null); setSelectedLabel(''); }}
                />
              ) : (
                <SearchableSelect<Pallet>
                  key="reprint-pallet"
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
                      <div className="flex items-center gap-2">
                        <span className="text-xs">{p.box_count} boxes</span>
                        <Badge className={p.status === 'ACTIVE' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}>{p.status}</Badge>
                      </div>
                    </div>
                  )}
                  placeholder="Search pallet by ID, item, or batch..."
                  label="Select Pallet"
                  required
                  inputId="reprint-pallet-search"
                  loadingText="Searching..."
                  emptyText="Type at least 2 characters"
                  notFoundText="No pallets found"
                  onSearchChange={handlePalletSearch}
                  onItemSelect={(p) => { setSelectedId(p.id); setSelectedLabel(p.pallet_id); }}
                  onClear={() => { setSelectedId(null); setSelectedLabel(''); }}
                />
              )}
            </div>
          </div>

          {/* Reprint reason + button */}
          {selectedId && (
            <div className="flex gap-3 items-end">
              <div className="flex-1">
                <label className="text-xs font-medium text-muted-foreground">Reprint Reason *</label>
                <input
                  className="w-full border rounded px-3 py-2 text-sm mt-1"
                  placeholder="e.g. Label damaged, fell off, new repack"
                  value={reprintReason}
                  onChange={(e) => setReprintReason(e.target.value)}
                />
              </div>
              <Button
                onClick={handleReprint}
                disabled={printBoxMutation.isPending || printPalletMutation.isPending || !reprintReason.trim()}
              >
                <Printer className="h-4 w-4 mr-1" />
                {printBoxMutation.isPending || printPalletMutation.isPending ? 'Printing...' : `Reprint ${selectedLabel}`}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Hidden print area */}
      <div className="hidden">
        <div ref={printRef}>
          {currentLabel?.type === 'BOX' && <BoxLabel data={currentLabel as BoxLabelData} />}
          {currentLabel?.type === 'PALLET' && <PalletLabel data={currentLabel as PalletLabelData} />}
        </div>
      </div>
    </div>
  );
}
