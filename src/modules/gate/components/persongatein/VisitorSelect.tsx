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
import { useVisitors } from '../../api/personGateIn/personGateIn.queries'
import { cn } from '@/shared/utils'
import { useDebounce } from '@/shared/hooks'
import { CreateVisitorDialog } from './CreateVisitorDialog'
import type { Visitor } from '../../api/personGateIn/personGateIn.api'

interface VisitorSelectProps {
  value?: number | null
  onChange: (visitor: Visitor | null) => void
  placeholder?: string
  disabled?: boolean
  error?: string
  label?: string
  required?: boolean
}

export function VisitorSelect({
  value,
  onChange,
  placeholder = 'Select visitor',
  disabled = false,
  error,
  label,
  required = false,
}: VisitorSelectProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [displayValue, setDisplayValue] = useState('')
  const [selectedVisitor, setSelectedVisitor] = useState<Visitor | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const debouncedSearch = useDebounce(searchTerm, 150)

  // Fetch visitors when dropdown is open (lazy loading)
  const { data: visitors = [], isLoading } = useVisitors(
    debouncedSearch || undefined,
    isOpen && !disabled
  )

  // Filter out blacklisted visitors
  const filteredVisitors = visitors.filter((v) => !v.blacklisted)

  // Update display value when value changes
  useEffect(() => {
    if (value && visitors.length > 0) {
      const visitor = visitors.find((v) => v.id === value)
      if (visitor) {
        setDisplayValue(visitor.name)
        setSelectedVisitor(visitor)
      }
    } else if (!value) {
      setDisplayValue('')
      setSearchTerm('')
      setSelectedVisitor(null)
    }
  }, [value, visitors])

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

  const handleSelect = (visitor: Visitor) => {
    setDisplayValue(visitor.name)
    setSearchTerm('')
    setSelectedVisitor(visitor)
    onChange(visitor)
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
      setSelectedVisitor(null)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Escape') {
      setIsOpen(false)
    } else if (e.key === 'Enter' && filteredVisitors.length === 1) {
      handleSelect(filteredVisitors[0])
    }
  }

  const handleAddNewClick = (e: React.MouseEvent) => {
    e.stopPropagation()
    setIsOpen(false)
    setIsDialogOpen(true)
  }

  const handleCreateSuccess = (visitor: Visitor) => {
    setDisplayValue(visitor.name)
    setSelectedVisitor(visitor)
    onChange(visitor)
  }

  return (
    <div className="space-y-2">
      {label && (
        <div className="flex items-center gap-1">
          <Label htmlFor="visitor-select">
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
              {selectedVisitor ? (
                <div className="space-y-2">
                  <div className="space-y-1.5 text-sm">
                    <div>
                      <span className="font-medium">Name:</span>{' '}
                      <span className="text-muted-foreground">{selectedVisitor.name}</span>
                    </div>
                    {selectedVisitor.mobile && (
                      <div>
                        <span className="font-medium">Mobile:</span>{' '}
                        <span className="text-muted-foreground">{selectedVisitor.mobile}</span>
                      </div>
                    )}
                    {selectedVisitor.company_name && (
                      <div>
                        <span className="font-medium">Company:</span>{' '}
                        <span className="text-muted-foreground">{selectedVisitor.company_name}</span>
                      </div>
                    )}
                    {selectedVisitor.id_proof_type && (
                      <div>
                        <span className="font-medium">ID Proof Type:</span>{' '}
                        <span className="text-muted-foreground">{selectedVisitor.id_proof_type}</span>
                      </div>
                    )}
                    {selectedVisitor.id_proof_no && (
                      <div>
                        <span className="font-medium">ID Proof Number:</span>{' '}
                        <span className="text-muted-foreground">{selectedVisitor.id_proof_no}</span>
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="text-sm text-muted-foreground">
                  Please select a visitor to view details.
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
            id="visitor-select"
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
                Loading visitors...
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
                    Add New Visitor
                  </Button>
                </div>
                {filteredVisitors.length === 0 ? (
                  <div className="p-4 text-center text-sm text-muted-foreground">
                    {searchTerm ? 'No visitors found' : 'Type to search visitors'}
                  </div>
                ) : (
                  <ul className="py-1">
                    {filteredVisitors.map((visitor) => (
                      <li
                        key={visitor.id}
                        className={cn(
                          'px-3 py-2 cursor-pointer hover:bg-accent hover:text-accent-foreground flex items-center justify-between',
                          value === visitor.id && 'bg-accent'
                        )}
                        onClick={() => handleSelect(visitor)}
                      >
                        <div>
                          <span className="text-sm font-medium">{visitor.name}</span>
                          {visitor.company_name && (
                            <span className="text-xs text-muted-foreground ml-2">
                              ({visitor.company_name})
                            </span>
                          )}
                        </div>
                        {value === visitor.id && <Check className="h-4 w-4 text-primary" />}
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
      <CreateVisitorDialog
        open={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        onSuccess={handleCreateSuccess}
      />
    </div>
  )
}
