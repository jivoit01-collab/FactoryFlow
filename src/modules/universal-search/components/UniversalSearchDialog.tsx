import { useQuery } from '@tanstack/react-query';
import { AlertTriangle, ArrowLeft, Loader2, Search } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import {
  Badge,
  Dialog,
  DialogBody,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  Input,
} from '@/shared/components/ui';
import { useDebounce } from '@/shared/hooks';

import type { CompanyResults, SapDocumentHit } from '../api';
import { universalSearchApi } from '../api';
import { CompanyResultGroup } from './CompanyResultGroup';
import { DocumentDetailPane } from './DocumentDetailPane';

/** Matches the server's floor. Below it there is nothing worth asking for. */
const MIN_TERM_LENGTH = 2;

/** Long enough that typing a nine-digit bill number is one search, not nine. */
const SEARCH_DEBOUNCE_MS = 350;

export interface UniversalSearchDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/** Which document the user drilled into, and in which company's books. */
interface OpenDocument {
  companyCode: string;
  hit: SapDocumentHit;
}

/**
 * One number, looked up everywhere at once.
 *
 * The modal has two faces. The list is every company's answer, grouped by
 * company because the same number can legitimately be a different document in
 * each — the search does not pick a winner. Opening a SAP hit swaps the body
 * for its lines, with a way back; app records are links out to the module that
 * owns them, since those already have screens of their own.
 */
export function UniversalSearchDialog({ open, onOpenChange }: UniversalSearchDialogProps) {
  const navigate = useNavigate();
  const [term, setTerm] = useState('');
  const [opened, setOpened] = useState<OpenDocument | null>(null);
  const debounced = useDebounce(term.trim(), SEARCH_DEBOUNCE_MS);
  const isSearchable = debounced.length >= MIN_TERM_LENGTH;

  // Each opening is a fresh search. Reopening on last week's number and its
  // stale results would be worse than an empty box.
  useEffect(() => {
    if (!open) return;
    setTerm('');
    setOpened(null);
  }, [open]);

  const search = useQuery({
    queryKey: ['universal-search', debounced],
    queryFn: ({ signal }) => universalSearchApi.search(debounced, signal),
    enabled: open && isSearchable,
    // A document number means the same thing for as long as the modal is open,
    // so going back from a detail must not re-run the whole search.
    staleTime: 60_000,
    retry: false,
  });

  const companies = useMemo<CompanyResults[]>(
    () => search.data?.companies ?? [],
    [search.data],
  );
  const total = search.data?.total ?? 0;

  function goTo(route: string) {
    onOpenChange(false);
    navigate(route);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="grid max-h-[90vh] w-[96vw] max-w-4xl grid-rows-[auto_auto_minmax(0,1fr)] overflow-hidden p-0">
        <DialogHeader className="px-6 pt-6">
          <DialogTitle>Search</DialogTitle>
          <DialogDescription>
            Look a bill or document number, one of our own entry numbers, an
            item code or a batch up in every company at once.
          </DialogDescription>
        </DialogHeader>

        <div className="border-b px-6 pb-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              autoFocus
              value={term}
              onChange={(event) => {
                setTerm(event.target.value);
                setOpened(null);
              }}
              placeholder="Bill number, entry no, item code, batch…"
              className="pl-9"
            />
            {search.isFetching && (
              <Loader2 className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-muted-foreground" />
            )}
          </div>
          <p className="mt-2 text-xs text-muted-foreground">
            {opened
              ? `${opened.hit.label} ${opened.hit.doc_num} — ${opened.companyCode.replace('JIVO_', '')}`
              : isSearchable && search.data
                ? `${total} ${total === 1 ? 'result' : 'results'} across ${companies.length} ${
                    companies.length === 1 ? 'company' : 'companies'
                  }`
                : 'Every company is searched, not just the one you are in.'}
          </p>
        </div>

        <DialogBody className="px-6 pb-6">
          {opened ? (
            <div className="space-y-3">
              <button
                type="button"
                onClick={() => setOpened(null)}
                className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
              >
                <ArrowLeft className="h-4 w-4" /> Back to results
              </button>
              <DocumentDetailPane
                companyCode={opened.companyCode}
                hit={opened.hit}
              />
            </div>
          ) : (
            <SearchBody
              isSearchable={isSearchable}
              isLoading={search.isLoading}
              error={search.isError}
              companies={companies}
              total={total}
              onOpenDocument={(companyCode, hit) => setOpened({ companyCode, hit })}
              onNavigate={goTo}
            />
          )}
        </DialogBody>
      </DialogContent>
    </Dialog>
  );
}

interface SearchBodyProps {
  isSearchable: boolean;
  isLoading: boolean;
  error: boolean;
  companies: CompanyResults[];
  total: number;
  onOpenDocument: (companyCode: string, hit: SapDocumentHit) => void;
  onNavigate: (route: string) => void;
}

function SearchBody({
  isSearchable,
  isLoading,
  error,
  companies,
  total,
  onOpenDocument,
  onNavigate,
}: SearchBodyProps) {
  if (!isSearchable) {
    return (
      <EmptyState
        title="Type a number"
        detail="A bill or document number, one of our own entry numbers, an item code, or a batch."
      />
    );
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16 text-sm text-muted-foreground">
        <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Searching every company…
      </div>
    );
  }

  if (error) {
    return (
      <EmptyState
        title="The search could not run"
        detail="Try again in a moment. If it keeps happening, report it from the header."
      />
    );
  }

  // Companies that answered with nothing are still worth naming: "nothing in
  // Mart either" is an answer, and hiding it makes the search look narrower
  // than it was.
  const withResults = companies.filter(
    (company) => company.total > 0 || company.error,
  );

  if (!withResults.length) {
    return (
      <EmptyState
        title="Nothing found"
        detail={`Searched ${companies.map((c) => c.company_name).join(', ')}. Check the number, or it may not be in SAP yet.`}
      />
    );
  }

  return (
    <div className="space-y-6">
      {total === 0 && (
        <div className="flex items-start gap-2 rounded-md border border-amber-500/40 bg-amber-500/10 p-3 text-sm">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400" />
          <span>
            No results — but not every company answered, so this may be
            incomplete.
          </span>
        </div>
      )}
      {withResults.map((company) => (
        <CompanyResultGroup
          key={company.company_code}
          company={company}
          onOpenDocument={(hit) => onOpenDocument(company.company_code, hit)}
          onNavigate={onNavigate}
        />
      ))}
      {companies.length > withResults.length && (
        <p className="text-xs text-muted-foreground">
          Nothing in{' '}
          {companies
            .filter((company) => !company.total && !company.error)
            .map((company) => company.company_name)
            .join(', ')}
          .
        </p>
      )}
    </div>
  );
}

function EmptyState({ title, detail }: { title: string; detail: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-1 py-16 text-center">
      <Badge variant="outline" className="mb-2">
        {title}
      </Badge>
      <p className="max-w-md text-sm text-muted-foreground">{detail}</p>
    </div>
  );
}
