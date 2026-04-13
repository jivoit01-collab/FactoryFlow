import { Check, Pencil } from 'lucide-react';
import { useState } from 'react';

import { Button, Input } from '@/shared/components/ui';

interface SignatureBlockProps {
  label: string;
  sign: string;
  signedAt: string | null;
  editable?: boolean;
  onSign?: (sign: string) => void;
}

export function SignatureBlock({ label, sign, signedAt, editable = false, onSign }: SignatureBlockProps) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState('');

  const handleSave = () => {
    const trimmed = value.trim();
    if (trimmed && onSign) {
      onSign(trimmed);
      setEditing(false);
      setValue('');
    }
  };

  return (
    <div className="border rounded-lg p-3">
      <p className="text-xs text-muted-foreground mb-1">{label}</p>
      {sign ? (
        <>
          <p className="font-medium text-sm">{sign}</p>
          {signedAt && (
            <p className="text-xs text-muted-foreground mt-0.5">
              {new Date(signedAt).toLocaleString()}
            </p>
          )}
        </>
      ) : editing ? (
        <div className="flex items-center gap-2">
          <Input
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder="Name / Designation"
            className="h-8 text-sm"
            onKeyDown={(e) => e.key === 'Enter' && handleSave()}
            autoFocus
          />
          <Button size="sm" variant="ghost" onClick={handleSave} disabled={!value.trim()}>
            <Check className="h-4 w-4" />
          </Button>
        </div>
      ) : editable ? (
        <button
          onClick={() => setEditing(true)}
          className="flex items-center gap-1 text-sm text-primary hover:underline cursor-pointer"
        >
          <Pencil className="h-3 w-3" /> Sign
        </button>
      ) : (
        <p className="text-sm text-muted-foreground italic">Pending</p>
      )}
    </div>
  );
}
