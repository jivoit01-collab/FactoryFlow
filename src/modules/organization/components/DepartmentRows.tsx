import { ChevronDown, ChevronUp, Plus, Trash2 } from 'lucide-react';
import { Fragment } from 'react';

import { Button, Input } from '@/shared/components/ui';
import { cn } from '@/shared/utils';

import type { OrgDepartmentDraft, OrgFunctionDraft, OrgLevelKey } from '../types';
import { CHART } from './chartTheme';
import { ORG_LEVELS } from './levels';
import { PeopleEditor } from './PeopleEditor';

interface DepartmentRowsProps {
  /** Position on the chart, 1-based — the "1." printed before the name. */
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
  return {
    key: `new-row-${rowKeySeed}`,
    name: '',
    subtitle: '',
    owners: [],
    level_1: [],
    level_2: [],
  };
}

/** How a row is referred to out loud: "Storage – OIL", or the department itself. */
function rowLabel(row: OrgFunctionDraft, departmentName: string) {
  if (row.name && row.subtitle) return `${row.name} – ${row.subtitle}`;
  return row.name || row.subtitle || departmentName || 'this department';
}

/**
 * The names at one level, as the chart prints them: "Raspreet, Lovepreet, Gopi".
 *
 * Each name is its own element with the comma between them rather than inside
 * them, so a name stays a thing you can point at — select it, search for it,
 * read it out — instead of dissolving into one run of text.
 */
function People({ names, className }: { names: string[]; className: string }) {
  if (!names.length) return <span className="text-muted-foreground/60">—</span>;
  return (
    <span className={className}>
      {names.map((name, position) => (
        <Fragment key={name}>
          {position > 0 && <span aria-hidden>, </span>}
          <span>{name}</span>
        </Fragment>
      ))}
    </span>
  );
}

/**
 * One department's block of the chart: its rail on the left, spanning as many
 * rows as it has sections, and one row per section across the five columns.
 *
 * A `tbody` per department is what makes the rail work — the department cell
 * carries `rowSpan` over its own sections and nothing else, so blocks stay
 * separate however many sections each one grows.
 *
 * The same component draws the chart and edits it: a section keeps its place in
 * the table when Edit is pressed, so nobody has to re-find the line they came
 * to change.
 */
export function DepartmentRows({
  index,
  department,
  editing,
  isFirst,
  isLast,
  onChange,
  onMove,
  onDelete,
}: DepartmentRowsProps) {
  const rows = department.functions;
  const columnCount = editing ? 6 : 5;

  const updateRow = (rowKey: string, patch: Partial<OrgFunctionDraft>) => {
    onChange({
      ...department,
      functions: rows.map((row) => (row.key === rowKey ? { ...row, ...patch } : row)),
    });
  };

  const updateLevel = (rowKey: string, level: OrgLevelKey, names: string[]) => {
    onChange({
      ...department,
      functions: rows.map((row) => {
        if (row.key !== rowKey) return row;
        const next: OrgFunctionDraft = { ...row };
        next[level] = names;
        return next;
      }),
    });
  };

  const moveRow = (position: number, direction: -1 | 1) => {
    const target = position + direction;
    if (target < 0 || target >= rows.length) return;
    const functions = [...rows];
    [functions[position], functions[target]] = [functions[target], functions[position]];
    onChange({ ...department, functions });
  };

  const removeRow = (rowKey: string) => {
    onChange({ ...department, functions: rows.filter((row) => row.key !== rowKey) });
  };

  const addRow = () => onChange({ ...department, functions: [...rows, newRow()] });

  /** The rail: the numbered name, whoever heads the whole department, controls. */
  const departmentCell = (
    <td
      rowSpan={Math.max(rows.length, 1)}
      className={cn(
        'w-56 min-w-[13rem] border-r p-4 align-top',
        CHART.departmentCell,
        CHART.line,
      )}
    >
      {editing ? (
        <div className="space-y-2">
          <Input
            value={department.name}
            onChange={(event) => onChange({ ...department, name: event.target.value })}
            placeholder="Department name"
            aria-label={`Name of department ${index}`}
            className="h-8 bg-background text-sm font-semibold"
          />
          <Input
            value={department.head}
            onChange={(event) => onChange({ ...department, head: event.target.value })}
            placeholder="Department head (optional)"
            aria-label={`Head of ${department.name || `department ${index}`}`}
            className="h-7 bg-background text-xs"
          />
          <div className="flex items-center gap-0.5">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-7 px-1.5"
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
              className="h-7 px-1.5"
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
              className="h-7 px-1.5 text-destructive hover:text-destructive"
              onClick={onDelete}
              aria-label={`Delete ${department.name || 'department'}`}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
          <Button type="button" variant="outline" size="sm" className="h-7" onClick={addRow}>
            <Plus className="mr-1.5 h-3.5 w-3.5" />
            Add section
          </Button>
        </div>
      ) : (
        <>
          <p className={cn('text-[15px] font-semibold leading-snug', CHART.departmentName)}>
            {/* The number and the name are separate so the name stays a thing
                you can select, search for and read on its own. */}
            <span className="tabular-nums">{index}.</span> <span>{department.name}</span>
          </p>
          {department.head && (
            <p className="mt-0.5 text-[13px] text-muted-foreground">{department.head}</p>
          )}
        </>
      )}
    </td>
  );

  if (!rows.length) {
    return (
      <tbody className={cn('border-t', CHART.line)}>
        <tr>
          {departmentCell}
          <td colSpan={columnCount - 1} className="p-4 text-sm text-muted-foreground">
            No sections listed for this department yet.
          </td>
        </tr>
      </tbody>
    );
  }

  return (
    <tbody className={cn('border-t', CHART.line)}>
      {rows.map((row, position) => (
        <tr
          key={row.key}
          className={cn(
            position > 0 && cn('border-t', CHART.line),
            position % 2 === 1 && CHART.stripe,
          )}
        >
          {position === 0 && departmentCell}

          <td className="min-w-[11rem] p-4 align-top">
            {editing ? (
              <div className="space-y-1">
                <Input
                  value={row.name}
                  onChange={(event) => updateRow(row.key, { name: event.target.value })}
                  placeholder="Leave blank for the whole department"
                  className="h-8 bg-background text-sm"
                />
                <Input
                  value={row.subtitle}
                  onChange={(event) => updateRow(row.key, { subtitle: event.target.value })}
                  placeholder="Second line (optional)"
                  aria-label={`Second line for ${rowLabel(row, department.name)}`}
                  className="h-7 bg-background text-xs"
                />
              </div>
            ) : (
              <>
                <p
                  className={cn(
                    'text-[15px] font-semibold leading-snug',
                    !row.name && !row.subtitle && 'font-normal italic text-muted-foreground',
                  )}
                >
                  {row.name || (row.subtitle ? '' : 'Whole department')}
                </p>
                {row.subtitle && (
                  <p className="mt-0.5 text-[13px] text-muted-foreground">{row.subtitle}</p>
                )}
              </>
            )}
          </td>

          {ORG_LEVELS.map((level) => (
            <td key={level.key} className="min-w-[10rem] p-4 align-top text-[15px]">
              {editing ? (
                <PeopleEditor
                  value={row[level.key]}
                  onChange={(names) => updateLevel(row.key, level.key, names)}
                  chipClassName={level.chip}
                  fieldLabel={`${level.label} for ${rowLabel(row, department.name)}`}
                />
              ) : (
                <People
                  names={row[level.key]}
                  className={cn(
                    level.key === 'owners' ? cn('font-semibold', CHART.leader) : CHART.people,
                  )}
                />
              )}
            </td>
          ))}

          {editing && (
            <td className="w-24 p-2 align-top">
              <div className="flex items-start gap-0.5">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-7 px-1.5"
                  disabled={position === 0}
                  onClick={() => moveRow(position, -1)}
                  aria-label={`Move ${rowLabel(row, department.name)} up`}
                >
                  <ChevronUp className="h-4 w-4" />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-7 px-1.5"
                  disabled={position === rows.length - 1}
                  onClick={() => moveRow(position, 1)}
                  aria-label={`Move ${rowLabel(row, department.name)} down`}
                >
                  <ChevronDown className="h-4 w-4" />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-7 px-1.5 text-destructive hover:text-destructive"
                  onClick={() => removeRow(row.key)}
                  aria-label={`Delete ${rowLabel(row, department.name)}`}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </td>
          )}
        </tr>
      ))}
    </tbody>
  );
}
