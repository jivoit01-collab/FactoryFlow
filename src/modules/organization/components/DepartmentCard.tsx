import { ChevronDown, ChevronUp, Plus, Trash2 } from 'lucide-react';

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

  const gridClass = cn(
    'grid gap-x-4 gap-y-3 px-4 py-3',
    editing
      ? 'md:grid-cols-[minmax(9rem,1.1fr)_repeat(3,minmax(0,1fr))_auto]'
      : 'md:grid-cols-[minmax(9rem,1.1fr)_repeat(3,minmax(0,1fr))]',
  );

  return (
    <Card className="overflow-hidden p-0">
      <div className="flex flex-col md:flex-row">
        {/* The dark block down the left of the printed chart. */}
        <div className="flex shrink-0 items-start gap-3 bg-slate-900 p-4 text-white md:w-56 md:flex-col dark:bg-slate-800">
          <span className="text-xs font-semibold tabular-nums text-slate-400">
            {String(index).padStart(2, '0')}
          </span>
          {editing ? (
            <div className="flex w-full flex-col gap-2">
              <Input
                value={department.name}
                onChange={(event) => onChange({ ...department, name: event.target.value })}
                placeholder="Department name"
                className="h-8 border-slate-600 bg-slate-800 text-white placeholder:text-slate-500 dark:bg-slate-900"
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
            <h3 className="text-lg font-semibold leading-tight">{department.name}</h3>
          )}
        </div>

        <div className="min-w-0 flex-1 divide-y divide-border">
          {department.functions.length === 0 && (
            <p className="px-4 py-4 text-sm text-muted-foreground">
              No functions listed for this department yet.
            </p>
          )}

          {department.functions.map((row, position) => (
            <div key={row.key} className={gridClass}>
              <div className="min-w-0">
                <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Sub-department
                </span>
                {editing ? (
                  <Input
                    value={row.name}
                    onChange={(event) => updateRow(row.key, { name: event.target.value })}
                    placeholder="Leave blank for the whole department"
                    className="mt-1 h-8 text-sm"
                  />
                ) : (
                  <p
                    className={cn(
                      'mt-1 text-sm font-medium',
                      !row.name && 'italic text-muted-foreground',
                    )}
                  >
                    {row.name || 'Whole department'}
                  </p>
                )}
              </div>

              {ORG_LEVELS.map((level) => (
                <div key={level.key} className="min-w-0">
                  <span
                    className={cn(
                      'text-[10px] font-semibold uppercase tracking-wider',
                      level.label_tone,
                    )}
                  >
                    {level.label}
                  </span>
                  <div className="mt-1">
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
                              'inline-flex rounded-md border px-2 py-0.5 text-sm font-medium',
                              level.chip,
                            )}
                          >
                            {name}
                          </span>
                        ))}
                      </div>
                    ) : (
                      <span className="text-sm text-muted-foreground">—</span>
                    )}
                  </div>
                </div>
              ))}

              {editing && (
                <div className="flex items-start gap-1 md:pt-4">
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
                    disabled={position === department.functions.length - 1}
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

          {editing && (
            <div className="px-4 py-3">
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
