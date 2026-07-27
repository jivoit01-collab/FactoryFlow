import { CalendarClock, Loader2, X } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';

import {
  Button,
  Card,
  CardContent,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Input,
  Label,
} from '@/shared/components/ui';

import { useBulkSetDispatchDate } from '../api';

interface DispatchPlanBulkDateBarProps {
  /** Doc entries currently ticked in the table. */
  selectedDocEntries: number[];
  /** How many of the selected bills already have a dispatch date (overwrite warning). */
  overwriteCount: number;
  /** Clear the selection (after a successful apply, or on "Clear"). */
  onClear: () => void;
}

/**
 * Contextual bulk-action bar for the Dispatch Plans page — appears once one or
 * more bills are ticked. Planners pick a single date and apply it to every
 * selected bill in one atomic request, after a confirmation that spells out how
 * many existing dates get overwritten.
 */
export function DispatchPlanBulkDateBar({
  selectedDocEntries,
  overwriteCount,
  onClear,
}: DispatchPlanBulkDateBarProps) {
  const [date, setDate] = useState('');
  const [confirmOpen, setConfirmOpen] = useState(false);
  const bulkMutation = useBulkSetDispatchDate();

  const count = selectedDocEntries.length;
  if (count === 0) return null;

  function handleApply() {
    bulkMutation.mutate(
      { doc_entries: selectedDocEntries, dispatch_date: date },
      {
        onSuccess: (r) => {
          toast.success(`Dispatch date set on ${r.updated} bill(s)`);
          setConfirmOpen(false);
          setDate('');
          onClear();
        },
        onError: () => toast.error('Could not set the dispatch date'),
      },
    );
  }

  return (
    <Card className="border-primary/40 bg-primary/5">
      <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="flex flex-wrap items-end gap-4">
          <div className="space-y-1.5">
            <span className="text-sm font-medium">
              {count} bill{count === 1 ? '' : 's'} selected
            </span>
            <div className="flex items-end gap-2">
              <div className="space-y-1">
                <Label htmlFor="bulk-dispatch-date" className="text-xs text-muted-foreground">
                  Dispatch date
                </Label>
                <Input
                  id="bulk-dispatch-date"
                  type="date"
                  value={date}
                  onChange={(event) => setDate(event.target.value)}
                  className="w-44"
                />
              </div>
              <Button type="button" onClick={() => setConfirmOpen(true)} disabled={!date}>
                <CalendarClock className="mr-2 h-4 w-4" />
                Apply date
              </Button>
            </div>
          </div>
        </div>

        <Button type="button" variant="ghost" size="sm" onClick={onClear}>
          <X className="mr-1.5 h-4 w-4" />
          Clear selection
        </Button>
      </CardContent>

      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Set dispatch date</DialogTitle>
            <DialogDescription>
              Set the dispatch date to <span className="font-medium text-foreground">{date}</span>{' '}
              on {count} selected bill{count === 1 ? '' : 's'}.
              {overwriteCount > 0 && (
                <>
                  {' '}
                  This overwrites the existing date on{' '}
                  <span className="font-medium text-foreground">{overwriteCount}</span> of them.
                </>
              )}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setConfirmOpen(false)}
              disabled={bulkMutation.isPending}
            >
              Cancel
            </Button>
            <Button type="button" onClick={handleApply} disabled={bulkMutation.isPending}>
              {bulkMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Confirm
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
