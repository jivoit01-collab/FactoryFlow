import {
  Bell,
  ClipboardPlus,
  PackageSearch,
  QrCode,
  RefreshCw,
  Save,
  Search,
  Send,
  Wrench,
} from 'lucide-react';
import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';

import {
  Badge,
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Input,
  Label,
  NativeSelect,
  SelectOption,
  Textarea,
} from '@/shared/components/ui';

import {
  useAssignMaintenanceAssetQr,
  useCreateWorkOrderFromScan,
  useMaintenanceAlerts,
  useMaintenanceScanLookup,
  useMaintenanceSpareStock,
  useSendMaintenanceAlerts,
} from '../api';
import type {
  MaintenanceAlertSeverity,
  MaintenanceAlertType,
  MaintenancePriority,
  WorkImpact,
} from '../types';

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

function formatQty(value: string | number | null | undefined) {
  const numericValue = Number(value ?? 0);
  return numericValue.toLocaleString('en-IN', { maximumFractionDigits: 3 });
}

function alertClass(severity: MaintenanceAlertSeverity) {
  return severity === 'critical'
    ? 'border-rose-200 dark:border-rose-500/30 bg-rose-50 dark:bg-rose-500/10 text-rose-800 dark:text-rose-400'
    : 'border-amber-200 dark:border-amber-500/30 bg-amber-50 dark:bg-amber-500/10 text-amber-800 dark:text-amber-400';
}

const alertLabels: Record<MaintenanceAlertType, string> = {
  PM_DUE: 'PM Due',
  BREAKDOWN_ESCALATION: 'Breakdown',
  LOW_CRITICAL_SPARE: 'Critical Spare',
  AMC_WARRANTY_EXPIRY: 'AMC / Warranty',
};

export default function MaintenanceAutomationPage() {
  const navigate = useNavigate();
  const [scanInput, setScanInput] = useState('');
  const [activeCode, setActiveCode] = useState('');
  const [warehouse, setWarehouse] = useState('');
  const [complaint, setComplaint] = useState({
    title: '',
    problem_statement: '',
    priority: 'HIGH' as MaintenancePriority,
    impact: 'DEGRADED' as WorkImpact,
    target_date: todayIso(),
  });

  const scanQuery = useMaintenanceScanLookup(activeCode, Boolean(activeCode));
  const lookup = scanQuery.data;
  const stockQuery = useMaintenanceSpareStock(
    { spare: lookup?.spare?.id, warehouse },
    lookup?.type === 'spare',
  );
  const alertsQuery = useMaintenanceAlerts();
  const assignQrMutation = useAssignMaintenanceAssetQr();
  const createWorkOrderMutation = useCreateWorkOrderFromScan();
  const sendAlertsMutation = useSendMaintenanceAlerts();

  const alertCounts = useMemo(() => alertsQuery.data?.counts ?? {}, [alertsQuery.data?.counts]);

  const runLookup = () => {
    const code = scanInput.trim();
    if (!code) return;
    setActiveCode(code);
  };

  const handleAssignQr = async () => {
    if (!lookup?.asset || !lookup.qr_code) return;
    await assignQrMutation.mutateAsync({
      assetId: lookup.asset.id,
      payload: { qr_code: lookup.qr_code },
    });
    toast.success('Asset QR saved');
  };

  const handleCreateComplaint = async () => {
    if (!activeCode || !lookup?.asset) return;
    const workOrder = await createWorkOrderMutation.mutateAsync({
      code: activeCode,
      ...complaint,
    });
    toast.success(`Created ${workOrder.work_order_no}`);
    navigate(`/maintenance/work-orders/${workOrder.id}`);
  };

  const handleSendAlerts = async (alertTypes?: MaintenanceAlertType[]) => {
    const response = await sendAlertsMutation.mutateAsync({
      alert_types: alertTypes,
      limit: 10,
    });
    toast.success(`${response.notifications_sent} notifications queued`);
  };

  return (
    <div className="space-y-6 p-4 md:p-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-normal">Maintenance Automation</h1>
          <div className="text-sm text-muted-foreground">
            {alertsQuery.data?.total ?? 0} active alerts
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" onClick={() => alertsQuery.refetch()}>
            <RefreshCw className={`mr-2 h-4 w-4 ${alertsQuery.isFetching ? 'animate-spin' : ''}`} />
            Refresh Alerts
          </Button>
          <Button size="sm" onClick={() => handleSendAlerts()} disabled={sendAlertsMutation.isPending}>
            <Send className="mr-2 h-4 w-4" />
            Send Alerts
          </Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {(Object.keys(alertLabels) as MaintenanceAlertType[]).map((type) => (
          <Card key={type}>
            <CardContent className="flex items-center justify-between p-4">
              <div>
                <div className="text-sm text-muted-foreground">{alertLabels[type]}</div>
                <div className="text-2xl font-semibold">{alertCounts[type] ?? 0}</div>
              </div>
              <Bell className="h-5 w-5 text-primary" />
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_420px]">
        <div className="space-y-6">
          <Card className="border-slate-200/80 shadow-sm transition-shadow hover:shadow-md dark:border-border">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <QrCode className="h-5 w-5" />
                Scan Lookup
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_auto]">
                <Input
                  value={scanInput}
                  onChange={(event) => setScanInput(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter') runLookup();
                  }}
                  placeholder="Asset QR, asset code, spare part number, SAP item code"
                />
                <Button onClick={runLookup} disabled={scanQuery.isFetching}>
                  <Search className="mr-2 h-4 w-4" />
                  Search
                </Button>
              </div>

              {scanQuery.isError && (
                <div className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-400">
                  No matching maintenance asset or spare found.
                </div>
              )}

              {lookup?.type === 'asset' && lookup.asset && (
                <div className="rounded-xl border border-slate-200/80 bg-slate-50/50 p-4 dark:border-border dark:bg-muted/20">
                  <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                    <div>
                      <div className="text-sm text-muted-foreground">Asset</div>
                      <div className="text-lg font-semibold">
                        {lookup.asset.asset_code} - {lookup.asset.name}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {lookup.asset.department_name} / {lookup.asset.line || '-'}
                      </div>
                    </div>
                    <Badge variant="outline">{lookup.asset.status}</Badge>
                  </div>
                  <div className="mt-4 grid gap-3 md:grid-cols-[minmax(0,1fr)_auto_auto]">
                    <Input value={lookup.qr_code ?? ''} readOnly />
                    <Button
                      variant="outline"
                      onClick={handleAssignQr}
                      disabled={assignQrMutation.isPending}
                    >
                      <Save className="mr-2 h-4 w-4" />
                      Save QR
                    </Button>
                    <Button onClick={() => navigate(`/maintenance/assets/${lookup.asset?.id}`)}>
                      View Asset
                    </Button>
                  </div>
                </div>
              )}

              {lookup?.type === 'spare' && lookup.spare && (
                <div className="rounded-xl border border-slate-200/80 bg-slate-50/50 p-4 dark:border-border dark:bg-muted/20">
                  <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                    <div>
                      <div className="text-sm text-muted-foreground">Spare</div>
                      <div className="text-lg font-semibold">
                        {lookup.spare.part_number} - {lookup.spare.name}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        SAP {lookup.spare.sap_item_code || '-'} / {lookup.spare.uom}
                      </div>
                    </div>
                    <Badge variant="outline">{lookup.spare.is_critical ? 'Critical' : 'Standard'}</Badge>
                  </div>
                  <div className="mt-4 grid gap-3 md:grid-cols-[220px_auto]">
                    <Input
                      value={warehouse}
                      onChange={(event) => setWarehouse(event.target.value)}
                      placeholder="Warehouse"
                    />
                    <Button variant="outline" onClick={() => stockQuery.refetch()}>
                      <PackageSearch className="mr-2 h-4 w-4" />
                      Refresh Stock
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {lookup?.type === 'asset' && lookup.asset && (
            <Card className="border-slate-200/80 shadow-sm transition-shadow hover:shadow-md dark:border-border">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <ClipboardPlus className="h-5 w-5" />
                  Scan Complaint
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="scan-complaint-title">Title</Label>
                    <Input
                      id="scan-complaint-title"
                      value={complaint.title}
                      onChange={(event) => setComplaint((current) => ({ ...current, title: event.target.value }))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="scan-complaint-target">Target Date</Label>
                    <Input
                      id="scan-complaint-target"
                      type="date"
                      value={complaint.target_date}
                      onChange={(event) =>
                        setComplaint((current) => ({ ...current, target_date: event.target.value }))
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="scan-complaint-priority">Priority</Label>
                    <NativeSelect
                      id="scan-complaint-priority"
                      value={complaint.priority}
                      onChange={(event) =>
                        setComplaint((current) => ({
                          ...current,
                          priority: event.target.value as MaintenancePriority,
                        }))
                      }
                    >
                      <SelectOption value="NORMAL">Normal</SelectOption>
                      <SelectOption value="HIGH">High</SelectOption>
                      <SelectOption value="CRITICAL">Critical</SelectOption>
                    </NativeSelect>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="scan-complaint-impact">Impact</Label>
                    <NativeSelect
                      id="scan-complaint-impact"
                      value={complaint.impact}
                      onChange={(event) =>
                        setComplaint((current) => ({
                          ...current,
                          impact: event.target.value as WorkImpact,
                        }))
                      }
                    >
                      <SelectOption value="NO_IMPACT">No Impact</SelectOption>
                      <SelectOption value="DEGRADED">Reduced Performance</SelectOption>
                      <SelectOption value="STOPPAGE">Production Stoppage</SelectOption>
                      <SelectOption value="SAFETY_RISK">Safety Risk</SelectOption>
                    </NativeSelect>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="scan-complaint-problem">Problem</Label>
                  <Textarea
                    id="scan-complaint-problem"
                    value={complaint.problem_statement}
                    onChange={(event) =>
                      setComplaint((current) => ({
                        ...current,
                        problem_statement: event.target.value,
                      }))
                    }
                  />
                </div>
                <Button
                  onClick={handleCreateComplaint}
                  disabled={
                    createWorkOrderMutation.isPending ||
                    !complaint.title.trim() ||
                    !complaint.problem_statement.trim()
                  }
                >
                  <Wrench className="mr-2 h-4 w-4" />
                  Create Work Order
                </Button>
              </CardContent>
            </Card>
          )}

          {lookup?.type === 'spare' && stockQuery.data && (
            <Card className="border-slate-200/80 shadow-sm transition-shadow hover:shadow-md dark:border-border">
              <CardHeader>
                <CardTitle className="text-lg">Spare Availability</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-3 md:grid-cols-4">
                  <div>
                    <div className="text-sm text-muted-foreground">Local Stock</div>
                    <div className="text-xl font-semibold">
                      {formatQty(stockQuery.data.local.current_stock)}
                    </div>
                  </div>
                  <div>
                    <div className="text-sm text-muted-foreground">Reorder</div>
                    <div className="text-xl font-semibold">
                      {formatQty(stockQuery.data.local.reorder_level)}
                    </div>
                  </div>
                  <div>
                    <div className="text-sm text-muted-foreground">Shortage</div>
                    <div className="text-xl font-semibold">
                      {formatQty(stockQuery.data.local.shortage_qty)}
                    </div>
                  </div>
                  <div>
                    <div className="text-sm text-muted-foreground">SAP Available</div>
                    <div className="text-xl font-semibold">
                      {formatQty(stockQuery.data.sap.total_available_qty)}
                    </div>
                  </div>
                </div>
                <div className="overflow-x-auto rounded-xl border border-slate-200/80 bg-card shadow-sm dark:border-border">
                  <table className="w-full min-w-[760px] text-sm">
                    <thead className="border-b border-slate-200/80 bg-slate-50/80 [&_th]:text-[11px] [&_th]:font-semibold [&_th]:uppercase [&_th]:tracking-wider [&_th]:text-slate-500 dark:[&_th]:text-muted-foreground dark:border-border dark:bg-muted/30">
                      <tr>
                        <th className="px-4 py-3 text-left">Warehouse</th>
                        <th className="px-4 py-3 text-right">On Hand</th>
                        <th className="px-4 py-3 text-right">Committed</th>
                        <th className="px-4 py-3 text-right">Available</th>
                        <th className="px-4 py-3 text-right">On Order</th>
                      </tr>
                    </thead>
                    <tbody>
                      {stockQuery.data.sap.rows.length === 0 ? (
                        <tr>
                          <td colSpan={5} className="h-20 px-4 text-center text-muted-foreground">
                            {stockQuery.data.sap.message || 'No SAP stock rows found.'}
                          </td>
                        </tr>
                      ) : (
                        stockQuery.data.sap.rows.map((row) => (
                          <tr key={row.warehouse} className="border-b last:border-b-0">
                            <td className="px-4 py-3">
                              <div className="font-medium">{row.warehouse || '-'}</div>
                              <div className="text-xs text-muted-foreground">{row.warehouse_name}</div>
                            </td>
                            <td className="px-4 py-3 text-right">{formatQty(row.on_hand)}</td>
                            <td className="px-4 py-3 text-right">{formatQty(row.committed)}</td>
                            <td className="px-4 py-3 text-right">{formatQty(row.available_qty)}</td>
                            <td className="px-4 py-3 text-right">{formatQty(row.on_order)}</td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        <Card className="border-slate-200/80 shadow-sm transition-shadow hover:shadow-md dark:border-border">
          <CardHeader>
            <CardTitle className="text-lg">Alerts</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {alertsQuery.data?.alerts.length === 0 && (
              <div className="rounded-xl border border-slate-200/80 bg-slate-50/50 p-4 text-sm text-muted-foreground dark:border-border dark:bg-muted/20">No alerts.</div>
            )}
            {alertsQuery.data?.alerts.slice(0, 12).map((alert) => (
              <div key={`${alert.type}-${alert.reference_id}`} className="rounded-xl border border-slate-200/80 bg-slate-50/50 p-3 dark:border-border dark:bg-muted/20">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="font-medium">{alert.title}</div>
                    <div className="text-sm text-muted-foreground">{alert.message}</div>
                  </div>
                  <Badge variant="outline" className={alertClass(alert.severity)}>
                    {alert.severity}
                  </Badge>
                </div>
                <div className="mt-3 flex gap-2">
                  <Button variant="outline" size="sm" onClick={() => navigate(alert.url)}>
                    Open
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleSendAlerts([alert.type])}
                    disabled={sendAlertsMutation.isPending}
                  >
                    Send
                  </Button>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
