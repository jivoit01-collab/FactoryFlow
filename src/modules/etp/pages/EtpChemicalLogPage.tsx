/**
 * Chemical consumption — the "Chemical Consumption Record" for the ETP / STP.
 *
 * The paper form is a month per page with one column per chemical, so that is
 * what this shows: the days down the side, the plant's chemicals across the top
 * and a monthly total row. Which chemicals a plant doses is master data (the
 * ETP form has DAP and Urea, the STP form does not), and each entry keeps its
 * own unit — the STP records HYPO in grams where the ETP records litres.
 */

import { FlaskConical, Pencil, Plus, Printer, Trash2 } from 'lucide-react';
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
  NativeSelect,
  SelectOption,
  Textarea,
} from '@/shared/components/ui';

import {
  useCreateEtpChemicalLog,
  useDeleteEtpChemicalLog,
  useEtpChemicalLogs,
  useEtpChemicals,
  useEtpChemicalTotals,
  useEtpPlants,
  useEtpStaff,
  useUpdateEtpChemicalLog,
} from '../api';
import {
  FilterTotal,
  PlantSelect,
  RegisterFilterBar,
  StaffSelect,
  TableState,
} from '../components/EtpControls';
import { EtpEntryHistory } from '../components/EtpEntryHistory';
import { useEtpRegisterPrint } from '../components/useEtpRegisterPrint';
import {
  CHEMICAL_UOM_LABELS,
  type ChemicalConsumptionLog,
  type ChemicalUom,
  type PlantChemical,
} from '../types';
import { useEtpPrintDocument } from '../usePrintDocument';
import { firstOfMonthISO, fmt, todayISO } from '../utils';

const UOM_VALUES: ChemicalUom[] = ['KG', 'GM', 'LTR', 'ML', 'NOS'];

/** One editable cell of the day's dialog. */
interface CellForm {
  quantity: string;
  uom: ChemicalUom;
}

export default function EtpChemicalLogPage() {
  const { hasPermission } = usePermission();
  const canManage = hasPermission(ETP_PERMISSIONS.MANAGE_CHEMICAL);

  const [plantFilter, setPlantFilter] = useState('');
  const [dateFrom, setDateFrom] = useState(firstOfMonthISO());
  const [dateTo, setDateTo] = useState(todayISO());
  const [company, setCompany] = useState<CompanyCode | ''>('');

  const filters = {
    plant: plantFilter ? Number(plantFilter) : undefined,
    date_from: dateFrom || undefined,
    date_to: dateTo || undefined,
    company: company || undefined,
  };

  const { data: plants = [] } = useEtpPlants({ is_active: true });
  const { data: staff = [] } = useEtpStaff({ is_active: true });
  const { data: chemicals = [] } = useEtpChemicals({
    is_active: true,
    plant: plantFilter ? Number(plantFilter) : undefined,
  });
  const { data: logs = [], isLoading } = useEtpChemicalLogs(filters);
  const { data: totals = [] } = useEtpChemicalTotals(filters);

  const createLog = useCreateEtpChemicalLog();
  const updateLog = useUpdateEtpChemicalLog();
  const deleteLog = useDeleteEtpChemicalLog();
  const { print, printPortal } = useEtpRegisterPrint();
  // The register's document number comes from the database, not the bundle.
  const printDocument = useEtpPrintDocument();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<ChemicalConsumptionLog | null>(null);
  const [formPlant, setFormPlant] = useState('');
  const [formDate, setFormDate] = useState(todayISO());
  const [operator, setOperator] = useState('');
  const [verifier, setVerifier] = useState('');
  const [remarks, setRemarks] = useState('');
  const [cells, setCells] = useState<Record<number, CellForm>>({});

  /** The chemicals the day's plant actually doses. */
  const formChemicals: PlantChemical[] = useMemo(() => {
    if (!formPlant) return chemicals;
    return chemicals.filter(
      (chemical) =>
        chemical.plant_ids.length === 0 || chemical.plant_ids.includes(Number(formPlant)),
    );
  }, [chemicals, formPlant]);

  /** Columns of the month grid — the chemicals actually used in the window. */
  const columns: PlantChemical[] = useMemo(() => {
    const usedIds = new Set(logs.flatMap((log) => log.lines.map((line) => line.chemical)));
    const shown = chemicals.filter(
      (chemical) =>
        usedIds.has(chemical.id) ||
        !plantFilter ||
        chemical.plant_ids.length === 0 ||
        chemical.plant_ids.includes(Number(plantFilter)),
    );
    return shown;
  }, [chemicals, logs, plantFilter]);

  const openAdd = () => {
    setEditing(null);
    setFormPlant(plantFilter);
    setFormDate(todayISO());
    setOperator('');
    setVerifier('');
    setRemarks('');
    setCells({});
    setDialogOpen(true);
  };

  const openEdit = (log: ChemicalConsumptionLog) => {
    setEditing(log);
    setFormPlant(String(log.plant));
    setFormDate(log.date);
    setOperator(log.operator ? String(log.operator) : '');
    setVerifier(log.verified_by ? String(log.verified_by) : '');
    setRemarks(log.remarks ?? '');
    setCells(
      Object.fromEntries(
        log.lines.map((line) => [
          line.chemical,
          { quantity: line.quantity ?? '', uom: (line.uom ?? 'KG') as ChemicalUom },
        ]),
      ),
    );
    setDialogOpen(true);
  };

  const setCell = (chemical: PlantChemical, patch: Partial<CellForm>) =>
    setCells((current) => ({
      ...current,
      [chemical.id]: {
        quantity: patch.quantity ?? current[chemical.id]?.quantity ?? '',
        uom: patch.uom ?? current[chemical.id]?.uom ?? chemical.default_uom,
      },
    }));

  const submit = async () => {
    if (!formPlant || !formDate) {
      toast.error('Pick the plant and the date');
      return;
    }
    const lines = Object.entries(cells)
      .filter(([, cell]) => cell.quantity !== '')
      .map(([chemicalId, cell]) => ({
        chemical: Number(chemicalId),
        quantity: cell.quantity,
        uom: cell.uom,
      }));
    if (lines.length === 0) {
      toast.error('Enter at least one quantity');
      return;
    }
    const payload = {
      plant: Number(formPlant),
      date: formDate,
      operator: operator ? Number(operator) : null,
      verified_by: verifier ? Number(verifier) : null,
      remarks,
      lines,
    };
    try {
      if (editing) {
        await updateLog.mutateAsync({ id: editing.id, payload });
        toast.success('Day updated');
      } else {
        await createLog.mutateAsync(payload);
        toast.success('Consumption recorded');
      }
      setDialogOpen(false);
    } catch {
      /* interceptor surfaces the backend's message */
    }
  };

  const remove = async (log: ChemicalConsumptionLog) => {
    if (!window.confirm(`Delete the ${log.date} entry for ${log.plant_code}?`)) return;
    try {
      await deleteLog.mutateAsync(log.id);
      toast.success('Entry deleted');
    } catch {
      toast.error('Could not delete the entry');
    }
  };

  const quantityFor = (log: ChemicalConsumptionLog, chemicalId: number) => {
    const line = log.lines.find((row) => row.chemical === chemicalId);
    if (!line || line.quantity === null) return '';
    return `${line.quantity} ${line.uom ? CHEMICAL_UOM_LABELS[line.uom] : ''}`.trim();
  };

  const printRegister = () => {
    const plantRow = plants.find((row) => String(row.id) === plantFilter);
    // The ETP and the STP are two different controlled forms, each with its own
    // number in the database.
    const { doc, documentId } = printDocument(
      plantRow?.plant_type === 'STP' ? 'STP_CHEMICAL_CONSUMPTION' : 'ETP_CHEMICAL_CONSUMPTION',
    );
    print({
      doc,
      documentId,
      title: doc.name,
      orientation: 'landscape',
      headerPairs: [
        ['Plant', plantRow ? `${plantRow.code} — ${plantRow.name}` : 'All plants'],
        ['Period', `${dateFrom} to ${dateTo}`],
        ['Days recorded', String(logs.length)],
        ['Printed on', todayISO()],
      ],
      columns: [
        { label: 'Date' },
        ...(plantFilter ? [] : [{ label: 'Plant' }]),
        ...columns.map((chemical) => ({ label: chemical.name, align: 'right' as const })),
        { label: 'Operator' },
        { label: 'Remarks' },
      ],
      rows: [...logs]
        .sort((left, right) => left.date.localeCompare(right.date))
        .map((log) => [
          log.date,
          ...(plantFilter ? [] : [log.plant_code]),
          ...columns.map((chemical) => quantityFor(log, chemical.id)),
          log.operator_name,
          log.remarks,
        ]),
      totalsRow: [
        'TOTAL',
        ...(plantFilter ? [] : ['']),
        ...columns.map((chemical) => {
          const total = totals.find((row) => row.chemical === chemical.id);
          return total ? `${total.total} ${CHEMICAL_UOM_LABELS[total.uom]}` : '';
        }),
        '',
        '',
      ],
    });
  };

  return (
    <div className="space-y-6 p-6">
      {printPortal}
      <DashboardHeader
        title="Chemical Consumption"
        description="What the plant dosed, day by day — one column per chemical"
      >
        <div className="flex gap-2">
          <Button variant="outline" onClick={printRegister} disabled={logs.length === 0}>
            <Printer className="mr-1 h-4 w-4" /> Print
          </Button>
          {canManage && (
            <Button onClick={openAdd} disabled={plants.length === 0}>
              <Plus className="mr-1 h-4 w-4" /> Record Day
            </Button>
          )}
        </div>
      </DashboardHeader>

      <RegisterFilterBar
        idPrefix="etp-chem"
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
        {totals.slice(0, 4).map((total) => (
          <FilterTotal
            key={total.chemical}
            label={total.chemical_name}
            value={`${total.total} ${CHEMICAL_UOM_LABELS[total.uom]}`}
          />
        ))}
      </RegisterFilterBar>

      <Card>
        <CardContent className="p-0">
          <TableState
            loading={isLoading}
            empty={logs.length === 0}
            emptyMessage="No consumption recorded in this period."
          >
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/50 text-left">
                    <th className="px-3 py-2 font-medium">Date</th>
                    {!plantFilter && <th className="px-3 py-2 font-medium">Plant</th>}
                    {columns.map((chemical) => (
                      <th key={chemical.id} className="px-3 py-2 text-right font-medium">
                        {chemical.name}
                      </th>
                    ))}
                    <th className="px-3 py-2 font-medium">Operator</th>
                    <th className="px-3 py-2 font-medium">Remarks</th>
                    {canManage && <th className="px-3 py-2" />}
                  </tr>
                </thead>
                <tbody>
                  {logs.map((log) => (
                    <tr key={log.id} className="border-b last:border-0 hover:bg-muted/30">
                      <td className="whitespace-nowrap px-3 py-2">{log.date}</td>
                      {!plantFilter && <td className="px-3 py-2">{log.plant_code}</td>}
                      {columns.map((chemical) => (
                        <td key={chemical.id} className="px-3 py-2 text-right">
                          {quantityFor(log, chemical.id) || '—'}
                        </td>
                      ))}
                      <td className="px-3 py-2">{fmt(log.operator_name)}</td>
                      <td className="px-3 py-2">{fmt(log.remarks)}</td>
                      {canManage && (
                        <td className="whitespace-nowrap px-3 py-2 text-right">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => openEdit(log)}
                            aria-label={`Edit ${log.date}`}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => remove(log)}
                            aria-label={`Delete ${log.date}`}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="border-t bg-muted/30 font-medium">
                    <td className="px-3 py-2">Total</td>
                    {!plantFilter && <td />}
                    {columns.map((chemical) => {
                      const total = totals.find((row) => row.chemical === chemical.id);
                      return (
                        <td key={chemical.id} className="px-3 py-2 text-right">
                          {total ? `${total.total} ${CHEMICAL_UOM_LABELS[total.uom]}` : '—'}
                        </td>
                      );
                    })}
                    <td />
                    <td />
                    {canManage && <td />}
                  </tr>
                </tfoot>
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
              {editing ? `Edit ${editing.date} — ${editing.plant_code}` : "Record a day's dosing"}
            </DialogTitle>
          </DialogHeader>

          <DialogBody className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <Label htmlFor="chem-plant">Plant</Label>
                <PlantSelect
                  id="chem-plant"
                  plants={plants}
                  value={formPlant}
                  onChange={setFormPlant}
                  disabled={Boolean(editing)}
                />
              </div>
              <div>
                <Label htmlFor="chem-date">Date</Label>
                <Input
                  id="chem-date"
                  type="date"
                  value={formDate}
                  onChange={(event) => setFormDate(event.target.value)}
                />
              </div>
            </div>

            <div className="space-y-2">
              {formChemicals.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No chemicals configured for this plant — add them in Settings.
                </p>
              ) : (
                formChemicals.map((chemical) => {
                  const cell = cells[chemical.id];
                  return (
                    <div key={chemical.id} className="flex items-end gap-3">
                      <div className="flex-1">
                        <Label htmlFor={`chem-qty-${chemical.id}`}>{chemical.name}</Label>
                        <Input
                          id={`chem-qty-${chemical.id}`}
                          type="number"
                          step="0.001"
                          placeholder="leave blank if not dosed"
                          value={cell?.quantity ?? ''}
                          onChange={(event) => setCell(chemical, { quantity: event.target.value })}
                        />
                      </div>
                      <div className="w-28">
                        <Label htmlFor={`chem-uom-${chemical.id}`}>Unit</Label>
                        <NativeSelect
                          id={`chem-uom-${chemical.id}`}
                          value={cell?.uom ?? chemical.default_uom}
                          onChange={(event) =>
                            setCell(chemical, { uom: event.target.value as ChemicalUom })
                          }
                        >
                          {UOM_VALUES.map((uom) => (
                            <SelectOption key={uom} value={uom}>
                              {CHEMICAL_UOM_LABELS[uom]}
                            </SelectOption>
                          ))}
                        </NativeSelect>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <Label htmlFor="chem-operator">Operator</Label>
                <StaffSelect
                  id="chem-operator"
                  staff={staff}
                  role="OPERATOR"
                  value={operator}
                  onChange={setOperator}
                />
              </div>
              <div>
                <Label htmlFor="chem-verifier">Verified by</Label>
                <StaffSelect
                  id="chem-verifier"
                  staff={staff}
                  role="SUPERVISOR"
                  value={verifier}
                  onChange={setVerifier}
                />
              </div>
            </div>

            <div>
              <Label htmlFor="chem-remarks">Remarks / stock received</Label>
              <Textarea
                id="chem-remarks"
                rows={2}
                placeholder="e.g. 200 kg DAP received 24/04/2026"
                value={remarks}
                onChange={(event) => setRemarks(event.target.value)}
              />
            </div>

            {/* The history of THIS entry, so a correction is always read in
                the context of the day it belongs to. */}
            {editing && <EtpEntryHistory register="CHEMICAL" objectId={editing.id} />}
          </DialogBody>

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={submit} disabled={createLog.isPending || updateLog.isPending}>
              <FlaskConical className="mr-1 h-4 w-4" />
              {editing ? 'Save changes' : 'Record day'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
