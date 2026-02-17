import { useMemo, useState } from 'react';

import { SearchableSelect } from '@/shared/components';

import type { Visitor } from '../../api/personGateIn/personGateIn.api';
import { useVisitors } from '../../api/personGateIn/personGateIn.queries';
import { CreateVisitorDialog } from './CreateVisitorDialog';

interface VisitorSelectProps {
  value?: number | null;
  onChange: (visitor: Visitor | null) => void;
  placeholder?: string;
  disabled?: boolean;
  error?: string;
  label?: string;
  required?: boolean;
}

export function VisitorSelect({
  value,
  onChange,
  placeholder = 'Select visitor',
  disabled = false,
  error,
  label,
  required = false,
}: VisitorSelectProps) {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [selectedVisitor, setSelectedVisitor] = useState<Visitor | null>(null);

  const { data: visitors = [], isLoading, isError } = useVisitors(
    undefined,
    isDropdownOpen && !disabled,
  );

  const filteredVisitors = useMemo(
    () => visitors.filter((v) => !v.blacklisted),
    [visitors],
  );

  return (
    <SearchableSelect<Visitor>
      value={value ? String(value) : undefined}
      items={filteredVisitors}
      isLoading={isLoading}
      isError={isError}
      placeholder={placeholder}
      disabled={disabled}
      error={error}
      label={label}
      required={required}
      inputId="visitor-select"
      getItemKey={(v) => v.id}
      getItemLabel={(v) => v.name}
      filterFn={(v, search) => {
        const lower = search.toLowerCase();
        return (
          v.name.toLowerCase().includes(lower) ||
          (v.company_name?.toLowerCase().includes(lower) ?? false)
        );
      }}
      renderItem={(visitor) => (
        <div>
          <span className="text-sm font-medium">{visitor.name}</span>
          {visitor.company_name && (
            <span className="text-xs text-muted-foreground ml-2">
              ({visitor.company_name})
            </span>
          )}
        </div>
      )}
      renderPopoverContent={() =>
        selectedVisitor ? (
          <div className="space-y-1.5 text-sm">
            <div>
              <span className="font-medium">Name:</span>{' '}
              <span className="text-muted-foreground">{selectedVisitor.name}</span>
            </div>
            {selectedVisitor.mobile && (
              <div>
                <span className="font-medium">Mobile:</span>{' '}
                <span className="text-muted-foreground">{selectedVisitor.mobile}</span>
              </div>
            )}
            {selectedVisitor.company_name && (
              <div>
                <span className="font-medium">Company:</span>{' '}
                <span className="text-muted-foreground">{selectedVisitor.company_name}</span>
              </div>
            )}
            {selectedVisitor.id_proof_type && (
              <div>
                <span className="font-medium">ID Proof Type:</span>{' '}
                <span className="text-muted-foreground">{selectedVisitor.id_proof_type}</span>
              </div>
            )}
            {selectedVisitor.id_proof_no && (
              <div>
                <span className="font-medium">ID Proof Number:</span>{' '}
                <span className="text-muted-foreground">{selectedVisitor.id_proof_no}</span>
              </div>
            )}
          </div>
        ) : (
          <div className="text-sm text-muted-foreground">
            Please select a visitor to view details.
          </div>
        )
      }
      loadingText="Loading visitors..."
      emptyText="No visitors available"
      notFoundText="No visitors found"
      addNewLabel="Add New Visitor"
      onOpenChange={setIsDropdownOpen}
      onItemSelect={(visitor) => {
        setSelectedVisitor(visitor);
        onChange(visitor);
      }}
      onClear={() => {
        setSelectedVisitor(null);
        onChange(null);
      }}
      renderCreateDialog={(open, onOpenChange, updateSelection) => (
        <CreateVisitorDialog
          open={open}
          onOpenChange={onOpenChange}
          onSuccess={(visitor) => {
            updateSelection(visitor.id, visitor.name);
            setSelectedVisitor(visitor);
            onChange(visitor);
          }}
        />
      )}
    />
  );
}
