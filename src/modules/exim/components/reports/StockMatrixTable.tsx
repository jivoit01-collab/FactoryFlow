/**
 * The Oil Stock matrix: oils down the side, the in-tank and outside-factory
 * columns, then a column group per stage split by vendor, and the total.
 *
 * It is as wide as the stages and vendors make it, so it scrolls sideways
 * inside its card (never the page), with the oil column pinned so a number
 * scrolled away from its oil can still be read.
 *
 * Arranging: a person allowed to change the shared order drags a row (or uses
 * its arrows); anybody can put a group break under a row, which is theirs alone.
 */
import {
  AlertTriangle,
  ChevronDown,
  ChevronRight,
  ChevronUp,
  GripVertical,
  Layers,
  SeparatorHorizontal,
  X,
} from 'lucide-react';
import { type ReactNode, useState } from 'react';
import { Link } from 'react-router-dom';

import { TABLE_CLASSES, TableEmpty, TableLoading, Th, THEAD_CLASSES } from '@/shared/components';
import { cn } from '@/shared/utils';

import { fmtAmount, fromKg, fromLitres, type OilUnit, stagePath } from './oilUnits';
import {
  type MatrixGroup,
  type MatrixLine,
  type Placement,
  sumKeys,
  type Sums,
  totalIn,
} from './stockMatrix';

/**
 * A pinned cell needs a solid background or the numbers show through it as
 * they scroll beneath. These are the table's own tints laid over the card
 * colour, so a pinned cell matches the row it sits in.
 */
const PIN_HEAD = 'bg-card bg-[linear-gradient(hsl(var(--muted)/0.4),hsl(var(--muted)/0.4))]';
const PIN_ROW =
  'bg-card group-hover:bg-[linear-gradient(hsl(var(--muted)/0.4),hsl(var(--muted)/0.4))]';
const PIN_SUB = 'bg-card bg-[linear-gradient(hsl(var(--muted)/0.7),hsl(var(--muted)/0.7))]';
/**
 * The rules round the pinned column. Drawn as shadows: a collapsed table's
 * borders belong to the grid and scroll away from a pinned cell.
 */
const PIN_EDGE =
  'sticky left-0 shadow-[inset_-1px_0_0_hsl(var(--border)),inset_0_-1px_0_hsl(var(--border))]';

/** The kit's header cell, a little tighter: the matrix has many columns. */
const HEAD = 'px-3 py-2';
const CELL = 'px-3 py-2 text-right tabular-nums whitespace-nowrap';

export interface StockMatrixTableProps {
  lines: MatrixLine[];
  groups: MatrixGroup[];
  showTank: boolean;
  showOutside: boolean;
  byVendor: boolean;
  unit: OilUnit;
  rounded: boolean;
  totals: Sums;
  isLoading: boolean;
  error: string | null;
  emptyMessage: string;
  emptyHint?: string;
  arrange: boolean;
  canReorder: boolean;
  wall: boolean;
  onPlace: (code: string, target: string, where: Placement) => void;
  onStep: (code: string, direction: 'up' | 'down') => void;
  onToggleBreak: (code: string) => void;
  onRemoveBreaks: (codes: string[]) => void;
}

function Amount({ value, rounded }: { value: number; rounded: boolean }) {
  if (value === 0) return <span className="text-muted-foreground/50">·</span>;
  return <>{fmtAmount(value, rounded)}</>;
}

function IconButton({
  label,
  onClick,
  disabled,
  pressed,
  children,
}: {
  label: string;
  onClick: () => void;
  disabled?: boolean;
  pressed?: boolean;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      aria-pressed={pressed}
      disabled={disabled}
      onClick={onClick}
      className={cn(
        'grid h-7 w-7 shrink-0 place-items-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:pointer-events-none disabled:opacity-30',
        pressed && 'bg-primary/10 text-primary hover:bg-primary/15 hover:text-primary',
      )}
    >
      {children}
    </button>
  );
}

export function StockMatrixTable({
  lines,
  groups,
  showTank,
  showOutside,
  byVendor,
  unit,
  rounded,
  totals,
  isLoading,
  error,
  emptyMessage,
  emptyHint,
  arrange,
  canReorder,
  wall,
  onPlace,
  onStep,
  onToggleBreak,
  onRemoveBreaks,
}: StockMatrixTableProps) {
  const [dragging, setDragging] = useState<string | null>(null);
  const [over, setOver] = useState<{ id: string; where: Placement } | null>(null);

  const keys = groups.flatMap((group) => group.sourceKeys);
  const valueColumns = groups.reduce((sum, group) => sum + group.columns.length, 0);
  const colSpan = 2 + (showTank ? 1 : 0) + (showOutside ? 1 : 0) + valueColumns;
  const canDrag = arrange && canReorder;
  const splitStatuses = byVendor && groups.some((group) => group.columns.length > 1);
  const oilLines = lines.filter((line) => line.kind === 'oil');
  const firstCode = oilLines[0]?.kind === 'oil' ? oilLines[0].oil.code : null;
  const lastLine = oilLines[oilLines.length - 1];
  const lastCode = lastLine?.kind === 'oil' ? lastLine.oil.code : null;

  const size = wall ? 'text-base' : 'text-sm';

  function clearDrag() {
    setDragging(null);
    setOver(null);
  }

  function hover(id: string, where: Placement) {
    setOver((current) => (current?.id === id && current.where === where ? current : { id, where }));
  }

  function halfOf(event: React.DragEvent<HTMLElement>): Placement {
    const rect = event.currentTarget.getBoundingClientRect();
    return event.clientY < rect.top + rect.height / 2 ? 'before' : 'after';
  }

  /** The figures of a row or subtotal, cell by cell after the pinned oil column. */
  function figureCells(sums: Sums) {
    return (
      <>
        {showTank && (
          <td className={CELL}>
            <Amount value={fromLitres(sums.tankL, unit)} rounded={rounded} />
          </td>
        )}
        {showOutside && (
          <td className={CELL}>
            <Amount value={fromKg(sums.outsideKg, unit)} rounded={rounded} />
          </td>
        )}
        {groups.map((group) =>
          group.columns.map((column, index) => (
            <td key={column.key} className={cn(CELL, index === 0 && 'border-l')}>
              <Amount
                value={fromKg(sumKeys(sums.values, column.sourceKeys), unit)}
                rounded={rounded}
              />
            </td>
          )),
        )}
        <td className={cn(CELL, 'border-l font-semibold')}>
          <Amount value={totalIn(unit, sums, keys)} rounded={rounded} />
        </td>
      </>
    );
  }

  const body = (() => {
    if (isLoading) return <TableLoading colSpan={colSpan} message="Reading the stock…" />;
    if (error) {
      return (
        <TableEmpty
          colSpan={colSpan}
          icon={AlertTriangle}
          message="The stock could not be read"
          hint={error}
        />
      );
    }
    if (lines.length === 0) {
      return <TableEmpty colSpan={colSpan} icon={Layers} message={emptyMessage} hint={emptyHint} />;
    }
    return lines.map((line) => {
      if (line.kind === 'subtotal') {
        const target = line.anchors[line.anchors.length - 1];
        const dropHere = !!dragging && !!target;
        return (
          <tr
            key={line.id}
            className={cn(
              'border-y bg-muted/70 font-medium',
              over?.id === line.id && '[&>td]:shadow-[inset_0_-2px_0_0_hsl(var(--primary))]',
            )}
            onDragOver={
              dropHere
                ? (event) => {
                    event.preventDefault();
                    event.dataTransfer.dropEffect = 'move';
                    hover(line.id, 'group-start');
                  }
                : undefined
            }
            onDragLeave={dropHere ? () => setOver(null) : undefined}
            onDrop={
              dropHere
                ? (event) => {
                    event.preventDefault();
                    if (dragging && target) onPlace(dragging, target, 'group-start');
                    clearDrag();
                  }
                : undefined
            }
          >
            <td className={cn(PIN_EDGE, PIN_SUB, 'z-10 px-3 py-2')}>
              <span className="flex items-center justify-between gap-2">
                <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Subtotal
                </span>
                {arrange && line.anchors.length > 0 && (
                  <IconButton
                    label="Remove this break"
                    onClick={() => onRemoveBreaks(line.anchors)}
                  >
                    <X className="h-3.5 w-3.5" />
                  </IconButton>
                )}
              </span>
            </td>
            {figureCells(line.sums)}
          </tr>
        );
      }

      const { oil } = line;
      const isOver = over?.id === oil.code && dragging !== oil.code;
      return (
        <tr
          key={oil.code}
          draggable={canDrag}
          onDragStart={
            canDrag
              ? (event) => {
                  setDragging(oil.code);
                  event.dataTransfer.effectAllowed = 'move';
                  event.dataTransfer.setData('text/plain', oil.code);
                }
              : undefined
          }
          onDragOver={
            canDrag && dragging
              ? (event) => {
                  event.preventDefault();
                  event.dataTransfer.dropEffect = 'move';
                  hover(oil.code, halfOf(event));
                }
              : undefined
          }
          onDrop={
            canDrag && dragging
              ? (event) => {
                  event.preventDefault();
                  onPlace(dragging, oil.code, halfOf(event));
                  clearDrag();
                }
              : undefined
          }
          onDragEnd={canDrag ? clearDrag : undefined}
          className={cn(
            'group border-b transition-colors hover:bg-muted/40',
            dragging === oil.code && 'opacity-50',
            isOver &&
              over?.where === 'before' &&
              '[&>td]:shadow-[inset_0_2px_0_0_hsl(var(--primary))]',
            isOver &&
              over?.where === 'after' &&
              '[&>td]:shadow-[inset_0_-2px_0_0_hsl(var(--primary))]',
          )}
        >
          <td className={cn(PIN_EDGE, PIN_ROW, 'z-10 px-3 py-2')}>
            <div className="flex items-center gap-2">
              {canDrag && (
                <GripVertical
                  className="h-4 w-4 shrink-0 cursor-grab text-muted-foreground active:cursor-grabbing"
                  aria-hidden="true"
                />
              )}
              <div className="min-w-0 flex-1">
                <span
                  className="block max-w-[8rem] truncate font-medium sm:max-w-[15rem]"
                  title={oil.name}
                >
                  {oil.name || oil.code}
                </span>
                <span className="block font-mono text-xs text-muted-foreground">{oil.code}</span>
              </div>
              {arrange && (
                <div className="flex shrink-0 items-center">
                  {canReorder && (
                    <>
                      <IconButton
                        label={`Move ${oil.name || oil.code} up`}
                        onClick={() => onStep(oil.code, 'up')}
                        disabled={oil.code === firstCode}
                      >
                        <ChevronUp className="h-4 w-4" />
                      </IconButton>
                      <IconButton
                        label={`Move ${oil.name || oil.code} down`}
                        onClick={() => onStep(oil.code, 'down')}
                        disabled={oil.code === lastCode}
                      >
                        <ChevronDown className="h-4 w-4" />
                      </IconButton>
                    </>
                  )}
                  <IconButton
                    label={
                      line.breakBelow
                        ? `Remove the break under ${oil.name || oil.code}`
                        : `Break under ${oil.name || oil.code} and subtotal the group`
                    }
                    pressed={line.breakBelow}
                    onClick={() => onToggleBreak(oil.code)}
                  >
                    <SeparatorHorizontal className="h-4 w-4" />
                  </IconButton>
                </div>
              )}
            </div>
          </td>
          {figureCells({ tankL: oil.tankL, outsideKg: oil.outsideKg, values: oil.values })}
        </tr>
      );
    });
  })();

  const ready = !isLoading && !error && lines.length > 0;

  return (
    <table className={cn(TABLE_CLASSES, size)}>
      <thead className={THEAD_CLASSES}>
        <tr>
          <Th
            rowSpan={byVendor ? 2 : 1}
            className={cn(PIN_EDGE, PIN_HEAD, HEAD, 'z-20 min-w-[10rem] border-b')}
          >
            Oil
          </Th>
          {showTank && (
            <Th align="right" rowSpan={byVendor ? 2 : 1} className={cn(HEAD, 'border-b')}>
              <Link
                to={stagePath('IN_TANK')}
                className="inline-flex items-center gap-0.5 whitespace-nowrap hover:text-foreground"
              >
                In tank
                <ChevronRight className="h-3 w-3" />
              </Link>
            </Th>
          )}
          {showOutside && (
            <Th align="right" rowSpan={byVendor ? 2 : 1} className={cn(HEAD, 'border-b')}>
              <Link
                to={stagePath('OUT_SIDE_FACTORY')}
                className="inline-flex items-center gap-0.5 whitespace-nowrap hover:text-foreground"
              >
                Outside factory
                <ChevronRight className="h-3 w-3" />
              </Link>
            </Th>
          )}
          {groups.map((group) => (
            <Th
              key={group.status}
              scope="colgroup"
              colSpan={group.columns.length}
              align={byVendor ? 'center' : 'right'}
              className={cn(HEAD, 'border-b border-l')}
            >
              <Link
                to={stagePath(group.status)}
                className="inline-flex items-center gap-0.5 whitespace-nowrap hover:text-foreground"
                title={`Open ${group.label.toLowerCase()}: its oils and lots`}
              >
                {group.label}
                <ChevronRight className="h-3 w-3" />
              </Link>
            </Th>
          ))}
          <Th align="right" rowSpan={byVendor ? 2 : 1} className={cn(HEAD, 'border-b border-l')}>
            Total
          </Th>
        </tr>
        {byVendor && (
          <tr>
            {groups.map((group) =>
              group.columns.map((column, index) => (
                <Th
                  key={column.key}
                  align="right"
                  className={cn(HEAD, 'border-b font-medium', index === 0 && 'border-l')}
                >
                  <span className="ml-auto block max-w-[9rem] truncate" title={column.label}>
                    {column.label}
                  </span>
                </Th>
              )),
            )}
          </tr>
        )}
      </thead>
      <tbody>{body}</tbody>
      {ready && (
        <tfoot className="font-semibold">
          <tr className="bg-muted/40">
            <td className={cn(PIN_EDGE, PIN_HEAD, 'z-10 border-t-2 px-3 py-2.5')}>Total</td>
            {showTank && (
              <td className={cn(CELL, 'border-t-2')}>
                <Amount value={fromLitres(totals.tankL, unit)} rounded={rounded} />
              </td>
            )}
            {showOutside && (
              <td className={cn(CELL, 'border-t-2')}>
                <Amount value={fromKg(totals.outsideKg, unit)} rounded={rounded} />
              </td>
            )}
            {groups.map((group) =>
              group.columns.map((column, index) => (
                <td key={column.key} className={cn(CELL, 'border-t-2', index === 0 && 'border-l')}>
                  <Amount
                    value={fromKg(sumKeys(totals.values, column.sourceKeys), unit)}
                    rounded={rounded}
                  />
                </td>
              )),
            )}
            <td className={cn(CELL, 'border-l border-t-2 text-foreground')}>
              <Amount value={totalIn(unit, totals, keys)} rounded={rounded} />
            </td>
          </tr>
          {splitStatuses && (
            <tr className="bg-muted/40">
              <td className={cn(PIN_EDGE, PIN_HEAD, 'z-10 border-t px-3 py-2.5')}>
                <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  By stage
                </span>
              </td>
              {showTank && <td className="border-t" />}
              {showOutside && <td className="border-t" />}
              {groups.map((group) => (
                <td
                  key={group.status}
                  colSpan={group.columns.length}
                  className={cn(CELL, 'border-l border-t text-center')}
                >
                  <Amount
                    value={fromKg(sumKeys(totals.values, group.sourceKeys), unit)}
                    rounded={rounded}
                  />
                </td>
              ))}
              <td className="border-l border-t" />
            </tr>
          )}
        </tfoot>
      )}
    </table>
  );
}
