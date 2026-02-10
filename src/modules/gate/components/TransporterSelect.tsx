import { useState, useRef, useEffect, useCallback } from 'react'
import { Loader2 } from 'lucide-react'
import { useTransporterNames, useTransporterById } from '../api/transporter/transporter.queries'
import { SearchableSelect } from '@/shared/components'
import { CreateTransporterDialog } from './CreateTransporterDialog'
import type { TransporterName, Transporter } from '../api/transporter/transporter.api'

export interface TransporterDetails {
  name: string
  contact_person: string
  mobile_no: string
}

interface TransporterSelectProps {
  value?: string
  onChange: (value: string) => void
  placeholder?: string
  disabled?: boolean
  error?: string
  label?: string
  required?: boolean
  /** Externally provided transporter details (e.g., from vehicle data) */
  externalDetails?: TransporterDetails | null
}

export function TransporterSelect({
  value,
  onChange,
  placeholder = 'Select transporter',
  disabled = false,
  error,
  label,
  required = false,
  externalDetails,
}: TransporterSelectProps) {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false)
  const [selectedId, setSelectedId] = useState<number | null>(null)
  const [selectedTransporterDetails, setSelectedTransporterDetails] = useState<Transporter | null>(
    null
  )

  const { data: transporterNames = [], isLoading } = useTransporterNames(isDropdownOpen && !disabled)
  const { data: transporterDetails } = useTransporterById(selectedId, selectedId !== null)

  const prevTransporterDetailsRef = useRef(transporterDetails)

  // Sync transporter details when fetched (for popover display only)
  const syncTransporterDetails = useCallback(() => {
    if (transporterDetails && transporterDetails !== prevTransporterDetailsRef.current) {
      prevTransporterDetailsRef.current = transporterDetails
      setSelectedTransporterDetails(transporterDetails)
    }
  }, [transporterDetails])

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- Syncing state with fetched data is a valid pattern
    syncTransporterDetails()
  }, [syncTransporterDetails])

  const details = externalDetails || selectedTransporterDetails

  return (
    <SearchableSelect<TransporterName>
      value={value}
      items={transporterNames}
      isLoading={isLoading}
      placeholder={placeholder}
      disabled={disabled}
      error={error}
      label={label}
      required={required}
      inputId="transporter-select"
      getItemKey={(t) => t.id}
      getItemLabel={(t) => t.name}
      loadingText="Loading transporters..."
      emptyText="No transporters available"
      notFoundText="No transporters found"
      addNewLabel="Add New Transporter"
      onOpenChange={setIsDropdownOpen}
      onSelectedKeyChange={(key) => {
        setSelectedId(key as number | null)
        if (!key) setSelectedTransporterDetails(null)
      }}
      onItemSelect={(transporter) => {
        setSelectedId(transporter.id)
        onChange(transporter.name)
      }}
      onClear={() => {
        setSelectedId(null)
        setSelectedTransporterDetails(null)
        onChange('')
      }}
      renderPopoverContent={(selKey) =>
        details ? (
          <div className="space-y-2">
            <div className="space-y-1.5 text-sm">
              <div>
                <span className="font-medium">Name:</span>{' '}
                <span className="text-muted-foreground">{details.name}</span>
              </div>
              <div>
                <span className="font-medium">Contact Person:</span>{' '}
                <span className="text-muted-foreground">{details.contact_person}</span>
              </div>
              <div>
                <span className="font-medium">Mobile Number:</span>{' '}
                <span className="text-muted-foreground">{details.mobile_no}</span>
              </div>
            </div>
          </div>
        ) : selKey ? (
          <div className="text-sm text-muted-foreground flex items-center gap-2">
            <Loader2 className="h-4 w-4 animate-spin" />
            Loading transporter details...
          </div>
        ) : (
          <div className="text-sm text-muted-foreground">
            Please select a transporter to view details.
          </div>
        )
      }
      renderCreateDialog={(open, onOpenChange, updateSelection) => (
        <CreateTransporterDialog
          open={open}
          onOpenChange={onOpenChange}
          onSuccess={(transporterName) => {
            updateSelection(0, transporterName)
            onChange(transporterName)
          }}
        />
      )}
    />
  )
}
