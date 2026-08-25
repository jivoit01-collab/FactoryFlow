/**
 * Small form controls shared by every ETP / STP register page.
 *
 * All of them are plain `<select>`s fed from the masters, which is the point of
 * the module: the plant team maintains the lists, the operator only picks from
 * them.
 */

import type { ReactNode } from 'react';

import { COMPANY_CODE_LIST, COMPANY_LABELS, type CompanyCode } from '@/config/constants';
import {
  Card,
  CardContent,
  Input,
  Label,
  NativeSelect,
  SelectOption,
} from '@/shared/components/ui';

import type { OptionCategory, PlantOption, PlantStaff, StaffRole, TreatmentPlant } from '../types';

export function PlantSelect({
  id,
  plants,
  value,
  onChange,
  includeAll,
  disabled,
}: {
  id: string;
  plants: TreatmentPlant[];
  value: string;
  onChange: (value: string) => void;
  includeAll?: boolean;
  disabled?: boolean;
}) {
  return (
    <NativeSelect
      id={id}
      value={value}
      disabled={disabled}
      onChange={(event) => onChange(event.target.value)}
    >
      {includeAll ? (
        <SelectOption value="">All plants</SelectOption>
      ) : (
        <SelectOption value="">Select plant…</SelectOption>
      )}
      {plants.map((plant) => (
        <SelectOption key={plant.id} value={String(plant.id)}>
          {plant.code} — {plant.name}
        </SelectOption>
      ))}
    </NativeSelect>
  );
}

/**
 * A signature dropdown. `role` narrows the list to the people who normally sign
 * that column, but anyone in the master can be picked — the paper register is
 * not that strict and a stand-in on a night shift must still be recordable.
 */
export function StaffSelect({
  id,
  staff,
  value,
  onChange,
  role,
  placeholder = 'Not recorded',
}: {
  id: string;
  staff: PlantStaff[];
  value: string;
  onChange: (value: string) => void;
  role?: StaffRole;
  placeholder?: string;
}) {
  const preferred = role ? staff.filter((person) => person.role === role) : staff;
  const others = role ? staff.filter((person) => person.role !== role) : [];
  return (
    <NativeSelect id={id} value={value} onChange={(event) => onChange(event.target.value)}>
      <SelectOption value="">{placeholder}</SelectOption>
      {preferred.map((person) => (
        <SelectOption key={person.id} value={String(person.id)}>
          {person.name}
        </SelectOption>
      ))}
      {others.length > 0 && (
        <optgroup label="Other staff">
          {others.map((person) => (
            <option key={person.id} value={String(person.id)}>
              {person.name} ({person.role_display})
            </option>
          ))}
        </optgroup>
      )}
    </NativeSelect>
  );
}

export function OptionSelect({
  id,
  options,
  category,
  value,
  onChange,
  placeholder = 'Select…',
}: {
  id: string;
  options: PlantOption[];
  category: OptionCategory;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}) {
  const rows = options.filter((option) => option.category === category && option.is_active);
  return (
    <NativeSelect id={id} value={value} onChange={(event) => onChange(event.target.value)}>
      <SelectOption value="">{placeholder}</SelectOption>
      {rows.map((option) => (
        <SelectOption key={option.id} value={String(option.id)}>
          {option.label}
        </SelectOption>
      ))}
    </NativeSelect>
  );
}

/** The plant + date-window + company bar every register page carries. */
export function RegisterFilterBar({
  plants,
  plant,
  onPlantChange,
  dateFrom,
  onDateFromChange,
  dateTo,
  onDateToChange,
  company,
  onCompanyChange,
  idPrefix,
  children,
}: {
  plants: TreatmentPlant[];
  plant: string;
  onPlantChange: (value: string) => void;
  dateFrom?: string;
  onDateFromChange?: (value: string) => void;
  dateTo?: string;
  onDateToChange?: (value: string) => void;
  company?: CompanyCode | '';
  onCompanyChange?: (value: CompanyCode | '') => void;
  idPrefix: string;
  /** Totals or extra controls, right-aligned. */
  children?: ReactNode;
}) {
  return (
    <Card>
      <CardContent className="flex flex-wrap items-end gap-4 p-4">
        <div className="min-w-[220px]">
          <Label htmlFor={`${idPrefix}-plant`}>Plant</Label>
          <PlantSelect
            id={`${idPrefix}-plant`}
            plants={plants}
            value={plant}
            onChange={onPlantChange}
            includeAll
          />
        </div>
        {onDateFromChange && (
          <div>
            <Label htmlFor={`${idPrefix}-from`}>From</Label>
            <Input
              id={`${idPrefix}-from`}
              type="date"
              value={dateFrom ?? ''}
              onChange={(event) => onDateFromChange(event.target.value)}
            />
          </div>
        )}
        {onDateToChange && (
          <div>
            <Label htmlFor={`${idPrefix}-to`}>To</Label>
            <Input
              id={`${idPrefix}-to`}
              type="date"
              value={dateTo ?? ''}
              onChange={(event) => onDateToChange(event.target.value)}
            />
          </div>
        )}
        {onCompanyChange && (
          <div className="min-w-[180px]">
            <Label htmlFor={`${idPrefix}-company`}>Company</Label>
            <NativeSelect
              id={`${idPrefix}-company`}
              value={company ?? ''}
              onChange={(event) => onCompanyChange(event.target.value as CompanyCode | '')}
            >
              <SelectOption value="">All companies</SelectOption>
              {COMPANY_CODE_LIST.map((code) => (
                <SelectOption key={code} value={code}>
                  {COMPANY_LABELS[code]}
                </SelectOption>
              ))}
            </NativeSelect>
          </div>
        )}
        {children && <div className="ml-auto flex items-end gap-6 text-sm">{children}</div>}
      </CardContent>
    </Card>
  );
}

/** A right-aligned "label: value" total for the filter bar. */
export function FilterTotal({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div>
      <span className="text-muted-foreground">{label}: </span>
      <span className="font-semibold">{value}</span>
    </div>
  );
}

/** Empty / loading state shared by the register tables. */
export function TableState({
  loading,
  empty,
  emptyMessage,
  children,
}: {
  loading: boolean;
  empty: boolean;
  emptyMessage: string;
  children: ReactNode;
}) {
  if (loading) {
    return <div className="p-8 text-center text-muted-foreground">Loading…</div>;
  }
  if (empty) {
    return <div className="p-10 text-center text-muted-foreground">{emptyMessage}</div>;
  }
  return <>{children}</>;
}
