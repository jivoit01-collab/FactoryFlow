import { useState } from 'react';

import { SearchableSelect } from '@/shared/components';
import { Input, Label } from '@/shared/components/ui';
import { cn } from '@/shared/utils';

import type { LookupOption, SapReportParameter } from '../api';
import { useSapReportParameterOptions } from '../api';

/**
 * How much room each kind of filter needs. Fixed widths rather than a grid, so a
 * report with two filters and one with four both sit on a single compact row and
 * leave the run buttons beside them.
 */
const WIDTHS: Record<string, string> = {
  DATE: 'w-40',
  NUMBER: 'w-32',
  TEXT: 'w-44',
};
const LOOKUP_WIDTH = 'w-52';

const CONTROL_HEIGHT = 'h-9';

interface Props {
  slug: string;
  parameter: SapReportParameter;
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
}

/**
 * One filter of a report, rendered from what the server said about it.
 *
 * SAP asks for these values with an unlabelled text box and trusts the user to
 * know that `BH-FG` is a warehouse and that the date wants `20260801`. Here the
 * parameter's `kind` decides the control: a date picker, a searchable list off
 * the company's own master data, or a plain box when there is genuinely nothing
 * to pick from.
 *
 * The SAP field a filter maps to is a hover title rather than a line of its own —
 * useful when two filters read alike, not worth a row of height otherwise.
 */
export function ReportFilterField({ slug, parameter, value, onChange, disabled }: Props) {
  const inputId = `report-filter-${parameter.position}`;

  if (parameter.has_lookup) {
    return (
      <LookupFilterField
        slug={slug}
        parameter={parameter}
        value={value}
        onChange={onChange}
        disabled={disabled}
        inputId={inputId}
      />
    );
  }

  const isDate = parameter.kind === 'DATE';

  return (
    <div className={cn('space-y-1', WIDTHS[parameter.kind] ?? WIDTHS.TEXT)}>
      <FieldLabel parameter={parameter} inputId={inputId} />
      <Input
        id={inputId}
        type={isDate ? 'date' : parameter.kind === 'NUMBER' ? 'number' : 'text'}
        className={CONTROL_HEIGHT}
        value={value}
        disabled={disabled}
        placeholder={isDate || parameter.is_required ? undefined : 'All'}
        onChange={(event) => onChange(event.target.value)}
      />
    </div>
  );
}

function LookupFilterField({
  slug,
  parameter,
  value,
  onChange,
  disabled,
  inputId,
}: Props & { inputId: string }) {
  const [search, setSearch] = useState('');
  const [isOpen, setIsOpen] = useState(false);

  // Items and business partners are searched on the server: the lists run to
  // thousands of rows, so nothing is fetched until the picker is opened.
  const query = useSapReportParameterOptions(slug, parameter.position, search, isOpen);
  const options = query.data ?? [];

  return (
    <div className={cn('space-y-1', LOOKUP_WIDTH)}>
      <FieldLabel parameter={parameter} inputId={inputId} />
      {/* The label is rendered here rather than by SearchableSelect so it matches
          the compact labels on the plain fields beside it. */}
      <SearchableSelect<LookupOption>
        inputId={inputId}
        value={value}
        items={options}
        isLoading={query.isLoading}
        isError={query.isError}
        disabled={disabled}
        inputClassName={CONTROL_HEIGHT}
        placeholder={`Select ${parameter.label.toLowerCase()}`}
        defaultDisplayText={value}
        getItemKey={(item) => item.value}
        getItemLabel={(item) =>
          item.label === item.value ? item.value : `${item.value} — ${item.label}`
        }
        loadingText="Loading from SAP…"
        emptyText="Nothing to choose from"
        notFoundText="No match in SAP"
        errorText="Could not reach SAP"
        onItemSelect={(item) => onChange(item.value)}
        onClear={() => onChange('')}
        onOpenChange={setIsOpen}
        onSearchChange={setSearch}
      />
    </div>
  );
}

function FieldLabel({
  parameter,
  inputId,
}: {
  parameter: SapReportParameter;
  inputId: string;
}) {
  return (
    <Label htmlFor={inputId} className="text-xs" title={parameter.help_text || undefined}>
      {parameter.label}
      {parameter.is_required && <span className="ml-0.5 text-destructive">*</span>}
    </Label>
  );
}
