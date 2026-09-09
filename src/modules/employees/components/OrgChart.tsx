/**
 * The org chart itself: two ways of drawing the same tree, and the controls
 * that make a large one usable.
 *
 * **Tree view** is the chart people mean when they say org chart — cards in
 * rows with elbow connectors, each parent centred over its children. It is
 * drawn in plain CSS rather than with an SVG layout library: at the density of
 * a real chart the browser's own flex layout centres a parent over its
 * children for free, and the connectors are three one-pixel divs per node.
 * The elbows are built as
 *
 *     parent card
 *          │            stem down from the parent
 *     ┌────┴────┐       half-width bars, one per child, so the first child's
 *     │         │       bar starts at its own centre and the last one's ends
 *   child     child     there — which is what makes the horizontal rule span
 *                       exactly from the first child to the last
 *
 * so nothing is absolutely positioned against a measured width, and a chart
 * survives a name that is longer than expected or a browser zoom of 150%.
 *
 * **List view** is the same tree indented, with a rail per level. It exists
 * because the tree view is a horizontal thing and phones are not, and because
 * an organisation that is twelve levels deep and two wide reads far better as
 * an indented list than as a very tall chart.
 *
 * The controls above them do the work that makes a four-thousand-person chart
 * openable at all: open only the top couple of levels to begin with, expand to
 * a chosen depth, zoom out to see shape rather than detail, and search — which
 * expands only the branches that contain a match and rings the matches, leaving
 * the rest of the tree shut.
 */
import {
  ChevronDown,
  ChevronRight,
  List,
  Minus,
  Network,
  Plus,
  Search,
  X,
} from 'lucide-react';
import { useMemo, useState } from 'react';

import { Button, Input } from '@/shared/components/ui';
import { cn } from '@/shared/utils';

import type { OrgTreeNode } from '../types';
import { flattenTree, idsToDepth, idsToRevealMatches, nodeMatches, treeDepth } from '../utils';
import { EmptyState } from './EmployeeBits';
import { OrgNodeCard } from './OrgNodeCard';
import { TREE_LINE } from './theme';

/**
 * How many levels of branches are open when the chart first loads.
 *
 * Two, which puts three levels of cards on screen — a chief, their directs and
 * their directs' teams. It is the most that reliably fits a laptop screen
 * without zooming, and everything below it is one click away with the count of
 * what is hidden printed on the toggle.
 */
const DEFAULT_OPEN_DEPTH = 2;

/** People in the forest — part of the key that decides when to reset. */
function flatCount(roots: OrgTreeNode[]) {
  return flattenTree(roots).length;
}

const ZOOM_STEPS = [0.6, 0.7, 0.8, 0.9, 1, 1.1] as const;
const DEFAULT_ZOOM_INDEX = 4;

export type OrgChartView = 'tree' | 'list';

/** Where a node sits among its siblings — which decides its elbow's shape. */
type NodePosition = 'only' | 'first' | 'middle' | 'last';

export interface OrgChartProps {
  roots: OrgTreeNode[];
  onOpen?: (node: OrgTreeNode) => void;
  onFocus?: (node: OrgTreeNode) => void;
  rootId?: number | null;
  selfEmployeeId?: number | null;
  view: OrgChartView;
  onViewChange: (view: OrgChartView) => void;
  className?: string;
}

interface BranchProps {
  node: OrgTreeNode;
  open: Set<number>;
  toggle: (id: number) => void;
  query: string;
  onOpen?: (node: OrgTreeNode) => void;
  onFocus?: (node: OrgTreeNode) => void;
  rootId?: number | null;
  selfEmployeeId?: number | null;
}

function positionOf(index: number, count: number): NodePosition {
  if (count === 1) return 'only';
  if (index === 0) return 'first';
  if (index === count - 1) return 'last';
  return 'middle';
}

/** The elbow above a child: half a rule, or a whole one, plus the drop. */
function Elbow({ position }: { position: NodePosition }) {
  return (
    <div className="relative h-5 w-full" aria-hidden="true">
      {position !== 'only' && (
        <div
          className={cn(
            'absolute top-0 h-px',
            TREE_LINE,
            position === 'first' && 'left-1/2 right-0',
            position === 'last' && 'left-0 right-1/2',
            position === 'middle' && 'left-0 right-0',
          )}
        />
      )}
      <div className={cn('absolute left-1/2 top-0 h-5 w-px -translate-x-1/2', TREE_LINE)} />
    </div>
  );
}

function TreeBranch({
  node,
  open,
  toggle,
  query,
  onOpen,
  onFocus,
  rootId,
  selfEmployeeId,
}: BranchProps) {
  const hasChildren = node.children.length > 0;
  const isOpen = hasChildren && open.has(node.id);

  return (
    <li className="flex flex-col items-center">
      <OrgNodeCard
        node={node}
        onOpen={onOpen}
        onFocus={onFocus}
        isRoot={node.id === rootId}
        isSelf={node.id === selfEmployeeId}
        isMatch={nodeMatches(node, query)}
      />

      {hasChildren && (
        <button
          type="button"
          onClick={() => toggle(node.id)}
          aria-expanded={isOpen}
          title={
            isOpen
              ? `Hide ${node.full_name}'s team`
              : `Show ${node.children.length} direct report(s)`
          }
          className="z-10 -mt-2 inline-flex items-center gap-1 rounded-full border bg-card px-2 py-0.5 text-[11px] font-semibold tabular-nums shadow-sm transition-colors hover:bg-muted focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          {isOpen ? (
            <ChevronDown className="h-3 w-3" />
          ) : (
            <ChevronRight className="h-3 w-3" />
          )}
          {node.children.length}
          {!isOpen && node.subtree_size > node.children.length && (
            <span className="font-normal text-muted-foreground">of {node.subtree_size}</span>
          )}
        </button>
      )}

      {isOpen && (
        <>
          <div className={cn('h-5 w-px', TREE_LINE)} aria-hidden="true" />
          <ul className="flex items-start">
            {node.children.map((child, index) => (
              <li key={child.id} className="flex flex-col items-center px-2">
                <Elbow position={positionOf(index, node.children.length)} />
                <TreeBranch
                  node={child}
                  open={open}
                  toggle={toggle}
                  query={query}
                  onOpen={onOpen}
                  onFocus={onFocus}
                  rootId={rootId}
                  selfEmployeeId={selfEmployeeId}
                />
              </li>
            ))}
          </ul>
        </>
      )}
    </li>
  );
}

function ListBranch({
  node,
  open,
  toggle,
  query,
  onOpen,
  onFocus,
  rootId,
  selfEmployeeId,
  depth = 0,
}: BranchProps & { depth?: number }) {
  const hasChildren = node.children.length > 0;
  const isOpen = hasChildren && open.has(node.id);

  return (
    <li>
      <div className="flex items-stretch gap-1">
        {/* One rail per level, so a deep row still shows where it hangs from. */}
        {Array.from({ length: depth }).map((_, index) => (
          <span
            key={index}
            className={cn('ml-2 w-px shrink-0', TREE_LINE)}
            aria-hidden="true"
          />
        ))}
        <div className="flex min-w-0 flex-1 items-center gap-1.5 py-1">
          {hasChildren ? (
            <button
              type="button"
              onClick={() => toggle(node.id)}
              aria-expanded={isOpen}
              aria-label={isOpen ? `Hide ${node.full_name}'s team` : `Show ${node.full_name}'s team`}
              className="rounded p-0.5 text-muted-foreground hover:bg-muted hover:text-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              {isOpen ? (
                <ChevronDown className="h-4 w-4" />
              ) : (
                <ChevronRight className="h-4 w-4" />
              )}
            </button>
          ) : (
            <span className="w-5 shrink-0" aria-hidden="true" />
          )}
          <OrgNodeCard
            node={node}
            onOpen={onOpen}
            onFocus={onFocus}
            isRoot={node.id === rootId}
            isSelf={node.id === selfEmployeeId}
            isMatch={nodeMatches(node, query)}
            dense
            className="max-w-2xl"
          />
        </div>
      </div>
      {isOpen && (
        <ul>
          {node.children.map((child) => (
            <ListBranch
              key={child.id}
              node={child}
              open={open}
              toggle={toggle}
              query={query}
              onOpen={onOpen}
              onFocus={onFocus}
              rootId={rootId}
              selfEmployeeId={selfEmployeeId}
              depth={depth + 1}
            />
          ))}
        </ul>
      )}
    </li>
  );
}

export function OrgChart({
  roots,
  onOpen,
  onFocus,
  rootId,
  selfEmployeeId,
  view,
  onViewChange,
  className,
}: OrgChartProps) {
  const depth = useMemo(() => treeDepth(roots), [roots]);
  const [query, setQuery] = useState('');
  const [zoomIndex, setZoomIndex] = useState<number>(DEFAULT_ZOOM_INDEX);

  /**
   * Which branches are open, and when that resets.
   *
   * The expansion is held against a **key** describing the tree rather than
   * against the array itself: a background refetch hands back a new array of
   * the same people, and resetting on that would collapse the chart under
   * somebody mid-read. A genuinely different tree — another root, a department
   * filter, somebody hired — has a different key, and starts open to the
   * default depth again, because carrying one chart's open set onto another
   * leaves it collapsed in arbitrary places.
   */
  const treeKey = useMemo(
    () => `${roots.map((root) => root.id).join('.')}|${flatCount(roots)}`,
    [roots],
  );
  const [expansion, setExpansion] = useState<{ key: string; ids: Set<number> }>(() => ({
    key: treeKey,
    ids: idsToDepth(roots, DEFAULT_OPEN_DEPTH),
  }));
  const defaultOpen = useMemo(() => idsToDepth(roots, DEFAULT_OPEN_DEPTH), [roots]);
  const openIds = expansion.key === treeKey ? expansion.ids : defaultOpen;

  /**
   * Searching reveals the way down to every match — derived, not stored.
   *
   * So clearing the box puts the chart back exactly as the reader had it,
   * rather than leaving eight branches open that a search opened for them.
   */
  const open = useMemo(() => {
    if (!query.trim()) return openIds;
    return new Set([...openIds, ...idsToRevealMatches(roots, query)]);
  }, [openIds, query, roots]);

  const matchCount = useMemo(() => {
    if (!query.trim()) return 0;
    let count = 0;
    const walk = (list: OrgTreeNode[]) => {
      list.forEach((node) => {
        if (nodeMatches(node, query)) count += 1;
        walk(node.children);
      });
    };
    walk(roots);
    return count;
  }, [roots, query]);

  function toggle(id: number) {
    const next = new Set(openIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setExpansion({ key: treeKey, ids: next });
  }

  function openToDepth(levels: number) {
    setExpansion({ key: treeKey, ids: idsToDepth(roots, levels) });
  }

  const zoom = ZOOM_STEPS[zoomIndex];

  if (!roots.length) {
    return (
      <EmptyState
        icon={Network}
        title="Nothing to chart yet"
        hint="Once employees have a reporting manager, the chart draws itself from the top down."
        className={className}
      />
    );
  }

  return (
    <div className={cn('space-y-3', className)}>
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative min-w-[240px] flex-1">
          <Search className="pointer-events-none absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Find someone in the chart — name, code, role, department"
            className="pl-8 pr-8"
          />
          {query && (
            <button
              type="button"
              onClick={() => setQuery('')}
              aria-label="Clear the chart search"
              className="absolute right-2 top-2 rounded p-0.5 text-muted-foreground hover:bg-muted"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        {query.trim() && (
          <span className="text-xs text-muted-foreground tabular-nums">
            {matchCount} match{matchCount === 1 ? '' : 'es'}
          </span>
        )}

        {/* Expand to a level, rather than "expand all" — on a real chart
            "expand all" is a wall nobody can read. */}
        <div className="flex items-center gap-1 rounded-md border p-0.5">
          {Array.from({ length: Math.min(depth, 6) }).map((_, index) => (
            <button
              key={index}
              type="button"
              onClick={() => openToDepth(index + 1)}
              title={`Open the chart down to level ${index + 1}`}
              className="rounded px-2 py-1 text-[11px] font-semibold tabular-nums text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            >
              L{index + 1}
            </button>
          ))}
          <button
            type="button"
            onClick={() => setExpansion({ key: treeKey, ids: new Set() })}
            title="Collapse the whole chart"
            className="rounded px-2 py-1 text-[11px] font-semibold text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            Collapse
          </button>
        </div>

        {view === 'tree' && (
          <div className="flex items-center gap-0.5 rounded-md border p-0.5">
            <Button
              variant="ghost"
              size="sm"
              className="h-7 w-7 p-0"
              onClick={() => setZoomIndex((index) => Math.max(0, index - 1))}
              disabled={zoomIndex === 0}
              aria-label="Zoom out"
            >
              <Minus className="h-3.5 w-3.5" />
            </Button>
            <span className="w-10 text-center text-[11px] tabular-nums text-muted-foreground">
              {Math.round(zoom * 100)}%
            </span>
            <Button
              variant="ghost"
              size="sm"
              className="h-7 w-7 p-0"
              onClick={() => setZoomIndex((index) => Math.min(ZOOM_STEPS.length - 1, index + 1))}
              disabled={zoomIndex === ZOOM_STEPS.length - 1}
              aria-label="Zoom in"
            >
              <Plus className="h-3.5 w-3.5" />
            </Button>
          </div>
        )}

        <div className="flex items-center gap-0.5 rounded-md border p-0.5">
          <Button
            variant={view === 'tree' ? 'secondary' : 'ghost'}
            size="sm"
            className="h-7 gap-1.5 px-2 text-xs"
            onClick={() => onViewChange('tree')}
          >
            <Network className="h-3.5 w-3.5" />
            Chart
          </Button>
          <Button
            variant={view === 'list' ? 'secondary' : 'ghost'}
            size="sm"
            className="h-7 gap-1.5 px-2 text-xs"
            onClick={() => onViewChange('list')}
          >
            <List className="h-3.5 w-3.5" />
            List
          </Button>
        </div>
      </div>

      {view === 'tree' ? (
        // The chart scrolls inside its own box: a wide organisation must never
        // put the whole page into a horizontal scroll.
        <div className="overflow-x-auto rounded-xl border bg-gradient-to-b from-muted/30 to-transparent p-6">
          <div
            style={{ transform: `scale(${zoom})`, transformOrigin: 'top center' }}
            className="min-w-fit transition-transform duration-200"
          >
            <ul className="flex items-start justify-center gap-8">
              {roots.map((root) => (
                <TreeBranch
                  key={root.id}
                  node={root}
                  open={open}
                  toggle={toggle}
                  query={query}
                  onOpen={onOpen}
                  onFocus={onFocus}
                  rootId={rootId}
                  selfEmployeeId={selfEmployeeId}
                />
              ))}
            </ul>
          </div>
        </div>
      ) : (
        <div className="rounded-xl border p-3">
          <ul>
            {roots.map((root) => (
              <ListBranch
                key={root.id}
                node={root}
                open={open}
                toggle={toggle}
                query={query}
                onOpen={onOpen}
                onFocus={onFocus}
                rootId={rootId}
                selfEmployeeId={selfEmployeeId}
              />
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
