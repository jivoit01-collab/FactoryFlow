import { ChevronDown, ChevronRight, ChevronUp, Plus, Trash2 } from 'lucide-react';

import { Button, Card, Input } from '@/shared/components/ui';
import { cn } from '@/shared/utils';

import type { OrgDepartmentDraft, OrgFunctionDraft, OrgLevelKey } from '../types';
import { ORG_LEVELS } from './levels';
import { PeopleEditor } from './PeopleEditor';

interface DepartmentCardProps {
  /** Position on the chart, 1-based — the "01" printed on the block. */
  index: number;
  department: OrgDepartmentDraft;
  editing: boolean;
  isFirst: boolean;
  isLast: boolean;
  onChange: (next: OrgDepartmentDraft) => void;
  onMove: (direction: -1 | 1) => void;
  onDelete: () => void;
}

let rowKeySeed = 0;
function newRow(): OrgFunctionDraft {
  rowKeySeed += 1;
  return { key: `new-row-${rowKeySeed}`, name: '', owners: [], level_1: [], level_2: [] };
}

/**
 * One department block: the dark rail with the department's name, and its rows
 * of functions with the people at each level.
 *
 * The column headings sit once at the top of the block rather than on every row
 * — repeated four times per row they drowned out the names, which are the only
 * thing anyone opens this page to read. Below `md` there is no room for columns,
 * so the rows stack and each cell carries its own label again.
 *
 * The same component draws the chart and edits it — a row keeps its position on
 * the page when the Edit button is pressed, so nobody has to re-find the line
 * they came to change.
 */
export function DepartmentCard({
  index,
  department,
  editing,
  isFirst,
  isLast,
  onChange,
  onMove,
  onDelete,
}: DepartmentCardProps) {
  const updateRow = (rowKey: string, patch: Partial<OrgFunctionDraft>) => {
    onChange({
      ...department,
      functions: department.functions.map((row) =>
        row.key === rowKey ? { ...row, ...patch } : row,
      ),
    });
  };

  const updateLevel = (rowKey: string, level: OrgLevelKey, names: string[]) => {
    onChange({
      ...department,
      functions: department.functions.map((row) => {
        if (row.key !== rowKey) return row;
        const next: OrgFunctionDraft = { ...row };
        next[level] = names;
        return next;
      }),
    });
  };

  const moveRow = (position: number, direction: -1 | 1) => {
    const target = position + direction;
    if (target < 0 || target >= department.functions.length) return;
    const functions = [...department.functions];
    [functions[position], functions[target]] = [functions[target], functions[position]];
    onChange({ ...department, functions });
  };

  const removeRow = (rowKey: string) => {
    onChange({
      ...department,
      functions: department.functions.filter((row) => row.key !== rowKey),
    });
  };

  // One grid, shared by the heading strip and every row, so the columns line up.
  const gridClass = cn(
    'gap-x-5 px-5',
    editing
      ? 'md:grid-cols-[minmax(10rem,1.05fr)_repeat(3,minmax(0,1fr))_auto]'
      : 'md:grid-cols-[minmax(10rem,1.05fr)_repeat(3,minmax(0,1fr))]',
  );

  const rowCount = department.functions.length;

  return (
    <Card className="overflow-hidden p-0 shadow-sm">
      <div className="flex flex-col md:flex-row">
        {/* The dark block down the left of the printed chart. */}
        <div className="flex shrink-0 items-center gap-3 bg-gradient-to-br from-slate-900 to-slate-800 p-5 text-white md:w-60 md:flex-col md:items-start md:justify-center dark:from-slate-800 dark:to-slate-900">
          <span className="rounded bg-white/10 px-1.5 py-0.5 text-[11px] font-semibold tabular-nums text-slate-300">
            {String(index).padStart(2, '0')}
          </span>
          {editing ? (
            <div className="flex w-full flex-col gap-2">
              <Input
                value={department.name}
                onChange={(event) => onChange({ ...department, name: event.target.value })}
                placeholder="Department name"
                className="h-9 border-slate-600 bg-slate-800/80 text-base font-semibold text-white placeholder:font-normal placeholder:text-slate-500 dark:bg-slate-900"
              />
              <div className="flex items-center gap-1">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-7 px-2 text-slate-300 hover:bg-slate-700 hover:text-white"
                  disabled={isFirst}
                  onClick={() => onMove(-1)}
                  aria-label={`Move ${department.name || 'department'} up`}
                >
                  <ChevronUp className="h-4 w-4" />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-7 px-2 text-slate-300 hover:bg-slate-700 hover:text-white"
                  disabled={isLast}
                  onClick={() => onMove(1)}
                  aria-label={`Move ${department.name || 'department'} down`}
                >
                  <ChevronDown className="h-4 w-4" />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-7 px-2 text-rose-300 hover:bg-rose-500/20 hover:text-rose-200"
                  onClick={onDelete}
                  aria-label={`Delete ${department.name || 'department'}`}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ) : (
            <div className="min-w-0 md:mt-2">
              <h3 className="text-xl font-semibold leading-tight tracking-tight">
                {department.name}
              </h3>
              <p className="mt-1 text-xs text-slate-400">
                {rowCount} {rowCount === 1 ? 'function' : 'functions'}
              </p>
            </div>
          )}
        </div>

        <div className="min-w-0 flex-1">
          {/* Column headings, once per block. Below md the rows label themselves. */}
          <div className={cn(gridClass, 'hidden border-b border-border bg-muted/40 py-2 md:grid')}>
            <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              Sub-department
            </span>
            {ORG_LEVELS.map((level) => (
              <span
                key={level.key}
                className={cn(
                  'text-[10px] font-semibold uppercase tracking-wider',
                  level.label_tone,
                )}
              >
                {level.label}
              </span>
            ))}
            {editing && <span />}
          </div>

          <div className="divide-y divide-border">
            {rowCount === 0 && (
              <p className="px-5 py-4 text-sm text-muted-foreground">
                No functions listed for this department yet.
              </p>
            )}

            {department.functions.map((row, position) => (
              <div
                key={row.key}
                className={cn(
                  gridClass,
                  'grid gap-y-3 py-3 transition-colors md:items-center',
                  !editing && 'hover:bg-muted/30',
                )}
              >
                <div className="min-w-0">
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground md:hidden">
                    Sub-department
                  </span>
                  {editing ? (
                    <Input
                      value={row.name}
                      onChange={(event) => updateRow(row.key, { name: event.target.value })}
                      placeholder="Leave blank for the whole department"
                      className="mt-1 h-8 text-sm md:mt-0"
                    />
                  ) : (
                    <p
                      className={cn(
                        'mt-1 text-[15px] font-medium leading-snug md:mt-0',
                        !row.name && 'italic text-muted-foreground',
                      )}
                    >
                      {row.name || 'Whole department'}
                    </p>
                  )}
                </div>

                {ORG_LEVELS.map((level, levelIndex) => (
                  <div key={level.key} className="min-w-0">
                    <span
                      className={cn(
                        'text-[10px] font-semibold uppercase tracking-wider md:hidden',
                        level.label_tone,
                      )}
                    >
                      {level.label}
                    </span>
                    <div className="mt-1 flex min-w-0 items-start gap-1.5 md:mt-0">
                      {/* The chart's flow: owner, then who backs them up. */}
                      {levelIndex > 0 && (
                        <ChevronRight
                          aria-hidden
                          className="mt-1.5 hidden h-3.5 w-3.5 shrink-0 text-muted-foreground/40 md:block"
                        />
                      )}
                      <div className="min-w-0 flex-1">
                        {editing ? (
                          <PeopleEditor
                            value={row[level.key]}
                            onChange={(names) => updateLevel(row.key, level.key, names)}
                            chipClassName={level.chip}
                            fieldLabel={`${level.label} for ${row.name || department.name || 'this department'}`}
                          />
                        ) : row[level.key].length ? (
                          <div className="flex flex-wrap gap-1.5">
                            {row[level.key].map((name) => (
                              <span
                                key={name}
                                className={cn(
                                  'inline-flex items-center rounded-full border px-2.5 py-0.5 text-[13px] font-medium leading-6',
                                  level.chip,
                                )}
                              >
                                {name}
                              </span>
                            ))}
                          </div>
                        ) : (
                          <span className="text-sm text-muted-foreground/60">—</span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}

                {editing && (
                  <div className="flex items-start gap-1">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-7 px-2"
                      disabled={position === 0}
                      onClick={() => moveRow(position, -1)}
                      aria-label="Move row up"
                    >
                      <ChevronUp className="h-4 w-4" />
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-7 px-2"
                      disabled={position === rowCount - 1}
                      onClick={() => moveRow(position, 1)}
                      aria-label="Move row down"
                    >
                      <ChevronDown className="h-4 w-4" />
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-7 px-2 text-destructive hover:text-destructive"
                      onClick={() => removeRow(row.key)}
                      aria-label="Delete row"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                )}
              </div>
            ))}
          </div>

          {editing && (
            <div className="border-t border-border px-5 py-3">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() =>
                  onChange({ ...department, functions: [...department.functions, newRow()] })
                }
              >
                <Plus className="mr-2 h-4 w-4" />
                Add function
              </Button>
            </div>
          )}
        </div>
      </div>
    </Card>
  );
}
