import { ScanLine } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

import { WmsScanButton } from '@/modules/wms/components/WmsScanButton';
import { Button, Input } from '@/shared/components/ui';

interface Props {
  onScan: (barcode: string) => void;
  disabled?: boolean;
  pending?: boolean;
  placeholder?: string;
  /** Auto-focus the input on mount and after each scan (default true). */
  autoFocus?: boolean;
}

/**
 * Scan capture: reuses the WMS scanner (camera + manual). Locks while a scan is
 * in flight to avoid barcode-gun double-fires, and keeps the input focused (mount +
 * after every scan resolves) so a gun/keyboard operator never has to click back in.
 */
export function MpScanPanel({ onScan, disabled, pending, placeholder, autoFocus = true }: Props) {
  const [value, setValue] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  // Keep the box focused: on mount, and whenever a scan finishes (pending → false).
  useEffect(() => {
    if (autoFocus && !disabled && !pending) inputRef.current?.focus();
  }, [autoFocus, disabled, pending]);

  function submit(raw?: string) {
    const code = (raw ?? value).trim();
    if (!code || disabled || pending) return;
    // Light tactile cue for barcode-gun/tablet users (no-op on desktop).
    navigator.vibrate?.(15);
    onScan(code);
    setValue('');
    inputRef.current?.focus();
  }

  return (
    <div className="flex gap-2">
      <Input
        ref={inputRef}
        value={value}
        placeholder={placeholder ?? 'Scan or type an item barcode'}
        disabled={disabled}
        autoFocus={autoFocus}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={(e) => e.key === 'Enter' && submit()}
      />
      <WmsScanButton label="Scan" onScan={(code) => submit(code)} />
      <Button onClick={() => submit()} disabled={disabled || pending}>
        <ScanLine className="mr-2 h-4 w-4" /> Add
      </Button>
    </div>
  );
}
