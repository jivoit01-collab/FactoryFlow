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
import { usePageSearch } from '../hooks/usePageSearch';
import type { PageHit } from '../utils/pageSearch';
import { isWorthAskingSap } from '../utils/vocabulary';
import { CompanyResultGroup } from './CompanyResultGroup';
import { DocumentDetailPane } from './DocumentDetailPane';
import { PageResultGroup } from './PageResultGroup';

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
 * One box, two questions.
 *
 * A number is a *thing* — a bill, a batch, an entry — and answering it means
 * asking every company's SAP. Words are a *place* — "material grpo",
 * "dashboards" — and answering that means the module registry, which is
 * already in memory. Nobody should have to say which they meant, so both run
 * and each sorts itself: pages lead on a worded query because a number almost
 * never matches a page, and a numeric query almost never matches one at all.
 *
 * Pages answer on the keystroke; SAP answers on the debounce. That difference
 * is the feature — by the time the network has been asked, whoever was looking
 * for a screen has already pressed Enter on it.
 */
export function UniversalSearchDialog({ open, onOpenChange }: UniversalSearchDialogProps) {
  const navigate = useNavigate();
  const [term, setTerm] = useState('');
  const [opened, setOpened] = useState<OpenDocument | null>(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const debounced = useDebounce(term.trim(), SEARCH_DEBOUNCE_MS);
  const isSearchable = debounced.length >= MIN_TERM_LENGTH;

  // Local, synchronous, and on the raw term rather than the debounced one:
  // the registry is in memory, so making a page search wait for a timer would
  // be inventing latency.
  const pages = usePageSearch(term.trim().length >= MIN_TERM_LENGTH ? term.trim() : '');

  // Each opening is a fresh search. Reopening on last week's number and its
  // stale results would be worse than an empty box.
  useEffect(() => {
    if (!open) return;
    setTerm('');
    setOpened(null);
    setActiveIndex(0);
  }, [open]);

  const search = useQuery({
    queryKey: ['universal-search', debounced],
    queryFn: ({ signal }) => universalSearchApi.search(debounced, signal),
    // A sentence is somebody hunting for a screen; sending it to three company
    // databases buys nothing but latency.
    enabled: open && isSearchable && isWorthAskingSap(debounced),
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
  const askedSap = isSearchable && isWorthAskingSap(debounced);

  function goTo(route: string) {
    onOpenChange(false);
    navigate(route);
  }

  /** Up, down and Enter move through the pages — the list that is always there. */
  function onKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    if (opened || !pages.length) return;

    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setActiveIndex((index) => (index + 1) % pages.length);
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      setActiveIndex((index) => (index - 1 + pages.length) % pages.length);
    } else if (event.key === 'Enter') {
      const hit = pages[activeIndex];
      if (hit) {
        event.preventDefault();
        goTo(hit.entry.path);
      }
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="grid max-h-[90vh] w-[96vw] max-w-4xl grid-rows-[auto_auto_minmax(0,1fr)] overflow-hidden p-0">
        <DialogHeader className="px-6 pt-6">
          <DialogTitle>Search</DialogTitle>
          <DialogDescription>
            Go to a screen, or look a bill number, entry no, item code or batch
            up in every company at once.
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
                setActiveIndex(0);
              }}
              onKeyDown={onKeyDown}
              placeholder="A page, a bill number, an entry no, an item code…"
              className="pl-9"
            />
            {search.isFetching && (
              <Loader2 className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-muted-foreground" />
            )}
          </div>
          <p className="mt-2 text-xs text-muted-foreground">
            {opened
              ? `${opened.hit.label} ${opened.hit.doc_num} — ${opened.companyCode.replace('JIVO_', '')}`
              : isSearchable && (search.data || pages.length)
                ? summaryLine(pages.length, total, companies.length, askedSap)
                : 'Screens answer as you type. Numbers are looked for in every company.'}
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
              <DocumentDetailPane companyCode={opened.companyCode} hit={opened.hit} />
            </div>
          ) : (
            <SearchBody
              isSearchable={isSearchable}
              isLoading={search.isLoading && askedSap}
              error={search.isError}
              askedSap={askedSap}
              pages={pages}
              activeIndex={activeIndex}
              onHover={setActiveIndex}
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

function summaryLine(
  pageCount: number,
  total: number,
  companyCount: number,
  askedSap: boolean,
): string {
  const parts: string[] = [];
  if (pageCount) {
    parts.push(`${pageCount} ${pageCount === 1 ? 'page' : 'pages'}`);
  }
  if (askedSap) {
    parts.push(
      `${total} ${total === 1 ? 'result' : 'results'} across ${companyCount} ${
        companyCount === 1 ? 'company' : 'companies'
      }`,
    );
  }
  return parts.join(' · ') || 'Nothing yet';
}

interface SearchBodyProps {
  isSearchable: boolean;
  isLoading: boolean;
  error: boolean;
  askedSap: boolean;
  pages: PageHit[];
  activeIndex: number;
  onHover: (index: number) => void;
  companies: CompanyResults[];
  total: number;
  onOpenDocument: (companyCode: string, hit: SapDocumentHit) => void;
  onNavigate: (route: string) => void;
}

function SearchBody({
  isSearchable,
  isLoading,
  error,
  askedSap,
  pages,
  activeIndex,
  onHover,
  companies,
  total,
  onOpenDocument,
  onNavigate,
}: SearchBodyProps) {
  if (!isSearchable) {
    return (
      <EmptyState
        title="Type to search"
        detail="The name of a screen — “material grpo”, “dashboards” — or a bill number, one of our own entry numbers, an item code, or a batch."
      />
    );
  }

  const pageSection = (
    <PageResultGroup
      hits={pages}
      activeIndex={activeIndex}
      onNavigate={onNavigate}
      onHover={onHover}
    />
  );

  if (isLoading) {
    return (
      <div className="space-y-6">
        {pageSection}
        <div className="flex items-center justify-center py-8 text-sm text-muted-foreground">
          <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Searching every company…
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        {pageSection}
        <EmptyState
          title="The number search could not run"
          detail="Try again in a moment. If it keeps happening, report it from the header."
        />
      </div>
    );
  }

  // Companies that answered with nothing are still worth naming: "nothing in
  // Mart either" is an answer, and hiding it makes the search look narrower
  // than it was.
  const withResults = companies.filter((company) => company.total > 0 || company.error);

  if (!pages.length && !withResults.length) {
    return (
      <EmptyState
        title="Nothing found"
        detail={
          askedSap
            ? `No screen by that name, and nothing in ${companies.map((c) => c.company_name).join(', ') || 'SAP'}. Check the number, or it may not be in SAP yet.`
            : 'No screen by that name. That looked like a question rather than a number, so SAP was not asked.'
        }
      />
    );
  }

  return (
    <div className="space-y-6">
      {pageSection}
      {askedSap && total === 0 && withResults.length > 0 && (
        <div className="flex items-start gap-2 rounded-md border border-amber-500/40 bg-amber-500/10 p-3 text-sm">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400" />
          <span>
            No results — but not every company answered, so this may be incomplete.
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
      {askedSap && companies.length > withResults.length && (
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
