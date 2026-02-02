import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Search, Plus, Edit2, Trash2, Ban, CheckCircle2 } from 'lucide-react'
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
  useVisitors,
  useCreateVisitor,
  useUpdateVisitor,
  useDeleteVisitor,
} from '../../api/personGateIn/personGateIn.queries'
import type { Visitor, CreateVisitorRequest } from '../../api/personGateIn/personGateIn.api'

export default function VisitorsPage() {
  const navigate = useNavigate()
  const [search, setSearch] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [editingVisitor, setEditingVisitor] = useState<Visitor | null>(null)
  const [formData, setFormData] = useState<CreateVisitorRequest>({
    name: '',
    mobile: '',
    company_name: '',
    id_proof_type: '',
    id_proof_no: '',
    blacklisted: false,
  })
  const [apiErrors, setApiErrors] = useState<Record<string, string>>({})

  const { data: visitors = [], isLoading, refetch } = useVisitors(search)
  const createMutation = useCreateVisitor()
  const updateMutation = useUpdateVisitor()
  const deleteMutation = useDeleteVisitor()

  // Filter visitors based on search
  const filteredVisitors = visitors.filter(
    (v) =>
      v.name.toLowerCase().includes(search.toLowerCase()) ||
      v.mobile?.toLowerCase().includes(search.toLowerCase()) ||
      v.company_name?.toLowerCase().includes(search.toLowerCase())
  )

  // Reset form
  const resetForm = () => {
    setFormData({
      name: '',
      mobile: '',
      company_name: '',
      id_proof_type: '',
      id_proof_no: '',
      blacklisted: false,
    })
    setEditingVisitor(null)
    setApiErrors({})
  }

  // Open edit form
  const handleEdit = (visitor: Visitor) => {
    setEditingVisitor(visitor)
    setFormData({
      name: visitor.name,
      mobile: visitor.mobile || '',
      company_name: visitor.company_name || '',
      id_proof_type: visitor.id_proof_type || '',
      id_proof_no: visitor.id_proof_no || '',
      blacklisted: visitor.blacklisted,
    })
    setShowForm(true)
  }

  // Handle form submit
  const handleSubmit = async () => {
    if (!formData.name.trim()) {
      setApiErrors({ name: 'Name is required' })
      return
    }

    try {
      if (editingVisitor) {
        await updateMutation.mutateAsync({ id: editingVisitor.id, data: formData })
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
    if (!window.confirm('Are you sure you want to delete this visitor?')) return

    try {
      await deleteMutation.mutateAsync(id)
      refetch()
    } catch (error) {
      console.error('Failed to delete:', error)
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
            <h2 className="text-3xl font-bold tracking-tight">Visitors</h2>
            <p className="text-muted-foreground">Manage visitor records</p>
          </div>
        </div>
        <Button
          onClick={() => {
            resetForm()
            setShowForm(true)
          }}
        >
          <Plus className="h-4 w-4 mr-2" />
          Add Visitor
        </Button>
      </div>

      {/* Search */}
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Search visitors..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Form Modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <Card className="w-full max-w-md mx-4">
            <CardHeader>
              <CardTitle>{editingVisitor ? 'Edit Visitor' : 'Add Visitor'}</CardTitle>
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

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Mobile</Label>
                  <Input
                    value={formData.mobile || ''}
                    onChange={(e) => setFormData((prev) => ({ ...prev, mobile: e.target.value }))}
                    placeholder="Mobile number"
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label>Company</Label>
                  <Input
                    value={formData.company_name || ''}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, company_name: e.target.value }))
                    }
                    placeholder="Company name"
                    className="mt-1"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>ID Proof Type</Label>
                  <Input
                    value={formData.id_proof_type || ''}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, id_proof_type: e.target.value }))
                    }
                    placeholder="e.g., Aadhar"
                    className="mt-1"
                  />
                </div>
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
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="blacklisted"
                  checked={formData.blacklisted}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, blacklisted: e.target.checked }))
                  }
                  className="rounded"
                />
                <Label htmlFor="blacklisted" className="text-sm font-normal">
                  Blacklisted
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
                    : editingVisitor
                      ? 'Update'
                      : 'Add'}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Visitors List */}
      {isLoading ? (
        <div className="flex items-center justify-center h-64">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        </div>
      ) : filteredVisitors.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-64 text-muted-foreground rounded-md border">
          <p className="text-lg">No visitors found</p>
        </div>
      ) : (
        <div className="rounded-md border overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[600px]">
              <thead className="bg-muted/50">
                <tr>
                  <th className="p-3 text-left text-sm font-medium">Name</th>
                  <th className="p-3 text-left text-sm font-medium">Mobile</th>
                  <th className="p-3 text-left text-sm font-medium">Company</th>
                  <th className="p-3 text-left text-sm font-medium">ID Proof</th>
                  <th className="p-3 text-left text-sm font-medium">Status</th>
                  <th className="p-3 text-right text-sm font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredVisitors.map((visitor) => (
                  <tr key={visitor.id} className="border-t hover:bg-muted/50">
                    <td className="p-3 text-sm font-medium">{visitor.name}</td>
                    <td className="p-3 text-sm">{visitor.mobile || '-'}</td>
                    <td className="p-3 text-sm">{visitor.company_name || '-'}</td>
                    <td className="p-3 text-sm">
                      {visitor.id_proof_type
                        ? `${visitor.id_proof_type}: ${visitor.id_proof_no}`
                        : '-'}
                    </td>
                    <td className="p-3 text-sm">
                      {visitor.blacklisted ? (
                        <span className="inline-flex items-center gap-1 text-red-600 dark:text-red-400">
                          <Ban className="h-3 w-3" />
                          Blacklisted
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-green-600 dark:text-green-400">
                          <CheckCircle2 className="h-3 w-3" />
                          Active
                        </span>
                      )}
                    </td>
                    <td className="p-3 text-right">
                      <div className="flex justify-end gap-1">
                        <Button variant="ghost" size="sm" onClick={() => handleEdit(visitor)}>
                          <Edit2 className="h-3 w-3" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDelete(visitor.id)}
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
