import { Plus, Save, Trash2 } from 'lucide-react';
import { useMemo, useState } from 'react';
import { toast } from 'sonner';

import { EXECUTION_PERMISSIONS } from '@/config/permissions';
import { usePermission } from '@/core/auth';
import { confirmDialog } from '@/shared/components';
import { DashboardHeader } from '@/shared/components/dashboard/DashboardHeader';
import {
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Input,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Textarea,
} from '@/shared/components/ui';
import { getErrorMessage } from '@/shared/utils';

import {
  useCreateFillingCostSheet,
  useDeleteFillingCostSheet,
  useFillingCostSheets,
  useLines,
  useUpdateFillingCostSheet,
} from '../api';
import { DEFAULT_FILLING_COST_CASES, DEFAULT_FILLING_COST_HEADS } from '../constants';
import type { FillingCostSheet } from '../types';

const ALL_LINES = 'all';

interface Row {
  /** React key only — a row is identified by its position when it is saved. */
  key: string;
  head: string;
  amount: string;
}

let rowSeq = 0;
const newRow = (head = '', amount = ''): Row => {
  rowSeq += 1;
  return { key: `row-${rowSeq}`, head, amount };
};

const thisMonth = () => {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
};

const num = (value: string) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

const fmt = (value: number, decimals = 2) =>
  value.toLocaleString('en-IN', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });

/** "1200000.00" off the API reads better in an input as "1200000". */
const plain = (value: string) =>
  value.includes('.') ? value.replace(/0+$/, '').replace(/\.$/, '') : value;

interface SheetEditorProps {
  /** The month's sheet, or null when nobody has entered it yet. */
  sheet: FillingCostSheet | null;
  /** The latest other month for this scope — what a blank month starts from. */
  template: FillingCostSheet | null;
  /** First day of the month being entered. */
  period: string;
  /** null = the filling floor as a whole. */
  lineId: number | null;
  lineName: string;
  canEdit: boolean;
}

/**
 * The sheet itself. Mounted under a key of the month, the line and the saved
 * version, so picking another month — or a save coming back — starts it over
 * from what the server holds rather than leaving a half-edited month on screen.
 */
function SheetEditor({ sheet, template, period, lineId, lineName, canEdit }: SheetEditorProps) {
  const [cases, setCases] = useState(() => {
    if (sheet) return plain(sheet.cases);
    return template ? plain(template.cases) : DEFAULT_FILLING_COST_CASES;
  });
  const [notes, setNotes] = useState(() => sheet?.notes ?? '');
  const [rows, setRows] = useState<Row[]>(() => {
    if (sheet) return sheet.entries.map((entry) => newRow(entry.head, plain(entry.amount)));
    const heads = template
      ? template.entries.map((entry) => entry.head)
      : [...DEFAULT_FILLING_COST_HEADS];
    return heads.map((head) => newRow(head));
  });

  const createSheet = useCreateFillingCostSheet();
  const updateSheet = useUpdateFillingCostSheet();
  const deleteSheet = useDeleteFillingCostSheet();
  const saving = createSheet.isPending || updateSheet.isPending;

  const caseCount = num(cases);
  const total = rows.reduce((sum, row) => sum + num(row.amount), 0);
  const perCase = (amount: number) => (caseCount > 0 ? amount / caseCount : 0);

  const editRow = (key: string, field: 'head' | 'amount', value: string) =>
    setRows((current) =>
      current.map((row) => (row.key === key ? { ...row, [field]: value } : row)),
    );

  const handleSave = async () => {
    const entries = rows
      .map((row) => ({
        head: row.head.trim(),
        amount: row.amount.trim() === '' ? '0' : row.amount.trim(),
      }))
      .filter((entry) => entry.head !== '');

    if (entries.length === 0) {
      toast.error('Enter at least one cost head');
      return;
    }
    if (caseCount <= 0) {
      toast.error('Enter the number of cases the cost is spread over');
      return;
    }
    const duplicate = entries.find(
      (entry, index) =>
        entries.findIndex((other) => other.head.toLowerCase() === entry.head.toLowerCase()) !==
        index,
    );
    if (duplicate) {
      toast.error(`'${duplicate.head}' is listed twice`);
      return;
    }
    const notANumber = entries.find((entry) => !Number.isFinite(Number(entry.amount)));
    if (notANumber) {
      toast.error(`'${notANumber.head}' needs an amount in figures`);
      return;
    }

    try {
      if (sheet) {
        await updateSheet.mutateAsync({ sheetId: sheet.id, data: { cases, notes, entries } });
      } else {
        await createSheet.mutateAsync({ line_id: lineId, period, cases, notes, entries });
      }
      toast.success('Filling cost saved');
    } catch (error) {
      toast.error(getErrorMessage(error, 'The filling cost was not saved.'));
    }
  };

  const handleDelete = async () => {
    if (!sheet) return;
    const confirmed = await confirmDialog({
      title: 'Delete this month’s filling cost?',
      description: 'The sheet and every head on it are removed.',
      confirmLabel: 'Delete',
      destructive: true,
    });
    if (!confirmed) return;
    try {
      await deleteSheet.mutateAsync(sheet.id);
      toast.success('Filling cost deleted');
    } catch (error) {
      toast.error(getErrorMessage(error, 'The sheet was not deleted.'));
    }
  };

  const monthLabel = new Date(`${period}T00:00:00`).toLocaleDateString('en-IN', {
    month: 'long',
    year: 'numeric',
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex flex-wrap items-center justify-between gap-3">
          <span>
            Filling Cost — {monthLabel}
            {lineName && ` · ${lineName}`}
          </span>
          <span className="flex flex-wrap items-center gap-2">
            <Label htmlFor="filling-cost-cases" className="text-sm font-normal">
              Cases
            </Label>
            <Input
              id="filling-cost-cases"
              className="w-36 text-right font-mono"
              inputMode="decimal"
              value={cases}
              disabled={!canEdit}
              onChange={(e) => setCases(e.target.value)}
            />
            {canEdit && (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setRows((current) => [...current, newRow()])}
                >
                  <Plus className="h-4 w-4 mr-2" /> Add Head
                </Button>
                {sheet && (
                  <Button variant="outline" size="sm" onClick={handleDelete}>
                    <Trash2 className="h-4 w-4 mr-2" /> Delete Sheet
                  </Button>
                )}
                <Button size="sm" onClick={handleSave} disabled={saving}>
                  <Save className="h-4 w-4 mr-2" /> {saving ? 'Saving…' : 'Save'}
                </Button>
              </>
            )}
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/50">
                <th className="text-left p-3 font-medium">Cost Head</th>
                <th className="text-right p-3 font-medium w-56">Amount (₹)</th>
                <th className="text-right p-3 font-medium w-52">Per {fmt(caseCount, 0)} Cases</th>
                {canEdit && <th className="w-12 p-3" />}
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.key} className="border-b">
                  <td className="p-2">
                    <Input
                      value={row.head}
                      placeholder="Cost head"
                      disabled={!canEdit}
                      onChange={(e) => editRow(row.key, 'head', e.target.value)}
                    />
                  </td>
                  <td className="p-2">
                    <Input
                      className="text-right font-mono"
                      inputMode="decimal"
                      placeholder="0"
                      value={row.amount}
                      disabled={!canEdit}
                      onChange={(e) => editRow(row.key, 'amount', e.target.value)}
                    />
                  </td>
                  <td className="p-3 text-right font-mono">{fmt(perCase(num(row.amount)))}</td>
                  {canEdit && (
                    <td className="p-2 text-center">
                      <Button
                        variant="ghost"
                        size="icon"
                        aria-label={`Remove ${row.head || 'row'}`}
                        onClick={() =>
                          setRows((current) => current.filter((r) => r.key !== row.key))
                        }
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </td>
                  )}
                </tr>
              ))}
              {rows.length === 0 && (
                <tr>
                  <td colSpan={canEdit ? 4 : 3} className="p-8 text-center text-muted-foreground">
                    No heads on this sheet yet.
                  </td>
                </tr>
              )}
            </tbody>
            <tfoot>
              <tr className="bg-muted/50 font-semibold">
                <td className="p-3">Total</td>
                <td className="p-3 text-right font-mono">{fmt(total)}</td>
                <td className="p-3 text-right font-mono">{fmt(perCase(total))}</td>
                {canEdit && <td />}
              </tr>
            </tfoot>
          </table>
        </div>

        {/* The sheet's own total row: the month over the cases. Adding up the
            rounded per-case column instead lands a paisa or two out. */}
        <p className="mt-3 text-xs text-muted-foreground">
          The total per case is the month’s total over {fmt(caseCount, 0)} cases, not the column
          above added up.
        </p>

        <div className="mt-4 space-y-1">
          <Label htmlFor="filling-cost-notes">Notes</Label>
          <Textarea
            id="filling-cost-notes"
            rows={2}
            placeholder="Anything about this month worth writing down"
            value={notes}
            disabled={!canEdit}
            onChange={(e) => setNotes(e.target.value)}
          />
        </div>
      </CardContent>
    </Card>
  );
}

/**
 * The filling cost sheet — the month's filling cost, typed in head by head as
 * the factory writes it, over the cases it is spread across.
 *
 * Nothing on the page is derived from production: the per-case column is the
 * amount over the case count and that is all it is. Run costing is a separate
 * thing and stays on the central Cost Master rates, so a sheet entered here
 * reprices no run.
 */
function FillingCostPage() {
  const { hasPermission } = usePermission();
  const canEdit = hasPermission(EXECUTION_PERMISSIONS.MANAGE_FILLING_COST);

  const { data: lines = [] } = useLines(true);
  const { data: sheets = [], isLoading } = useFillingCostSheets();

  const [month, setMonth] = useState(thisMonth);
  const [lineId, setLineId] = useState<number | null>(null);

  const period = `${month}-01`;
  const sheet = useMemo(
    () => sheets.find((s) => s.period === period && (s.line ?? null) === lineId) ?? null,
    [sheets, period, lineId],
  );
  // The latest other month for this scope — the list comes back newest first.
  // A month nobody has entered opens with the heads that one used, so the
  // sheet is typed out once and filled in thereafter.
  const template = useMemo(
    () => sheets.find((s) => (s.line ?? null) === lineId && s.period !== period) ?? null,
    [sheets, period, lineId],
  );

  return (
    <div className="space-y-6">
      <DashboardHeader
        title="Filling Cost"
        description={
          canEdit
            ? 'Enter the month’s filling cost head by head. The per-case column is the amount over the cases.'
            : 'The month’s filling cost, head by head. Read-only.'
        }
      />

      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-wrap items-end gap-4">
            <div className="space-y-1">
              <Label htmlFor="filling-cost-month">Month</Label>
              <Input
                id="filling-cost-month"
                type="month"
                className="w-44"
                value={month}
                onChange={(e) => setMonth(e.target.value || thisMonth())}
              />
            </div>
            <div className="space-y-1">
              <Label>Line</Label>
              <Select
                value={lineId === null ? ALL_LINES : String(lineId)}
                onValueChange={(value) => setLineId(value === ALL_LINES ? null : Number(value))}
              >
                <SelectTrigger className="w-[220px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={ALL_LINES}>All filling lines</SelectItem>
                  {lines.map((line) => (
                    <SelectItem key={line.id} value={String(line.id)}>
                      {line.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex-1 min-w-[220px] text-sm text-muted-foreground">
              {sheet
                ? `Entered by ${sheet.created_by_name || '—'}${
                    sheet.updated_by_name ? `, last saved by ${sheet.updated_by_name}` : ''
                  }`
                : 'No sheet for this month yet — fill the heads in and save.'}
            </div>
          </div>
        </CardContent>
      </Card>

      {isLoading ? (
        <div className="py-12 flex justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        </div>
      ) : (
        <SheetEditor
          key={`${period}|${lineId ?? 'none'}|${sheet?.id ?? 'new'}|${sheet?.updated_at ?? ''}`}
          sheet={sheet}
          template={template}
          period={period}
          lineId={lineId}
          lineName={lineId === null ? '' : (lines.find((l) => l.id === lineId)?.name ?? '')}
          canEdit={canEdit}
        />
      )}
    </div>
  );
}

export default FillingCostPage;
