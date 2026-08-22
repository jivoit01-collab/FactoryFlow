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
  Switch,
  Textarea,
} from '@/shared/components/ui';
import { getErrorMessage } from '@/shared/utils';

import type { SapReportDetail, UpdateSapReportPayload } from '../api';
import { useUpdateSapReport } from '../api';

interface Props {
  report: SapReportDetail;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/**
 * The admin side of a report: what it is called here and whether it is offered.
 *
 * SAP has nowhere to record any of this — a saved query is a name and a blob of
 * SQL — so it lives in our catalogue and survives every sync.
 *
 * Of a filter, only whether it is **required** is settable here. Its label and
 * type are inferred from the SQL, and correcting one of those is a rare, careful
 * act that belongs in the Django admin. Requiredness is different: it is a
 * judgement about how people should use the report, and the person who runs it
 * is the one who knows.
 */
export function ReportSetupDialog({ report, open, onOpenChange }: Props) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] max-w-[calc(100vw-2rem)] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Report setup</DialogTitle>
          <DialogDescription>
            Only what this app owns. The SAP query name and its SQL come from SAP and cannot be
            edited here.
          </DialogDescription>
        </DialogHeader>

        {/* The form lives in its own component so that closing the dialog
            unmounts it: reopening after a cancel then shows what is saved
            rather than the edits that were abandoned. */}
        <SetupForm report={report} onDone={() => onOpenChange(false)} />
      </DialogContent>
    </Dialog>
  );
}

function SetupForm({ report, onDone }: { report: SapReportDetail; onDone: () => void }) {
  const update = useUpdateSapReport(report.slug);

  const [displayName, setDisplayName] = useState(report.display_name);
  const [description, setDescription] = useState(report.description);
  const [isEnabled, setIsEnabled] = useState(report.is_enabled);
  const [rowLimit, setRowLimit] = useState(report.row_limit ? String(report.row_limit) : '');
  const [required, setRequired] = useState<Record<number, boolean>>(() =>
    Object.fromEntries(
      report.parameters.map((parameter) => [parameter.position, parameter.is_required]),
    ),
  );

  function handleSave() {
    const payload: UpdateSapReportPayload = {
      display_name: displayName,
      description,
      is_enabled: isEnabled,
      row_limit: rowLimit.trim() ? Number(rowLimit) : null,
      parameters: report.parameters.map((parameter) => ({
        position: parameter.position,
        is_required: required[parameter.position],
      })),
    };
    update.mutate(payload, {
      onSuccess: () => {
        toast.success('Report setup saved.');
        onDone();
      },
      onError: (error) => toast.error(getErrorMessage(error, 'Could not save the setup.')),
    });
  }

  return (
    <>
      <div className="space-y-5">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="setup-display-name">Shown as</Label>
            <Input
              id="setup-display-name"
              value={displayName}
              placeholder={report.sap_name}
              onChange={(event) => setDisplayName(event.target.value)}
            />
            <p className="text-xs text-muted-foreground">Blank falls back to the SAP name.</p>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="setup-row-limit">Row limit</Label>
            <Input
              id="setup-row-limit"
              type="number"
              min={1}
              value={rowLimit}
              placeholder={String(report.effective_row_limit)}
              onChange={(event) => setRowLimit(event.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              Blank uses the module default of {report.effective_row_limit.toLocaleString()}.
            </p>
          </div>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="setup-description">Description</Label>
          <Textarea
            id="setup-description"
            rows={2}
            value={description}
            placeholder="What question does this report answer?"
            onChange={(event) => setDescription(event.target.value)}
          />
        </div>

        <div className="flex items-center gap-2">
          <Switch id="setup-enabled" checked={isEnabled} onChange={setIsEnabled} />
          <Label htmlFor="setup-enabled">Available to users</Label>
        </div>

        {report.parameters.length > 0 && (
          <div className="space-y-2">
            <p className="text-sm font-medium">Filters</p>
            <p className="text-xs text-muted-foreground">
              Names and types come from the SAP query. Turn a filter off here to let people run
              the report without it.
            </p>
            <div className="divide-y rounded-md border">
              {report.parameters.map((parameter) => (
                <div
                  key={parameter.position}
                  className="flex items-center justify-between gap-3 px-3 py-2"
                >
                  <Label
                    htmlFor={`setup-required-${parameter.position}`}
                    className="text-sm font-normal"
                  >
                    {parameter.label}
                  </Label>
                  <div className="flex shrink-0 items-center gap-2">
                    <span className="text-xs text-muted-foreground">
                      {required[parameter.position] ? 'Required' : 'Optional'}
                    </span>
                    <Switch
                      id={`setup-required-${parameter.position}`}
                      checked={required[parameter.position]}
                      onChange={(checked) =>
                        setRequired((current) => ({
                          ...current,
                          [parameter.position]: checked,
                        }))
                      }
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <DialogFooter>
        <Button variant="outline" onClick={onDone}>
          Cancel
        </Button>
        <Button onClick={handleSave} disabled={update.isPending}>
          {update.isPending ? 'Saving…' : 'Save setup'}
        </Button>
      </DialogFooter>
    </>
  );
}
