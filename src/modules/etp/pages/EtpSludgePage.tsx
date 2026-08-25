/**
 * Sludge generation — the "Sludge Generation Record".
 *
 * Source, quantity, how it was collected and how it is stored. The mode and
 * method dropdowns are maintained lists (filter press / bag / …), and the Sr.
 * No. continues the paper register's running number so a print matches the book
 * it replaces.
 */

import { Pencil, Plus, Printer, Trash2 } from 'lucide-react';
import { useMemo, useState } from 'react';
import { toast } from 'sonner';

import type { CompanyCode } from '@/config/constants';
import { ETP_PERMISSIONS } from '@/config/permissions';
import { usePermission } from '@/core/auth/hooks/usePermission';
import { DashboardHeader } from '@/shared/components/dashboard/DashboardHeader';
import {
  Button,
  Card,
  CardContent,
  Dialog,
  DialogBody,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Input,
  Label,
  Textarea,
} from '@/shared/components/ui';

import {
  useCreateEtpSludgeEntry,
  useDeleteEtpSludgeEntry,
  useEtpOptions,
  useEtpPlants,
  useEtpSludgeEntries,
  useEtpStaff,
  useUpdateEtpSludgeEntry,
} from '../api';
import {
  FilterTotal,
  OptionSelect,
  PlantSelect,
  RegisterFilterBar,
  StaffSelect,
  TableState,
} from '../components/EtpControls';
import { EtpEntryHistory } from '../components/EtpEntryHistory';
import { useEtpRegisterPrint } from '../components/useEtpRegisterPrint';
import type { SludgeEntry } from '../types';
import { useEtpPrintDocument } from '../usePrintDocument';
import { firstOfMonthISO, fmt, todayISO } from '../utils';

const EMPTY_FORM = {
  plant: '',
  date: todayISO(),
  quantity_kg: '',
  collection_mode: '',
  storage_method: '',
  disposal_mode: '',
  operator: '',
  supervisor: '',
  remarks: '',
};

export default function EtpSludgePage() {
  const { hasPermission } = usePermission();
  const canManage = hasPermission(ETP_PERMISSIONS.MANAGE_SLUDGE);

  const [plantFilter, setPlantFilter] = useState('');
  const [dateFrom, setDateFrom] = useState(firstOfMonthISO());
  const [dateTo, setDateTo] = useState(todayISO());
  const [company, setCompany] = useState<CompanyCode | ''>('');

  const { data: plants = [] } = useEtpPlants({ is_active: true });
  const { data: staff = [] } = useEtpStaff({ is_active: true });
  const { data: options = [] } = useEtpOptions({ is_active: true });
  const { data: entries = [], isLoading } = useEtpSludgeEntries({
    plant: plantFilter ? Number(plantFilter) : undefined,
    date_from: dateFrom || undefined,
    date_to: dateTo || undefined,
    company: company || undefined,
  });

  const createEntry = useCreateEtpSludgeEntry();
  const updateEntry = useUpdateEtpSludgeEntry();
  const deleteEntry = useDeleteEtpSludgeEntry();
  const { print, printPortal } = useEtpRegisterPrint();
  // The register's document number comes from the database, not the bundle.
  const printDocument = useEtpPrintDocument();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<SludgeEntry | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [photo, setPhoto] = useState<File | null>(null);

  const totalKg = useMemo(
    () => entries.reduce((sum, entry) => sum + Number(entry.quantity_kg || 0), 0),
    [entries],
  );

  const setField = (key: keyof typeof EMPTY_FORM, value: string) =>
    setForm((previous) => ({ ...previous, [key]: value }));

  /** Preselect the dropdowns' defaults so the common case is one click. */
  const defaultOption = (category: string) =>
    options.find((option) => option.category === category && option.is_default && option.is_active);

  const openAdd = () => {
    setEditing(null);
    setPhoto(null);
    setForm({
      ...EMPTY_FORM,
      date: todayISO(),
      plant: plantFilter,
      collection_mode: String(defaultOption('SLUDGE_COLLECTION_MODE')?.id ?? ''),
      storage_method: String(defaultOption('SLUDGE_STORAGE_METHOD')?.id ?? ''),
    });
    setDialogOpen(true);
  };

  const openEdit = (entry: SludgeEntry) => {
    setEditing(entry);
    setPhoto(null);
    setForm({
      plant: String(entry.plant),
      date: entry.date,
      quantity_kg: entry.quantity_kg ?? '',
      collection_mode: entry.collection_mode ? String(entry.collection_mode) : '',
      storage_method: entry.storage_method ? String(entry.storage_method) : '',
      disposal_mode: entry.disposal_mode ? String(entry.disposal_mode) : '',
      operator: entry.operator ? String(entry.operator) : '',
      supervisor: entry.supervisor ? String(entry.supervisor) : '',
      remarks: entry.remarks ?? '',
    });
    setDialogOpen(true);
  };

  const submit = async () => {
    if (!form.plant || !form.date) {
      toast.error('Pick the source plant and the date');
      return;
    }
    const payload: Record<string, unknown> = {
      plant: form.plant,
      date: form.date,
      quantity_kg: form.quantity_kg,
      collection_mode: form.collection_mode,
      storage_method: form.storage_method,
      disposal_mode: form.disposal_mode,
      operator: form.operator,
      supervisor: form.supervisor,
      remarks: form.remarks,
    };
    try {
      if (editing) {
        await updateEntry.mutateAsync({ id: editing.id, payload, photoFile: photo });
        toast.success('Entry updated');
      } else {
        await createEntry.mutateAsync({ payload, photoFile: photo });
        toast.success('Sludge recorded');
      }
      setDialogOpen(false);
    } catch {
      /* interceptor surfaces the backend's message */
    }
  };

  const remove = async (entry: SludgeEntry) => {
    if (!window.confirm(`Delete entry #${entry.serial_no}?`)) return;
    try {
      await deleteEntry.mutateAsync(entry.id);
      toast.success('Entry deleted');
    } catch {
      toast.error('Could not delete the entry');
    }
  };

  const printRegister = () => {
    const { doc, documentId } = printDocument('ETP_SLUDGE_GENERATION');
    print({
      doc,
      documentId,
      title: doc.name,
      headerPairs: [
        [
          'Plant',
          plantFilter
            ? (plants.find((plant) => String(plant.id) === plantFilter)?.name ?? '—')
            : 'All plants',
        ],
        ['Period', `${dateFrom} to ${dateTo}`],
        ['Entries', String(entries.length)],
        ['Total', `${totalKg.toFixed(2)} kg`],
      ],
      columns: [
        { label: 'Sr. No.' },
        { label: 'Date' },
        { label: 'Source of sludge' },
        { label: 'Quantity (kg)', align: 'right' },
        { label: 'Mode of collection' },
        { label: 'Method of storage' },
        { label: 'Operator' },
        { label: 'Supervisor' },
      ],
      rows: [...entries]
        .sort((left, right) => (left.serial_no ?? 0) - (right.serial_no ?? 0))
        .map((entry) => [
          entry.serial_no,
          entry.date,
          entry.plant_code,
          entry.quantity_kg,
          entry.collection_mode_label,
          entry.storage_method_label,
          entry.operator_name,
          entry.supervisor_name,
        ]),
      totalsRow: ['', 'TOTAL', '', totalKg.toFixed(2), '', '', '', ''],
    });
  };

  return (
    <div className="space-y-6 p-6">
      {printPortal}
      <DashboardHeader
        title="Sludge Generation"
        description="Sludge taken off the plants — quantity, collection and storage"
      >
        <div className="flex gap-2">
          <Button variant="outline" onClick={printRegister} disabled={entries.length === 0}>
            <Printer className="mr-1 h-4 w-4" /> Print
          </Button>
          {canManage && (
            <Button onClick={openAdd} disabled={plants.length === 0}>
              <Plus className="mr-1 h-4 w-4" /> Add Entry
            </Button>
          )}
        </div>
      </DashboardHeader>

      <RegisterFilterBar
        idPrefix="etp-sludge"
        plants={plants}
        plant={plantFilter}
        onPlantChange={setPlantFilter}
        dateFrom={dateFrom}
        onDateFromChange={setDateFrom}
        dateTo={dateTo}
        onDateToChange={setDateTo}
        company={company}
        onCompanyChange={setCompany}
      >
        <FilterTotal label="Total sludge" value={`${totalKg.toFixed(2)} kg`} />
        <FilterTotal label="Entries" value={entries.length} />
      </RegisterFilterBar>

      <Card>
        <CardContent className="p-0">
          <TableState
            loading={isLoading}
            empty={entries.length === 0}
            emptyMessage="No sludge recorded in this period."
          >
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/50 text-left">
                    <th className="px-3 py-2 font-medium">Sr.</th>
                    <th className="px-3 py-2 font-medium">Date</th>
                    <th className="px-3 py-2 font-medium">Source</th>
                    <th className="px-3 py-2 text-right font-medium">Qty (kg)</th>
                    <th className="px-3 py-2 font-medium">Collection</th>
                    <th className="px-3 py-2 font-medium">Storage</th>
                    <th className="px-3 py-2 font-medium">Operator</th>
                    <th className="px-3 py-2 font-medium">Supervisor</th>
                    <th className="px-3 py-2 font-medium">Photo</th>
                    {canManage && <th className="px-3 py-2" />}
                  </tr>
                </thead>
                <tbody>
                  {entries.map((entry) => (
                    <tr key={entry.id} className="border-b last:border-0 hover:bg-muted/30">
                      <td className="px-3 py-2">{entry.serial_no ?? '—'}</td>
                      <td className="whitespace-nowrap px-3 py-2">{entry.date}</td>
                      <td className="px-3 py-2">{entry.plant_code}</td>
                      <td className="px-3 py-2 text-right">{fmt(entry.quantity_kg)}</td>
                      <td className="px-3 py-2">{fmt(entry.collection_mode_label)}</td>
                      <td className="px-3 py-2">{fmt(entry.storage_method_label)}</td>
                      <td className="px-3 py-2">{fmt(entry.operator_name)}</td>
                      <td className="px-3 py-2">{fmt(entry.supervisor_name)}</td>
                      <td className="px-3 py-2">
                        {entry.photo ? (
                          <a
                            href={entry.photo}
                            target="_blank"
                            rel="noreferrer"
                            className="underline"
                          >
                            view
                          </a>
                        ) : (
                          '—'
                        )}
                      </td>
                      {canManage && (
                        <td className="whitespace-nowrap px-3 py-2 text-right">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => openEdit(entry)}
                            aria-label={`Edit entry ${entry.serial_no}`}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => remove(entry)}
                            aria-label={`Delete entry ${entry.serial_no}`}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </TableState>
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        {/* Title and buttons stay put; only the fields scroll. */}
        <DialogContent className="max-h-[90vh] max-w-2xl grid-rows-[auto_minmax(0,1fr)_auto] overflow-hidden">
          <DialogHeader>
            <DialogTitle>
              {editing ? `Edit entry #${editing.serial_no}` : 'Add a sludge entry'}
            </DialogTitle>
          </DialogHeader>

          <DialogBody className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <Label htmlFor="sludge-plant">Source of sludge</Label>
                <PlantSelect
                  id="sludge-plant"
                  plants={plants}
                  value={form.plant}
                  onChange={(value) => setField('plant', value)}
                />
              </div>
              <div>
                <Label htmlFor="sludge-date">Date</Label>
                <Input
                  id="sludge-date"
                  type="date"
                  value={form.date}
                  onChange={(event) => setField('date', event.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="sludge-qty">Quantity (kg)</Label>
                <Input
                  id="sludge-qty"
                  type="number"
                  step="0.01"
                  value={form.quantity_kg}
                  onChange={(event) => setField('quantity_kg', event.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="sludge-collection">Mode of collection</Label>
                <OptionSelect
                  id="sludge-collection"
                  options={options}
                  category="SLUDGE_COLLECTION_MODE"
                  value={form.collection_mode}
                  onChange={(value) => setField('collection_mode', value)}
                />
              </div>
              <div>
                <Label htmlFor="sludge-storage">Method of storage</Label>
                <OptionSelect
                  id="sludge-storage"
                  options={options}
                  category="SLUDGE_STORAGE_METHOD"
                  value={form.storage_method}
                  onChange={(value) => setField('storage_method', value)}
                />
              </div>
              <div>
                <Label htmlFor="sludge-disposal">Mode of disposal</Label>
                <OptionSelect
                  id="sludge-disposal"
                  options={options}
                  category="SLUDGE_DISPOSAL_MODE"
                  value={form.disposal_mode}
                  onChange={(value) => setField('disposal_mode', value)}
                  placeholder="Not disposed yet"
                />
              </div>
              <div>
                <Label htmlFor="sludge-operator">Operator</Label>
                <StaffSelect
                  id="sludge-operator"
                  staff={staff}
                  role="OPERATOR"
                  value={form.operator}
                  onChange={(value) => setField('operator', value)}
                />
              </div>
              <div>
                <Label htmlFor="sludge-supervisor">Supervisor</Label>
                <StaffSelect
                  id="sludge-supervisor"
                  staff={staff}
                  role="SUPERVISOR"
                  value={form.supervisor}
                  onChange={(value) => setField('supervisor', value)}
                />
              </div>
              <div className="sm:col-span-2">
                <Label htmlFor="sludge-photo">Photo (optional)</Label>
                <Input
                  id="sludge-photo"
                  type="file"
                  accept="image/*"
                  onChange={(event) => setPhoto(event.target.files?.[0] ?? null)}
                />
              </div>
              <div className="sm:col-span-2">
                <Label htmlFor="sludge-remarks">Remarks</Label>
                <Textarea
                  id="sludge-remarks"
                  rows={2}
                  value={form.remarks}
                  onChange={(event) => setField('remarks', event.target.value)}
                />
              </div>
            </div>

            {/* The history of THIS entry, so a correction is always read in
                the context of the day it belongs to. */}
            {editing && <EtpEntryHistory register="SLUDGE" objectId={editing.id} />}
          </DialogBody>

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={submit} disabled={createEntry.isPending || updateEntry.isPending}>
              {editing ? 'Save changes' : 'Add entry'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
