import { useState, useRef, useEffect, useCallback } from 'react'
import { ChevronDown, Check, Loader2 } from 'lucide-react'
import { Input, Label } from '@/shared/components/ui'
import { useDepartments } from '../api/department.queries'
import { cn } from '@/shared/utils'
import { useDebounce } from '@/shared/hooks'
import type { Department } from '../api/department.api'

interface DepartmentSelectProps {
  value?: number | ''
  onChange: (departmentId: number | '', departmentName: string) => void
  placeholder?: string
  disabled?: boolean
  error?: string
  label?: string
  required?: boolean
  /** Initial display text to show without fetching departments (for edit mode) */
  initialDisplayText?: string
}

export function DepartmentSelect({
  value,
  onChange,
  placeholder = 'Select department',
  disabled = false,
  error,
  label,
  required = false,
  initialDisplayText,
}: DepartmentSelectProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [searchTerm, setSearchTerm] = useState(initialDisplayText || '')
  const [selectedId, setSelectedId] = useState<number | null>(value ? Number(value) : null)
  const containerRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const prevInitialDisplayTextRef = useRef(initialDisplayText)
  const prevValueRef = useRef(value)

  // Only fetch departments when dropdown is open (lazy loading)
  const { data: departments = [], isLoading } = useDepartments(isOpen)

  const debouncedSearch = useDebounce(searchTerm, 100)

  // Filter departments based on search term
  const filteredDepartments = departments.filter((department) =>
    department.name.toLowerCase().includes(debouncedSearch.toLowerCase())
  )

  // Sync search term with initialDisplayText when it changes from parent
  const syncWithInitialDisplayText = useCallback(() => {
    if (initialDisplayText !== prevInitialDisplayTextRef.current) {
      prevInitialDisplayTextRef.current = initialDisplayText
      if (initialDisplayText) {
        setSearchTerm(initialDisplayText)
      }
    }
  }, [initialDisplayText])

  // Sync state when value/departments change
  const syncWithValue = useCallback(() => {
    if (isOpen && value && departments.length > 0) {
      const department = departments.find((d) => d.id === Number(value))
      if (department) {
        setSelectedId(department.id)
        if (searchTerm !== department.name) {
          setSearchTerm(department.name)
        }
      }
    } else if (value !== prevValueRef.current && !value && !isOpen && !initialDisplayText) {
      prevValueRef.current = value
      setSelectedId(null)
      setSearchTerm('')
    }
  }, [isOpen, value, departments, searchTerm, initialDisplayText])

  // Run sync effects - these are valid patterns for syncing state with props
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- Syncing state with props is a valid pattern
    syncWithInitialDisplayText()
  }, [syncWithInitialDisplayText])

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- Syncing state with props is a valid pattern
    syncWithValue()
    prevValueRef.current = value
  }, [syncWithValue, value])

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isOpen])

  const handleSelect = (department: Department) => {
    setSelectedId(department.id)
    setSearchTerm(department.name)
    onChange(department.id, department.name)
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
      onChange('', '')
      setSelectedId(null)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Escape') {
      setIsOpen(false)
    } else if (e.key === 'Enter' && filteredDepartments.length === 1) {
      handleSelect(filteredDepartments[0])
    }
  }

  return (
    <div className="space-y-2">
      {label && (
        <Label htmlFor="department-select">
          {label} {required && <span className="text-destructive">*</span>}
        </Label>
      )}
      <div ref={containerRef} className="relative">
        <div className="relative">
          <Input
            ref={inputRef}
            id="department-select"
            type="text"
            value={searchTerm}
            onChange={handleInputChange}
            onFocus={handleInputFocus}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            disabled={disabled}
            className={cn(
              'pr-10 cursor-text border-2 font-medium',
              error && 'border-destructive focus-visible:ring-destructive'
            )}
            autoComplete="off"
          />
          <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
            {isLoading && isOpen ? (
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
                Loading departments...
              </div>
            ) : filteredDepartments.length === 0 ? (
              <div className="p-4 text-center text-sm text-muted-foreground">
                {searchTerm ? 'No departments found' : 'No departments available'}
              </div>
            ) : (
              <ul className="py-1">
                {filteredDepartments.map((department) => (
                  <li
                    key={department.id}
                    className={cn(
                      'px-3 py-2 cursor-pointer hover:bg-accent hover:text-accent-foreground flex items-center justify-between',
                      selectedId === department.id && 'bg-accent'
                    )}
                    onClick={() => handleSelect(department)}
                  >
                    <div className="flex flex-col">
                      <span className="text-sm">{department.name}</span>
                      {department.description && (
                        <span className="text-xs text-muted-foreground">
                          {department.description}
                        </span>
                      )}
                    </div>
                    {selectedId === department.id && <Check className="h-4 w-4 text-primary" />}
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </div>
      {error && <p className="text-sm text-destructive">{error}</p>}
    </div>
  )
}
