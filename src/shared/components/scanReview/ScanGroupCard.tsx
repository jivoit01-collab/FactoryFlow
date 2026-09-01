import { ChevronDown, ChevronRight } from 'lucide-react';
import type { ReactNode } from 'react';

/**
 * Collapsible per-bill shell of a scan review: chevron header with title,
 * subtitle and progress badges; children render as the body while open.
 * Extracted from the dispatch docking scan page so BST shares the same look.
 */
export function ScanGroupCard({
  tag,
  title,
  subtitle,
  badges,
  isOpen,
  onToggle,
  children,
}: {
  /** Small pill before the title (e.g. the company on a multi-company truck). */
  tag?: ReactNode;
  title: ReactNode;
  subtitle?: ReactNode;
  /** Right-aligned badge row (boxes scanned, loose pieces, status). */
  badges?: ReactNode;
  isOpen: boolean;
  onToggle: () => void;
  children?: ReactNode;
}) {
  return (
    <div className="overflow-hidden rounded-md border">
      <button
        type="button"
        onClick={onToggle}
        className="flex w-full flex-wrap items-center gap-x-3 gap-y-2 bg-muted/40 p-3 text-left transition-colors hover:bg-muted/60"
      >
        {isOpen ? (
          <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" />
        ) : (
          <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
        )}
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            {tag ? (
              <span className="inline-flex shrink-0 rounded-full border bg-background px-2 py-0.5 text-xs font-medium">
                {tag}
              </span>
            ) : null}
            <span className="truncate text-sm font-semibold">{title}</span>
          </div>
          {subtitle ? <div className="text-xs text-muted-foreground">{subtitle}</div> : null}
        </div>
        {/* On phones the badges drop to their own full-width line (indented under the
            title past the chevron) so the title isn't squeezed into a stub. From sm
            up they sit inline to the right of the title. */}
        {badges ? (
          <div className="flex w-full shrink-0 flex-wrap items-center gap-2 pl-7 sm:w-auto sm:pl-0">
            {badges}
          </div>
        ) : null}
      </button>
      {isOpen ? <div className="space-y-4 border-t p-4">{children}</div> : null}
    </div>
  );
}
