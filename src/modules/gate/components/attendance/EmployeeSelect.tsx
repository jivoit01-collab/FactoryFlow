import { useState } from 'react';

import { SearchableSelect } from '@/shared/components';

import type { AttendanceEmployee } from '../../api/attendance/attendance.api';
import { useAttendanceEmployees } from '../../api/attendance/attendance.queries';

interface EmployeeSelectProps {
  value?: number | null;
  onChange: (employee: AttendanceEmployee | null) => void;
  placeholder?: string;
  disabled?: boolean;
  error?: string;
  label?: string;
  required?: boolean;
}

export function EmployeeSelect({
  value,
  onChange,
  placeholder = 'Select employee',
  disabled = false,
  error,
  label,
  required = false,
}: EmployeeSelectProps) {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  const { data: employees = [], isLoading, isError } = useAttendanceEmployees(
    { is_active: true },
    isDropdownOpen && !disabled,
  );

  return (
    <SearchableSelect<AttendanceEmployee>
      value={value ? String(value) : undefined}
      items={employees}
      isLoading={isLoading}
      isError={isError}
      placeholder={placeholder}
      disabled={disabled}
      error={error}
      label={label}
      required={required}
      inputId="employee-select"
      getItemKey={(e) => e.id}
      getItemLabel={(e) => e.name}
      filterFn={(e, search) => {
        const lower = search.toLowerCase();
        return (
          e.name.toLowerCase().includes(lower) ||
          e.employee_code.toLowerCase().includes(lower) ||
          (e.department_name?.toLowerCase().includes(lower) ?? false)
        );
      }}
      renderItem={(employee) => (
        <div className="flex flex-col">
          <span className="text-sm font-medium">{employee.name}</span>
          <span className="text-xs text-muted-foreground">
            {employee.employee_code}
            {employee.department_name ? ` · ${employee.department_name}` : ''}
          </span>
        </div>
      )}
      loadingText="Loading employees..."
      emptyText="No employees available"
      notFoundText="No employees found"
      onOpenChange={setIsDropdownOpen}
      onItemSelect={(employee) => onChange(employee)}
      onClear={() => onChange(null)}
    />
  );
}
