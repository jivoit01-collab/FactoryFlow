import { useState, useRef, useEffect, useCallback, type ReactNode } from 'react'
import { ChevronDown, Check, Loader2, Plus, HelpCircle } from 'lucide-react'
import {
  Input,
  Label,
  Button,
  Popover,
  PopoverTrigger,
  PopoverContent,
} from '@/shared/components/ui'
import { cn } from '@/shared/utils'
import { useDebounce } from '@/shared/hooks'

type ItemKey = string | number

export interface SearchableSelectProps<TItem> {
  // Value & data
  value?: string
  items: TItem[]
  isLoading: boolean
  // Config
  placeholder?: string
  disabled?: boolean
  error?: string
  label?: string
  required?: boolean
  inputId: string
  inputClassName?: string
  /** Text to display when value exists but items haven't loaded yet (edit mode) */
  defaultDisplayText?: string
  // Item identity & display
  getItemKey: (item: TItem) => ItemKey
  getItemLabel: (item: TItem) => string
  /** Custom item rendering in dropdown list */
  renderItem?: (item: TItem, isSelected: boolean) => ReactNode
  /** Custom filter function. Default: match by getItemLabel */
  filterFn?: (item: TItem, search: string) => boolean
  // Popover content (optional render prop — if omitted, no help icon shown)
  renderPopoverContent?: (selectedKey: ItemKey | null) => ReactNode
  // Text config
  loadingText: string
  emptyText: string
  notFoundText: string
  addNewLabel?: string
  // Callbacks
  onItemSelect: (item: TItem) => void
  onClear: () => void
  onOpenChange?: (isOpen: boolean) => void
  onSelectedKeyChange?: (key: ItemKey | null) => void
  // Create dialog (optional render prop)
  renderCreateDialog?: (
    open: boolean,
    onOpenChange: (open: boolean) => void,
    updateSelection: (key: ItemKey, label: string) => void,
  ) => ReactNode
}

export function SearchableSelect<TItem>({
  value,
  items,
  isLoading,
  placeholder = 'Select...',
  disabled = false,
  error,
  label,
  required = false,
  inputId,
  inputClassName,
  defaultDisplayText,
  getItemKey,
  getItemLabel,
  renderItem,
  filterFn,
  renderPopoverContent,
  loadingText,
  emptyText,
  notFoundText,
  addNewLabel,
  onItemSelect,
  onClear,
  onOpenChange,
  onSelectedKeyChange,
  renderCreateDialog,
}: SearchableSelectProps<TItem>) {
  const [isOpen, setIsOpen] = useState(false)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [searchTerm, setSearchTerm] = useState(defaultDisplayText || '')
  const [selectedKey, setSelectedKey] = useState<ItemKey | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const prevValueRef = useRef(value)
  const prevDefaultDisplayTextRef = useRef(defaultDisplayText)

  const debouncedSearch = useDebounce(searchTerm, 100)

  const defaultFilter = useCallback(
    (item: TItem, search: string) =>
      getItemLabel(item).toLowerCase().includes(search.toLowerCase()),
    [getItemLabel]
  )
  const activeFilter = filterFn || defaultFilter

  const filteredItems = items.filter((item) => activeFilter(item, debouncedSearch))

  // Wrappers to notify parent of state changes
  const updateIsOpen = useCallback((open: boolean) => {
    setIsOpen(open)
    onOpenChange?.(open)
  }, [onOpenChange])

  const updateSelectedKey = useCallback((key: ItemKey | null) => {
    setSelectedKey(key)
    onSelectedKeyChange?.(key)
  }, [onSelectedKeyChange])

  // Sync defaultDisplayText when it changes from parent (edit mode)
  useEffect(() => {
    if (defaultDisplayText !== prevDefaultDisplayTextRef.current) {
      prevDefaultDisplayTextRef.current = defaultDisplayText
      if (defaultDisplayText) {
        // eslint-disable-next-line react-hooks/set-state-in-effect -- Syncing state with props
        setSearchTerm(defaultDisplayText)
      }
    }
  }, [defaultDisplayText])

  // Sync search term with value prop
  const syncWithValue = useCallback(() => {
    if (disabled && value) {
      setSearchTerm(value)
      return
    }

    if (value && items.length > 0) {
      const item = items.find(
        (i) => getItemLabel(i) === value || String(getItemKey(i)) === value
      )
      if (item) {
        updateSelectedKey(getItemKey(item))
        setSearchTerm(getItemLabel(item))
      }
    } else if (value !== prevValueRef.current && !value) {
      prevValueRef.current = value
      updateSelectedKey(null)
      setSearchTerm('')
    }
  }, [value, items, disabled, getItemLabel, getItemKey, updateSelectedKey])

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- Syncing state with props is a valid pattern
    syncWithValue()
    prevValueRef.current = value
  }, [syncWithValue, value])

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        updateIsOpen(false)
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isOpen, updateIsOpen])

  const handleSelect = (item: TItem) => {
    updateSelectedKey(getItemKey(item))
    setSearchTerm(getItemLabel(item))
    onItemSelect(item)
    updateIsOpen(false)
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value)
    updateIsOpen(true)
    if (!e.target.value) {
      onClear()
      updateSelectedKey(null)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Escape') {
      updateIsOpen(false)
    } else if (e.key === 'Enter' && filteredItems.length === 1) {
      handleSelect(filteredItems[0])
    }
  }

  const handleAddNewClick = (e: React.MouseEvent) => {
    e.stopPropagation()
    updateIsOpen(false)
    setIsDialogOpen(true)
  }

  const updateSelection = useCallback((key: ItemKey, newLabel: string) => {
    updateSelectedKey(key)
    setSearchTerm(newLabel)
    updateIsOpen(false)
  }, [updateSelectedKey, updateIsOpen])

  const hasCreateDialog = addNewLabel && renderCreateDialog

  return (
    <div className="space-y-2">
      {label && (
        renderPopoverContent ? (
          <div className="flex items-center gap-1">
            <Label htmlFor={inputId}>
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
                {renderPopoverContent(selectedKey)}
              </PopoverContent>
            </Popover>
          </div>
        ) : (
          <Label htmlFor={inputId}>
            {label} {required && <span className="text-destructive">*</span>}
          </Label>
        )
      )}
      <div ref={containerRef} className="relative">
        <div className="relative">
          <Input
            ref={inputRef}
            id={inputId}
            type="text"
            value={searchTerm}
            onChange={handleInputChange}
            onFocus={() => updateIsOpen(true)}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            disabled={disabled || isLoading}
            className={cn(
              'pr-10 cursor-text',
              inputClassName,
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
                {loadingText}
              </div>
            ) : (
              <>
                {hasCreateDialog && (
                  <div className="px-3 py-2 border-b">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="w-full justify-start text-sm"
                      onClick={handleAddNewClick}
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      {addNewLabel}
                    </Button>
                  </div>
                )}
                {filteredItems.length === 0 ? (
                  <div className="p-4 text-center text-sm text-muted-foreground">
                    {searchTerm ? notFoundText : emptyText}
                  </div>
                ) : (
                  <ul className="py-1">
                    {filteredItems.map((item) => {
                      const key = getItemKey(item)
                      const isSelected = selectedKey === key
                      return (
                        <li
                          key={key}
                          className={cn(
                            'px-3 py-2 cursor-pointer hover:bg-accent hover:text-accent-foreground flex items-center justify-between',
                            isSelected && 'bg-accent'
                          )}
                          onClick={() => handleSelect(item)}
                        >
                          {renderItem ? (
                            renderItem(item, isSelected)
                          ) : (
                            <span className="text-sm">{getItemLabel(item)}</span>
                          )}
                          {isSelected && <Check className="h-4 w-4 text-primary" />}
                        </li>
                      )
                    })}
                  </ul>
                )}
              </>
            )}
          </div>
        )}
      </div>
      {error && <p className="text-sm text-destructive">{error}</p>}
      {hasCreateDialog && renderCreateDialog(isDialogOpen, setIsDialogOpen, updateSelection)}
    </div>
  )
}
