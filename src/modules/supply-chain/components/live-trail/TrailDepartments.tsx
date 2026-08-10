/** Who has to do what.
 *
 * The brief's first complaint is that five departments each keep their own view
 * and coordination between them is manual. One shared set of numbers fixes half
 * of that; this is the other half — every issue on the trail sitting on exactly
 * one desk, with the date it missed and the evidence to check it.
 *
 * A department with nothing to do still gets a card saying so. A card that
 * disappears when it is clear looks exactly like a card nobody built, and the
 * point of a board is that silence is informative.
 */
import { ChevronDown } from 'lucide-react';
import { useState } from 'react';

import { Card, CardContent } from '@/shared/components/ui';
import { cn } from '@/shared/utils';

import type { Department, DepartmentAction, LiveTrail } from '../../types';
import { inr, n0, onDate } from './trail-format';
import { TrailPill } from './TrailPill';

/** Enough to act on without the card becoming a document. */
const VISIBLE_ACTIONS = 4;

export function TrailDepartments({
  data,
  onOpenSubject,
}: {
  data: LiveTrail;
  onOpenSubject: (kind: 'sku' | 'component', code: string) => void;
}) {
  const [open, setOpen] = useState<string | null>(
    // Open whichever desk is most on fire, so the page arrives on the problem
    // rather than on a menu.
    data.departments.find((d) => d.critical > 0)?.code ?? null,
  );

  return (
    <div className="space-y-2">
      {data.departments.map((department) => (
        <DepartmentCard
          key={department.code}
          department={department}
          open={open === department.code}
          onToggle={() =>
            setOpen(open === department.code ? null : department.code)
          }
          onOpenSubject={onOpenSubject}
        />
      ))}
    </div>
  );
}

function DepartmentCard({
  department,
  open,
  onToggle,
  onOpenSubject,
}: {
  department: Department;
  open: boolean;
  onToggle: () => void;
  onOpenSubject: (kind: 'sku' | 'component', code: string) => void;
}) {
  const [all, setAll] = useState(false);
  const clear = department.total === 0;
  const actions = all
    ? department.actions
    : department.actions.slice(0, VISIBLE_ACTIONS);

  return (
    <Card
      className={cn(
        'overflow-hidden border-l-4',
        department.critical > 0
          ? 'border-l-destructive'
          : department.plan > 0
            ? 'border-l-amber-500'
            : clear
              ? 'border-l-emerald-600'
              : 'border-l-muted-foreground/40',
      )}
    >
      <button
        type="button"
        onClick={onToggle}
        disabled={clear}
        className={cn(
          'flex w-full items-start gap-3 p-3 text-left transition-colors',
          !clear && 'hover:bg-muted/50',
        )}
      >
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm font-semibold">{department.label}</span>
            {department.critical > 0 && (
              <TrailPill tone="critical" glyph="▲">
                {department.critical} past due
              </TrailPill>
            )}
            {department.plan > 0 && (
              <TrailPill tone="warn" glyph="●">
                {department.plan} to schedule
              </TrailPill>
            )}
            {department.watch > 0 && (
              <TrailPill glyph="·">{department.watch} to decide</TrailPill>
            )}
            {clear && (
              <TrailPill tone="good" glyph="✓">
                clear
              </TrailPill>
            )}
          </div>
          <p className="mt-1 truncate text-xs text-muted-foreground">
            {clear ? department.remit : department.headline}
          </p>
        </div>

        {!clear && (
          <ChevronDown
            className={cn(
              'mt-0.5 h-4 w-4 shrink-0 text-muted-foreground transition-transform',
              open && 'rotate-180',
            )}
          />
        )}
      </button>

      {open && !clear && (
        <CardContent className="space-y-2 border-t p-3 pt-3">
          {actions.map((action) => (
            <ActionRow
              key={action.id}
              action={action}
              onOpenSubject={onOpenSubject}
            />
          ))}

          {department.actions.length > VISIBLE_ACTIONS && (
            <button
              type="button"
              onClick={() => setAll(!all)}
              className="text-xs font-medium text-muted-foreground underline-offset-2 hover:underline"
            >
              {all
                ? 'Show less'
                : `Show all ${department.actions.length} actions`}
            </button>
          )}
        </CardContent>
      )}
    </Card>
  );
}

function ActionRow({
  action,
  onOpenSubject,
}: {
  action: DepartmentAction;
  onOpenSubject: (kind: 'sku' | 'component', code: string) => void;
}) {
  const openable = action.subject.kind === 'sku' || action.subject.kind === 'component';

  return (
    <div
      role={openable ? 'button' : undefined}
      tabIndex={openable ? 0 : undefined}
      onClick={() =>
        openable &&
        onOpenSubject(action.subject.kind as 'sku' | 'component', action.subject.code)
      }
      onKeyDown={(event) => {
        if (openable && (event.key === 'Enter' || event.key === ' ')) {
          event.preventDefault();
          onOpenSubject(action.subject.kind as 'sku' | 'component', action.subject.code);
        }
      }}
      className={cn(
        'rounded-md border p-2.5',
        openable && 'cursor-pointer hover:bg-muted/50',
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <p className="text-[13px] font-medium leading-snug">{action.title}</p>
        {action.severity === 'CRITICAL' ? (
          <TrailPill tone="critical" glyph="▲">
            now
          </TrailPill>
        ) : action.severity === 'PLAN' ? (
          <TrailPill tone="warn" glyph="●">
            schedule
          </TrailPill>
        ) : (
          <TrailPill glyph="·">decide</TrailPill>
        )}
      </div>

      <p className="mt-1 text-xs leading-snug text-muted-foreground">{action.detail}</p>

      <div className="mt-1.5 flex flex-wrap gap-x-4 gap-y-0.5 text-[11px] text-muted-foreground">
        {action.due && (
          <span>
            Due {onDate(action.due)}
            {action.days_late > 0 && ` · ${n0(action.days_late)} d late`}
          </span>
        )}
        {action.value > 0 && <span>{inr(action.value)}</span>}
        {action.blocks.length > 0 && (
          <span>Holds up {action.blocks.slice(0, 2).join(', ')}</span>
        )}
      </div>
    </div>
  );
}
