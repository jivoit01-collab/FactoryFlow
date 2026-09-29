/**
 * Add an oil, or change one.
 *
 * An oil is one of SAP's raw-material oils (an RM item whose unit is OIL), so
 * its code and name are one choice, picked from SAP and never typed. Picking
 * another item moves the oil to it; its tanks and lots point at the oil, not at
 * its code, so nothing else has to follow.
 *
 * EXIM asked for a colour and a category on every oil; so does this. The
 * colour is what the Tank Farm paints the oil's tanks in.
 */
import { useState } from 'react';
import { toast } from 'sonner';

import { SearchableSelect } from '@/shared/components';
import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Label,
  NativeSelect,
  SelectOption,
  Switch,
} from '@/shared/components/ui';
import { getErrorMessage } from '@/shared/utils';

import { useSapOils, useSaveOil } from '../../api';
import type { Oil, OilCategory, OilPayload, SapOil } from '../../types';
import { ColorPicker } from './ColorPicker';
import { OIL_CATEGORIES, resolveColor } from './farm';

function emptyForm(): OilPayload {
  return { code: '', category: '', color: '', is_active: true };
}

function fromOil(oil: Oil): OilPayload {
  return {
    code: oil.code,
    category: oil.category,
    color: oil.color ? resolveColor(oil.color) : '',
    is_active: oil.is_active,
  };
}

function sapLabel(item: { code: string; name: string }) {
  return `${item.code} · ${item.name}`;
}

/** SAP's variety as one of the categories, when it names one. */
function categoryOf(item: SapOil): OilCategory | '' {
  const variety = item.sub_group.trim().toUpperCase();
  return OIL_CATEGORIES.find((c) => c.value === variety)?.value ?? '';
}

function matches(item: SapOil, search: string) {
  const term = search.trim().toLowerCase();
  return (
    !term ||
    item.code.toLowerCase().includes(term) ||
    item.name.toLowerCase().includes(term) ||
    sapLabel(item).toLowerCase() === term
  );
}

function SapOilRow({ item }: { item: SapOil }) {
  return (
    <span className="min-w-0">
      <span className="block truncate text-sm">{item.name}</span>
      <span className="block font-mono text-xs text-muted-foreground">
        {item.code}
        {item.frozen ? ' · frozen in SAP' : ''}
      </span>
    </span>
  );
}

export function OilFormDialog({
  open,
  onOpenChange,
  oil,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** The oil to change. Left out, the dialog adds one. */
  oil?: Oil | null;
}) {
  const save = useSaveOil();
  const sap = useSapOils(open);
  const [form, setForm] = useState<OilPayload>(emptyForm);
  const [picked, setPicked] = useState<SapOil | null>(null);
  const [errors, setErrors] = useState<Partial<Record<keyof OilPayload, string>>>({});
  const [serverError, setServerError] = useState('');

  const [wasOpen, setWasOpen] = useState(open);
  if (open !== wasOpen) {
    setWasOpen(open);
    if (open) {
      setForm(oil ? fromOil(oil) : emptyForm());
      setPicked(null);
      setErrors({});
      setServerError('');
    }
  }

  // An item already set up as another oil is not offered again.
  const choices = (sap.data?.oils ?? []).filter(
    (item) => item.oil === null || item.oil === oil?.id,
  );
  const sapDown = !!sap.data?.sap_unavailable;

  function set<K extends keyof OilPayload>(key: K, value: OilPayload[K]) {
    setForm((current) => ({ ...current, [key]: value }));
    setErrors((current) => ({ ...current, [key]: undefined }));
  }

  function pick(item: SapOil | null) {
    setPicked(item);
    setErrors((current) => ({ ...current, code: undefined }));
    setForm((current) => ({
      ...current,
      code: item?.code ?? (oil ? oil.code : ''),
      // SAP's variety fills an empty category; a chosen one is left alone.
      category: current.category || (item ? categoryOf(item) : ''),
    }));
  }

  async function submit() {
    const found: Partial<Record<keyof OilPayload, string>> = {};
    if (!form.code) found.code = 'Pick the raw material from SAP.';
    if (!form.category) found.category = 'Which kind of oil is it?';
    if (!form.color) found.color = 'Pick the colour its tanks are drawn in.';
    setErrors(found);
    if (Object.keys(found).length) return;
    setServerError('');
    try {
      const saved = await save.mutateAsync({ id: oil?.id, payload: form });
      toast.success(oil ? `${saved.name} saved` : `${saved.name} added`);
      onOpenChange(false);
    } catch (error) {
      setServerError(getErrorMessage(error, 'Could not save the oil.'));
    }
  }

  const moving = !!oil && !!picked && picked.code !== oil.code;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{oil ? `Edit ${oil.name}` : 'Add an oil'}</DialogTitle>
          <DialogDescription>
            {oil
              ? 'Its tanks and lots follow the oil, so moving it to another SAP item is safe.'
              : "One of SAP's raw-material oils, for the tanks to hold and lots to be bought in."}
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4">
          <div className="space-y-1.5">
            <SearchableSelect<SapOil>
              inputId="oil-sap-item"
              label="Raw material in SAP"
              required
              value={form.code}
              defaultDisplayText={oil ? sapLabel(oil) : undefined}
              items={choices}
              isLoading={sap.isLoading}
              isError={sap.isError}
              placeholder="Search by code or name"
              getItemKey={(item) => item.code}
              getItemLabel={sapLabel}
              filterFn={matches}
              renderItem={(item) => <SapOilRow item={item} />}
              loadingText="Reading the raw materials from SAP…"
              emptyText={
                sapDown
                  ? 'SAP is not answering'
                  : 'Every raw-material oil in SAP is already an oil here'
              }
              notFoundText="No raw-material oil by that code or name"
              errorText="The raw materials could not be read from SAP."
              error={errors.code}
              onItemSelect={pick}
              onClear={() => pick(null)}
            />
            {sapDown ? (
              <p className="text-xs text-amber-700 dark:text-amber-400">
                {oil
                  ? 'SAP is not answering, so the oil cannot move to another item now. Its colour, category and in-use flag can still be changed.'
                  : 'SAP is not answering, so no raw material can be picked now. Try again shortly.'}
              </p>
            ) : (
              <p className="text-xs text-muted-foreground">
                {moving
                  ? `It will be ${picked ? picked.name : ''}, as SAP names it.`
                  : 'Items coded RM… whose unit in SAP is OIL. The name is SAP’s.'}
              </p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="oil-category">Category</Label>
            <NativeSelect
              id="oil-category"
              value={form.category}
              onChange={(event) => set('category', event.target.value as OilPayload['category'])}
            >
              <SelectOption value="">Choose</SelectOption>
              {OIL_CATEGORIES.map((c) => (
                <SelectOption key={c.value} value={c.value}>
                  {c.label}
                </SelectOption>
              ))}
            </NativeSelect>
            {errors.category && <p className="text-xs text-rose-600">{errors.category}</p>}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="oil-color">Colour on the Tank Farm</Label>
            <ColorPicker id="oil-color" value={form.color} onChange={(hex) => set('color', hex)} />
            {errors.color && <p className="text-xs text-rose-600">{errors.color}</p>}
          </div>

          <label className="flex items-center justify-between gap-3 text-sm">
            <span>
              Active
              <span className="block text-xs text-muted-foreground">
                An inactive oil is kept on its tanks and lots but is not offered for new ones.
              </span>
            </span>
            <Switch
              id="oil-active"
              checked={form.is_active}
              onChange={(value) => set('is_active', value)}
            />
          </label>
        </div>

        {serverError && <p className="text-sm text-rose-600">{serverError}</p>}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={save.isPending}>
            Cancel
          </Button>
          <Button onClick={submit} disabled={save.isPending || (!oil && sapDown)}>
            {save.isPending ? 'Saving…' : oil ? 'Save changes' : 'Add oil'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
