import { useState } from 'react';

import { SearchableSelect } from '@/shared/components';

import type { Department } from '../api/department/department.api';
import { useDepartments } from '../api/department/department.queries';

interface DepartmentSelectProps {
  value?: number | '';
  onChange: (departmentId: number | '', departmentName: string) => void;
  placeholder?: string;
  disabled?: boolean;
  error?: string;
  label?: string;
  required?: boolean;
  /** Initial display text to show without fetching departments (for edit mode) */
  initialDisplayText?: string;
}

export function DepartmentSelect({
  value,
  onChange,
  placeholder = 'Select department',
  disabled = false,
  error,
  label,
  required = false,
  initialDisplayText,
}: DepartmentSelectProps) {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  const { data: departments = [], isLoading, isError } = useDepartments(isDropdownOpen);

  return (
    <SearchableSelect<Department>
      value={value ? String(value) : undefined}
      items={departments}
      isLoading={isLoading}
      isError={isError}
      placeholder={placeholder}
      disabled={disabled}
      error={error}
      label={label}
      required={required}
      inputId="department-select"
      inputClassName="border-2 font-medium"
      defaultDisplayText={initialDisplayText}
      getItemKey={(d) => d.id}
      getItemLabel={(d) => d.name}
      renderItem={(department) => (
        <div className="flex flex-col">
          <span className="text-sm">{department.name}</span>
          {department.description && (
            <span className="text-xs text-muted-foreground">{department.description}</span>
          )}
        </div>
      )}
      loadingText="Loading departments..."
      emptyText="No departments available"
      notFoundText="No departments found"
      onOpenChange={setIsDropdownOpen}
      onItemSelect={(department) => {
        onChange(department.id, department.name);
      }}
      onClear={() => {
        onChange('', '');
      }}
    />
  );
}
