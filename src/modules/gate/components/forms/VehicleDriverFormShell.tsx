import { AlertCircle, Camera, Truck, User } from 'lucide-react'

import { ID_PROOF_TYPES } from '@/config/constants'
import { env } from '@/config/env.config'
import {
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Input,
  Label,
} from '@/shared/components/ui'
import { useScrollToError } from '@/shared/hooks'
import { cn } from '@/shared/utils'

import { DriverSelect } from '../DriverSelect'
import { TransporterSelect } from '../TransporterSelect'
import { VehicleSelect } from '../VehicleSelect'
import { useState } from 'react'
import { CreateDriverDialog } from '../CreateDriverDialog'

// Get the server base URL for media files (without /api/v1)
const getMediaBaseUrl = () => {
  try {
    const url = new URL(env.apiBaseUrl)
    return url.origin
  } catch {
    return env.apiBaseUrl.replace(/\/api\/v1\/?$/, '')
  }
}

// Type definitions
export interface VehicleDriverFormData {
  vehicleId: number
  vehicleNumber: string
  vehicleType: string
  transporterName: string
  transporterContactPerson: string
  transporterMobile: string
  vehicleCapacity: string
  gpsId: string
  driverId: number
  driverName: string
  mobileNumber: string
  drivingLicenseNumber: string
  idProofType: string
  idProofNumber: string
  driverPhoto: string | null
  remarks: string
}

export interface VehicleSelection {
  vehicleId: number
  vehicleNumber: string
  vehicleType: string
  vehicleCapacity: string
  transporterName: string
  transporterContactPerson: string
  transporterMobile: string
}

export interface DriverSelection {
  driverId: number
  driverName: string
  mobileNumber: string
  drivingLicenseNumber: string
  idProofType: string
  idProofNumber: string
  driverPhoto: string | null
}

export interface VehicleDriverFormShellProps {
  // Form data (controlled component)
  formData: VehicleDriverFormData
  onFormChange: (field: string, value: string) => void

  // State flags
  isReadOnly: boolean
  isLoading: boolean
  isSaving: boolean

  // Errors
  apiErrors: Record<string, string>

  // Step configuration
  currentStep: number
  totalSteps: number

  // Callbacks
  onVehicleSelect: (vehicle: VehicleSelection) => void
  onDriverSelect: (driver: DriverSelection) => void
  onCancel: () => void
  onNext: () => void
  onUpdate?: () => void

  // Edit mode configuration
  isEditMode: boolean
  canUpdate: boolean
  updateMode: boolean

  // Server error message (5xx errors)
  serverError?: string | null

  // Custom content (optional)
  headerTitle?: string
}

export function VehicleDriverFormShell({
  formData,
  onFormChange,
  isReadOnly,
  isLoading,
  isSaving,
  apiErrors,
  currentStep,
  totalSteps,
  onVehicleSelect,
  onDriverSelect,
  onCancel,
  onNext,
  onUpdate,
  isEditMode,
  canUpdate,
  updateMode,
  serverError,
  headerTitle = 'Material Inward',
}: VehicleDriverFormShellProps) {
  const progressPercentage = (currentStep / totalSteps) * 100

  const [isEditDriverOpen, setIsEditDriverOpen] = useState(false)

  // Scroll to first error when errors occur
  useScrollToError(apiErrors)

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    )
  }

  return (
    <div className="space-y-6 pb-6">
      {/* Header */}
      <div className="space-y-2">
        <h2 className="text-3xl font-bold tracking-tight">
          {headerTitle} - Step {currentStep} of {totalSteps}
        </h2>
        <div className="flex items-center gap-4">
          <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
            <div
              className="h-full bg-primary transition-all duration-300"
              style={{ width: `${progressPercentage}%` }}
            />
          </div>
          <span className="text-sm font-medium text-muted-foreground min-w-[3rem]">
            {Math.round(progressPercentage)}%
          </span>
        </div>
      </div>

      {(serverError || apiErrors.general) && (
        <div className="rounded-md bg-destructive/15 p-3 text-sm text-destructive flex items-center gap-2">
          <AlertCircle className="h-4 w-4" />
          {serverError || apiErrors.general}
        </div>
      )}

      <div className="space-y-6">
        {/* Vehicle Details Section */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Truck className="h-5 w-5" />
              Vehicle Details
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <VehicleSelect
                  value={formData.vehicleNumber}
                  onChange={(vehicle) => {
                    if (isReadOnly) return
                    onVehicleSelect({
                      vehicleId: vehicle.vehicleId,
                      vehicleNumber: vehicle.vehicleNumber,
                      vehicleType: vehicle.vehicleType,
                      vehicleCapacity: vehicle.vehicleCapacity,
                      transporterName: vehicle.transporterName,
                      transporterContactPerson: vehicle.transporterContactPerson,
                      transporterMobile: vehicle.transporterMobile,
                    })
                  }}
                  placeholder="Enter vehicle number"
                  label="Vehicle Number"
                  required
                  error={apiErrors.vehicle}
                  disabled={isReadOnly}
                />
              </div>

              <div className="space-y-2">
                <TransporterSelect
                  value={formData.transporterName}
                  onChange={() => { }}
                  placeholder="Auto-filled from vehicle"
                  label="Transporter Name"
                  required
                  disabled
                  externalDetails={
                    formData.transporterName
                      ? {
                        name: formData.transporterName,
                        contact_person: formData.transporterContactPerson,
                        mobile_no: formData.transporterMobile,
                      }
                      : null
                  }
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="vehicleType">
                  Vehicle Type <span className="text-destructive">*</span>
                </Label>
                <Input id="vehicleType" value={formData.vehicleType} disabled />
              </div>

              <div className="space-y-2">
                <Label htmlFor="vehicleCapacity">Vehicle Capacity</Label>
                <Input
                  id="vehicleCapacity"
                  placeholder="e.g., 10 Tons / 50 CBM"
                  value={formData.vehicleCapacity}
                  onChange={(e) => onFormChange('vehicleCapacity', e.target.value)}
                  disabled
                />
              </div>

              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="gpsId">GPS ID (if available)</Label>
                <Input
                  id="gpsId"
                  placeholder="GPS tracking ID"
                  value={formData.gpsId}
                  onChange={(e) => onFormChange('gpsId', e.target.value)}
                  disabled={isReadOnly || isSaving}
                  className={cn(isReadOnly && 'cursor-not-allowed opacity-50')}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Driver Information Section */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <User className="h-5 w-5" />
                Driver Information
              </div>

              {formData.driverId != 0 && !isReadOnly && (
                <Button
                  type="button"
                  variant="link"
                  size="sm"
                  className="px-0 h-auto"
                  onClick={() => setIsEditDriverOpen(true)}
                >
                  Edit Driver
                </Button>
              )}
            </CardTitle>

          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <DriverSelect
                  value={formData.driverName}
                  onChange={(driver) => {
                    if (isReadOnly) return
                    onDriverSelect({
                      driverId: driver.driverId,
                      driverName: driver.driverName,
                      mobileNumber: driver.mobileNumber,
                      drivingLicenseNumber: driver.drivingLicenseNumber,
                      idProofType: driver.idProofType,
                      idProofNumber: driver.idProofNumber,
                      driverPhoto: driver.driverPhoto,
                    })
                  }}
                  placeholder="Enter driver name or license number"
                  label="Driver Name"
                  required
                  error={apiErrors.driver}
                  disabled={isReadOnly || isSaving}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="mobileNumber">
                  Mobile Number <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="mobileNumber"
                  placeholder="+91 9876543210"
                  value={formData.mobileNumber}
                  onChange={(e) => onFormChange('mobileNumber', e.target.value)}
                  disabled
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="drivingLicenseNumber">
                  Driving License Number <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="drivingLicenseNumber"
                  placeholder="DL number"
                  value={formData.drivingLicenseNumber}
                  onChange={(e) => onFormChange('drivingLicenseNumber', e.target.value)}
                  disabled
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="idProofType">
                  ID Proof Type <span className="text-destructive">*</span>
                </Label>
                <select
                  id="idProofType"
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  value={formData.idProofType}
                  onChange={(e) => onFormChange('idProofType', e.target.value)}
                  disabled
                >
                  <option value="">Select ID proof type</option>
                  {ID_PROOF_TYPES.map((type) => (
                    <option key={type.value} value={type.value}>
                      {type.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="idProofNumber">
                  ID Proof Number <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="idProofNumber"
                  placeholder="ID number"
                  value={formData.idProofNumber}
                  onChange={(e) => onFormChange('idProofNumber', e.target.value)}
                  disabled
                />
              </div>

              <div className="space-y-2">
                <Label>Driver Photo</Label>
                {formData.driverPhoto ? (
                  <div className="relative w-full h-48 border rounded-md overflow-hidden bg-muted">
                    <img
                      src={
                        formData.driverPhoto.startsWith('http')
                          ? formData.driverPhoto
                          : `${getMediaBaseUrl()}${formData.driverPhoto}`
                      }
                      alt="Driver photo"
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        e.currentTarget.style.display = 'none'
                        const placeholder = e.currentTarget.nextElementSibling as HTMLElement
                        if (placeholder) {
                          placeholder.style.display = 'flex'
                        }
                      }}
                    />
                    <div
                      className="absolute inset-0 items-center justify-center text-muted-foreground"
                      style={{ display: 'none' }}
                    >
                      <div className="text-center">
                        <Camera className="h-12 w-12 mx-auto mb-2 opacity-50" />
                        <p className="text-sm">Photo not available</p>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="w-full h-48 border rounded-md flex items-center justify-center bg-muted text-muted-foreground">
                    <div className="text-center">
                      <Camera className="h-12 w-12 mx-auto mb-2 opacity-50" />
                      <p className="text-sm">No photo available</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Remarks Section */}
        <Card>
          <CardHeader>
            <CardTitle>Remarks</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <Label htmlFor="remarks">Additional Remarks (Optional)</Label>
              <textarea
                id="remarks"
                rows={3}
                className={cn(
                  'flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50',
                  apiErrors.entry_no && 'border-destructive',
                  isReadOnly && 'cursor-not-allowed opacity-50'
                )}
                placeholder="Enter any additional remarks or notes..."
                value={formData.remarks}
                onChange={(e) => onFormChange('remarks', e.target.value)}
                disabled={isReadOnly || isSaving}
              />
              {apiErrors.remarks && <p className="text-sm text-destructive">{apiErrors.remarks}</p>}
              {apiErrors.entry_no && (
                <p className="text-sm text-destructive">{apiErrors.entry_no}</p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      <CreateDriverDialog
        open={isEditDriverOpen}
        onOpenChange={setIsEditDriverOpen}
        initialData={{
          id: formData.driverId,
          name: formData.driverName,
          mobile_no: formData.mobileNumber,
          license_no: formData.drivingLicenseNumber,
          id_proof_type: formData.idProofType,
          id_proof_number: formData.idProofNumber,
          photo: formData.driverPhoto,
        }}
        onSuccess={(driver) => {
          onDriverSelect({
            driverId: driver.id,
            driverName: driver.name,
            mobileNumber: driver.mobile_no,
            drivingLicenseNumber: driver.license_no,
            idProofType: driver.id_proof_type,
            idProofNumber: driver.id_proof_number,
            driverPhoto: driver.photo,
          })
        }}
      />


      {/* Footer Actions */}
      <div className="flex flex-col-reverse gap-4 sm:flex-row sm:justify-end">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        {isEditMode ? (
          <>
            {canUpdate && !updateMode && onUpdate && (
              <Button type="button" onClick={onUpdate}>
                Update
              </Button>
            )}
            <Button type="button" onClick={onNext} disabled={isSaving}>
              {updateMode ? (isSaving ? 'Saving...' : 'Save and Next →') : 'Next →'}
            </Button>
          </>
        ) : (
          <Button type="button" onClick={onNext} disabled={isSaving}>
            {isSaving ? 'Saving...' : 'Save and Next →'}
          </Button>
        )}
      </div>
    </div>
  )
}
