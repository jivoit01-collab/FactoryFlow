import { useState } from 'react'
import { useDailyNeedCategories } from '../api/dailyNeed/dailyNeed.queries'
import { SearchableSelect } from '@/shared/components'
import type { DailyNeedCategory } from '../api/dailyNeed/dailyNeed.api'

interface CategorySelectProps {
  value?: number | ''
  onChange: (categoryId: number | '', categoryName: string) => void
  placeholder?: string
  disabled?: boolean
  error?: string
  label?: string
  required?: boolean
  /** Initial display text to show without fetching categories (for edit mode) */
  initialDisplayText?: string
}

export function CategorySelect({
  value,
  onChange,
  placeholder = 'Select category',
  disabled = false,
  error,
  label,
  required = false,
  initialDisplayText,
}: CategorySelectProps) {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false)

  const { data: categories = [], isLoading } = useDailyNeedCategories(isDropdownOpen)

  return (
    <SearchableSelect<DailyNeedCategory>
      value={value ? String(value) : undefined}
      items={categories}
      isLoading={isLoading}
      placeholder={placeholder}
      disabled={disabled}
      error={error}
      label={label}
      required={required}
      inputId="category-select"
      inputClassName="border-2 font-medium"
      defaultDisplayText={initialDisplayText}
      getItemKey={(c) => c.id}
      getItemLabel={(c) => c.category_name}
      loadingText="Loading categories..."
      emptyText="No categories available"
      notFoundText="No categories found"
      onOpenChange={setIsDropdownOpen}
      onItemSelect={(category) => {
        onChange(category.id, category.category_name)
      }}
      onClear={() => {
        onChange('', '')
      }}
    />
  )
}
