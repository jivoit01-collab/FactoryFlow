import { Check, ChevronDown, Loader2 } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

import { Input, Label } from '@/shared/components/ui';
import { cn } from '@/shared/utils';

import type { Gate } from '../../api/personGateIn/personGateIn.api';
import { useGates } from '../../api/personGateIn/personGateIn.queries';

interface GateSelectProps {
  value?: number | null;
  onChange: (gate: Gate | null) => void;
  placeholder?: string;
  disabled?: boolean;
  error?: string;
  label?: string;
  required?: boolean;
}

export function GateSelect({
  value,
  onChange,
  placeholder = 'Select gate',
  disabled = false,
  error,
  label,
  required = false,
}: GateSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [displayValue, setDisplayValue] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Fetch gates when dropdown is open (lazy loading)
  const { data: gates = [], isLoading } = useGates(isOpen && !disabled);

  // Filter only active gates
  const activeGates = gates.filter((g) => g.is_active);

  // Update display value when value changes or gates are loaded
  useEffect(() => {
    if (value && gates.length > 0) {
      const gate = gates.find((g) => g.id === value);
      if (gate) {
        setDisplayValue(gate.location ? `${gate.name} (${gate.location})` : gate.name);
      }
    } else if (!value) {
      setDisplayValue('');
    }
  }, [value, gates]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isOpen]);

  const handleSelect = (gate: Gate) => {
    setDisplayValue(gate.location ? `${gate.name} (${gate.location})` : gate.name);
    onChange(gate);
    setIsOpen(false);
  };

  const handleInputClick = () => {
    if (!disabled) {
      setIsOpen(!isOpen);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Escape') {
      setIsOpen(false);
    } else if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      setIsOpen(!isOpen);
    }
  };

  return (
    <div className="space-y-2">
      {label && (
        <Label htmlFor="gate-select">
          {label} {required && <span className="text-destructive">*</span>}
        </Label>
      )}
      <div ref={containerRef} className="relative">
        <div className="relative">
          <Input
            ref={inputRef}
            id="gate-select"
            type="text"
            value={displayValue}
            onClick={handleInputClick}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            disabled={disabled}
            readOnly
            className={cn(
              'pr-10 cursor-pointer',
              error && 'border-destructive focus-visible:ring-destructive',
            )}
          />
          <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
            {isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
            ) : (
              <ChevronDown
                className={cn(
                  'h-4 w-4 text-muted-foreground transition-transform',
                  isOpen && 'rotate-180',
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
                Loading gates...
              </div>
            ) : activeGates.length === 0 ? (
              <div className="p-4 text-center text-sm text-muted-foreground">
                No gates available
              </div>
            ) : (
              <ul className="py-1">
                {activeGates.map((gate) => (
                  <li
                    key={gate.id}
                    className={cn(
                      'px-3 py-2 cursor-pointer hover:bg-accent hover:text-accent-foreground flex items-center justify-between',
                      value === gate.id && 'bg-accent',
                    )}
                    onClick={() => handleSelect(gate)}
                  >
                    <div>
                      <span className="text-sm font-medium">{gate.name}</span>
                      {gate.location && (
                        <span className="text-xs text-muted-foreground ml-2">
                          ({gate.location})
                        </span>
                      )}
                    </div>
                    {value === gate.id && <Check className="h-4 w-4 text-primary" />}
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </div>
      {error && <p className="text-sm text-destructive">{error}</p>}
    </div>
  );
}
