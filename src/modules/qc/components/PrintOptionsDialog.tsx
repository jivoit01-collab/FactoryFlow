import { Printer } from 'lucide-react';
import { useState } from 'react';

import {
  Button,
  Checkbox,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Label,
} from '@/shared/components/ui';

import type { PrintSections } from './InspectionReportPrint';

interface PrintOptionsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Whether the inspection actually has a COA attachment to print. */
  hasCoa: boolean;
  /** Whether the inspection actually has a COQ attachment to print. */
  hasCoq: boolean;
  /** Whether the inspection actually has QC-uploaded attachments to print. */
  hasQcAttachments: boolean;
  /** Called with the chosen sections when the user confirms. */
  onConfirm: (sections: PrintSections) => void;
}

type SectionRow = {
  key: keyof PrintSections;
  label: string;
  available: boolean;
  unavailableHint: string;
};

/**
 * Lets the user pick which sections of the inspection printout to send to the
 * browser print dialog. Attachment rows (COA/COQ/QC) are disabled (and
 * unchecked) when nothing of that type is attached, so the user can't print an
 * empty section.
 */
export function PrintOptionsDialog({
  open,
  onOpenChange,
  hasCoa,
  hasCoq,
  hasQcAttachments,
  onConfirm,
}: PrintOptionsDialogProps) {
  const defaultSections = (): PrintSections => ({
    report: true,
    coa: hasCoa,
    coq: hasCoq,
    qcAttachments: hasQcAttachments,
  });

  const [sections, setSections] = useState<PrintSections>(defaultSections);

  // Reset to sensible defaults whenever the dialog transitions to open
  // (availability can change between inspections that share this instance).
  // Done during render per React's "adjust state when a prop changes" guidance,
  // which avoids an extra render cycle and the set-state-in-effect lint rule.
  const [wasOpen, setWasOpen] = useState(open);
  if (open !== wasOpen) {
    setWasOpen(open);
    if (open) {
      setSections(defaultSections());
    }
  }

  const rows: SectionRow[] = [
    { key: 'report', label: 'Inspection report', available: true, unavailableHint: '' },
    {
      key: 'coa',
      label: 'Certificate of Analysis (COA)',
      available: hasCoa,
      unavailableHint: 'No COA attached',
    },
    {
      key: 'coq',
      label: 'Certificate of Quantity (COQ)',
      available: hasCoq,
      unavailableHint: 'No COQ attached',
    },
    {
      key: 'qcAttachments',
      label: 'QC attachments',
      available: hasQcAttachments,
      unavailableHint: 'No QC attachments',
    },
  ];

  const nothingSelected = !Object.values(sections).some(Boolean);

  const handleConfirm = () => {
    if (nothingSelected) return;
    onConfirm(sections);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Print options</DialogTitle>
          <DialogDescription>
            Choose what to include, then continue to the browser print dialog.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 py-2">
          {rows.map((row) => (
            <div key={row.key} className="flex items-center gap-3">
              <Checkbox
                id={`print-section-${row.key}`}
                checked={sections[row.key]}
                disabled={!row.available}
                onCheckedChange={(checked) =>
                  setSections((prev) => ({ ...prev, [row.key]: checked }))
                }
              />
              <Label
                htmlFor={`print-section-${row.key}`}
                className={row.available ? 'cursor-pointer' : 'cursor-not-allowed opacity-50'}
              >
                {row.label}
                {!row.available && (
                  <span className="ml-2 text-xs text-muted-foreground">
                    ({row.unavailableHint})
                  </span>
                )}
              </Label>
            </div>
          ))}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleConfirm} disabled={nothingSelected}>
            <Printer className="h-4 w-4 mr-2" />
            Print
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
