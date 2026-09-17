import { CornerDownLeft } from 'lucide-react';

import { Badge } from '@/shared/components/ui';
import { cn } from '@/shared/utils';

import type { PageHit } from '../utils/pageSearch';

export interface PageResultGroupProps {
  hits: PageHit[];
  /** Which row the arrow keys are on, or -1 for none. */
  activeIndex: number;
  onNavigate: (path: string) => void;
  onHover: (index: number) => void;
}

/**
 * The screens matching the query.
 *
 * Sits above the company groups whenever it has anything, because a worded
 * query is somebody looking for a page and a numeric one rarely matches a page
 * at all — so the two kinds of answer sort themselves out without the user
 * choosing a mode.
 */
export function PageResultGroup({
  hits,
  activeIndex,
  onNavigate,
  onHover,
}: PageResultGroupProps) {
  if (!hits.length) return null;

  // When nothing matched the query in full, say so rather than presenting a
  // near-miss as the answer. The user can then see at a glance whether to
  // trust the first row or re-word.
  const allPartial = hits.every((hit) => hit.isPartial);

  return (
    <section className="space-y-2">
      <div className="flex items-center gap-2">
        <h3 className="text-sm font-semibold">{allPartial ? 'Closest pages' : 'Pages'}</h3>
        <Badge variant="secondary" className="text-xs">
          {hits.length}
        </Badge>
      </div>

      <div className="divide-y rounded-md border">
        {hits.map((hit, index) => (
          <button
            key={hit.entry.path}
            type="button"
            data-active={index === activeIndex || undefined}
            onMouseEnter={() => onHover(index)}
            onClick={() => onNavigate(hit.entry.path)}
            className={cn(
              'flex w-full items-center gap-3 px-3 py-2.5 text-left text-sm first:rounded-t-md last:rounded-b-md',
              index === activeIndex ? 'bg-muted' : 'hover:bg-muted/60',
            )}
          >
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-medium">{hit.entry.title}</span>
                {hit.entry.section && (
                  <Badge variant="outline" className="text-[10px]">
                    {hit.entry.section}
                  </Badge>
                )}
              </div>
              <p className="truncate text-xs text-muted-foreground">{hit.entry.path}</p>
            </div>
            {index === activeIndex && (
              <CornerDownLeft className="h-4 w-4 shrink-0 text-muted-foreground" />
            )}
          </button>
        ))}
      </div>
    </section>
  );
}
