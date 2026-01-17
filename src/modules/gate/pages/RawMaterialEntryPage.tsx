import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Camera, Truck, User } from 'lucide-react'
import {
  Button,
  Input,
  Label,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/shared/components/ui'

export default function RawMaterialEntryPage() {
  const navigate = useNavigate()
  const totalSteps = 5
  const currentStep = 1

  // Form state
  const [formData, setFormData] = useState({
    vehicleNumber: 'MH-12-AB-1234',
    vehicleType: 'Truck',
    transporterName: '',
    vehicleCapacity: '',
    gpsId: '',
    driverName: '',
    mobileNumber: '+91 9876543210',
    drivingLicenseNumber: '',
    idProofType: 'Aadhaar Card',
    idProofNumber: '',
  })

  const handleInputChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
  }

  const handleNext = () => {
    // TODO: Implement navigation to next step
    console.log('Navigate to step 2')
  }

  const progressPercentage = (currentStep / totalSteps) * 100

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

      <div className="space-y-6">
        {/* Vehicle & Driver Details Section */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Truck className="h-5 w-5" />
              Vehicle & Driver Details
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
                <Label htmlFor="transporterName">
                  Transporter Name <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="transporterName"
                  placeholder="Enter transporter"
                  value={formData.transporterName}
                  onChange={(e) => handleInputChange('transporterName', e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="vehicleNumber">
                  Vehicle Number <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="vehicleNumber"
                  placeholder="MH-12-AB-1234"
                  value={formData.vehicleNumber}
                  onChange={(e) => handleInputChange('vehicleNumber', e.target.value)}
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
                >
                  <option value="Truck">Truck</option>
                  <option value="Container">Container</option>
                  <option value="Tempo">Tempo</option>
                  <option value="Tractor">Tractor</option>
                </select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="vehicleCapacity">Vehicle Capacity</Label>
                <Input
                  id="vehicleCapacity"
                  placeholder="e.g., 10 Tons / 50 CBM"
                  value={formData.vehicleCapacity}
                  onChange={(e) => handleInputChange('vehicleCapacity', e.target.value)}
                />
              </div>

              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="gpsId">GPS ID (if available)</Label>
                <Input
                  id="gpsId"
                  placeholder="GPS tracking ID"
                  value={formData.gpsId}
                  onChange={(e) => handleInputChange('gpsId', e.target.value)}
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
                <Label htmlFor="driverName">
                  Driver Name <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="driverName"
                  placeholder="Enter driver name"
                  value={formData.driverName}
                  onChange={(e) => handleInputChange('driverName', e.target.value)}
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
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="idProofType">
                  ID Proof Type <span className="text-destructive">*</span>
                </Label>
                <select
                  id="idProofType"
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                  value={formData.idProofType}
                  onChange={(e) => handleInputChange('idProofType', e.target.value)}
                >
                  <option value="Aadhaar Card">Aadhaar Card</option>
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
                />
              </div>

              <div className="space-y-2">
                <Label>Driver Photo</Label>
                <Button type="button" variant="outline" className="w-full">
                  <Camera className="h-4 w-4 mr-2" />
                  Capture Photo
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Footer Actions */}
      <div className="flex flex-col-reverse gap-4 sm:flex-row sm:justify-end">
        <Button type="button" variant="outline" onClick={() => navigate(-1)}>
          Cancel
        </Button>
        <Button type="button" onClick={handleNext}>
          Next →
        </Button>
      </div>
    </div>
  )
}
