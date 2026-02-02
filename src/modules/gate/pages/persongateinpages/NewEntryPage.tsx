import { useState, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { ArrowLeft, User, Users } from 'lucide-react'
import {
  Button,
  Input,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Label,
} from '@/shared/components/ui'
import {
  usePersonTypes,
  useCreatePersonEntry,
} from '../../api/personGateIn/personGateIn.queries'
import { VisitorSelect, LabourSelect, GateSelect } from '../../components/persongatein'
import type { Visitor, Labour, Gate, CreateEntryRequest } from '../../api/personGateIn/personGateIn.api'

type PersonTypeValue = 'visitor' | 'labour'

interface FormData {
  person_type: number | null
  visitor: number | null
  labour: number | null
  gate_in: number | null
  purpose: string
  vehicle_no: string
  remarks: string
}

export default function NewEntryPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const initialType = searchParams.get('type') as PersonTypeValue | null

  // Form state
  const [personType, setPersonType] = useState<PersonTypeValue>(initialType || 'visitor')
  const [formData, setFormData] = useState<FormData>({
    person_type: null,
    visitor: null,
    labour: null,
    gate_in: null,
    purpose: '',
    vehicle_no: '',
    remarks: '',
  })
  const [selectedPerson, setSelectedPerson] = useState<Visitor | Labour | null>(null)
  const [apiErrors, setApiErrors] = useState<Record<string, string>>({})

  // API hooks
  const { data: personTypes = [] } = usePersonTypes()
  const createEntryMutation = useCreatePersonEntry()

  // Set person type ID when person types load
  useEffect(() => {
    if (personTypes.length > 0) {
      const type = personTypes.find(
        (pt) => pt.name.toLowerCase() === personType.toLowerCase()
      )
      if (type) {
        setFormData((prev) => ({ ...prev, person_type: type.id }))
      }
    }
  }, [personTypes, personType])

  // Handle person type change
  const handlePersonTypeChange = (type: PersonTypeValue) => {
    setPersonType(type)
    setSelectedPerson(null)
    setFormData((prev) => ({
      ...prev,
      visitor: null,
      labour: null,
    }))
    setApiErrors({})
  }

  // Handle visitor selection
  const handleVisitorChange = (visitor: Visitor | null) => {
    setSelectedPerson(visitor)
    setFormData((prev) => ({
      ...prev,
      visitor: visitor?.id || null,
      labour: null,
    }))
    if (apiErrors.visitor) {
      setApiErrors((prev) => {
        const newErrors = { ...prev }
        delete newErrors.visitor
        return newErrors
      })
    }
  }

  // Handle labour selection
  const handleLabourChange = (labour: Labour | null) => {
    setSelectedPerson(labour)
    setFormData((prev) => ({
      ...prev,
      labour: labour?.id || null,
      visitor: null,
    }))
    if (apiErrors.labour) {
      setApiErrors((prev) => {
        const newErrors = { ...prev }
        delete newErrors.labour
        return newErrors
      })
    }
  }

  // Handle gate selection
  const handleGateChange = (gate: Gate | null) => {
    setFormData((prev) => ({
      ...prev,
      gate_in: gate?.id || null,
    }))
    if (apiErrors.gate_in) {
      setApiErrors((prev) => {
        const newErrors = { ...prev }
        delete newErrors.gate_in
        return newErrors
      })
    }
  }

  // Handle form submission
  const handleSubmit = async () => {
    // Validation
    const errors: Record<string, string> = {}
    if (!formData.person_type) errors.person_type = 'Person type is required'
    if (!formData.gate_in) errors.gate_in = 'Gate is required'
    if (personType === 'visitor' && !formData.visitor) errors.visitor = 'Please select a visitor'
    if (personType === 'labour' && !formData.labour) errors.labour = 'Please select a labour'

    if (Object.keys(errors).length > 0) {
      setApiErrors(errors)
      return
    }

    try {
      const requestData: CreateEntryRequest = {
        person_type: formData.person_type!,
        gate_in: formData.gate_in!,
        purpose: formData.purpose || undefined,
        vehicle_no: formData.vehicle_no || undefined,
        remarks: formData.remarks || undefined,
      }

      if (personType === 'visitor') {
        requestData.visitor = formData.visitor!
      } else {
        requestData.labour = formData.labour!
      }

      const entry = await createEntryMutation.mutateAsync(requestData)
      navigate(`/gate/visitor-labour/entry/${entry.id}`)
    } catch (error: unknown) {
      const err = error as { errors?: Record<string, string[]> }
      if (err.errors) {
        const fieldErrors: Record<string, string> = {}
        Object.entries(err.errors).forEach(([field, messages]) => {
          if (Array.isArray(messages) && messages.length > 0) {
            fieldErrors[field] = messages[0]
          }
        })
        setApiErrors(fieldErrors)
      }
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate('/gate/visitor-labour')}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h2 className="text-3xl font-bold tracking-tight">New Entry</h2>
          <p className="text-muted-foreground">Create a new gate entry for visitor or labour</p>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Left Column - Person Selection */}
        <div className="space-y-4">
          {/* Person Type Toggle */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Person Type</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex gap-2">
                <Button
                  variant={personType === 'visitor' ? 'default' : 'outline'}
                  onClick={() => handlePersonTypeChange('visitor')}
                  className="flex-1"
                >
                  <User className="h-4 w-4 mr-2" />
                  Visitor
                </Button>
                <Button
                  variant={personType === 'labour' ? 'default' : 'outline'}
                  onClick={() => handlePersonTypeChange('labour')}
                  className="flex-1"
                >
                  <Users className="h-4 w-4 mr-2" />
                  Labour
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Person Selection */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">
                Select {personType === 'visitor' ? 'Visitor' : 'Labour'}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {personType === 'visitor' ? (
                <VisitorSelect
                  value={formData.visitor}
                  onChange={handleVisitorChange}
                  label="Visitor"
                  placeholder="Search and select visitor..."
                  error={apiErrors.visitor}
                  required
                />
              ) : (
                <LabourSelect
                  value={formData.labour}
                  onChange={handleLabourChange}
                  label="Labour"
                  placeholder="Search and select labour..."
                  error={apiErrors.labour}
                  required
                />
              )}

              {/* Selected Person Display */}
              {selectedPerson && (
                <div className="p-3 rounded-lg border-2 border-primary bg-primary/5">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">{selectedPerson.name}</p>
                      {'company_name' in selectedPerson && selectedPerson.company_name && (
                        <p className="text-sm text-muted-foreground">
                          {selectedPerson.company_name}
                        </p>
                      )}
                      {'skill_type' in selectedPerson && selectedPerson.skill_type && (
                        <p className="text-sm text-muted-foreground">{selectedPerson.skill_type}</p>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right Column - Entry Details */}
        <div className="space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Entry Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Gate Selection */}
              <GateSelect
                value={formData.gate_in}
                onChange={handleGateChange}
                label="Entry Gate"
                placeholder="Select gate..."
                error={apiErrors.gate_in}
                required
              />

              {/* Purpose */}
              <div>
                <Label>Purpose of Visit</Label>
                <Input
                  value={formData.purpose}
                  onChange={(e) => setFormData((prev) => ({ ...prev, purpose: e.target.value }))}
                  placeholder="e.g., Meeting with HR, Daily work"
                  className="mt-1"
                />
              </div>

              {/* Vehicle Number */}
              <div>
                <Label>Vehicle Number</Label>
                <Input
                  value={formData.vehicle_no}
                  onChange={(e) => setFormData((prev) => ({ ...prev, vehicle_no: e.target.value }))}
                  placeholder="e.g., MH12AB1234"
                  className="mt-1"
                />
              </div>

              {/* Remarks */}
              <div>
                <Label>Remarks</Label>
                <textarea
                  value={formData.remarks}
                  onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setFormData((prev) => ({ ...prev, remarks: e.target.value }))}
                  placeholder="Any additional notes..."
                  className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  rows={3}
                />
              </div>
            </CardContent>
          </Card>

          {/* Submit Button */}
          <div className="flex gap-3">
            <Button variant="outline" onClick={() => navigate('/gate/visitor-labour')} className="flex-1">
              Cancel
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={createEntryMutation.isPending}
              className="flex-1"
            >
              {createEntryMutation.isPending ? 'Creating...' : 'Create Entry'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
