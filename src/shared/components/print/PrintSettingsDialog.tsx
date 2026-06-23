import { Printer } from 'lucide-react';

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

import type {
  InspectionReportPrintSettings,
  InspectionReportSectionAvailability,
} from './printSettings';

interface PrintSettingsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  settings: InspectionReportPrintSettings;
  onSettingsChange: (settings: InspectionReportPrintSettings) => void;
  availability: InspectionReportSectionAvailability;
  onConfirm: () => void;
}

interface ToggleRow {
  key: keyof InspectionReportPrintSettings;
  label: string;
  available: boolean;
}

export function PrintSettingsDialog({
  open,
  onOpenChange,
  settings,
  onSettingsChange,
  availability,
  onConfirm,
}: PrintSettingsDialogProps) {
  const rows: ToggleRow[] = [
    { key: 'printCOA', label: 'Certificate of Analysis (COA)', available: availability.hasCOA },
    { key: 'printCOQ', label: 'Certificate of Quantity (COQ)', available: availability.hasCOQ },
    { key: 'printQCAttachments', label: 'QC Attachments', available: availability.hasQCAttachments },
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Print settings</DialogTitle>
          <DialogDescription>
            Inspection details, QC parameters and approval details are always included. Choose which
            attachments to add to the printout.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 py-2">
          {rows.map((row) => (
            <div key={row.key} className="flex items-center gap-3">
              <Checkbox
                id={`print-setting-${row.key}`}
                checked={settings[row.key]}
                disabled={!row.available}
                onCheckedChange={(checked) =>
                  onSettingsChange({ ...settings, [row.key]: checked })
                }
              />
              <Label
                htmlFor={`print-setting-${row.key}`}
                className={
                  row.available
                    ? 'cursor-pointer'
                    : 'cursor-not-allowed text-muted-foreground'
                }
              >
                {row.label}
                {!row.available && (
                  <span className="ml-2 text-xs text-muted-foreground">(none attached)</span>
                )}
              </Label>
            </div>
          ))}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={onConfirm}>
            <Printer className="mr-2 h-4 w-4" />
            Print
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
