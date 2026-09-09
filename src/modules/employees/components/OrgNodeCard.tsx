/**
 * One person, as a card on the org chart.
 *
 * The card has to do four things at a glance and nothing more, because a real
 * chart puts forty of them on a screen: say who this is, say what they do, say
 * how big their team is, and let you go to them or re-root the chart on them.
 *
 * Decisions worth knowing:
 *
 * **Fixed width.** Every card is the same width, so the columns of a chart line
 * up and the elbow connectors meet their cards squarely. A card that grew with
 * its name would make the whole tree ragged.
 *
 * **The level accent is a left bar, not a fill.** Depth is a secondary fact;
 * filling the card with it would drown the name, which is the primary one. The
 * bar plus the `L3` chip is enough to see the shape of the company while the
 * text stays on a plain card surface at full contrast in both themes.
 *
 * **The team count sits on the card, not on the connector.** "4 / 12" — four
 * direct, twelve underneath — is the number people scan a chart for, and
 * putting it on the card means a collapsed branch still tells you how much is
 * hidden.
 *
 * **Search matches are ringed, not recoloured.** A match keeps its status and
 * level colours, because losing them would make the one card you were looking
 * for the only one you cannot read properly.
 */
import { Crosshair, Star } from 'lucide-react';

import { cn } from '@/shared/utils';

import type { OrgTreeNode } from '../types';
import { EmployeeAvatar, LevelChip, TeamCount } from './EmployeeBits';
import { levelAccent, statusStyle } from './theme';

export interface OrgNodeCardProps {
  node: OrgTreeNode;
  /** Open this person's profile. */
  onOpen?: (node: OrgTreeNode) => void;
  /** Re-root the chart here — the manager view of one organisation. */
  onFocus?: (node: OrgTreeNode) => void;
  /** The person the chart is currently rooted on. */
  isRoot?: boolean;
  /** This is the logged-in user. */
  isSelf?: boolean;
  /** Matches the chart's search box. */
  isMatch?: boolean;
  /** Compact rows for the list view and for phones. */
  dense?: boolean;
  className?: string;
}

export function OrgNodeCard({
  node,
  onOpen,
  onFocus,
  isRoot = false,
  isSelf = false,
  isMatch = false,
  dense = false,
  className,
}: OrgNodeCardProps) {
  const accent = levelAccent(node.hierarchy_level);
  const status = statusStyle(node.employment_status);
  const role = node.job_title || node.designation_name || '—';

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => onOpen?.(node)}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          onOpen?.(node);
        }
      }}
      title={`${node.full_name} — ${role}`}
      className={cn(
        'group relative flex cursor-pointer items-start gap-2.5 overflow-hidden rounded-xl border bg-card text-left shadow-sm transition-all duration-200',
        'hover:-translate-y-0.5 hover:shadow-md focus:outline-none focus-visible:ring-2 focus-visible:ring-ring',
        accent.glow,
        dense ? 'w-full px-2.5 py-2' : 'w-56 px-3 py-2.5',
        isMatch && 'ring-2 ring-amber-400 dark:ring-amber-500',
        isRoot && !isMatch && 'ring-2 ring-primary/40',
        status.gone && 'opacity-70',
        className,
      )}
    >
      {/* The level accent: a bar, so it never competes with the name. */}
      <span className={cn('absolute inset-y-0 left-0 w-1', accent.bar)} />

      <EmployeeAvatar employee={node} size={dense ? 'sm' : 'md'} className="ml-1" />

      <span className="min-w-0 flex-1">
        <span className="flex items-center gap-1">
          <span className="truncate text-sm font-semibold leading-tight">{node.full_name}</span>
          {isSelf && (
            <Star
              className="h-3 w-3 shrink-0 fill-amber-400 text-amber-500"
              aria-label="This is you"
            />
          )}
        </span>
        <span className="mt-0.5 block truncate text-xs text-muted-foreground">{role}</span>
        <span className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1">
          <LevelChip level={node.hierarchy_level} />
          <span className="truncate font-mono text-[10px] text-muted-foreground/80">
            {node.employee_code}
          </span>
          <TeamCount
            direct={node.direct_report_count}
            total={node.subtree_size || node.direct_report_count}
          />
        </span>
        {!dense && node.department_name && (
          <span className="mt-1 block truncate text-[11px] text-muted-foreground/80">
            {node.department_name}
          </span>
        )}
      </span>

      {/* Re-root here. Hidden until the card is hovered or focused, so forty
          cards on a screen do not turn into forty buttons. */}
      {onFocus && !isRoot && (
        <button
          type="button"
          onClick={(event) => {
            event.stopPropagation();
            onFocus(node);
          }}
          title={`Show only ${node.full_name}'s organisation`}
          aria-label={`Show only ${node.full_name}'s organisation`}
          className="absolute right-1 top-1 rounded-md p-1 text-muted-foreground opacity-0 transition-opacity hover:bg-muted hover:text-foreground focus:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring group-hover:opacity-100"
        >
          <Crosshair className="h-3.5 w-3.5" />
        </button>
      )}
    </div>
  );
}
