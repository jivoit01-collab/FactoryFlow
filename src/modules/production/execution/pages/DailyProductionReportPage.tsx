import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Printer } from 'lucide-react';

import { Button, Card, CardContent, CardHeader, CardTitle, Input, Label } from '@/shared/components/ui';

import { ProductionStatusBadge } from '../components/ProductionStatusBadge';
import { MachineStatusDot } from '../components/MachineStatusDot';
import { TIME_SLOTS } from '../constants';
import { useDailyProductionReport, useProductionLines } from '../api/execution.queries';

export default function DailyProductionReportPage() {
  const navigate = useNavigate();
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [lineId, setLineId] = useState<number | undefined>();

  const { data: lines = [] } = useProductionLines(true);
  const { data: report, isLoading } = useDailyProductionReport({ date, line_id: lineId });

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6 p-6">
      {/* Header - hidden in print */}
      <div className="flex items-start justify-between print:hidden">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold">Daily Production Report</h1>
            <p className="text-sm text-muted-foreground">
              View and print daily production summary
            </p>
          </div>
        </div>
        <Button variant="outline" onClick={handlePrint}>
          <Printer className="h-4 w-4 mr-2" />
          Print
        </Button>
      </div>

      {/* Filters - hidden in print */}
      <Card className="print:hidden">
        <CardContent className="p-4">
          <div className="flex items-end gap-4">
            <div className="space-y-1">
              <Label className="text-xs">Date</Label>
              <Input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="h-9 w-44"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Line</Label>
              <select
                value={lineId ?? ''}
                onChange={(e) =>
                  setLineId(e.target.value ? Number(e.target.value) : undefined)
                }
                className="h-9 rounded-md border border-input bg-background px-3 text-sm"
              >
                <option value="">All Lines</option>
                {lines.map((line) => (
                  <option key={line.id} value={line.id}>
                    {line.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </CardContent>
      </Card>

      {isLoading ? (
        <div className="space-y-4">
          <div className="h-32 bg-muted rounded animate-pulse" />
          <div className="h-96 bg-muted rounded animate-pulse" />
        </div>
      ) : !report ? (
        <Card>
          <CardContent className="p-12 text-center">
            <p className="text-muted-foreground">
              No production data found for the selected date.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6 print:space-y-4">
          {/* Print Header */}
          <div className="text-center print:block hidden">
            <h1 className="text-xl font-bold">DAILY PRODUCTION REPORT</h1>
            <p className="text-sm">JIVO WELLNESS PVT. LTD.</p>
          </div>

          {/* Report Info */}
          <Card className="print:shadow-none print:border">
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Report Summary</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <div>
                  <span className="text-muted-foreground">Date</span>
                  <p className="font-medium">{date}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Total Production</span>
                  <p className="font-bold text-blue-600">
                    {report.total_production?.toLocaleString() ?? 0} Cases
                  </p>
                </div>
                <div>
                  <span className="text-muted-foreground">Total Breakdown</span>
                  <p className="font-bold text-red-600">
                    {report.total_breakdown ?? 0} min
                  </p>
                </div>
                <div>
                  <span className="text-muted-foreground">Efficiency</span>
                  <p className="font-bold text-green-600">
                    {report.efficiency?.toFixed(1) ?? '0.0'}%
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Runs */}
          {report.runs?.map((run: Record<string, unknown>) => {
            const runData = run as {
              id: number;
              run_number: number;
              brand?: string;
              plan_item_name?: string;
              pack?: string;
              line_name?: string;
              sap_order_no?: string;
              rated_speed?: string;
              status: 'DRAFT' | 'IN_PROGRESS' | 'COMPLETED';
              total_production: number;
              total_breakdown_time: number;
              total_minutes_pe?: number;
              total_minutes_me?: number;
              line_breakdown_time?: number;
              external_breakdown_time?: number;
              unrecorded_time?: number;
              logs?: {
                time_slot: string;
                produced_cases: number;
                machine_status: 'RUNNING' | 'IDLE' | 'BREAKDOWN' | 'CHANGEOVER';
                recd_minutes: number;
                breakdown_detail: string;
              }[];
              manpower?: { worker_count: number }[];
            };

            const totalWorkers = runData.manpower?.reduce(
              (sum, m) => sum + m.worker_count,
              0,
            ) ?? 0;

            return (
              <Card key={runData.id} className="print:shadow-none print:border print:break-inside-avoid">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base">
                      Run #{runData.run_number} — {runData.brand || runData.plan_item_name || 'Production Run'}
                      {runData.pack && ` ${runData.pack}`}
                    </CardTitle>
                    <ProductionStatusBadge status={runData.status} />
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Run Info Grid */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
                    <div>
                      <span className="text-muted-foreground">Line</span>
                      <p className="font-medium">{runData.line_name}</p>
                    </div>
                    {runData.sap_order_no && (
                      <div>
                        <span className="text-muted-foreground">SAP Order</span>
                        <p className="font-medium">{runData.sap_order_no}</p>
                      </div>
                    )}
                    <div>
                      <span className="text-muted-foreground">Rated Speed</span>
                      <p className="font-medium">{runData.rated_speed ?? '—'} cases/hr</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Manpower</span>
                      <p className="font-medium">{totalWorkers} workers</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Total PE Minutes</span>
                      <p className="font-medium">{runData.total_minutes_pe ?? '—'}</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Total ME Minutes</span>
                      <p className="font-medium">{runData.total_minutes_me ?? '—'}</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Line Breakdown</span>
                      <p className="font-medium">{runData.line_breakdown_time ?? 0} min</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">External Breakdown</span>
                      <p className="font-medium">{runData.external_breakdown_time ?? 0} min</p>
                    </div>
                  </div>

                  {/* Hourly Production Table (read-only) */}
                  {runData.logs && runData.logs.length > 0 && (
                    <div className="overflow-x-auto rounded-lg border">
                      <table className="w-full text-xs">
                        <thead>
                          <tr className="border-b bg-muted/50">
                            <th className="px-2 py-2 text-left font-medium">Time</th>
                            <th className="px-2 py-2 text-right font-medium">Prod (Cases)</th>
                            <th className="px-2 py-2 text-center font-medium">Machine</th>
                            <th className="px-2 py-2 text-right font-medium">Recd Mins</th>
                            <th className="px-2 py-2 text-left font-medium">Detail</th>
                          </tr>
                        </thead>
                        <tbody>
                          {TIME_SLOTS.map((slot) => {
                            const log = runData.logs?.find((l) => l.time_slot === slot.slot);
                            return (
                              <tr key={slot.slot} className="border-b last:border-0">
                                <td className="px-2 py-1.5 font-medium text-muted-foreground">
                                  {slot.slot}
                                </td>
                                <td className="px-2 py-1.5 text-right font-mono">
                                  {log?.produced_cases || '—'}
                                </td>
                                <td className="px-2 py-1.5 text-center">
                                  {log ? (
                                    <MachineStatusDot status={log.machine_status} showLabel />
                                  ) : (
                                    '—'
                                  )}
                                </td>
                                <td className="px-2 py-1.5 text-right font-mono">
                                  {log?.recd_minutes || '—'}
                                </td>
                                <td className="px-2 py-1.5 text-muted-foreground">
                                  {log?.breakdown_detail || '—'}
                                </td>
                              </tr>
                            );
                          })}
                          <tr className="bg-blue-50 dark:bg-blue-900/20 font-bold text-xs">
                            <td className="px-2 py-2">TOTAL</td>
                            <td className="px-2 py-2 text-right font-mono">
                              {runData.total_production.toLocaleString()}
                            </td>
                            <td className="px-2 py-2" />
                            <td className="px-2 py-2 text-right font-mono">
                              {runData.logs?.reduce((sum, l) => sum + l.recd_minutes, 0) ?? 0}
                            </td>
                            <td className="px-2 py-2" />
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}

          {/* Signature Row */}
          <Card className="print:shadow-none print:border">
            <CardContent className="p-6">
              <div className="grid grid-cols-3 gap-8">
                <div className="text-center">
                  <div className="border-b border-dashed pb-8 mb-2" />
                  <p className="text-xs text-muted-foreground">Sign of Associate</p>
                </div>
                <div className="text-center">
                  <div className="border-b border-dashed pb-8 mb-2" />
                  <p className="text-xs text-muted-foreground">Sign of Engineer</p>
                </div>
                <div className="text-center">
                  <div className="border-b border-dashed pb-8 mb-2" />
                  <p className="text-xs text-muted-foreground">HOD Sign</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
