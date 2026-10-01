import { AlertCircle, Loader2, Search } from 'lucide-react';
import { useState } from 'react';
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

import { useProductionParameterTypes } from '../../api/productionQC/productionQC.queries';

/**
 * New entry: pick the report, then fill it. Reports are not tied to lines
 * or runs, so this is the only choice to make.
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
  const [search, setSearch] = useState('');

  // Every active report, with its parameter count: one with no parameters
  // cannot be filled.
  const { data: reports = [], isLoading, error } = useProductionParameterTypes(undefined, open);

  const query = search.trim().toLowerCase();
  const shown = query
    ? reports.filter(
        (doc) => doc.name.toLowerCase().includes(query) || doc.code.toLowerCase().includes(query),
      )
    : reports;

  // With only one usable report there is nothing to choose: it is picked
  // until the user picks otherwise.
  const usable = reports.filter((doc) => doc.parameter_count > 0);
  const onlyOption = usable.length === 1 ? usable[0].id : null;
  const chosenId = typeId ?? onlyOption;
  const chosen = reports.find((doc) => doc.id === chosenId) ?? null;
  const canContinue = !!chosen && chosen.parameter_count > 0;

  const handleOpenChange = (next: boolean) => {
    if (!next) {
      setTypeId(null);
      setSearch('');
    }
    onOpenChange(next);
  };

  const handleContinue = () => {
    if (!chosen) return;
    navigate(`/qc/qa-reports/new?type=${chosen.id}`);
    handleOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>Pick a report</DialogTitle>
          <DialogDescription>The form to fill in.</DialogDescription>
        </DialogHeader>

        <DialogBody className="max-h-[60vh] space-y-3">
          {reports.length > 6 && (
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search reports"
                aria-label="Search reports by name or code"
                className="pl-9"
              />
            </div>
          )}

          {isLoading && (
            <div className="flex items-center justify-center gap-2 py-6 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Loading reports…
            </div>
          )}
          {error && !isLoading && (
            <div className="flex items-center gap-2 rounded-md border border-destructive/40 bg-destructive/5 p-3 text-sm text-destructive">
              <AlertCircle className="h-4 w-4" />
              Could not load the reports.
            </div>
          )}
          {!isLoading && !error && reports.length === 0 && (
            <div className="rounded-md border border-dashed py-6 text-center text-sm text-muted-foreground">
              There are no reports yet. Add them under Report Types.
            </div>
          )}
          {!isLoading && reports.length > 0 && shown.length === 0 && (
            <div className="py-6 text-center text-sm text-muted-foreground">
              No report matches “{search.trim()}”.
            </div>
          )}

          {shown.length > 0 && (
            <fieldset className="space-y-2">
              <legend className="sr-only">Report</legend>
              {shown.map((doc) => {
                const empty = doc.parameter_count === 0;
                const inputId = `qc-document-${doc.id}`;
                return (
                  <label
                    key={doc.id}
                    htmlFor={inputId}
                    className={cn(
                      'flex items-center gap-3 rounded-md border p-3 transition-colors',
                      empty ? 'cursor-not-allowed opacity-60' : 'cursor-pointer hover:bg-muted/50',
                      chosenId === doc.id && 'border-primary bg-primary/5',
                    )}
                  >
                    <input
                      id={inputId}
                      type="radio"
                      name="qc-document"
                      value={doc.id}
                      checked={chosenId === doc.id}
                      disabled={empty}
                      onChange={() => setTypeId(doc.id)}
                      className="h-4 w-4"
                    />
                    <span className="min-w-0 flex-1">
                      <span className="block font-medium">{doc.name}</span>
                      <span className="block font-mono text-xs text-muted-foreground">
                        {doc.print_document_id || doc.code}
                      </span>
                    </span>
                    <span className="whitespace-nowrap text-xs text-muted-foreground">
                      {empty
                        ? 'no parameters yet'
                        : `${doc.parameter_count} parameter${doc.parameter_count === 1 ? '' : 's'}`}
                    </span>
                  </label>
                );
              })}
            </fieldset>
          )}
        </DialogBody>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => handleOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleContinue} disabled={!canContinue}>
            Continue
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
