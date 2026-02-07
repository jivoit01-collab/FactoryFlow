import { useState, useRef, useEffect } from 'react'
import { ChevronDown, Check, Loader2, Plus } from 'lucide-react'
import {
  Input,
  Label,
  Button,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  Textarea,
} from '@/shared/components/ui'
import { cn } from '@/shared/utils'
import { useDebounce } from '@/shared/hooks'
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
  const [isOpen, setIsOpen] = useState(false)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const containerRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  // Permission check
  const { hasAnyPermission } = usePermission()
  const canManageMaterialTypes = hasAnyPermission([
    'quality_control.can_manage_material_types',
    'quality_control.add_materialtype',
  ])

  // Fetch material types
  const { data: materialTypes = [], isLoading } = useMaterialTypes()
  const createMaterialType = useCreateMaterialType()

  // Dialog form state
  const [formData, setFormData] = useState({ code: '', name: '', description: '' })
  const [formErrors, setFormErrors] = useState<Record<string, string>>({})

  const debouncedSearch = useDebounce(searchTerm, 100)

  // Filter material types based on search term
  const filteredTypes = materialTypes.filter(
    (type) =>
      type.name.toLowerCase().includes(debouncedSearch.toLowerCase()) ||
      type.code.toLowerCase().includes(debouncedSearch.toLowerCase())
  )

  // Find selected material type
  const selectedType = materialTypes.find((t) => t.id === value)

  // Sync search term with selected value
  useEffect(() => {
    if (selectedType) {
      setSearchTerm(selectedType.name)
    } else if (!value) {
      setSearchTerm('')
    }
  }, [selectedType, value])

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false)
        // Reset search term to selected value when closing
        if (selectedType) {
          setSearchTerm(selectedType.name)
        }
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isOpen, selectedType])

  const handleSelect = (type: MaterialType) => {
    setSearchTerm(type.name)
    onChange(type)
    setIsOpen(false)
  }

  const handleInputFocus = () => {
    if (!disabled) {
      setIsOpen(true)
    }
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value)
    setIsOpen(true)
    if (!e.target.value) {
      onChange(null)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Escape') {
      setIsOpen(false)
    } else if (e.key === 'Enter' && filteredTypes.length === 1) {
      handleSelect(filteredTypes[0])
    }
  }

  const handleAddNewClick = (e: React.MouseEvent) => {
    e.stopPropagation()
    setIsOpen(false)
    setFormData({ code: '', name: '', description: '' })
    setFormErrors({})
    setIsDialogOpen(true)
  }

  const handleCreateMaterialType = async () => {
    // Validation
    if (!formData.code.trim()) {
      setFormErrors({ code: 'Code is required' })
      return
    }
    // Validate code format (uppercase, no spaces)
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

      // Auto-select the newly created material type
      setSearchTerm(newType.name)
      onChange(newType)
      setIsDialogOpen(false)
    } catch (err) {
      const apiError = err as ApiError
      setFormErrors({ general: apiError.message || 'Failed to create material type' })
    }
  }

  return (
    <div className="space-y-2">
      {label && (
        <Label htmlFor="material-type-select">
          {label} {required && <span className="text-destructive">*</span>}
        </Label>
      )}
      <div ref={containerRef} className="relative">
        <div className="relative">
          <Input
            ref={inputRef}
            id="material-type-select"
            type="text"
            value={searchTerm}
            onChange={handleInputChange}
            onFocus={handleInputFocus}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            disabled={disabled || isLoading}
            className={cn(
              'pr-10 cursor-text',
              error && 'border-destructive focus-visible:ring-destructive'
            )}
            autoComplete="off"
          />
          <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
            {isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
            ) : (
              <ChevronDown
                className={cn(
                  'h-4 w-4 text-muted-foreground transition-transform',
                  isOpen && 'rotate-180'
                )}
              />
            )}
          </div>
        </div>

        {isOpen && (
          <div className="absolute z-50 w-full mt-1 bg-popover border rounded-md shadow-md max-h-60 overflow-auto">
            {isLoading ? (
              <div className="p-4 text-center text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin mx-auto mb-2" />
                Loading...
              </div>
            ) : (
              <>
                {canManageMaterialTypes && (
                  <div className="px-3 py-2 border-b">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="w-full justify-start text-sm"
                      onClick={handleAddNewClick}
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Add New Material Type
                    </Button>
                  </div>
                )}
                {filteredTypes.length === 0 ? (
                  <div className="p-4 text-center text-sm text-muted-foreground">
                    {searchTerm ? 'No material types found' : 'No material types available'}
                  </div>
                ) : (
                  <ul className="py-1">
                    {filteredTypes.map((type) => (
                      <li
                        key={type.id}
                        className={cn(
                          'px-3 py-2 cursor-pointer hover:bg-accent hover:text-accent-foreground flex items-center justify-between',
                          value === type.id && 'bg-accent'
                        )}
                        onClick={() => handleSelect(type)}
                      >
                        <div>
                          <span className="text-sm font-medium">{type.name}</span>
                          <span className="text-xs text-muted-foreground ml-2">({type.code})</span>
                        </div>
                        {value === type.id && <Check className="h-4 w-4 text-primary" />}
                      </li>
                    ))}
                  </ul>
                )}
              </>
            )}
          </div>
        )}
      </div>
      {error && <p className="text-sm text-destructive">{error}</p>}

      {/* Add Material Type Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
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
                  // Transform to uppercase and remove spaces
                  const value = e.target.value.toUpperCase().replace(/\s/g, '')
                  setFormData((prev) => ({ ...prev, code: value }))
                  // Clear error when user types
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
              onClick={() => setIsDialogOpen(false)}
              disabled={createMaterialType.isPending}
            >
              Cancel
            </Button>
            <Button onClick={handleCreateMaterialType} disabled={createMaterialType.isPending}>
              {createMaterialType.isPending ? 'Creating...' : 'Create'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
