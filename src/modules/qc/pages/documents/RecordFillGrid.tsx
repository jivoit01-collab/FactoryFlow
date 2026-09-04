import { Plus } from 'lucide-react';
import { Fragment, useMemo } from 'react';

import { Button, Input } from '@/shared/components/ui';
import { cn } from '@/shared/utils';

import type { QCRecord, RecordTemplateParameter } from '../../types/qcRecord.types';
import { cellKey, toHHMM } from '../../utils/recordGrid';

interface RecordFillGridProps {
  record: QCRecord;
  /** Pending edits, keyed by `${slotTime}|${parameterId}`. */
  drafts: Record<string, string>;
  onCellChange: (slotTime: string, parameterId: number, value: string) => void;
  onAddTimeSlot: () => void;
  readOnly: boolean;
}

/**
 * The paper form, on screen: parameters down the left with their frequency
 * and specification, one column per observation time across the top.
 *
 * Cells the backend judged out of spec are tinted red. That verdict is always
 * the server's — an edited cell shows as pending until saved rather than
 * guessing a verdict the backend might disagree with.
 */
export default function RecordFillGrid({
  record,
  drafts,
  onCellChange,
  onAddTimeSlot,
  readOnly,
}: RecordFillGridProps) {
  const slots = record.time_slots;

  // (slotId, parameterId) -> stored value, for O(1) lookup while rendering.
  const stored = useMemo(() => {
    const map = new Map<string, { value: string; inSpec: boolean | null }>();
    const slotTimeById = new Map(slots.map((slot) => [slot.id, slot.slot_time]));
    record.values.forEach((value) => {
      const slotTime = slotTimeById.get(value.time_slot);
      if (slotTime) {
        map.set(cellKey(slotTime, value.parameter), {
          value: value.value,
          inSpec: value.in_spec,
        });
      }
    });
    return map;
  }, [record.values, slots]);

  const renderCell = (parameter: RecordTemplateParameter, slotTime: string) => {
    const key = cellKey(slotTime, parameter.id);
    const saved = stored.get(key);
    const isDirty = key in drafts;
    const value = isDirty ? drafts[key] : (saved?.value ?? '');

    const outOfSpec = !isDirty && saved?.inSpec === false;
    const inSpec = !isDirty && saved?.inSpec === true;

    const className = cn(
      'h-8 w-full min-w-[7rem] text-sm',
      outOfSpec && 'border-red-400 bg-red-50 font-semibold text-red-700',
      inSpec && 'border-green-300 bg-green-50/60',
      isDirty && 'border-amber-400 bg-amber-50',
    );

    // A CHOICE cell is a suggestion list, not a closed set: the printed
    // options cover the usual cases, but the operator must be able to record
    // whatever was actually observed. `list` gives the dropdown while leaving
    // the field freely typeable.
    const suggestionListId =
      parameter.value_type === 'CHOICE' && parameter.allowed_values.length > 0
        ? `param-options-${parameter.id}`
        : undefined;

    return (
      <Input
        value={value}
        disabled={readOnly}
        list={suggestionListId}
        inputMode={parameter.value_type === 'NUMBER' ? 'decimal' : 'text'}
        placeholder={suggestionListId ? 'Select or type…' : undefined}
        className={className}
        onChange={(event) => onCellChange(slotTime, parameter.id, event.target.value)}
      />
    );
  };

  // One datalist per CHOICE parameter, rendered once outside the table — an
  // id must be unique in the document, so these cannot live inside the cells.
  const choiceParameters = record.template_detail.sections
    .flatMap((section) => section.parameters)
    .filter(
      (parameter) => parameter.value_type === 'CHOICE' && parameter.allowed_values.length > 0,
    );

  return (
    <div className="overflow-x-auto rounded-lg border">
      {choiceParameters.map((parameter) => (
        <datalist key={parameter.id} id={`param-options-${parameter.id}`}>
          {parameter.allowed_values.map((option) => (
            <option key={option} value={option} />
          ))}
        </datalist>
      ))}

      <table className="w-full border-collapse text-sm">
        <thead>
          <tr className="border-b bg-muted/50 text-left">
            <th className="w-14 border-r px-2 py-2 font-medium">Sr.No.</th>
            <th className="min-w-[10rem] border-r px-2 py-2 font-medium">Parameter</th>
            <th className="min-w-[12rem] border-r px-2 py-2 font-medium">Frequency</th>
            <th className="min-w-[12rem] border-r px-2 py-2 font-medium">Specification</th>
            {slots.map((slot) => (
              <th key={slot.id} className="border-r px-2 py-2 text-center font-medium">
                {toHHMM(slot.slot_time)}
              </th>
            ))}
            <th className="px-2 py-2">
              {!readOnly && (
                <Button variant="outline" size="sm" onClick={onAddTimeSlot}>
                  <Plus className="mr-1 h-3 w-3" />
                  Time
                </Button>
              )}
            </th>
          </tr>
        </thead>

        <tbody>
          {record.template_detail.sections.map((section) => (
            <Fragment key={section.id}>
              <tr className="border-b bg-muted/30">
                <td colSpan={5 + slots.length} className="px-2 py-1.5 text-sm font-semibold">
                  {section.title}
                </td>
              </tr>

              {section.parameters.map((parameter) => (
                <tr key={parameter.id} className="border-b last:border-0">
                  <td className="border-r px-2 py-1.5 text-muted-foreground">{parameter.sr_no}</td>
                  <td className="border-r px-2 py-1.5 font-medium">
                    {parameter.name}
                    {parameter.unit && (
                      <span className="ml-1 text-xs text-muted-foreground">({parameter.unit})</span>
                    )}
                  </td>
                  <td className="border-r px-2 py-1.5 text-xs text-muted-foreground">
                    {parameter.frequency}
                  </td>
                  <td className="border-r px-2 py-1.5 text-xs">{parameter.specification}</td>
                  {slots.map((slot) => (
                    <td key={slot.id} className="border-r px-1 py-1">
                      {renderCell(parameter, slot.slot_time)}
                    </td>
                  ))}
                  <td />
                </tr>
              ))}
            </Fragment>
          ))}
        </tbody>
      </table>

      {slots.length === 0 && (
        <div className="border-t px-4 py-8 text-center">
          <p className="text-sm text-muted-foreground">
            No observation times yet. Use the <span className="font-medium">+ Time</span> button
            above to add a column each time you take a reading.
          </p>
        </div>
      )}
    </div>
  );
}
