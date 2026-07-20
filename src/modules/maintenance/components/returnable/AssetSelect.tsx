import { useState } from 'react';

import { SearchableSelect } from '@/shared/components';

import { useMaintenanceAssets } from '../../api/maintenance.queries';
import type { MaintenanceAsset } from '../../types';

interface AssetSelectProps {
  inputId?: string;
  /** The chosen asset id, or null when nothing is linked. */
  value?: number | null;
  /** Shown before the asset list loads, when editing a saved pass. */
  defaultDisplayText?: string;
  disabled?: boolean;
  error?: string;
  label?: string;
  onChange: (assetId: number | null) => void;
}

/**
 * Optional link from a returnable pass to the maintenance asset the material
 * belongs to (e.g. the weighing scale being sent out for repair). The list is
 * fetched lazily — only once the dropdown is opened — and filtered client-side
 * on both the asset code and name.
 */
export function AssetSelect({
  inputId = 'returnable-asset-select',
  value,
  defaultDisplayText,
  disabled = false,
  error,
  label,
  onChange,
}: AssetSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const {
    data: assets = [],
    isLoading,
    isError,
  } = useMaintenanceAssets({ is_active: true }, isOpen);

  return (
    <SearchableSelect<MaintenanceAsset>
      inputId={inputId}
      label={label}
      value={value ? String(value) : undefined}
      defaultDisplayText={defaultDisplayText}
      disabled={disabled}
      error={error}
      items={assets}
      isLoading={isLoading}
      isError={isError}
      placeholder="Search assets by code or name"
      loadingText="Loading assets…"
      emptyText="No assets available"
      notFoundText="No asset matches"
      errorText="Failed to load assets."
      getItemKey={(asset) => asset.id}
      getItemLabel={(asset) => asset.name}
      filterFn={(asset, search) => {
        const query = search.toLowerCase();
        return (
          asset.name.toLowerCase().includes(query) ||
          asset.asset_code.toLowerCase().includes(query)
        );
      }}
      renderItem={(asset) => (
        <div className="flex flex-col">
          <span className="text-sm">{asset.name}</span>
          <span className="text-xs text-muted-foreground">
            {asset.asset_code}
            {asset.department_name ? ` · ${asset.department_name}` : ''}
          </span>
        </div>
      )}
      onOpenChange={setIsOpen}
      onItemSelect={(asset) => onChange(asset.id)}
      onClear={() => onChange(null)}
    />
  );
}
