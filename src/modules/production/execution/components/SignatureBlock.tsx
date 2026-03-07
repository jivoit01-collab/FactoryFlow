import { CheckCircle2 } from 'lucide-react';

import { Input, Label } from '@/shared/components/ui';

interface SignatureBlockProps {
  label: string;
  value: string;
  disabled?: boolean;
  onChange: (value: string) => void;
}

export function SignatureBlock({ label, value, disabled = false, onChange }: SignatureBlockProps) {
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <Input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        placeholder="Enter name to sign"
      />
      {value && (
        <p className="text-xs text-green-600 flex items-center gap-1">
          <CheckCircle2 className="h-3 w-3" />
          Signed
        </p>
      )}
    </div>
  );
}
