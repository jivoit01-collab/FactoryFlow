import { Download } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';

import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Input,
  Label,
} from '@/shared/components/ui';

import { attendanceApi } from '../../api/attendance/attendance.api';

interface ExportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Default date (YYYY-MM-DD) to seed both from and to. */
  defaultDate: string;
}

export function ExportDialog({ open, onOpenChange, defaultDate }: ExportDialogProps) {
  const [dateFrom, setDateFrom] = useState(defaultDate);
  const [dateTo, setDateTo] = useState(defaultDate);
  const [error, setError] = useState<string | null>(null);
  const [isExporting, setIsExporting] = useState(false);

  // Re-seed the range whenever the dialog is opened.
  const handleOpenChange = (next: boolean) => {
    if (next) {
      setDateFrom(defaultDate);
      setDateTo(defaultDate);
      setError(null);
    }
    onOpenChange(next);
  };

  const handleExport = async () => {
    if (!dateFrom || !dateTo) {
      setError('Select both a from and to date.');
      return;
    }
    if (dateFrom > dateTo) {
      setError('The "from" date must be on or before the "to" date.');
      return;
    }
    setError(null);
    setIsExporting(true);
    try {
      const blob = await attendanceApi.exportRecords({ date_from: dateFrom, date_to: dateTo });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `attendance_${dateFrom}_to_${dateTo}.xlsx`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success('Export downloaded');
      onOpenChange(false);
    } catch {
      toast.error('Could not export attendance');
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[440px]">
        <DialogHeader>
          <DialogTitle>Export attendance</DialogTitle>
          <DialogDescription>
            Download an Excel sheet of attendance marks for a date range.
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="export-from">From</Label>
            <Input
              id="export-from"
              type="date"
              value={dateFrom}
              max={dateTo || undefined}
              onChange={(e) => {
                setDateFrom(e.target.value);
                setError(null);
              }}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="export-to">To</Label>
            <Input
              id="export-to"
              type="date"
              value={dateTo}
              min={dateFrom || undefined}
              onChange={(e) => {
                setDateTo(e.target.value);
                setError(null);
              }}
            />
          </div>
        </div>
        {error && <p className="text-sm text-destructive">{error}</p>}

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isExporting}
          >
            Cancel
          </Button>
          <Button type="button" onClick={handleExport} disabled={isExporting}>
            <Download className="h-4 w-4 mr-2" />
            {isExporting ? 'Exporting...' : 'Export'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
