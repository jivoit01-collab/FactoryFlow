import {
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/shared/components/ui';

import type { BreakdownCategory } from '../types';
import { subBreakdownsOf } from '../utils';

interface BreakdownTypeFieldsProps {
  categories: BreakdownCategory[];
  categoryId?: number;
  onCategoryChange: (categoryId: number) => void;
  onSubCategoryChange: (subCategoryId: number) => void;
  categoryError?: string;
  subCategoryError?: string;
}

/** The main breakdown, then its sub-breakdown where the main has any. */
export function BreakdownTypeFields({
  categories,
  categoryId,
  onCategoryChange,
  onSubCategoryChange,
  categoryError,
  subCategoryError,
}: BreakdownTypeFieldsProps) {
  const subs = subBreakdownsOf(categories, categoryId);

  return (
    <>
      <div>
        <Label>Main Breakdown</Label>
        <Select onValueChange={(v) => onCategoryChange(Number(v))}>
          <SelectTrigger>
            <SelectValue placeholder="Select breakdown" />
          </SelectTrigger>
          <SelectContent>
            {categories.length === 0 ? (
              <div className="px-2 py-4 text-sm text-muted-foreground text-center">
                No breakdown categories found.
              </div>
            ) : (
              categories.map((c) => (
                <SelectItem key={c.id} value={String(c.id)}>
                  {c.name}
                </SelectItem>
              ))
            )}
          </SelectContent>
        </Select>
        {categoryError && <p className="mt-1 text-xs text-red-600">{categoryError}</p>}
      </div>
      {subs.length > 0 && (
        <div>
          <Label>Sub-breakdown</Label>
          {/* Keyed on the main, so choosing another main clears the old pick. */}
          <Select key={categoryId} onValueChange={(v) => onSubCategoryChange(Number(v))}>
            <SelectTrigger>
              <SelectValue placeholder="Select what went wrong" />
            </SelectTrigger>
            <SelectContent>
              {subs.map((s) => (
                <SelectItem key={s.id} value={String(s.id)}>
                  {s.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {subCategoryError && <p className="mt-1 text-xs text-red-600">{subCategoryError}</p>}
        </div>
      )}
    </>
  );
}
