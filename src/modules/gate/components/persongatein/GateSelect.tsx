import { useMemo, useState } from 'react';

import { SearchableSelect } from '@/shared/components';

import type { Gate } from '../../api/personGateIn/personGateIn.api';
import { useGates } from '../../api/personGateIn/personGateIn.queries';

interface GateSelectProps {
  value?: number | null;
  onChange: (gate: Gate | null) => void;
  placeholder?: string;
  disabled?: boolean;
  error?: string;
  label?: string;
  required?: boolean;
}

export function GateSelect({
  value,
  onChange,
  placeholder = 'Select gate',
  disabled = false,
  error,
  label,
  required = false,
}: GateSelectProps) {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  const { data: gates = [], isLoading, isError } = useGates(isDropdownOpen && !disabled);

  const activeGates = useMemo(
    () => gates.filter((g) => g.is_active),
    [gates],
  );

  return (
    <SearchableSelect<Gate>
      value={value ? String(value) : undefined}
      items={activeGates}
      isLoading={isLoading}
      isError={isError}
      placeholder={placeholder}
      disabled={disabled}
      error={error}
      label={label}
      required={required}
      inputId="gate-select"
      getItemKey={(g) => g.id}
      getItemLabel={(g) => (g.location ? `${g.name} (${g.location})` : g.name)}
      renderItem={(gate) => (
        <div>
          <span className="text-sm font-medium">{gate.name}</span>
          {gate.location && (
            <span className="text-xs text-muted-foreground ml-2">
              ({gate.location})
            </span>
          )}
        </div>
      )}
      loadingText="Loading gates..."
      emptyText="No gates available"
      notFoundText="No gates found"
      onOpenChange={setIsDropdownOpen}
      onItemSelect={(gate) => {
        onChange(gate);
      }}
      onClear={() => {
        onChange(null);
      }}
    />
  );
}
