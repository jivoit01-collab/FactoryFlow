import { ArrowLeft, CheckCircle2, Edit2, Plus, Search, Trash2, XCircle } from 'lucide-react'
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'

import { VALIDATION_PATTERNS } from '@/config/constants'
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

import type { Contractor, CreateContractorRequest } from '../../api/personGateIn/personGateIn.api'
import {
  useContractors,
  useCreateContractor,
  useDeleteContractor,
  useUpdateContractor,
} from '../../api/personGateIn/personGateIn.queries'

export default function ContractorsPage() {
  const navigate = useNavigate()
  const [search, setSearch] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [editingContractor, setEditingContractor] = useState<Contractor | null>(null)
  const [formData, setFormData] = useState<CreateContractorRequest>({
    contractor_name: '',
    contact_person: '',
    mobile: '',
    address: '',
    contract_valid_till: '',
    is_active: true,
  })
  const [apiErrors, setApiErrors] = useState<Record<string, string>>({})

  // Scroll to first error when errors occur
  useScrollToError(apiErrors)

  const { data: contractors = [], isLoading, refetch } = useContractors()
  const createMutation = useCreateContractor()
  const updateMutation = useUpdateContractor()
  const deleteMutation = useDeleteContractor()

  // Filter contractors based on search
  const filteredContractors = contractors.filter(
    (c) =>
      c.contractor_name.toLowerCase().includes(search.toLowerCase()) ||
      c.contact_person?.toLowerCase().includes(search.toLowerCase()) ||
      c.mobile?.toLowerCase().includes(search.toLowerCase())
  )

  // Reset form
  const resetForm = () => {
    setFormData({
      contractor_name: '',
      contact_person: '',
      mobile: '',
      address: '',
      contract_valid_till: '',
      is_active: true,
    })
    setEditingContractor(null)
    setApiErrors({})
  }

  // Open edit form
  const handleEdit = (contractor: Contractor) => {
    setEditingContractor(contractor)
    setFormData({
      contractor_name: contractor.contractor_name,
      contact_person: contractor.contact_person || '',
      mobile: contractor.mobile || '',
      address: contractor.address || '',
      contract_valid_till: contractor.contract_valid_till || '',
      is_active: contractor.is_active,
    })
    setShowForm(true)
  }

  // Handle form submit
  const handleSubmit = async () => {
    const errors: Record<string, string> = {}
    if (!formData.contractor_name.trim()) errors.contractor_name = 'Contractor name is required'
    if (formData.mobile?.trim() && !VALIDATION_PATTERNS.phone.test(formData.mobile.trim())) {
      errors.mobile = 'Please enter a valid 10-digit phone number'
    }

    if (Object.keys(errors).length > 0) {
      setApiErrors(errors)
      return
    }

    try {
      if (editingContractor) {
        await updateMutation.mutateAsync({ id: editingContractor.id, data: formData })
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
    if (!window.confirm('Are you sure you want to delete this contractor?')) return

    try {
      await deleteMutation.mutateAsync(id)
      refetch()
    } catch (error) {
      console.error('Failed to delete:', error)
    }
  }

  // Format date for display
  const formatDate = (date?: string) => {
    if (!date) return '-'
    try {
      return new Date(date).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      })
    } catch {
      return date
    }
  }

  // Check if contract is expired
  const isExpired = (date?: string) => {
    if (!date) return false
    try {
      return new Date(date) < new Date()
    } catch {
      return false
    }
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
            <h2 className="text-3xl font-bold tracking-tight">Contractors</h2>
            <p className="text-muted-foreground">Manage contractor records</p>
          </div>
        </div>
        <Button
          onClick={() => {
            resetForm()
            setShowForm(true)
          }}
        >
          <Plus className="h-4 w-4 mr-2" />
          Add Contractor
        </Button>
      </div>

      {/* Search */}
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Search contractors..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Form Modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <Card className="w-full max-w-md mx-4 max-h-[90vh] overflow-y-auto">
            <CardHeader>
              <CardTitle>{editingContractor ? 'Edit Contractor' : 'Add Contractor'}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>Contractor Name *</Label>
                <Input
                  value={formData.contractor_name}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, contractor_name: e.target.value }))
                  }
                  placeholder="Enter contractor name"
                  className="mt-1"
                />
                {apiErrors.contractor_name && (
                  <p className="text-xs text-red-500 mt-1">{apiErrors.contractor_name}</p>
                )}
              </div>

              <div>
                <Label>Contact Person</Label>
                <Input
                  value={formData.contact_person || ''}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, contact_person: e.target.value }))
                  }
                  placeholder="Contact person name"
                  className="mt-1"
                />
              </div>

              <div>
                <Label>Mobile</Label>
                <Input
                  value={formData.mobile || ''}
                  onChange={(e) => {
                    const value = e.target.value.replace(/[^0-9]/g, '').slice(0, 10)
                    setFormData((prev) => ({ ...prev, mobile: value }))
                    if (apiErrors.mobile) {
                      setApiErrors((prev) => {
                        const n = { ...prev }
                        delete n.mobile
                        return n
                      })
                    }
                  }}
                  placeholder="9876543210"
                  maxLength={10}
                  className={cn('mt-1', apiErrors.mobile && 'border-destructive')}
                />
                {apiErrors.mobile && (
                  <p className="text-xs text-destructive mt-1">{apiErrors.mobile}</p>
                )}
              </div>

              <div>
                <Label>Address</Label>
                <textarea
                  value={formData.address || ''}
                  onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
                    setFormData((prev) => ({ ...prev, address: e.target.value }))
                  }
                  placeholder="Full address"
                  className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  rows={3}
                />
              </div>

              <div>
                <Label>Contract Valid Till</Label>
                <Input
                  type="date"
                  value={formData.contract_valid_till || ''}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, contract_valid_till: e.target.value }))
                  }
                  className="mt-1"
                />
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
                    : editingContractor
                      ? 'Update'
                      : 'Add'}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Contractors List */}
      {isLoading ? (
        <div className="flex items-center justify-center h-64">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        </div>
      ) : filteredContractors.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-64 text-muted-foreground rounded-md border">
          <p className="text-lg">No contractors found</p>
        </div>
      ) : (
        <div className="rounded-md border overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[700px]">
              <thead className="bg-muted/50">
                <tr>
                  <th className="p-3 text-left text-sm font-medium">Contractor Name</th>
                  <th className="p-3 text-left text-sm font-medium">Contact Person</th>
                  <th className="p-3 text-left text-sm font-medium">Mobile</th>
                  <th className="p-3 text-left text-sm font-medium">Contract Valid Till</th>
                  <th className="p-3 text-left text-sm font-medium">Status</th>
                  <th className="p-3 text-right text-sm font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredContractors.map((contractor) => (
                  <tr key={contractor.id} className="border-t hover:bg-muted/50">
                    <td className="p-3 text-sm font-medium">{contractor.contractor_name}</td>
                    <td className="p-3 text-sm">{contractor.contact_person || '-'}</td>
                    <td className="p-3 text-sm">{contractor.mobile || '-'}</td>
                    <td className="p-3 text-sm">
                      <span
                        className={
                          isExpired(contractor.contract_valid_till)
                            ? 'text-red-600 dark:text-red-400'
                            : ''
                        }
                      >
                        {formatDate(contractor.contract_valid_till)}
                        {isExpired(contractor.contract_valid_till) && ' (Expired)'}
                      </span>
                    </td>
                    <td className="p-3 text-sm">
                      {contractor.is_active ? (
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
                        <Button variant="ghost" size="sm" onClick={() => handleEdit(contractor)}>
                          <Edit2 className="h-3 w-3" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDelete(contractor.id)}
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
