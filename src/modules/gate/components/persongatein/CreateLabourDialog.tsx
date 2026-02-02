import { useState, useEffect } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Button,
  Input,
  Label,
} from '@/shared/components/ui'
import { useCreateLabour, useContractors } from '../../api/personGateIn/personGateIn.queries'
import type { Labour } from '../../api/personGateIn/personGateIn.api'

interface CreateLabourDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess?: (labour: Labour) => void
  defaultContractorId?: number
}

export function CreateLabourDialog({
  open,
  onOpenChange,
  onSuccess,
  defaultContractorId,
}: CreateLabourDialogProps) {
  const [apiErrors, setApiErrors] = useState<Record<string, string>>({})
  const [formData, setFormData] = useState({
    name: '',
    contractor: defaultContractorId || 0,
    mobile: '',
    id_proof_no: '',
    skill_type: '',
    permit_valid_till: '',
  })

  const createLabour = useCreateLabour()
  const { data: contractors = [], isLoading: contractorsLoading } = useContractors(open)

  // Reset form when dialog opens/closes
  useEffect(() => {
    if (open) {
      setFormData({
        name: '',
        contractor: defaultContractorId || 0,
        mobile: '',
        id_proof_no: '',
        skill_type: '',
        permit_valid_till: '',
      })
      setApiErrors({})
    }
  }, [open, defaultContractorId])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!formData.name.trim()) {
      setApiErrors({ name: 'Name is required' })
      return
    }

    if (!formData.contractor) {
      setApiErrors({ contractor: 'Contractor is required' })
      return
    }

    setApiErrors({})
    try {
      const result = await createLabour.mutateAsync({
        name: formData.name,
        contractor: formData.contractor,
        mobile: formData.mobile || undefined,
        id_proof_no: formData.id_proof_no || undefined,
        skill_type: formData.skill_type || undefined,
        permit_valid_till: formData.permit_valid_till || undefined,
      })
      onOpenChange(false)
      onSuccess?.(result)
    } catch (error: unknown) {
      const err = error as { errors?: Record<string, string[]>; message?: string }
      if (err.errors) {
        const fieldErrors: Record<string, string> = {}
        Object.entries(err.errors).forEach(([field, messages]) => {
          if (Array.isArray(messages) && messages.length > 0) {
            fieldErrors[field] = messages[0]
          }
        })
        setApiErrors(fieldErrors)
      } else {
        setApiErrors({ general: err.message || 'Failed to create labour' })
      }
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Add New Labour</DialogTitle>
          <DialogDescription>
            Fill in the details to register a new labour.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {apiErrors.general && (
            <div className="rounded-md bg-destructive/15 p-3 text-sm text-destructive">
              {apiErrors.general}
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="name">
              Name <span className="text-destructive">*</span>
            </Label>
            <Input
              id="name"
              placeholder="Enter labour name"
              value={formData.name}
              onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
              disabled={createLabour.isPending}
              className={apiErrors.name ? 'border-destructive' : ''}
            />
            {apiErrors.name && (
              <p className="text-sm text-destructive">{apiErrors.name}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="contractor">
              Contractor <span className="text-destructive">*</span>
            </Label>
            <select
              id="contractor"
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              value={formData.contractor}
              onChange={(e) => setFormData((prev) => ({ ...prev, contractor: Number(e.target.value) }))}
              disabled={createLabour.isPending || contractorsLoading}
            >
              <option value={0}>Select contractor</option>
              {contractors.map((contractor) => (
                <option key={contractor.id} value={contractor.id}>
                  {contractor.contractor_name}
                </option>
              ))}
            </select>
            {apiErrors.contractor && (
              <p className="text-sm text-destructive">{apiErrors.contractor}</p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="mobile">Mobile</Label>
              <Input
                id="mobile"
                placeholder="Mobile number"
                value={formData.mobile}
                onChange={(e) => setFormData((prev) => ({ ...prev, mobile: e.target.value }))}
                disabled={createLabour.isPending}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="skill_type">Skill Type</Label>
              <Input
                id="skill_type"
                placeholder="e.g., Electrician, Plumber"
                value={formData.skill_type}
                onChange={(e) => setFormData((prev) => ({ ...prev, skill_type: e.target.value }))}
                disabled={createLabour.isPending}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="id_proof_no">ID Proof Number</Label>
              <Input
                id="id_proof_no"
                placeholder="ID number"
                value={formData.id_proof_no}
                onChange={(e) => setFormData((prev) => ({ ...prev, id_proof_no: e.target.value }))}
                disabled={createLabour.isPending}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="permit_valid_till">Permit Valid Till</Label>
              <Input
                id="permit_valid_till"
                type="date"
                value={formData.permit_valid_till}
                onChange={(e) => setFormData((prev) => ({ ...prev, permit_valid_till: e.target.value }))}
                disabled={createLabour.isPending}
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={createLabour.isPending}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={createLabour.isPending}>
              {createLabour.isPending ? 'Creating...' : 'Create Labour'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
