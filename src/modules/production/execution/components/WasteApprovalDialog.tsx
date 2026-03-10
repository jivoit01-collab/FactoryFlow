import { useState } from 'react';

import {
  Button,
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Textarea,
} from '@/shared/components/ui';

interface WasteApprovalDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  materialName: string;
  wastageQty: string;
  role: string;
  isPending?: boolean;
  onConfirm: (remarks: string) => void;
}

export function WasteApprovalDialog({
  open,
  onOpenChange,
  materialName,
  wastageQty,
  role,
  isPending = false,
  onConfirm,
}: WasteApprovalDialogProps) {
  const [remarks, setRemarks] = useState('');

  const handleConfirm = () => {
    onConfirm(remarks);
    setRemarks('');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Approve Waste Log?</DialogTitle>
        </DialogHeader>

        <div className="space-y-3">
          <p className="text-sm text-muted-foreground">
            Approve wastage of <strong>{wastageQty}</strong> of{' '}
            <strong>{materialName}</strong> as <strong>{role}</strong>?
          </p>

          <div className="space-y-2">
            <label className="text-sm font-medium">Remarks (optional)</label>
            <Textarea
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
              placeholder="Add any notes..."
              rows={3}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleConfirm} disabled={isPending}>
            {isPending ? 'Approving...' : 'Approve'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
