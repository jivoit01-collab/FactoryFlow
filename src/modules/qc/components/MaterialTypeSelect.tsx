import { useState } from 'react'
import {
  Button,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  Input,
  Label,
  Textarea,
} from '@/shared/components/ui'
import { SearchableSelect } from '@/shared/components'
import { usePermission } from '@/core/auth'
import { useMaterialTypes, useCreateMaterialType } from '../api/materialType/materialType.queries'
import type { MaterialType } from '../types'
import type { ApiError } from '@/core/api/types'

interface MaterialTypeSelectProps {
  value?: number
  onChange: (materialType: MaterialType | null) => void
  placeholder?: string
  disabled?: boolean
  error?: string
  label?: string
  required?: boolean
}

export function MaterialTypeSelect({
  value,
  onChange,
  placeholder = 'Select Material Type',
  disabled = false,
  error,
  label,
  required = false,
}: MaterialTypeSelectProps) {
  // Permission check
  const { hasAnyPermission } = usePermission()
  const canManageMaterialTypes = hasAnyPermission([
    'quality_control.can_manage_material_types',
    'quality_control.add_materialtype',
  ])

  // Fetch material types
  const { data: materialTypes = [], isLoading, isError } = useMaterialTypes()
  const createMaterialType = useCreateMaterialType()

  // Dialog form state
  const [formData, setFormData] = useState({ code: '', name: '', description: '' })
  const [formErrors, setFormErrors] = useState<Record<string, string>>({})

  const handleCreateMaterialType = async (updateSelection: (key: string | number, label: string) => void) => {
    if (!formData.code.trim()) {
      setFormErrors({ code: 'Code is required' })
      return
    }
    if (!/^[A-Z0-9_]+$/.test(formData.code)) {
      setFormErrors({ code: 'Code must be uppercase letters, numbers, and underscores only' })
      return
    }
    if (!formData.name.trim()) {
      setFormErrors({ name: 'Name is required' })
      return
    }

    try {
      setFormErrors({})
      const newType = await createMaterialType.mutateAsync({
        code: formData.code,
        name: formData.name,
        description: formData.description,
      })

      updateSelection(newType.id, newType.name)
      onChange(newType)
    } catch (err) {
      const apiError = err as ApiError
      setFormErrors({ general: apiError.message || 'Failed to create material type' })
    }
  }

  return (
    <SearchableSelect<MaterialType>
      value={value ? String(value) : undefined}
      items={materialTypes}
      isLoading={isLoading}
      isError={isError}
      placeholder={placeholder}
      disabled={disabled}
      error={error}
      label={label}
      required={required}
      inputId="material-type-select"
      getItemKey={(t) => t.id}
      getItemLabel={(t) => t.name}
      filterFn={(t, search) =>
        t.name.toLowerCase().includes(search.toLowerCase()) ||
        t.code.toLowerCase().includes(search.toLowerCase())
      }
      renderItem={(type) => (
        <div>
          <span className="text-sm font-medium">{type.name}</span>
          <span className="text-xs text-muted-foreground ml-2">({type.code})</span>
        </div>
      )}
      loadingText="Loading..."
      emptyText="No material types available"
      notFoundText="No material types found"
      addNewLabel={canManageMaterialTypes ? 'Add New Material Type' : undefined}
      onItemSelect={(type) => {
        onChange(type)
      }}
      onClear={() => {
        onChange(null)
      }}
      renderCreateDialog={canManageMaterialTypes ? (open, onOpenChange, updateSelection) => (
        <Dialog open={open} onOpenChange={onOpenChange}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Add Material Type</DialogTitle>
            </DialogHeader>

            {formErrors.general && (
              <div className="rounded-md bg-destructive/15 p-3 text-sm text-destructive">
                {formErrors.general}
              </div>
            )}

            <div className="space-y-4">
              <div className="space-y-2">
                <Label>
                  Code <span className="text-destructive">*</span>
                </Label>
                <Input
                  value={formData.code}
                  onChange={(e) => {
                    const val = e.target.value.toUpperCase().replace(/\s/g, '')
                    setFormData((prev) => ({ ...prev, code: val }))
                    if (formErrors.code) {
                      setFormErrors((prev) => ({ ...prev, code: '' }))
                    }
                  }}
                  placeholder="e.g., CAP_BLUE"
                  disabled={createMaterialType.isPending}
                />
                <p className="text-xs text-muted-foreground">
                  All caps, no spaces. Use underscores to separate words.
                </p>
                {formErrors.code && (
                  <p className="text-sm text-destructive">{formErrors.code}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label>
                  Name <span className="text-destructive">*</span>
                </Label>
                <Input
                  value={formData.name}
                  onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
                  placeholder="e.g., Cap Blue Plain"
                  disabled={createMaterialType.isPending}
                />
                {formErrors.name && (
                  <p className="text-sm text-destructive">{formErrors.name}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label>Description</Label>
                <Textarea
                  value={formData.description}
                  onChange={(e) => setFormData((prev) => ({ ...prev, description: e.target.value }))}
                  placeholder="e.g., Blue plain caps for water bottles"
                  rows={3}
                  disabled={createMaterialType.isPending}
                />
              </div>
            </div>

            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={createMaterialType.isPending}
              >
                Cancel
              </Button>
              <Button
                onClick={() => handleCreateMaterialType(updateSelection)}
                disabled={createMaterialType.isPending}
              >
                {createMaterialType.isPending ? 'Creating...' : 'Create'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      ) : undefined}
    />
  )
}
