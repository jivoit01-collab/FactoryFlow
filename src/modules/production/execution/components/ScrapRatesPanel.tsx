import { Pencil, Plus, Trash2, X } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';

import { confirmDialog } from '@/shared/components';
import {
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Dialog,
  DialogBody,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Input,
  Label,
} from '@/shared/components/ui';
import { getErrorMessage } from '@/shared/utils';

import {
  useCreateScrapRate,
  useDeleteScrapRate,
  useScrapRates,
  useSearchSAPItems,
  useUpdateScrapRate,
} from '../api';
import type { ScrapItem, ScrapKind, ScrapKindPayload } from '../types';

/** Today, local, YYYY-MM-DD: a new price counts from today unless told otherwise. */
const today = () => {
  const day = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${day.getFullYear()}-${pad(day.getMonth() + 1)}-${pad(day.getDate())}`;
};

/** '2026-09-01' → '1 Sep 2026'. */
const dayLabel = (date: string) =>
  new Date(`${date}T00:00:00`).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });

const rupees = (value: string) =>
  `₹${Number(value).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;

/** "10.500" off the API reads better as "10.5". */
const plain = (value: string) =>
  value.includes('.') ? value.replace(/0+$/, '').replace(/\.$/, '') : value;

interface Form {
  name: string;
  items: ScrapItem[];
  grams: string;
  perBox: string;
  price: string;
  from: string;
}

const formOf = (kind: ScrapKind | null): Form => ({
  name: kind?.name ?? '',
  items: kind?.items ?? [],
  grams: kind?.grams_per_piece ? plain(kind.grams_per_piece) : '',
  perBox: kind?.pieces_per_box ? String(kind.pieces_per_box) : '',
  price: kind?.price_per_kg ? plain(kind.price_per_kg) : '',
  from: today(),
});

/** The SAP items a scrap is made of: the ones it has, and a search to add more. */
function ItemPicker({
  items,
  onChange,
}: {
  items: ScrapItem[];
  onChange: (items: ScrapItem[]) => void;
}) {
  const [search, setSearch] = useState('');
  const term = search.trim();
  const { data: found = [], isFetching } = useSearchSAPItems(term);
  const taken = new Set(items.map((item) => item.code));
  const choices = found.filter((item) => !taken.has(item.ItemCode));

  return (
    <div className="space-y-2">
      <ul className="flex flex-wrap gap-2">
        {items.map((item) => (
          <li
            key={item.code}
            className="flex items-center gap-1 rounded-md border px-2 py-1 text-xs"
          >
            <span className="font-mono">{item.code}</span>
            {item.name && <span className="text-muted-foreground">{item.name}</span>}
            <button
              type="button"
              className="ml-1 rounded text-muted-foreground hover:text-foreground"
              aria-label={`Remove ${item.code}`}
              onClick={() => onChange(items.filter((other) => other.code !== item.code))}
            >
              <X className="h-3 w-3" />
            </button>
          </li>
        ))}
        {items.length === 0 && <li className="text-xs text-muted-foreground">No SAP items yet.</li>}
      </ul>
      <Input
        aria-label="Search SAP items"
        placeholder="Search SAP items to add, e.g. PREFORM"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />
      {term.length >= 2 && (
        <ul className="max-h-48 overflow-y-auto rounded-md border text-sm">
          {choices.map((item) => (
            <li key={item.ItemCode}>
              <button
                type="button"
                className="w-full px-3 py-1.5 text-left hover:bg-muted"
                onClick={() => {
                  onChange([...items, { code: item.ItemCode, name: item.ItemName }]);
                  setSearch('');
                }}
              >
                <span className="font-mono">{item.ItemCode}</span> {item.ItemName}{' '}
                <span className="text-muted-foreground">({item.UomCode})</span>
              </button>
            </li>
          ))}
          {choices.length === 0 && (
            <li className="px-3 py-1.5 text-muted-foreground">
              {isFetching ? 'Searching SAP…' : 'No other SAP item matches.'}
            </li>
          )}
        </ul>
      )}
    </div>
  );
}

/** Add a scrap, or change one: what it is, its weight, and a new price from a date. */
function ScrapKindDialog({ kind, onClose }: { kind: ScrapKind | null; onClose: () => void }) {
  const [form, setForm] = useState<Form>(() => formOf(kind));
  const createRate = useCreateScrapRate();
  const updateRate = useUpdateScrapRate();
  const saving = createRate.isPending || updateRate.isPending;
  const set = (field: keyof Form, value: Form[keyof Form]) =>
    setForm((current) => ({ ...current, [field]: value }));

  const priceWas = kind?.price_per_kg ? plain(kind.price_per_kg) : '';
  const priceChanged = form.price.trim() !== '' && form.price.trim() !== priceWas;

  const handleSave = async () => {
    const name = form.name.trim();
    if (!name) {
      toast.error('Name the scrap');
      return;
    }
    const figures: Array<[string, string]> = [
      ['Weight a piece', form.grams],
      ['Pieces a box', form.perBox],
      ['Price a kg', form.price],
    ];
    const bad = figures.find(([, value]) => value.trim() !== '' && !(Number(value) >= 0));
    if (bad) {
      toast.error(`${bad[0]} needs a figure`);
      return;
    }
    const data: ScrapKindPayload = {
      name,
      items: form.items,
      grams_per_piece: form.grams.trim() || null,
      pieces_per_box: form.perBox.trim() ? Math.round(Number(form.perBox)) : null,
      ...(priceChanged ? { price_per_kg: form.price.trim(), effective_from: form.from } : {}),
    };
    try {
      if (kind) {
        await updateRate.mutateAsync({ kindId: kind.id, data });
      } else {
        await createRate.mutateAsync(data);
      }
      toast.success('Scrap rate saved');
      onClose();
    } catch (error) {
      toast.error(getErrorMessage(error, 'The scrap rate was not saved.'));
    }
  };

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>{kind ? `Change ${kind.name}` : 'Add a scrap'}</DialogTitle>
          <DialogDescription>
            The wastage of its SAP items counts as this scrap, in kilos, at its price a kg.
          </DialogDescription>
        </DialogHeader>

        <DialogBody className="space-y-4">
          <div className="space-y-1">
            <Label htmlFor="scrap-name">Scrap</Label>
            <Input
              id="scrap-name"
              placeholder="e.g. Preform 10.5 GM"
              value={form.name}
              onChange={(e) => set('name', e.target.value)}
            />
          </div>
          <div className="space-y-1">
            <Label>SAP items</Label>
            <ItemPicker items={form.items} onChange={(items) => set('items', items)} />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1">
              <Label htmlFor="scrap-grams">Weight a piece (g)</Label>
              <Input
                id="scrap-grams"
                inputMode="decimal"
                placeholder="Items counted in pieces"
                value={form.grams}
                onChange={(e) => set('grams', e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                Needed for items SAP counts in pieces (PCS); not for grams or kilos.
              </p>
            </div>
            <div className="space-y-1">
              <Label htmlFor="scrap-box">Pieces a box</Label>
              <Input
                id="scrap-box"
                inputMode="numeric"
                value={form.perBox}
                onChange={(e) => set('perBox', e.target.value)}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="scrap-price">Price a kg (₹)</Label>
              <Input
                id="scrap-price"
                inputMode="decimal"
                value={form.price}
                onChange={(e) => set('price', e.target.value)}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="scrap-from">New price counts from</Label>
              <Input
                id="scrap-from"
                type="date"
                value={form.from}
                disabled={!priceChanged}
                onChange={(e) => set('from', e.target.value || today())}
              />
            </div>
          </div>
          {priceChanged && priceWas && (
            <p className="text-xs text-muted-foreground">
              Days before {dayLabel(form.from)} keep {rupees(priceWas)} a kg.
            </p>
          )}
        </DialogBody>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? 'Saving…' : 'Save'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/** A scrap's items, the first two by name and the rest counted. */
function ItemList({ items }: { items: ScrapItem[] }) {
  if (items.length === 0) return <span className="text-muted-foreground">—</span>;
  const shown = items.slice(0, 2).map((item) => item.name || item.code);
  const rest = items.length - shown.length;
  return (
    <span title={items.map((item) => `${item.code} ${item.name}`.trim()).join('\n')}>
      {shown.join(', ')}
      {rest > 0 && <span className="text-muted-foreground"> + {rest} more</span>}
    </span>
  );
}

/**
 * The scrap rates — the factory's scrap table. A new sheet's Scrap Recurring
 * is the day's wastage in kilos at these prices, so this is where a new
 * price is entered once rather than worked into every day by hand.
 */
export function ScrapRatesPanel({ canEdit }: { canEdit: boolean }) {
  const { data: kinds = [], isLoading } = useScrapRates();
  const deleteRate = useDeleteScrapRate();
  const [editing, setEditing] = useState<ScrapKind | 'new' | null>(null);

  const handleDelete = async (kind: ScrapKind) => {
    const confirmed = await confirmDialog({
      title: `Remove ${kind.name} from the scrap rates?`,
      description: 'Its wastage stops counting towards Scrap Recurring on new sheets.',
      confirmLabel: 'Remove',
      destructive: true,
    });
    if (!confirmed) return;
    try {
      await deleteRate.mutateAsync(kind.id);
      toast.success(`${kind.name} removed`);
    } catch (error) {
      toast.error(getErrorMessage(error, 'The scrap was not removed.'));
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex flex-wrap items-center justify-between gap-3">
          <span>Scrap Rates</span>
          {canEdit && (
            <Button variant="outline" size="sm" onClick={() => setEditing('new')}>
              <Plus className="h-4 w-4 mr-2" /> Add Scrap
            </Button>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <p className="mb-3 text-xs text-muted-foreground">
          Scrap Recurring on a new sheet is the day’s wastage in kilos at these prices. Items
          counted in pieces become kilos by their weight a piece; a new price counts from its date
          on.
        </p>
        <div className="overflow-x-auto rounded-lg border">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/50 text-left text-xs text-muted-foreground">
                <th className="px-3 py-2 font-medium">Scrap</th>
                <th className="px-3 py-2 font-medium">SAP items</th>
                <th className="px-3 py-2 text-right font-medium">Weight a piece</th>
                <th className="px-3 py-2 text-right font-medium">Pieces a box</th>
                <th className="px-3 py-2 text-right font-medium">Price a kg</th>
                {canEdit && <th className="w-24 px-3 py-2" aria-label="Actions" />}
              </tr>
            </thead>
            <tbody>
              {kinds.map((kind) => (
                <tr key={kind.id} className="border-b last:border-0">
                  <td className="px-3 py-2 font-medium">{kind.name}</td>
                  <td className="px-3 py-2">
                    <ItemList items={kind.items} />
                  </td>
                  <td className="px-3 py-2 text-right tabular-nums">
                    {kind.grams_per_piece ? `${plain(kind.grams_per_piece)} g` : '—'}
                  </td>
                  <td className="px-3 py-2 text-right tabular-nums">
                    {kind.pieces_per_box ?? '—'}
                  </td>
                  <td className="px-3 py-2 text-right tabular-nums">
                    {kind.price_per_kg ? (
                      <>
                        {rupees(kind.price_per_kg)}
                        {kind.price_from && (
                          <span className="block text-xs text-muted-foreground">
                            from {dayLabel(kind.price_from)}
                          </span>
                        )}
                      </>
                    ) : (
                      <span className="text-muted-foreground">No price yet</span>
                    )}
                  </td>
                  {canEdit && (
                    <td className="whitespace-nowrap px-3 py-2 text-right">
                      <Button
                        variant="ghost"
                        size="icon"
                        aria-label={`Change ${kind.name}`}
                        onClick={() => setEditing(kind)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        aria-label={`Remove ${kind.name}`}
                        onClick={() => handleDelete(kind)}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </td>
                  )}
                </tr>
              ))}
              {!isLoading && kinds.length === 0 && (
                <tr>
                  <td colSpan={canEdit ? 6 : 5} className="p-6 text-center text-muted-foreground">
                    No scrap rates yet: Scrap Recurring is typed in by hand until there are.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </CardContent>
      {editing && (
        <ScrapKindDialog
          key={editing === 'new' ? 'new' : editing.id}
          kind={editing === 'new' ? null : editing}
          onClose={() => setEditing(null)}
        />
      )}
    </Card>
  );
}
