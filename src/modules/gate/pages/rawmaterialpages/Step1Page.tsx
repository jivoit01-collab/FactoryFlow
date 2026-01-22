import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useQueryClient } from '@tanstack/react-query'
import { Camera, Truck, User, AlertCircle } from 'lucide-react'
import { env } from '@/config/env.config'

// Get the server base URL for media files (without /api/v1)
const getMediaBaseUrl = () => {
  try {
    const url = new URL(env.apiBaseUrl)
    return url.origin // Returns just http://192.168.1.84:3000
  } catch {
    // Fallback: remove /api/v1 from the end
    return env.apiBaseUrl.replace(/\/api\/v1\/?$/, '')
  }
}
import {
  Button,
  Input,
  Label,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/shared/components/ui'
import { TransporterSelect } from '../../components/TransporterSelect'
import { VehicleSelect } from '../../components/VehicleSelect'
import { DriverSelect } from '../../components/DriverSelect'
import {
  useCreateVehicleEntry,
  useVehicleEntry,
  useUpdateVehicleEntry,
} from '../../api/vehicleEntry.queries'
import { cn } from '@/shared/utils'
import type { ApiError } from '@/core/api/types'

export default function Step1Page() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { entryId } = useParams<{ entryId?: string }>()
  const isEditMode = !!entryId
  const totalSteps = 5
  const currentStep = 1
  const createVehicleEntry = useCreateVehicleEntry()
  const updateVehicleEntry = useUpdateVehicleEntry()
  const { data: entryData, isLoading: isLoadingEntry } = useVehicleEntry(
    entryId ? parseInt(entryId) : null
  )

  // State to track if Update button has been clicked (enables editing)
  const [updateMode, setUpdateMode] = useState(false)
  
  // State to keep button disabled after API success until navigation completes
  const [isNavigating, setIsNavigating] = useState(false)

  // Form state
  const [formData, setFormData] = useState({
    vehicleId: 0,
    vehicleNumber: '',
    vehicleType: '',
    transporterName: '',
    vehicleCapacity: '',
    gpsId: '',
    driverId: 0,
    driverName: '',
    mobileNumber: '',
    drivingLicenseNumber: '',
    idProofType: '',
    idProofNumber: '',
    driverPhoto: null as string | null,
    remarks: '',
  })

  const [apiErrors, setApiErrors] = useState<Record<string, string>>({})

  // Load entry data when in edit mode
  useEffect(() => {
    if (isEditMode && entryData) {
      setFormData({
        vehicleId: entryData.vehicle?.id || 0,
        vehicleNumber: entryData.vehicle?.vehicle_number || '',
        vehicleType: entryData.vehicle?.vehicle_type || '',
        transporterName: entryData.vehicle?.transporter?.name || '',
        vehicleCapacity: entryData.vehicle?.capacity_ton
          ? `${entryData.vehicle.capacity_ton} Tons`
          : '',
        gpsId: '',
        driverId: entryData.driver?.id || 0,
        driverName: entryData.driver?.name || '',
        mobileNumber: entryData.driver?.mobile_no || '',
        drivingLicenseNumber: entryData.driver?.license_no || '',
        idProofType: entryData.driver?.id_proof_type || '',
        idProofNumber: entryData.driver?.id_proof_number || '',
        driverPhoto: entryData.driver?.photo || null,
        remarks: entryData.remarks || '',
      })
    }
  }, [isEditMode, entryData])

  const handleInputChange = (field: string, value: string) => {
    // In edit mode, Step 1 is read-only unless updateMode is active
    if (isEditMode && !updateMode) return
    setFormData((prev) => ({ ...prev, [field]: value }))
    // Clear error for this field when user starts typing
    if (apiErrors[field]) {
      setApiErrors((prev) => {
        const newErrors = { ...prev }
        delete newErrors[field]
        return newErrors
      })
    }
  }

  const handleNext = async () => {
    // In edit mode, navigate to next step without API call (unless in updateMode)
    if (isEditMode && !updateMode && entryId) {
      navigate(`/gate/raw-materials/edit/${entryId}/step2`)
      return
    }

    // Create mode or update mode - validate and create/update entry
    setApiErrors({})

    // Validation
    if (!formData.vehicleId) {
      setApiErrors({ vehicle: 'Please select a vehicle' })
      return
    }
    if (!formData.driverId) {
      setApiErrors({ driver: 'Please select a driver' })
      return
    }

    handleCreate()
  }

  const handleCreate = async () => {
    try {
      // Generate entry number (format: GE-YYYY-NNNN)
      // Using timestamp to ensure uniqueness - backend should ideally generate this
      const year = new Date().getFullYear()
      const timestamp = Date.now().toString().slice(-4)
      const entryNo = `GE-${year}-${timestamp}`

      const result = await createVehicleEntry.mutateAsync({
        entry_no: entryNo,
        vehicle: formData.vehicleId,
        driver: formData.driverId,
        remarks: formData.remarks || undefined,
        entry_type: 'RAW_MATERIAL',
      })

      // Navigate to step 2 with entry ID
      setIsNavigating(true)
      navigate(`/gate/raw-materials/new/step2?entryId=${result.id}`)
    } catch (error) {
      const apiError = error as ApiError
      if (apiError.errors) {
        const fieldErrors: Record<string, string> = {}
        Object.entries(apiError.errors).forEach(([field, messages]) => {
          if (Array.isArray(messages) && messages.length > 0) {
            fieldErrors[field] = messages[0]
          }
        })
        setApiErrors(fieldErrors)
      } else {
        setApiErrors({ general: apiError.message || 'Failed to create vehicle entry' })
      }
    }
  }

  const handleUpdate = async () => {
    if (!entryId) return

    setApiErrors({})

    // Validation
    if (!formData.vehicleId) {
      setApiErrors({ vehicle: 'Please select a vehicle' })
      return
    }
    if (!formData.driverId) {
      setApiErrors({ driver: 'Please select a driver' })
      return
    }

    try {
      await updateVehicleEntry.mutateAsync({
        id: parseInt(entryId),
        data: {
          vehicle: formData.vehicleId,
          driver: formData.driverId,
          remarks: formData.remarks || undefined,
        },
      })

      // Navigate to step 2
      setIsNavigating(true)
      navigate(`/gate/raw-materials/edit/${entryId}/step2`)
    } catch (error) {
      const apiError = error as ApiError
      if (apiError.errors) {
        const fieldErrors: Record<string, string> = {}
        Object.entries(apiError.errors).forEach(([field, messages]) => {
          if (Array.isArray(messages) && messages.length > 0) {
            fieldErrors[field] = messages[0]
          }
        })
        setApiErrors(fieldErrors)
      } else {
        setApiErrors({ general: apiError.message || 'Failed to update vehicle entry' })
      }
    }
  }

  const progressPercentage = (currentStep / totalSteps) * 100
  const canUpdate = isEditMode && entryData?.status === 'DRAFT'
  const isReadOnly = isEditMode

  if (isEditMode && isLoadingEntry) {
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
          Material Inward - Step {currentStep} of {totalSteps}
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

      {apiErrors.general && (
        <div className="rounded-md bg-destructive/15 p-3 text-sm text-destructive flex items-center gap-2">
          <AlertCircle className="h-4 w-4" />
          {apiErrors.general}
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
                <TransporterSelect
                  value={formData.transporterName}
                  onChange={(value) => handleInputChange('transporterName', value)}
                  placeholder="Enter transporter"
                  label="Transporter Name"
                  required
                  disabled={isReadOnly || createVehicleEntry.isPending || updateVehicleEntry.isPending}
                />
              </div>

              <div className="space-y-2">
                <VehicleSelect
                  value={formData.vehicleNumber}
                  onChange={(vehicle) => {
                    if (isReadOnly) return
                    setFormData((prev) => ({
                      ...prev,
                      vehicleId: vehicle.vehicleId,
                      vehicleNumber: vehicle.vehicleNumber,
                      vehicleType: vehicle.vehicleType,
                      vehicleCapacity: vehicle.vehicleCapacity,
                    }))
                  }}
                  placeholder="Enter vehicle number"
                  label="Vehicle Number"
                  required
                  error={apiErrors.vehicle}
                  disabled={isReadOnly}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="vehicleType">
                  Vehicle Type <span className="text-destructive">*</span>
                </Label>
                <select
                  id="vehicleType"
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                  value={formData.vehicleType}
                  onChange={(e) => handleInputChange('vehicleType', e.target.value)}
                  disabled
                >
                  <option value="TRUCK">Truck</option>
                  <option value="CONTAINER">Container</option>
                  <option value="TEMPO">Tempo</option>
                  <option value="TRACTOR">Tractor</option>
                </select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="vehicleCapacity">Vehicle Capacity</Label>
                <Input
                  id="vehicleCapacity"
                  placeholder="e.g., 10 Tons / 50 CBM"
                  value={formData.vehicleCapacity}
                  onChange={(e) => handleInputChange('vehicleCapacity', e.target.value)}
                  disabled
                />
              </div>

              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="gpsId">GPS ID (if available)</Label>
                <Input
                  id="gpsId"
                  placeholder="GPS tracking ID"
                  value={formData.gpsId}
                  onChange={(e) => handleInputChange('gpsId', e.target.value)}
                  disabled={isReadOnly || createVehicleEntry.isPending || updateVehicleEntry.isPending}
                  className={cn(isReadOnly && 'cursor-not-allowed opacity-50')}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Driver Information Section */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              Driver Information
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <DriverSelect
                  value={formData.driverName}
                  onChange={(driver) => {
                    if (isReadOnly) return
                    setFormData((prev) => ({
                      ...prev,
                      driverId: driver.driverId,
                      driverName: driver.driverName,
                      mobileNumber: driver.mobileNumber,
                      drivingLicenseNumber: driver.drivingLicenseNumber,
                      idProofType: driver.idProofType,
                      idProofNumber: driver.idProofNumber,
                      driverPhoto: driver.driverPhoto,
                    }))
                  }}
                  placeholder="Enter driver name or license number"
                  label="Driver Name"
                  required
                  error={apiErrors.driver}
                  disabled={isReadOnly || createVehicleEntry.isPending || updateVehicleEntry.isPending}
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
                  onChange={(e) => handleInputChange('mobileNumber', e.target.value)}
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
                  onChange={(e) => handleInputChange('drivingLicenseNumber', e.target.value)}
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
                  onChange={(e) => handleInputChange('idProofType', e.target.value)}
                  disabled
                >
                  <option value="">Select ID proof type</option>
                  <option value="Aadhar">Aadhar</option>
                  <option value="PAN Card">PAN Card</option>
                  <option value="Driving License">Driving License</option>
                  <option value="Voter ID">Voter ID</option>
                  <option value="Other">Other</option>
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
                  onChange={(e) => handleInputChange('idProofNumber', e.target.value)}
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
                  isReadOnly && 'cursor-not-allowed opacity-50',
                )}
                placeholder="Enter any additional remarks or notes..."
                value={formData.remarks}
                onChange={(e) => handleInputChange('remarks', e.target.value)}
                disabled={isReadOnly || createVehicleEntry.isPending || updateVehicleEntry.isPending}
              />
              {apiErrors.remarks && <p className="text-sm text-destructive">{apiErrors.remarks}</p>}
              {apiErrors.entry_no && (
                <p className="text-sm text-destructive">{apiErrors.entry_no}</p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Footer Actions */}
      <div className="flex flex-col-reverse gap-4 sm:flex-row sm:justify-end">
        <Button
          type="button"
          variant="outline"
          onClick={() => {
            queryClient.invalidateQueries({ queryKey: ['vehicleEntries'] })
            navigate('/gate/raw-materials')
          }}
        >
          Cancel
        </Button>
        {isEditMode ? (
          <>
            {canUpdate && !updateMode && (
              <Button type="button" onClick={handleUpdate}>
                Update
              </Button>
            )}
            <Button type="button" onClick={handleNext} disabled={createVehicleEntry.isPending || updateVehicleEntry.isPending || isNavigating}>
              {updateMode
                ? createVehicleEntry.isPending || updateVehicleEntry.isPending || isNavigating
                  ? 'Saving...'
                  : 'Save and Next →'
                : 'Next →'}
            </Button>
          </>
        ) : (
          <Button type="button" onClick={handleNext} disabled={createVehicleEntry.isPending || isNavigating}>
            {createVehicleEntry.isPending || isNavigating ? 'Saving...' : 'Save and Next →'}
          </Button>
        )}
      </div>
    </div>
  )
}
