import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Search, Plus, Edit2, Trash2, CheckCircle2, XCircle } from 'lucide-react'
import {
  Button,
  Input,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Label,
} from '@/shared/components/ui'
import { useScrollToError } from '@/shared/hooks'
import {
  useLabours,
  useContractors,
  useCreateLabour,
  useUpdateLabour,
  useDeleteLabour,
} from '../../api/personGateIn/personGateIn.queries'
import type { Labour, CreateLabourRequest } from '../../api/personGateIn/personGateIn.api'
import { VALIDATION_PATTERNS } from '@/config/constants'
import { cn } from '@/shared/utils'

export default function LaboursPage() {
  const navigate = useNavigate()
  const [search, setSearch] = useState('')
  const [contractorFilter, setContractorFilter] = useState<number | undefined>(undefined)
  const [showForm, setShowForm] = useState(false)
  const [editingLabour, setEditingLabour] = useState<Labour | null>(null)
  const [formData, setFormData] = useState<CreateLabourRequest>({
    name: '',
    contractor: 0,
    mobile: '',
    id_proof_no: '',
    skill_type: '',
    permit_valid_till: '',
    is_active: true,
  })
  const [apiErrors, setApiErrors] = useState<Record<string, string>>({})

  // Scroll to first error when errors occur
  useScrollToError(apiErrors)

  const { data: labours = [], isLoading, refetch } = useLabours(search, contractorFilter)
  const { data: contractors = [] } = useContractors()
  const createMutation = useCreateLabour()
  const updateMutation = useUpdateLabour()
  const deleteMutation = useDeleteLabour()

  // Filter labours based on search
  const filteredLabours = labours.filter(
    (l) =>
      l.name.toLowerCase().includes(search.toLowerCase()) ||
      l.mobile?.toLowerCase().includes(search.toLowerCase()) ||
      l.skill_type?.toLowerCase().includes(search.toLowerCase())
  )

  // Reset form
  const resetForm = () => {
    setFormData({
      name: '',
      contractor: 0,
      mobile: '',
      id_proof_no: '',
      skill_type: '',
      permit_valid_till: '',
      is_active: true,
    })
    setEditingLabour(null)
    setApiErrors({})
  }

  // Open edit form
  const handleEdit = (labour: Labour) => {
    setEditingLabour(labour)
    setFormData({
      name: labour.name,
      contractor: labour.contractor,
      mobile: labour.mobile || '',
      id_proof_no: labour.id_proof_no || '',
      skill_type: labour.skill_type || '',
      permit_valid_till: labour.permit_valid_till || '',
      is_active: labour.is_active,
    })
    setShowForm(true)
  }

  // Handle form submit
  const handleSubmit = async () => {
    const errors: Record<string, string> = {}
    if (!formData.name.trim()) errors.name = 'Name is required'
    if (!formData.contractor) errors.contractor = 'Contractor is required'
    if (formData.mobile?.trim() && !VALIDATION_PATTERNS.phone.test(formData.mobile.trim())) {
      errors.mobile = 'Please enter a valid 10-digit phone number'
    }

    if (Object.keys(errors).length > 0) {
      setApiErrors(errors)
      return
    }

    try {
      if (editingLabour) {
        await updateMutation.mutateAsync({ id: editingLabour.id, data: formData })
      } else {
        await createMutation.mutateAsync(formData)
      }
      setShowForm(false)
      resetForm()
      refetch()
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

  // Handle delete
  const handleDelete = async (id: number) => {
    if (!window.confirm('Are you sure you want to delete this labour?')) return

    try {
      await deleteMutation.mutateAsync(id)
      refetch()
    } catch (error) {
      console.error('Failed to delete:', error)
    }
  }

  // Get contractor name by ID
  const getContractorName = (contractorId: number) => {
    const contractor = contractors.find((c) => c.id === contractorId)
    return contractor?.contractor_name || '-'
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate('/gate/visitor-labour')}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h2 className="text-3xl font-bold tracking-tight">Labours</h2>
            <p className="text-muted-foreground">Manage labour records</p>
          </div>
        </div>
        <Button
          onClick={() => {
            resetForm()
            setShowForm(true)
          }}
        >
          <Plus className="h-4 w-4 mr-2" />
          Add Labour
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search labours..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>
        <select
          value={contractorFilter || ''}
          onChange={(e) => setContractorFilter(Number(e.target.value) || undefined)}
          className="border rounded-md px-3 py-2 text-sm bg-background"
        >
          <option value="">All Contractors</option>
          {contractors.map((contractor) => (
            <option key={contractor.id} value={contractor.id}>
              {contractor.contractor_name}
            </option>
          ))}
        </select>
      </div>

      {/* Form Modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <Card className="w-full max-w-md mx-4">
            <CardHeader>
              <CardTitle>{editingLabour ? 'Edit Labour' : 'Add Labour'}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>Name *</Label>
                <Input
                  value={formData.name}
                  onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
                  placeholder="Enter name"
                  className="mt-1"
                />
                {apiErrors.name && <p className="text-xs text-red-500 mt-1">{apiErrors.name}</p>}
              </div>

              <div>
                <Label>Contractor *</Label>
                <select
                  value={formData.contractor || ''}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, contractor: Number(e.target.value) }))
                  }
                  className="w-full border rounded-md px-3 py-2 text-sm bg-background mt-1"
                >
                  <option value="">Select Contractor</option>
                  {contractors
                    .filter((c) => c.is_active)
                    .map((contractor) => (
                      <option key={contractor.id} value={contractor.id}>
                        {contractor.contractor_name}
                      </option>
                    ))}
                </select>
                {apiErrors.contractor && (
                  <p className="text-xs text-red-500 mt-1">{apiErrors.contractor}</p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Mobile</Label>
                  <Input
                    value={formData.mobile || ''}
                    onChange={(e) => {
                      const value = e.target.value.replace(/[^0-9]/g, '').slice(0, 10)
                      setFormData((prev) => ({ ...prev, mobile: value }))
                      if (apiErrors.mobile) {
                        setApiErrors((prev) => { const n = { ...prev }; delete n.mobile; return n })
                      }
                    }}
                    placeholder="9876543210"
                    maxLength={10}
                    className={cn('mt-1', apiErrors.mobile && 'border-destructive')}
                  />
                  {apiErrors.mobile && <p className="text-xs text-destructive mt-1">{apiErrors.mobile}</p>}
                </div>
                <div>
                  <Label>Skill Type</Label>
                  <Input
                    value={formData.skill_type || ''}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, skill_type: e.target.value }))
                    }
                    placeholder="e.g., Mason"
                    className="mt-1"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>ID Proof No</Label>
                  <Input
                    value={formData.id_proof_no || ''}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, id_proof_no: e.target.value }))
                    }
                    placeholder="ID number"
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label>Permit Valid Till</Label>
                  <Input
                    type="date"
                    value={formData.permit_valid_till || ''}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, permit_valid_till: e.target.value }))
                    }
                    className="mt-1"
                  />
                </div>
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="is_active"
                  checked={formData.is_active}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, is_active: e.target.checked }))
                  }
                  className="rounded"
                />
                <Label htmlFor="is_active" className="text-sm font-normal">
                  Active
                </Label>
              </div>

              <div className="flex gap-2 pt-2">
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowForm(false)
                    resetForm()
                  }}
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleSubmit}
                  disabled={createMutation.isPending || updateMutation.isPending}
                  className="flex-1"
                >
                  {createMutation.isPending || updateMutation.isPending
                    ? 'Saving...'
                    : editingLabour
                      ? 'Update'
                      : 'Add'}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Labours List */}
      {isLoading ? (
        <div className="flex items-center justify-center h-64">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        </div>
      ) : filteredLabours.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-64 text-muted-foreground rounded-md border">
          <p className="text-lg">No labours found</p>
        </div>
      ) : (
        <div className="rounded-md border overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[700px]">
              <thead className="bg-muted/50">
                <tr>
                  <th className="p-3 text-left text-sm font-medium">Name</th>
                  <th className="p-3 text-left text-sm font-medium">Contractor</th>
                  <th className="p-3 text-left text-sm font-medium">Mobile</th>
                  <th className="p-3 text-left text-sm font-medium">Skill</th>
                  <th className="p-3 text-left text-sm font-medium">Permit Till</th>
                  <th className="p-3 text-left text-sm font-medium">Status</th>
                  <th className="p-3 text-right text-sm font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredLabours.map((labour) => (
                  <tr key={labour.id} className="border-t hover:bg-muted/50">
                    <td className="p-3 text-sm font-medium">{labour.name}</td>
                    <td className="p-3 text-sm">
                      {labour.contractor_name || getContractorName(labour.contractor)}
                    </td>
                    <td className="p-3 text-sm">{labour.mobile || '-'}</td>
                    <td className="p-3 text-sm">{labour.skill_type || '-'}</td>
                    <td className="p-3 text-sm">{labour.permit_valid_till || '-'}</td>
                    <td className="p-3 text-sm">
                      {labour.is_active ? (
                        <span className="inline-flex items-center gap-1 text-green-600 dark:text-green-400">
                          <CheckCircle2 className="h-3 w-3" />
                          Active
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-red-600 dark:text-red-400">
                          <XCircle className="h-3 w-3" />
                          Inactive
                        </span>
                      )}
                    </td>
                    <td className="p-3 text-right">
                      <div className="flex justify-end gap-1">
                        <Button variant="ghost" size="sm" onClick={() => handleEdit(labour)}>
                          <Edit2 className="h-3 w-3" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDelete(labour.id)}
                          disabled={deleteMutation.isPending}
                        >
                          <Trash2 className="h-3 w-3 text-red-500" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
