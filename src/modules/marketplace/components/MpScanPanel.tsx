import { ScanLine } from 'lucide-react';
import { useRef, useState } from 'react';

import { WmsScanButton } from '@/modules/wms/components/WmsScanButton';
import { Button, Input } from '@/shared/components/ui';

interface Props {
  onScan: (barcode: string) => void;
  disabled?: boolean;
  pending?: boolean;
  placeholder?: string;
}

/**
 * Scan capture: reuses the WMS scanner (camera + manual). Locks while a scan is
 * in flight to avoid barcode-gun double-fires, and re-focuses for the next scan.
 */
export function MpScanPanel({ onScan, disabled, pending, placeholder }: Props) {
  const [value, setValue] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  function submit(raw?: string) {
    const code = (raw ?? value).trim();
    if (!code || disabled || pending) return;
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
