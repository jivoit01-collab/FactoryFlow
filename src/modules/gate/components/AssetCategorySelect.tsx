import { useState } from 'react';

import { SearchableSelect } from '@/shared/components';

import type { AssetCategory } from '../api/fixedAssets/fixedAssets.api';
import { useAssetCategories } from '../api/fixedAssets/fixedAssets.queries';

interface AssetCategorySelectProps {
  value?: string;
  onChange: (categoryId: string, categoryName: string) => void;
  placeholder?: string;
  disabled?: boolean;
  error?: string;
  label?: string;
  required?: boolean;
  /** Initial display text to show without fetching categories (for edit mode) */
  initialDisplayText?: string;
}

export function AssetCategorySelect({
  value,
  onChange,
  placeholder = 'Select asset category',
  disabled = false,
  error,
  label,
  required = false,
  initialDisplayText,
}: AssetCategorySelectProps) {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  const { data: categories = [], isLoading, isError } = useAssetCategories(isDropdownOpen);

  return (
    <SearchableSelect<AssetCategory>
      value={value || undefined}
      items={categories}
      isLoading={isLoading}
      isError={isError}
      placeholder={placeholder}
      disabled={disabled}
      error={error}
      label={label}
      required={required}
      inputId="asset-category-select"
      inputClassName="border-2 font-medium"
      defaultDisplayText={initialDisplayText}
      getItemKey={(c) => c.id}
      getItemLabel={(c) => c.category_name}
      loadingText="Loading categories..."
      emptyText="No categories available"
      notFoundText="No categories found"
      onOpenChange={setIsDropdownOpen}
      onItemSelect={(category) => {
        onChange(category.id.toString(), category.category_name);
      }}
      onClear={() => {
        onChange('', '');
      }}
    />
  );
}
