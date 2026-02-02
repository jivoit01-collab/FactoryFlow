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
import { useCreateVisitor } from '../../api/personGateIn/personGateIn.queries'
import type { Visitor } from '../../api/personGateIn/personGateIn.api'

interface CreateVisitorDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess?: (visitor: Visitor) => void
}

export function CreateVisitorDialog({ open, onOpenChange, onSuccess }: CreateVisitorDialogProps) {
  const [apiErrors, setApiErrors] = useState<Record<string, string>>({})
  const [formData, setFormData] = useState({
    name: '',
    mobile: '',
    company_name: '',
    id_proof_type: '',
    id_proof_no: '',
  })

  const createVisitor = useCreateVisitor()

  // Reset form when dialog opens/closes
  useEffect(() => {
    if (open) {
      setFormData({
        name: '',
        mobile: '',
        company_name: '',
        id_proof_type: '',
        id_proof_no: '',
      })
      setApiErrors({})
    }
  }, [open])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!formData.name.trim()) {
      setApiErrors({ name: 'Name is required' })
      return
    }

    setApiErrors({})
    try {
      const result = await createVisitor.mutateAsync({
        name: formData.name,
        mobile: formData.mobile || undefined,
        company_name: formData.company_name || undefined,
        id_proof_type: formData.id_proof_type || undefined,
        id_proof_no: formData.id_proof_no || undefined,
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
        setApiErrors({ general: err.message || 'Failed to create visitor' })
      }
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Add New Visitor</DialogTitle>
          <DialogDescription>
            Fill in the details to register a new visitor.
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
              placeholder="Enter visitor name"
              value={formData.name}
              onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
              disabled={createVisitor.isPending}
              className={apiErrors.name ? 'border-destructive' : ''}
            />
            {apiErrors.name && (
              <p className="text-sm text-destructive">{apiErrors.name}</p>
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
                disabled={createVisitor.isPending}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="company_name">Company</Label>
              <Input
                id="company_name"
                placeholder="Company name"
                value={formData.company_name}
                onChange={(e) => setFormData((prev) => ({ ...prev, company_name: e.target.value }))}
                disabled={createVisitor.isPending}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="id_proof_type">ID Proof Type</Label>
              <select
                id="id_proof_type"
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                value={formData.id_proof_type}
                onChange={(e) => setFormData((prev) => ({ ...prev, id_proof_type: e.target.value }))}
                disabled={createVisitor.isPending}
              >
                <option value="">Select type</option>
                <option value="Aadhar">Aadhar</option>
                <option value="PAN">PAN</option>
                <option value="Driving License">Driving License</option>
                <option value="Passport">Passport</option>
                <option value="Voter ID">Voter ID</option>
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="id_proof_no">ID Proof Number</Label>
              <Input
                id="id_proof_no"
                placeholder="ID number"
                value={formData.id_proof_no}
                onChange={(e) => setFormData((prev) => ({ ...prev, id_proof_no: e.target.value }))}
                disabled={createVisitor.isPending}
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={createVisitor.isPending}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={createVisitor.isPending}>
              {createVisitor.isPending ? 'Creating...' : 'Create Visitor'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
