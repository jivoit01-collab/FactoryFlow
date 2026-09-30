import { AlertCircle, ArrowLeft, Factory, Info, Loader2 } from 'lucide-react';
import { useMemo, useState } from 'react';
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
} from '@/shared/components/ui';
import { cn } from '@/shared/utils';

import {
  useProductionParameterTypes,
  useProductionQCRunningLines,
} from '../../api/productionQC/productionQC.queries';
import type { ProductionRunningLine } from '../../types/productionQC.types';
import { LineRunningBadge } from './ProductionQCStatusBadge';

interface TypeOption {
  id: number;
  code: string;
  name: string;
  /** null while the type list is still loading. */
  parameterCount: number | null;
}

/**
 * New entry, in two steps: the running line, then the parameter type. A product
 * linked to types is offered only those; an unlinked one is offered every type,
 * and the one picked is linked to it when the entry is saved.
 */
export function NewProductionQCEntryDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const navigate = useNavigate();
  const [runId, setRunId] = useState<number | null>(null);
  const [typeId, setTypeId] = useState<number | null>(null);

  const {
    data: lines = [],
    isLoading: linesLoading,
    error: linesError,
    refetch: refetchLines,
  } = useProductionQCRunningLines(open);
  // Every active type, with its parameter count: the linked types arrive as bare
  // references, and a type with no parameters cannot be checked against.
  const {
    data: allTypes = [],
    isLoading: typesLoading,
    error: typesError,
  } = useProductionParameterTypes(undefined, open);

  const line = lines.find((candidate) => candidate.run_id === runId) ?? null;
  const isLinked = !!line && line.linked_parameter_types.length > 0;

  const typeOptions = useMemo<TypeOption[]>(() => {
    if (!line) return [];
    const counts = new Map(allTypes.map((type) => [type.id, type.parameter_count]));
    if (line.linked_parameter_types.length > 0) {
      return line.linked_parameter_types.map((type) => ({
        ...type,
        // Unknown until the list loads; if it cannot load, the save still checks.
        parameterCount: typesLoading || typesError ? null : (counts.get(type.id) ?? 0),
      }));
    }
    return allTypes.map((type) => ({
      id: type.id,
      code: type.code,
      name: type.name,
      parameterCount: type.parameter_count,
    }));
  }, [line, allTypes, typesLoading, typesError]);

  // With only one type on offer — linked, or the only one there is — there is
  // nothing to choose: it is picked until the user picks otherwise.
  const usable = typeOptions.filter((type) => (type.parameterCount ?? 0) > 0);
  const onlyOption = usable.length === 1 ? usable[0].id : null;
  const chosenTypeId = typeId ?? onlyOption;
  // Links are made on the SAP item code; a run without one cannot be linked.
  const canLink = !!line?.item_code;

  const reset = () => {
    setRunId(null);
    setTypeId(null);
  };

  const handleOpenChange = (next: boolean) => {
    if (!next) reset();
    onOpenChange(next);
  };

  const pickLine = (picked: ProductionRunningLine) => {
    setRunId(picked.run_id);
    setTypeId(null);
  };

  const selectedType = typeOptions.find((type) => type.id === chosenTypeId) ?? null;
  const canContinue =
    !!line &&
    !!selectedType &&
    (selectedType.parameterCount === null ? !!typesError : selectedType.parameterCount > 0);

  const handleContinue = () => {
    if (!line || !selectedType) return;
    navigate(`/qc/production/new?run=${line.run_id}&type=${selectedType.id}`);
    handleOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>{line ? 'Pick the parameter type' : 'Pick a running line'}</DialogTitle>
          <DialogDescription>
            {line
              ? 'The parameters of this type are checked against the product on the line.'
              : 'A check is made against the run on the line right now.'}
          </DialogDescription>
        </DialogHeader>

        <DialogBody className="max-h-[60vh] space-y-3">
          {!line && (
            <>
              {linesLoading && (
                <div className="flex items-center justify-center gap-2 py-10 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Loading running lines…
                </div>
              )}
              {linesError && !linesLoading && (
                <div className="flex items-center justify-between gap-3 rounded-md border border-destructive/40 bg-destructive/5 p-3 text-sm text-destructive">
                  <span className="flex items-center gap-2">
                    <AlertCircle className="h-4 w-4" />
                    Could not load the running lines.
                  </span>
                  <Button variant="outline" size="sm" onClick={() => refetchLines()}>
                    Retry
                  </Button>
                </div>
              )}
              {!linesLoading && !linesError && lines.length === 0 && (
                <div className="flex flex-col items-center gap-2 rounded-md border border-dashed py-10 text-center text-sm text-muted-foreground">
                  <Factory className="h-8 w-8" />
                  No line is running right now
                </div>
              )}
              {!linesLoading &&
                lines.map((candidate) => (
                  <button
                    key={candidate.run_id}
                    type="button"
                    onClick={() => pickLine(candidate)}
                    className="flex w-full items-start justify-between gap-3 rounded-md border p-3 text-left transition-colors hover:border-primary/60 hover:bg-muted/50"
                  >
                    <div className="min-w-0">
                      <div className="font-medium">{candidate.line_name}</div>
                      <div className="truncate text-sm">{candidate.product || '-'}</div>
                      <div className="font-mono text-xs text-muted-foreground">
                        {candidate.item_code || 'No item code'} · Run #{candidate.run_number}
                      </div>
                    </div>
                    <LineRunningBadge line={candidate} />
                  </button>
                ))}
            </>
          )}

          {line && (
            <>
              <div className="flex items-start justify-between gap-3 rounded-md bg-muted/50 p-3">
                <div className="min-w-0">
                  <div className="font-medium">{line.line_name}</div>
                  <div className="truncate text-sm">{line.product || '-'}</div>
                  <div className="font-mono text-xs text-muted-foreground">
                    {line.item_code || 'No item code'} · Run #{line.run_number}
                  </div>
                </div>
                <LineRunningBadge line={line} />
              </div>

              {!isLinked && (
                <div className="flex items-start gap-2 rounded-md border border-blue-200 bg-blue-50 p-3 text-sm text-blue-900 dark:border-blue-500/30 dark:bg-blue-500/10 dark:text-blue-300">
                  <Info className="mt-0.5 h-4 w-4 flex-shrink-0" />
                  <span>
                    {canLink
                      ? 'This product is not linked to a parameter type yet. The one you pick will be linked to it when the entry is saved.'
                      : 'This run has no SAP item code, so the type cannot be linked to its product. Pick it each time.'}
                  </span>
                </div>
              )}

              {typesLoading && !isLinked && (
                <div className="flex items-center justify-center gap-2 py-6 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Loading parameter types…
                </div>
              )}
              {typesError && !typesLoading && (
                <div className="flex items-center gap-2 rounded-md border border-destructive/40 bg-destructive/5 p-3 text-sm text-destructive">
                  <AlertCircle className="h-4 w-4" />
                  Could not load the parameter types.
                </div>
              )}
              {!typesLoading && !typesError && typeOptions.length === 0 && (
                <div className="rounded-md border border-dashed py-6 text-center text-sm text-muted-foreground">
                  There are no parameter types yet. Add them under Parameter Types.
                </div>
              )}

              {typeOptions.length > 0 && (
                <fieldset className="space-y-2">
                  <legend className="sr-only">Parameter type</legend>
                  {typeOptions.map((type) => {
                    const empty = type.parameterCount === 0;
                    const inputId = `production-qc-type-${type.id}`;
                    return (
                      <label
                        key={type.id}
                        htmlFor={inputId}
                        className={cn(
                          'flex items-center gap-3 rounded-md border p-3 transition-colors',
                          empty
                            ? 'cursor-not-allowed opacity-60'
                            : 'cursor-pointer hover:bg-muted/50',
                          chosenTypeId === type.id && 'border-primary bg-primary/5',
                        )}
                      >
                        <input
                          id={inputId}
                          type="radio"
                          name="production-qc-type"
                          value={type.id}
                          checked={chosenTypeId === type.id}
                          disabled={empty}
                          onChange={() => setTypeId(type.id)}
                          className="h-4 w-4"
                        />
                        <span className="min-w-0 flex-1">
                          <span className="block font-medium">{type.name}</span>
                          <span className="block font-mono text-xs text-muted-foreground">
                            {type.code}
                          </span>
                        </span>
                        <span className="whitespace-nowrap text-xs text-muted-foreground">
                          {type.parameterCount === null
                            ? ''
                            : empty
                              ? 'no parameters yet'
                              : `${type.parameterCount} parameter${type.parameterCount === 1 ? '' : 's'}`}
                        </span>
                      </label>
                    );
                  })}
                </fieldset>
              )}
            </>
          )}
        </DialogBody>

        <DialogFooter className="gap-2">
          {line ? (
            <>
              <Button variant="outline" onClick={reset}>
                <ArrowLeft className="mr-2 h-4 w-4" />
                Change line
              </Button>
              <Button onClick={handleContinue} disabled={!canContinue}>
                Continue
              </Button>
            </>
          ) : (
            <Button variant="outline" onClick={() => handleOpenChange(false)}>
              Cancel
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
