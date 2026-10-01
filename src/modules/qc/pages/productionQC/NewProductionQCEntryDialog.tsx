import { AlertCircle, ArrowLeft, Loader2, Search } from 'lucide-react';
import { type ReactNode, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import {
  Button,
  Dialog,
  DialogBody,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Input,
} from '@/shared/components/ui';
import { cn } from '@/shared/utils';

import {
  useProductionParameterTypeDefaults,
  useProductionParameterTypes,
} from '../../api/productionQC/productionQC.queries';
import type { ProductionParameterType } from '../../types/productionQC.types';

const NONE = 'none';

/**
 * New entry: pick the report, then — when it has defaults (one per SKU, say) —
 * the default to fill it with, or none for the report's own standards. Reports
 * are not tied to lines or runs, so these are the only choices to make.
 */
export function NewProductionQCEntryDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const navigate = useNavigate();
  const [typeId, setTypeId] = useState<number | null>(null);
  const [step, setStep] = useState<'report' | 'default'>('report');
  const [defaultChoice, setDefaultChoice] = useState<number | typeof NONE | null>(null);
  const [search, setSearch] = useState('');

  // Every active report, with its parameter count: one with no parameters
  // cannot be filled.
  const { data: reports = [], isLoading, error } = useProductionParameterTypes(undefined, open);

  // With only one usable report there is nothing to choose: it is picked
  // until the user picks otherwise.
  const usable = reports.filter((report) => report.parameter_count > 0);
  const onlyOption = usable.length === 1 ? usable[0].id : null;
  const chosenId = typeId ?? onlyOption;
  const chosen = reports.find((report) => report.id === chosenId) ?? null;

  const defaults = useProductionParameterTypeDefaults(chosen?.id ?? null, step === 'default');

  const reset = () => {
    setTypeId(null);
    setStep('report');
    setDefaultChoice(null);
    setSearch('');
  };

  const handleOpenChange = (next: boolean) => {
    if (!next) reset();
    onOpenChange(next);
  };

  const open_ = (report: ProductionParameterType, defaultId: number | null) => {
    navigate(`/qc/qa-reports/new?type=${report.id}${defaultId ? `&default=${defaultId}` : ''}`);
    handleOpenChange(false);
  };

  const handleContinue = () => {
    if (!chosen) return;
    if (step === 'report') {
      if (chosen.default_count > 0) {
        setStep('default');
        setSearch('');
        return;
      }
      open_(chosen, null);
      return;
    }
    if (defaultChoice === null) return;
    open_(chosen, defaultChoice === NONE ? null : defaultChoice);
  };

  const canContinue =
    step === 'report' ? !!chosen && chosen.parameter_count > 0 : defaultChoice !== null;

  const query = search.trim().toLowerCase();
  const shownReports = query
    ? reports.filter(
        (report) =>
          report.name.toLowerCase().includes(query) || report.code.toLowerCase().includes(query),
      )
    : reports;
  const defaultList = defaults.data ?? [];
  const shownDefaults = query
    ? defaultList.filter((item) => item.name.toLowerCase().includes(query))
    : defaultList;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>{step === 'report' ? 'Pick a report' : 'Pick a default'}</DialogTitle>
          <DialogDescription>
            {step === 'report'
              ? 'The form to fill in.'
              : `${chosen?.name}: the default sets its standards and fills in values.`}
          </DialogDescription>
        </DialogHeader>

        <DialogBody className="max-h-[60vh] space-y-3">
          {(step === 'report' ? reports.length : defaultList.length) > 6 && (
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder={step === 'report' ? 'Search reports' : 'Search defaults'}
                aria-label={
                  step === 'report' ? 'Search reports by name or code' : 'Search defaults by name'
                }
                className="pl-9"
              />
            </div>
          )}

          {step === 'report' && (
            <>
              {isLoading && <Loading label="Loading reports…" />}
              {error && !isLoading && <LoadError label="Could not load the reports." />}
              {!isLoading && !error && reports.length === 0 && (
                <div className="rounded-md border border-dashed py-6 text-center text-sm text-muted-foreground">
                  There are no reports yet. Add them under Report Types.
                </div>
              )}
              {!isLoading && reports.length > 0 && shownReports.length === 0 && (
                <NoMatch search={search} />
              )}
              {shownReports.length > 0 && (
                <fieldset className="space-y-2">
                  <legend className="sr-only">Report</legend>
                  {shownReports.map((report) => {
                    const empty = report.parameter_count === 0;
                    const params = `${report.parameter_count} parameter${report.parameter_count === 1 ? '' : 's'}`;
                    const defaultsNote =
                      report.default_count > 0
                        ? ` · ${report.default_count} default${report.default_count === 1 ? '' : 's'}`
                        : '';
                    return (
                      <Choice
                        key={report.id}
                        id={`qc-report-${report.id}`}
                        name="qc-report"
                        checked={chosenId === report.id}
                        disabled={empty}
                        onChange={() => setTypeId(report.id)}
                        title={report.name}
                        subtitle={report.print_document_id || report.code}
                        aside={empty ? 'no parameters yet' : params + defaultsNote}
                      />
                    );
                  })}
                </fieldset>
              )}
            </>
          )}

          {step === 'default' && (
            <>
              {defaults.isLoading && <Loading label="Loading defaults…" />}
              {defaults.error && !defaults.isLoading && (
                <LoadError label="Could not load the defaults." />
              )}
              {!defaults.isLoading && !defaults.error && (
                <fieldset className="space-y-2">
                  <legend className="sr-only">Default</legend>
                  {!query && (
                    <Choice
                      id="qc-default-none"
                      name="qc-default"
                      checked={defaultChoice === NONE}
                      onChange={() => setDefaultChoice(NONE)}
                      title="None"
                      subtitle="The report's own standards, nothing filled in"
                      mono={false}
                    />
                  )}
                  {shownDefaults.map((item) => (
                    <Choice
                      key={item.id}
                      id={`qc-default-${item.id}`}
                      name="qc-default"
                      checked={defaultChoice === item.id}
                      onChange={() => setDefaultChoice(item.id)}
                      title={item.name}
                    />
                  ))}
                  {query && shownDefaults.length === 0 && <NoMatch search={search} />}
                </fieldset>
              )}
            </>
          )}
        </DialogBody>

        <DialogFooter className="gap-2">
          {step === 'default' ? (
            <Button
              variant="outline"
              onClick={() => {
                setStep('report');
                setDefaultChoice(null);
                setSearch('');
              }}
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Change report
            </Button>
          ) : (
            <Button variant="outline" onClick={() => handleOpenChange(false)}>
              Cancel
            </Button>
          )}
          <Button onClick={handleContinue} disabled={!canContinue}>
            Continue
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function Choice({
  id,
  name,
  checked,
  disabled = false,
  onChange,
  title,
  subtitle,
  mono = true,
  aside,
}: {
  id: string;
  name: string;
  checked: boolean;
  disabled?: boolean;
  onChange: () => void;
  title: string;
  subtitle?: string;
  /** A code or form number; plain text otherwise. */
  mono?: boolean;
  aside?: ReactNode;
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
        name={name}
        checked={checked}
        disabled={disabled}
        onChange={onChange}
        className="h-4 w-4"
      />
      <span className="min-w-0 flex-1">
        <span className="block font-medium">{title}</span>
        {subtitle && (
          <span className={cn('block text-xs text-muted-foreground', mono && 'font-mono')}>
            {subtitle}
          </span>
        )}
      </span>
      {aside && <span className="whitespace-nowrap text-xs text-muted-foreground">{aside}</span>}
    </label>
  );
}

function Loading({ label }: { label: string }) {
  return (
    <div className="flex items-center justify-center gap-2 py-6 text-sm text-muted-foreground">
      <Loader2 className="h-4 w-4 animate-spin" />
      {label}
    </div>
  );
}

function LoadError({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-2 rounded-md border border-destructive/40 bg-destructive/5 p-3 text-sm text-destructive">
      <AlertCircle className="h-4 w-4" />
      {label}
    </div>
  );
}

function NoMatch({ search }: { search: string }) {
  return (
    <div className="py-6 text-center text-sm text-muted-foreground">
      Nothing matches “{search.trim()}”.
    </div>
  );
}
