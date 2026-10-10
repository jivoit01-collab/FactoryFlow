import { ArrowLeft, Loader2, Pencil, Plus, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';

import { usePermission } from '@/core/auth/hooks/usePermission';
import { confirmDialog } from '@/shared/components';
import { DashboardHeader } from '@/shared/components/dashboard/DashboardHeader';
import {
  Badge,
  Button,
  Checkbox,
  Label,
  NativeSelect,
  SelectOption,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/shared/components/ui';
import { formatDateTimeShort, getErrorMessage } from '@/shared/utils';

import { useCashSapOptions, useCashSapRouting, useGLItemMap, useRetireGLMapRow } from '../api';
import { CashSapSwitchBadges } from '../components/CashSapSwitchBadges';
import { GLMapEditDialog } from '../components/GLMapEditDialog';
import { RoutingEditDialog } from '../components/RoutingEditDialog';
import { CASH_SAP_PERMISSIONS } from '../constants/permissions';
import type { CashBranchRouting, GLItemMapRow } from '../types';
import { fmt } from '../utils/voucherDates';

const MODE_LABEL: Record<string, string> = {
  PO_GRPO: 'PO + GRPOs',
  AP_DRAFT_ONLY: 'A/P draft only',
};

const GROUPING_LABEL: Record<string, string> = {
  NONE: 'Per voucher',
  GATE_NO: 'Bill date + G.no.',
  BILL_NO: 'Bill date + bill no.',
};

const HEAD_LABEL: Record<string, string> = {
  ITEM: 'Goods',
  SERVICE: 'Service',
  NEVER: 'Never posted',
};

/**
 * Cash → SAP settings: `/accounts/cash-sap-settings`.
 *
 * Two tabs. **Branch routing** says, per cash-book branch, which SAP company
 * its vouchers post to and with what vendor, SAP branch, warehouse, dims, tax
 * codes, A/P drafts, GRPO grouping, series hints and cut-over. **G/L → SAP
 * item** says what each cash-book G/L head becomes in each SAP company, and
 * which account it is in that company's chart.
 *
 * Readable by anyone on the cash book (the backend's read rule); changeable
 * only with `cash_sap.can_manage_cash_sap_settings`. Without it the page says
 * so and offers no buttons.
 */
export default function CashSapSettingsPage() {
  const { hasPermission } = usePermission();
  const { data: options } = useCashSapOptions();
  const canEdit = hasPermission(CASH_SAP_PERMISSIONS.SETTINGS);
  const [tab, setTab] = useState('routing');

  return (
    <div className="space-y-6">
      <Link
        to="/accounts/cash-sap"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:underline"
      >
        <ArrowLeft className="h-4 w-4" /> Cash → SAP
      </Link>
      <DashboardHeader title="Cash → SAP settings">
        <CashSapSwitchBadges options={options} />
      </DashboardHeader>
      {!canEdit && (
        <p className="rounded-md border bg-muted/40 p-3 text-sm text-muted-foreground">
          Read only. Changing these needs the “Cash Book SAP Settings” group.
        </p>
      )}
      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="routing">Branch routing</TabsTrigger>
          <TabsTrigger value="gl-map">G/L → SAP item</TabsTrigger>
        </TabsList>
        <TabsContent value="routing" className="mt-4">
          <RoutingTab canEdit={canEdit} />
        </TabsContent>
        <TabsContent value="gl-map" className="mt-4">
          <GLMapTab canEdit={canEdit} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function RoutingTab({ canEdit }: { canEdit: boolean }) {
  const { data: options } = useCashSapOptions();
  const { data: rows = [], isLoading } = useCashSapRouting();
  const [editing, setEditing] = useState<CashBranchRouting | null>(null);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-10 text-muted-foreground">
        <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Loading the routing…
      </div>
    );
  }
  return (
    <>
      <div className="overflow-x-auto rounded-md border">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-muted/40 text-left">
              <th className="px-3 py-2">Branch</th>
              <th className="px-3 py-2">Posts</th>
              <th className="px-3 py-2">SAP company</th>
              <th className="px-3 py-2">Mode</th>
              <th className="px-3 py-2">Vendor</th>
              <th className="px-3 py-2">SAP branch</th>
              <th className="px-3 py-2">Warehouse</th>
              <th className="px-3 py-2">Dim1 / Dim3 / Dim5</th>
              <th className="px-3 py-2">Tax (item / service)</th>
              <th className="px-3 py-2">A/P drafts</th>
              <th className="px-3 py-2">GRPOs</th>
              <th className="px-3 py-2">Cut-over</th>
              <th className="px-3 py-2">Changed</th>
              <th className="px-3 py-2" />
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.branch_id} className="border-b align-top">
                <td className="px-3 py-2">
                  {row.branch_name}
                  {!row.branch_is_active && (
                    <Badge variant="outline" className="ml-1 text-[10px]">
                      Retired
                    </Badge>
                  )}
                </td>
                <td className="px-3 py-2">
                  {!row.configured ? (
                    <span className="text-muted-foreground">Not set</span>
                  ) : row.enabled ? (
                    'Yes'
                  ) : (
                    <span className="text-muted-foreground">Off</span>
                  )}
                </td>
                <td className="px-3 py-2 font-mono">{row.sap_company_code || '—'}</td>
                <td className="px-3 py-2">{MODE_LABEL[row.mode] ?? row.mode}</td>
                <td className="px-3 py-2 font-mono">{row.vendor_code || '—'}</td>
                <td className="px-3 py-2">{row.bpl_id ?? '—'}</td>
                <td className="px-3 py-2 font-mono">{row.warehouse_code || '—'}</td>
                <td className="px-3 py-2 text-xs">
                  {[row.ocr_code, row.ocr_code3, row.ocr_code5].map((d) => d || '—').join(' / ')}
                </td>
                <td className="px-3 py-2 text-xs">
                  {row.item_tax_code || '—'} / {row.service_tax_code || '—'}
                </td>
                <td className="px-3 py-2">{row.ap_drafts_enabled ? 'On' : 'Off'}</td>
                <td className="px-3 py-2 text-xs">
                  {GROUPING_LABEL[row.grpo_grouping] ?? row.grpo_grouping}
                  {row.grpo_needs_attachment ? ' · bill needed' : ''}
                </td>
                <td className="whitespace-nowrap px-3 py-2">
                  {row.cutover_date ? fmt(row.cutover_date) : '—'}
                </td>
                <td className="px-3 py-2 text-xs text-muted-foreground">
                  {row.updated_by_name}
                  {row.updated_at ? ` · ${formatDateTimeShort(row.updated_at)}` : ''}
                </td>
                <td className="px-3 py-2">
                  {canEdit && (
                    <Button variant="ghost" size="sm" onClick={() => setEditing(row)}>
                      <Pencil className="mr-2 h-4 w-4" /> Edit
                    </Button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <RoutingEditDialog
        open={editing != null}
        onOpenChange={(open) => !open && setEditing(null)}
        row={editing}
        options={options}
      />
    </>
  );
}

function GLMapTab({ canEdit }: { canEdit: boolean }) {
  const { data: options } = useCashSapOptions();
  const [company, setCompany] = useState('');
  const [includeRetired, setIncludeRetired] = useState(false);
  const { data: rows = [], isLoading } = useGLItemMap(company, includeRetired);
  const retire = useRetireGLMapRow();
  const [editing, setEditing] = useState<GLItemMapRow | 'new' | null>(null);

  async function doRetire(row: GLItemMapRow) {
    const ok = await confirmDialog({
      title: `Retire the mapping of ${row.gl_account_code} in ${row.sap_company_code}?`,
      description:
        'Vouchers under this head then post as service lines (with a warning) until it is mapped again. Documents already frozen keep what they were frozen with.',
      confirmLabel: 'Retire',
      destructive: true,
    });
    if (!ok) return;
    try {
      await retire.mutateAsync(row.id);
      toast.success('Mapping retired');
    } catch (err) {
      toast.error(getErrorMessage(err, 'The mapping could not be retired.'));
    }
  }

  return (
    <>
      <div className="mb-3 flex flex-wrap items-center gap-3">
        <NativeSelect
          aria-label="SAP company"
          className="w-[200px]"
          value={company}
          onChange={(e) => setCompany(e.target.value)}
        >
          <SelectOption value="">Every SAP company</SelectOption>
          {(options?.sap_companies ?? []).map((code) => (
            <SelectOption key={code} value={code}>
              {code}
            </SelectOption>
          ))}
        </NativeSelect>
        <div className="flex items-center gap-2">
          <Checkbox
            id="gl-retired"
            checked={includeRetired}
            onCheckedChange={setIncludeRetired}
            aria-label="Show retired mappings"
          />
          <Label htmlFor="gl-retired">Show retired</Label>
        </div>
        {canEdit && (
          <Button size="sm" className="ml-auto" onClick={() => setEditing('new')}>
            <Plus className="mr-2 h-4 w-4" /> Map a G/L head
          </Button>
        )}
      </div>
      {isLoading ? (
        <div className="flex items-center justify-center py-10 text-muted-foreground">
          <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Loading the map…
        </div>
      ) : rows.length === 0 ? (
        <p className="py-8 text-center text-muted-foreground">
          No mappings. An unmapped head posts as a service line, with a warning.
        </p>
      ) : (
        <div className="overflow-x-auto rounded-md border">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/40 text-left">
                <th className="px-3 py-2">SAP company</th>
                <th className="px-3 py-2">Cash book G/L</th>
                <th className="px-3 py-2">Account there</th>
                <th className="px-3 py-2">Treatment</th>
                <th className="px-3 py-2">SAP item</th>
                <th className="px-3 py-2">Dim3</th>
                <th className="px-3 py-2">Changed</th>
                <th className="px-3 py-2" />
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr
                  key={row.id}
                  className={`border-b align-top ${row.is_active ? '' : 'text-muted-foreground line-through'}`}
                >
                  <td className="px-3 py-2 font-mono">{row.sap_company_code}</td>
                  <td className="px-3 py-2">
                    <span className="font-mono">{row.gl_account_code}</span>{' '}
                    <span className="text-muted-foreground">{row.gl_account_name}</span>
                  </td>
                  <td className="px-3 py-2 font-mono">{row.target_account_code || '—'}</td>
                  <td className="px-3 py-2">
                    {HEAD_LABEL[row.treatment] ?? row.treatment}
                    {row.needs_review && (
                      <Badge variant="outline" className="ml-1 text-[10px]">
                        Check each
                      </Badge>
                    )}
                  </td>
                  <td className="px-3 py-2">
                    {row.item_code ? (
                      <>
                        <span className="font-mono">{row.item_code}</span>{' '}
                        <span className="text-muted-foreground">{row.item_name}</span>
                      </>
                    ) : (
                      '—'
                    )}
                  </td>
                  <td className="px-3 py-2">{row.ocr_code3 || '—'}</td>
                  <td className="px-3 py-2 text-xs text-muted-foreground">
                    {row.updated_by_name}
                    {row.updated_at ? ` · ${formatDateTimeShort(row.updated_at)}` : ''}
                  </td>
                  <td className="whitespace-nowrap px-3 py-2">
                    {canEdit && row.is_active && (
                      <>
                        <Button variant="ghost" size="sm" onClick={() => setEditing(row)}>
                          <Pencil className="mr-2 h-4 w-4" /> Edit
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => void doRetire(row)}
                          disabled={retire.isPending}
                        >
                          <Trash2 className="mr-2 h-4 w-4" /> Retire
                        </Button>
                      </>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <GLMapEditDialog
        open={editing != null}
        onOpenChange={(open) => !open && setEditing(null)}
        row={editing === 'new' ? null : editing}
        options={options}
        defaultCompany={company}
      />
    </>
  );
}
