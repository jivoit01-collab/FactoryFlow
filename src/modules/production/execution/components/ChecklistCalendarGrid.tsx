import { useMemo } from 'react';

import { cn } from '@/shared/utils';
import { Input } from '@/shared/components/ui';

import { ChecklistCellPopover } from './ChecklistCellPopover';
import type { ChecklistFrequency, ChecklistStatus, ChecklistTemplate, MachineChecklistEntry } from '../types';

interface ChecklistCalendarGridProps {
  templates: ChecklistTemplate[];
  entries: MachineChecklistEntry[];
  month: number;
  year: number;
  frequency: ChecklistFrequency;
  disabled?: boolean;
  onCellChange: (templateId: number, day: number, status: ChecklistStatus) => void;
  onSignatureChange: (day: number, field: 'operator' | 'shift_incharge', value: string) => void;
}

function getDaysInMonth(year: number, month: number): number {
  return new Date(year, month, 0).getDate();
}

function getColumnLabels(frequency: ChecklistFrequency, month: number, year: number): string[] {
  if (frequency === 'DAILY') {
    const days = getDaysInMonth(year, month);
    return Array.from({ length: days }, (_, i) => String(i + 1));
  }
  if (frequency === 'WEEKLY') {
    return ['Week 1', 'Week 2', 'Week 3', 'Week 4'];
  }
  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return [monthNames[month - 1] || ''];
}

export function ChecklistCalendarGrid({
  templates,
  entries,
  month,
  year,
  frequency,
  disabled = false,
  onCellChange,
  onSignatureChange,
}: ChecklistCalendarGridProps) {
  const columns = useMemo(() => getColumnLabels(frequency, month, year), [frequency, month, year]);

  const today = new Date();
  const todayDay = today.getDate();
  const isCurrentMonth = today.getMonth() + 1 === month && today.getFullYear() === year;

  // Build a lookup: { templateId: { day: entry } }
  const entryMap = useMemo(() => {
    const map: Record<number, Record<number, MachineChecklistEntry>> = {};
    entries.forEach((e) => {
      if (!map[e.template]) map[e.template] = {};
      const day = new Date(e.date).getDate();
      map[e.template][day] = e;
    });
    return map;
  }, [entries]);

  // Signature lookup: { day: { operator, shift_incharge } }
  const signatureMap = useMemo(() => {
    const map: Record<number, { operator: string; shift_incharge: string }> = {};
    entries.forEach((e) => {
      const day = new Date(e.date).getDate();
      if (!map[day]) map[day] = { operator: '', shift_incharge: '' };
      if (e.operator) map[day].operator = e.operator;
      if (e.shift_incharge) map[day].shift_incharge = e.shift_incharge;
    });
    return map;
  }, [entries]);

  if (templates.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground text-sm">
        No checklist templates found for this configuration.
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-lg border">
      <table className="text-xs">
        <thead>
          <tr className="border-b bg-muted/50">
            <th className="sticky left-0 z-10 bg-muted/50 min-w-[220px] px-3 py-2.5 text-left font-medium">
              Task
            </th>
            {columns.map((col, i) => {
              const isColToday = frequency === 'DAILY' && isCurrentMonth && i + 1 === todayDay;
              return (
                <th
                  key={col}
                  className={cn(
                    'px-1 py-2.5 text-center font-medium min-w-[44px]',
                    isColToday && 'border-t-2 border-t-blue-500',
                  )}
                >
                  {col}
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody>
          {templates.map((template) => (
            <tr key={template.id} className="border-b last:border-0">
              <td className="sticky left-0 z-10 bg-background px-3 py-1.5 font-medium text-muted-foreground border-r">
                {template.task}
              </td>
              {columns.map((_, colIdx) => {
                const day = colIdx + 1;
                const entry = entryMap[template.id]?.[day];
                const cellStatus = entry?.status ?? null;
                const isColToday = frequency === 'DAILY' && isCurrentMonth && day === todayDay;
                const isFuture = frequency === 'DAILY' && isCurrentMonth && day > todayDay;

                return (
                  <td key={colIdx} className="px-1 py-1 text-center">
                    <ChecklistCellPopover
                      status={cellStatus}
                      disabled={disabled || isFuture}
                      isToday={isColToday}
                      onChange={(status) => onCellChange(template.id, day, status)}
                    />
                  </td>
                );
              })}
            </tr>
          ))}

          {/* Operator row */}
          <tr className="border-t-2 bg-muted/30">
            <td className="sticky left-0 z-10 bg-muted/30 px-3 py-1.5 font-bold border-r">
              Operator
            </td>
            {columns.map((_, colIdx) => {
              const day = colIdx + 1;
              const sig = signatureMap[day];
              return (
                <td key={colIdx} className="px-1 py-1 text-center">
                  <Input
                    value={sig?.operator ?? ''}
                    disabled={disabled}
                    placeholder="—"
                    className="h-7 w-10 text-center text-xs p-0"
                    onChange={(e) => onSignatureChange(day, 'operator', e.target.value)}
                  />
                </td>
              );
            })}
          </tr>

          {/* Shift Incharge row */}
          <tr className="bg-muted/30">
            <td className="sticky left-0 z-10 bg-muted/30 px-3 py-1.5 font-bold border-r">
              Shift Incharge
            </td>
            {columns.map((_, colIdx) => {
              const day = colIdx + 1;
              const sig = signatureMap[day];
              return (
                <td key={colIdx} className="px-1 py-1 text-center">
                  <Input
                    value={sig?.shift_incharge ?? ''}
                    disabled={disabled}
                    placeholder="—"
                    className="h-7 w-10 text-center text-xs p-0"
                    onChange={(e) => onSignatureChange(day, 'shift_incharge', e.target.value)}
                  />
                </td>
              );
            })}
          </tr>
        </tbody>
      </table>
    </div>
  );
}
