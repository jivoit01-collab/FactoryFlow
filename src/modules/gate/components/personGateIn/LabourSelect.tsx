import { useMemo, useState } from 'react';

import { SearchableSelect } from '@/shared/components';

import type { Labour } from '../../api/personGateIn/personGateIn.api';
import { useLabours } from '../../api/personGateIn/personGateIn.queries';
import { CreateLabourDialog } from './CreateLabourDialog';

interface LabourSelectProps {
  value?: number | null;
  onChange: (labour: Labour | null) => void;
  contractorId?: number;
  placeholder?: string;
  disabled?: boolean;
  error?: string;
  label?: string;
  required?: boolean;
}

export function LabourSelect({
  value,
  onChange,
  contractorId,
  placeholder = 'Select labour',
  disabled = false,
  error,
  label,
  required = false,
}: LabourSelectProps) {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [selectedLabour, setSelectedLabour] = useState<Labour | null>(null);

  const { data: labours = [], isLoading, isError } = useLabours(
    undefined,
    contractorId,
    isDropdownOpen && !disabled,
  );

  const activeLabours = useMemo(
    () => labours.filter((l) => l.is_active),
    [labours],
  );

  return (
    <SearchableSelect<Labour>
      value={value ? String(value) : undefined}
      items={activeLabours}
      isLoading={isLoading}
      isError={isError}
      placeholder={placeholder}
      disabled={disabled}
      error={error}
      label={label}
      required={required}
      inputId="labour-select"
      getItemKey={(l) => l.id}
      getItemLabel={(l) => l.name}
      filterFn={(l, search) => {
        const lower = search.toLowerCase();
        return (
          l.name.toLowerCase().includes(lower) ||
          (l.skill_type?.toLowerCase().includes(lower) ?? false) ||
          (l.contractor_name?.toLowerCase().includes(lower) ?? false)
        );
      }}
      renderItem={(labour) => (
        <div>
          <span className="text-sm font-medium">{labour.name}</span>
          {labour.skill_type && (
            <span className="text-xs text-muted-foreground ml-2">
              ({labour.skill_type})
            </span>
          )}
        </div>
      )}
      renderPopoverContent={() =>
        selectedLabour ? (
          <div className="space-y-1.5 text-sm">
            <div>
              <span className="font-medium">Name:</span>{' '}
              <span className="text-muted-foreground">{selectedLabour.name}</span>
            </div>
            {selectedLabour.contractor_name && (
              <div>
                <span className="font-medium">Contractor:</span>{' '}
                <span className="text-muted-foreground">{selectedLabour.contractor_name}</span>
              </div>
            )}
            {selectedLabour.mobile && (
              <div>
                <span className="font-medium">Mobile:</span>{' '}
                <span className="text-muted-foreground">{selectedLabour.mobile}</span>
              </div>
            )}
            {selectedLabour.skill_type && (
              <div>
                <span className="font-medium">Skill Type:</span>{' '}
                <span className="text-muted-foreground">{selectedLabour.skill_type}</span>
              </div>
            )}
            {selectedLabour.id_proof_no && (
              <div>
                <span className="font-medium">ID Proof Number:</span>{' '}
                <span className="text-muted-foreground">{selectedLabour.id_proof_no}</span>
              </div>
            )}
            {selectedLabour.permit_valid_till && (
              <div>
                <span className="font-medium">Permit Valid Till:</span>{' '}
                <span className="text-muted-foreground">{selectedLabour.permit_valid_till}</span>
              </div>
            )}
          </div>
        ) : (
          <div className="text-sm text-muted-foreground">
            Please select a labour to view details.
          </div>
        )
      }
      loadingText="Loading labours..."
      emptyText="No labours available"
      notFoundText="No labours found"
      addNewLabel="Add New Labour"
      onOpenChange={setIsDropdownOpen}
      onItemSelect={(labour) => {
        setSelectedLabour(labour);
        onChange(labour);
      }}
      onClear={() => {
        setSelectedLabour(null);
        onChange(null);
      }}
      renderCreateDialog={(open, onOpenChange, updateSelection) => (
        <CreateLabourDialog
          open={open}
          onOpenChange={onOpenChange}
          onSuccess={(labour) => {
            updateSelection(labour.id, labour.name);
            setSelectedLabour(labour);
            onChange(labour);
          }}
          defaultContractorId={contractorId}
        />
      )}
    />
  );
}
