import { AlertCircle, Settings2 } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';

import { GRPO_PERMISSIONS } from '@/config/permissions';
import { usePermission } from '@/core/auth/hooks/usePermission';
import { useAppSelector } from '@/core/store';
import { Button, Input, Label } from '@/shared/components/ui';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/shared/components/ui/dialog';
import { cn, getErrorMessage } from '@/shared/utils';

import { usePOPrintSettings, useUpdatePOPrintSettings } from '../api';
import type { POApproverSource, POPrintSettings } from '../types';

/**
 * Where the printed Purchase Order takes its approver from, for the active
 * company.
 *
 * SAP's own layout does not read the approver off the order — the name is typed
 * into the layout — so the company may want a fixed signatory printed rather
 * than whoever cleared the SAP approval chain. The "Approved" stamp stays SAP's
 * either way. Shown only to those who may change it.
 */
export function POPrintSettingsButton() {
  const { hasPermission } = usePermission();
  const [open, setOpen] = useState(false);

  if (!hasPermission(GRPO_PERMISSIONS.MANAGE_PO_PRINT_SETTINGS)) return null;

  return (
    <>
      <Button variant="outline" size="sm" className="h-8" onClick={() => setOpen(true)}>
        <Settings2 className="mr-1.5 h-3.5 w-3.5" />
        PO print settings
      </Button>
      <POPrintSettingsDialog open={open} onOpenChange={setOpen} />
    </>
  );
}

function POPrintSettingsDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const companyName = useAppSelector((s) => s.auth.currentCompany?.company_name ?? '');
  const { data: settings, isLoading, error } = usePOPrintSettings(open);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Purchase Order print</DialogTitle>
          <DialogDescription>
            The name printed under &ldquo;Approver&rdquo; on every PO
            {companyName ? ` of ${companyName}` : ''}.
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <p className="p-1 text-sm text-muted-foreground">Loading…</p>
        ) : error || !settings ? (
          <p className="p-1 text-sm text-destructive">
            {getErrorMessage(error, 'Could not read the PO print settings.')}
          </p>
        ) : (
          // Keyed on the saved row so a reopen starts from what is stored.
          <SettingsForm
            key={settings.updated_at ?? 'default'}
            settings={settings}
            onDone={() => onOpenChange(false)}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}

function SettingsForm({ settings, onDone }: { settings: POPrintSettings; onDone: () => void }) {
  const [source, setSource] = useState<POApproverSource>(settings.approver_source);
  const [name, setName] = useState(settings.approver_name);
  const [formError, setFormError] = useState<string | null>(null);
  const update = useUpdatePOPrintSettings();

  const submit = () => {
    if (source === 'MANUAL' && !name.trim()) {
      setFormError("Enter the approver's name to print it instead of SAP's.");
      return;
    }
    setFormError(null);
    update.mutate(
      { approver_source: source, approver_name: name.trim() },
      {
        onSuccess: () => {
          toast.success('PO print settings saved');
          onDone();
        },
      },
    );
  };

  const errorMessage =
    formError ?? (update.error ? getErrorMessage(update.error, 'Could not save.') : null);

  return (
    <>
      <div className="space-y-2 p-1">
        <SourceOption
          id="po-approver-sap"
          checked={source === 'SAP'}
          onChange={() => setSource('SAP')}
          disabled={update.isPending}
          title="From SAP"
          subtitle="Whoever approved the order in SAP's approval chain."
        />
        <SourceOption
          id="po-approver-manual"
          checked={source === 'MANUAL'}
          onChange={() => setSource('MANUAL')}
          disabled={update.isPending}
          title="Enter a name"
          subtitle="Printed as typed on every order, whoever approved it in SAP."
        />

        {source === 'MANUAL' && (
          <div className="space-y-1.5 pt-2">
            <Label htmlFor="po-approver-name">
              Approver <span className="text-destructive">*</span>
            </Label>
            <Input
              id="po-approver-name"
              value={name}
              maxLength={120}
              autoFocus
              disabled={update.isPending}
              placeholder="e.g. Vishal/Gagandeep Singh"
              onChange={(event) => setName(event.target.value)}
            />
          </div>
        )}

        {settings.updated_by_name && (
          <p className="pt-1 text-xs text-muted-foreground">
            Last changed by {settings.updated_by_name}
          </p>
        )}

        {errorMessage && (
          <div className="flex items-start gap-2 rounded-md border border-destructive/40 bg-destructive/10 p-3">
            <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0 text-destructive" />
            <p className="text-sm text-destructive">{errorMessage}</p>
          </div>
        )}
      </div>

      <div className="flex justify-end gap-2 p-1">
        <Button variant="outline" onClick={onDone} disabled={update.isPending}>
          Cancel
        </Button>
        <Button onClick={submit} disabled={update.isPending}>
          {update.isPending ? 'Saving…' : 'Save'}
        </Button>
      </div>
    </>
  );
}

function SourceOption({
  id,
  checked,
  onChange,
  disabled,
  title,
  subtitle,
}: {
  id: string;
  checked: boolean;
  onChange: () => void;
  disabled: boolean;
  title: string;
  subtitle: string;
}) {
  return (
    <label
      htmlFor={id}
      className={cn(
        'flex items-center gap-3 rounded-md border p-3 transition-colors',
        disabled ? 'cursor-not-allowed opacity-60' : 'cursor-pointer hover:bg-muted/50',
        checked && 'border-primary bg-primary/5',
      )}
    >
      <input
        id={id}
        type="radio"
        name="po-approver-source"
        checked={checked}
        disabled={disabled}
        onChange={onChange}
        className="h-4 w-4"
      />
      <span className="min-w-0 flex-1">
        <span className="block font-medium">{title}</span>
        <span className="block text-xs text-muted-foreground">{subtitle}</span>
      </span>
    </label>
  );
}
