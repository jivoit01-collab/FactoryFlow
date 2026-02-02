import { useState, useRef, useEffect } from 'react'
import { ChevronDown, Check, Loader2, Plus, HelpCircle } from 'lucide-react'
import {
  Input,
  Label,
  Button,
  Popover,
  PopoverTrigger,
  PopoverContent,
} from '@/shared/components/ui'
import { useLabours } from '../../api/personGateIn/personGateIn.queries'
import { cn } from '@/shared/utils'
import { useDebounce } from '@/shared/hooks'
import { CreateLabourDialog } from './CreateLabourDialog'
import type { Labour } from '../../api/personGateIn/personGateIn.api'

interface LabourSelectProps {
  value?: number | null
  onChange: (labour: Labour | null) => void
  contractorId?: number
  placeholder?: string
  disabled?: boolean
  error?: string
  label?: string
  required?: boolean
}

export function LabourSelect({
  value,
  onChange,
  contractorId,
  placeholder = 'Select labour',
  disabled = false,
  error,
  label,
  required = false,
}: LabourSelectProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [displayValue, setDisplayValue] = useState('')
  const [selectedLabour, setSelectedLabour] = useState<Labour | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const debouncedSearch = useDebounce(searchTerm, 150)

  // Fetch labours when dropdown is open (lazy loading)
  const { data: labours = [], isLoading } = useLabours(
    debouncedSearch || undefined,
    contractorId,
    isOpen && !disabled
  )

  // Filter only active labours
  const filteredLabours = labours.filter((l) => l.is_active)

  // Update display value when value changes
  useEffect(() => {
    if (value && labours.length > 0) {
      const labour = labours.find((l) => l.id === value)
      if (labour) {
        setDisplayValue(labour.name)
        setSelectedLabour(labour)
      }
    } else if (!value) {
      setDisplayValue('')
      setSearchTerm('')
      setSelectedLabour(null)
    }
  }, [value, labours])

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false)
        // Reset search term to display value when closing
        if (value) {
          setSearchTerm('')
        }
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isOpen, value])

  const handleSelect = (labour: Labour) => {
    setDisplayValue(labour.name)
    setSearchTerm('')
    setSelectedLabour(labour)
    onChange(labour)
    setIsOpen(false)
  }

  const handleInputFocus = () => {
    if (!disabled) {
      setIsOpen(true)
    }
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value
    setSearchTerm(val)
    setDisplayValue(val)
    setIsOpen(true)
    if (!val) {
      onChange(null)
      setSelectedLabour(null)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Escape') {
      setIsOpen(false)
    } else if (e.key === 'Enter' && filteredLabours.length === 1) {
      handleSelect(filteredLabours[0])
    }
  }

  const handleAddNewClick = (e: React.MouseEvent) => {
    e.stopPropagation()
    setIsOpen(false)
    setIsDialogOpen(true)
  }

  const handleCreateSuccess = (labour: Labour) => {
    setDisplayValue(labour.name)
    setSelectedLabour(labour)
    onChange(labour)
  }

  return (
    <div className="space-y-2">
      {label && (
        <div className="flex items-center gap-1">
          <Label htmlFor="labour-select">
            {label} {required && <span className="text-destructive">*</span>}
          </Label>
          <Popover>
            <PopoverTrigger asChild>
              <button
                type="button"
                className="inline-flex items-center justify-center rounded-full text-muted-foreground hover:text-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                onClick={(e) => e.stopPropagation()}
              >
                <HelpCircle className="h-4 w-4" />
              </button>
            </PopoverTrigger>
            <PopoverContent className="w-80" align="start">
              {selectedLabour ? (
                <div className="space-y-2">
                  <div className="space-y-1.5 text-sm">
                    <div>
                      <span className="font-medium">Name:</span>{' '}
                      <span className="text-muted-foreground">{selectedLabour.name}</span>
                    </div>
                    {selectedLabour.contractor_name && (
                      <div>
                        <span className="font-medium">Contractor:</span>{' '}
                        <span className="text-muted-foreground">{selectedLabour.contractor_name}</span>
                      </div>
                    )}
                    {selectedLabour.mobile && (
                      <div>
                        <span className="font-medium">Mobile:</span>{' '}
                        <span className="text-muted-foreground">{selectedLabour.mobile}</span>
                      </div>
                    )}
                    {selectedLabour.skill_type && (
                      <div>
                        <span className="font-medium">Skill Type:</span>{' '}
                        <span className="text-muted-foreground">{selectedLabour.skill_type}</span>
                      </div>
                    )}
                    {selectedLabour.id_proof_no && (
                      <div>
                        <span className="font-medium">ID Proof Number:</span>{' '}
                        <span className="text-muted-foreground">{selectedLabour.id_proof_no}</span>
                      </div>
                    )}
                    {selectedLabour.permit_valid_till && (
                      <div>
                        <span className="font-medium">Permit Valid Till:</span>{' '}
                        <span className="text-muted-foreground">{selectedLabour.permit_valid_till}</span>
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="text-sm text-muted-foreground">
                  Please select a labour to view details.
                </div>
              )}
            </PopoverContent>
          </Popover>
        </div>
      )}
      <div ref={containerRef} className="relative">
        <div className="relative">
          <Input
            ref={inputRef}
            id="labour-select"
            type="text"
            value={searchTerm || displayValue}
            onChange={handleInputChange}
            onFocus={handleInputFocus}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            disabled={disabled}
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
                Loading labours...
              </div>
            ) : (
              <>
                <div className="px-3 py-2 border-b">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="w-full justify-start text-sm"
                    onClick={handleAddNewClick}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Add New Labour
                  </Button>
                </div>
                {filteredLabours.length === 0 ? (
                  <div className="p-4 text-center text-sm text-muted-foreground">
                    {searchTerm ? 'No labours found' : 'Type to search labours'}
                  </div>
                ) : (
                  <ul className="py-1">
                    {filteredLabours.map((labour) => (
                      <li
                        key={labour.id}
                        className={cn(
                          'px-3 py-2 cursor-pointer hover:bg-accent hover:text-accent-foreground flex items-center justify-between',
                          value === labour.id && 'bg-accent'
                        )}
                        onClick={() => handleSelect(labour)}
                      >
                        <div>
                          <span className="text-sm font-medium">{labour.name}</span>
                          {labour.skill_type && (
                            <span className="text-xs text-muted-foreground ml-2">
                              ({labour.skill_type})
                            </span>
                          )}
                        </div>
                        {value === labour.id && <Check className="h-4 w-4 text-primary" />}
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
      <CreateLabourDialog
        open={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        onSuccess={handleCreateSuccess}
        defaultContractorId={contractorId}
      />
    </div>
  )
}
