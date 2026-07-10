import { useState } from 'react';

import { SearchableSelect } from '@/shared/components/SearchableSelect';
import { Badge } from '@/shared/components/ui';

import { usePallets } from '../../api';
import type { Pallet } from '../../types';
import ScanSearchButton from '../ScanSearchButton';

interface PalletPickerProps {
  onSelect: (pallet: Pallet) => void;
  label?: string;
  inputId?: string;
}

/** Search-or-scan a pallet. Shared by the verify request flows. */
export default function PalletPicker({
  onSelect,
  label = 'Select Pallet',
  inputId = 'pallet-picker',
}: PalletPickerProps) {
  const [palletSearch, setPalletSearch] = useState('');
  const [scannedPalletSearch, setScannedPalletSearch] = useState('');

  const { data: pallets = [], isLoading } = usePallets(
    palletSearch.length >= 2 ? { search: palletSearch } : undefined,
    { enabled: palletSearch.length >= 2 },
  );

  return (
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
      label={label}
      labelAction={<ScanSearchButton onScan={setScannedPalletSearch} expectedType="PALLET" />}
      scannedSearchValue={scannedPalletSearch}
      inputId={inputId}
      loadingText="Searching..."
      emptyText="Type at least 2 characters"
      notFoundText="No pallets found"
      onSearchChange={setPalletSearch}
      onItemSelect={onSelect}
      onClear={() => {}}
    />
  );
}
