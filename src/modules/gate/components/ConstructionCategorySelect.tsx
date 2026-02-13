import { useState } from 'react'

import { SearchableSelect } from '@/shared/components'

import type { ConstructionCategory } from '../api/construction/construction.api'
import { useConstructionCategories } from '../api/construction/construction.queries'

interface ConstructionCategorySelectProps {
  value?: string
  onChange: (categoryId: string, categoryName: string) => void
  placeholder?: string
  disabled?: boolean
  error?: string
  label?: string
  required?: boolean
  /** Initial display text to show without fetching categories (for edit mode) */
  initialDisplayText?: string
}

export function ConstructionCategorySelect({
  value,
  onChange,
  placeholder = 'Select material category',
  disabled = false,
  error,
  label,
  required = false,
  initialDisplayText,
}: ConstructionCategorySelectProps) {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false)

  const { data: categories = [], isLoading, isError } = useConstructionCategories(isDropdownOpen)

  return (
    <SearchableSelect<ConstructionCategory>
      value={value || undefined}
      items={categories}
      isLoading={isLoading}
      isError={isError}
      placeholder={placeholder}
      disabled={disabled}
      error={error}
      label={label}
      required={required}
      inputId="construction-category-select"
      inputClassName="border-2 font-medium"
      defaultDisplayText={initialDisplayText}
      getItemKey={(c) => c.id}
      getItemLabel={(c) => c.category_name}
      loadingText="Loading categories..."
      emptyText="No categories available"
      notFoundText="No categories found"
      onOpenChange={setIsDropdownOpen}
      onItemSelect={(category) => {
        onChange(category.id.toString(), category.category_name)
      }}
      onClear={() => {
        onChange('', '')
      }}
    />
  )
}
