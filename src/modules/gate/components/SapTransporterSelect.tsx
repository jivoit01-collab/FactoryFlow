import { SearchableSelect } from '@/shared/components';
import { Button, Input, Label } from '@/shared/components/ui';

import type { SapTransporterVendor } from '../api/transporter/transporter.api';
import { useSapTransporterVendors } from '../api/transporter/transporter.queries';

interface SapTransporterSelectProps {
  /** Fetch the vendor list only while the form is open. */
  enabled: boolean;
  /** Typing the name by hand, for a transporter SAP does not have. */
  manual: boolean;
  onManualChange: (manual: boolean) => void;
  manualName: string;
  onManualNameChange: (name: string) => void;
  /** Code of the vendor picked from SAP, if any. */
  selectedCode?: string;
  /** Shown before anything is picked: the vehicle's current transporter, or a seed. */
  displayText?: string;
  onVendorSelect: (vendor: SapTransporterVendor | null) => void;
  disabled?: boolean;
  error?: string;
}

/** With nothing typed, the TRANSPORTER group; once typing, every vendor by name, code or GSTIN. */
function matchesSearch(vendor: SapTransporterVendor, search: string) {
  const term = search.trim().toLowerCase();
  if (!term) return vendor.is_transporter;
  return (
    vendor.card_name.toLowerCase().includes(term) ||
    vendor.card_code.toLowerCase().includes(term) ||
    vendor.gstin.toLowerCase().includes(term)
  );
}

/**
 * A vehicle's transporter, picked from the current company's SAP vendors. SAP's
 * TRANSPORTER group is listed first, but any vendor can be found by typing:
 * real transporters also sit in other groups, and a supplier delivering in its
 * own truck is that truck's transporter. "Not in SAP?" turns the field into a
 * plain name box for the rest.
 */
export function SapTransporterSelect({
  enabled,
  manual,
  onManualChange,
  manualName,
  onManualNameChange,
  selectedCode,
  displayText,
  onVendorSelect,
  disabled = false,
  error,
}: SapTransporterSelectProps) {
  const { data, isLoading, isError } = useSapTransporterVendors(enabled && !manual);
  const vendors = data?.results ?? [];

  if (manual) {
    return (
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <Label htmlFor="transporter-manual">
            Transporter <span className="text-destructive">*</span>
          </Label>
          <Button
            type="button"
            variant="link"
            size="sm"
            className="ml-auto h-auto p-0 text-xs"
            onClick={() => onManualChange(false)}
            disabled={disabled}
          >
            Pick from SAP
          </Button>
        </div>
        <Input
          id="transporter-manual"
          value={manualName}
          onChange={(e) => onManualNameChange(e.target.value)}
          placeholder="Transporter name"
          disabled={disabled}
          autoComplete="off"
          className={error ? 'border-destructive' : ''}
        />
        <p className="text-xs text-muted-foreground">Not in SAP, so saved as typed.</p>
        {error && <p className="text-sm text-destructive">{error}</p>}
      </div>
    );
  }

  return (
    <div className="space-y-1">
      <SearchableSelect<SapTransporterVendor>
        value={selectedCode ?? ''}
        items={vendors}
        isLoading={isLoading}
        isError={isError}
        placeholder="Search SAP transporter or vendor"
        disabled={disabled}
        error={error}
        label="Transporter"
        required
        labelAction={
          <Button
            type="button"
            variant="link"
            size="sm"
            className="ml-auto h-auto p-0 text-xs"
            onClick={() => onManualChange(true)}
            disabled={disabled}
          >
            Not in SAP? Type it
          </Button>
        }
        defaultDisplayText={displayText}
        inputId="transporter-sap-select"
        getItemKey={(v) => v.card_code}
        getItemLabel={(v) => v.card_name}
        filterFn={matchesSearch}
        renderItem={(v) => (
          <div className="min-w-0">
            <div className="truncate text-sm">{v.card_name}</div>
            <div className="truncate text-xs text-muted-foreground">
              {[v.card_code, v.is_transporter ? '' : v.group, v.gstin].filter(Boolean).join(' · ')}
            </div>
          </div>
        )}
        loadingText="Loading SAP vendors..."
        emptyText="Type to search SAP vendors"
        notFoundText="Not in SAP. Use “Not in SAP? Type it” above."
        errorText="Could not load SAP vendors. Use “Not in SAP? Type it” above."
        onItemSelect={(v) => onVendorSelect(v)}
        onClear={() => onVendorSelect(null)}
      />
      {data?.sap_copy_as_of && (
        <p className="text-xs text-muted-foreground">
          SAP is not answering; this list is the copy from{' '}
          {new Date(data.sap_copy_as_of).toLocaleString('en-IN', {
            day: 'numeric',
            month: 'short',
            hour: '2-digit',
            minute: '2-digit',
          })}
          .
        </p>
      )}
    </div>
  );
}
