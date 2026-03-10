import { useCallback, useState } from 'react';
import { ChevronLeft, ChevronRight, Save, Wrench } from 'lucide-react';
import { toast } from 'sonner';

import { Button, Card, CardContent, CardHeader, CardTitle } from '@/shared/components/ui';
import { DashboardHeader } from '@/shared/components/dashboard/DashboardHeader';

import { FrequencyTabs } from '../components/FrequencyTabs';
import { ChecklistCalendarGrid } from '../components/ChecklistCalendarGrid';
import { MACHINE_TYPE_OPTIONS } from '../constants';
import {
  useChecklistTemplates,
  useChecklistEntries,
  useBulkCreateChecklistEntries,
  useProductionLines,
  useMachines,
} from '../api/execution.queries';
import type { ChecklistFrequency, ChecklistStatus, CreateChecklistEntryRequest } from '../types';

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

export default function MachineChecklistPage() {
  const now = new Date();
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year, setYear] = useState(now.getFullYear());
  const [frequency, setFrequency] = useState<ChecklistFrequency>('DAILY');
  const [selectedMachineType, setSelectedMachineType] = useState(MACHINE_TYPE_OPTIONS[0].value);
  const [selectedLine, setSelectedLine] = useState<number | undefined>();

  const { data: lines = [] } = useProductionLines(true);
  const { data: machines = [] } = useMachines(selectedLine, selectedMachineType);
  const { data: templates = [] } = useChecklistTemplates(selectedMachineType, frequency);
  const { data: entries = [] } = useChecklistEntries({
    machine_id: machines[0]?.id,
    month,
    year,
    frequency,
  });
  const bulkCreate = useBulkCreateChecklistEntries();

  const [pendingChanges, setPendingChanges] = useState<CreateChecklistEntryRequest[]>([]);

  const prevMonth = () => {
    if (month === 1) {
      setMonth(12);
      setYear(year - 1);
    } else {
      setMonth(month - 1);
    }
  };

  const nextMonth = () => {
    if (month === 12) {
      setMonth(1);
      setYear(year + 1);
    } else {
      setMonth(month + 1);
    }
  };

  const handleCellChange = useCallback(
    (templateId: number, day: number, status: ChecklistStatus) => {
      const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      const machineId = machines[0]?.id;
      if (!machineId) return;

      const entry: CreateChecklistEntryRequest = {
        machine_id: machineId,
        template_id: templateId,
        date: dateStr,
        status,
      };

      setPendingChanges((prev) => {
        const filtered = prev.filter(
          (e) => !(e.template_id === templateId && e.date === dateStr),
        );
        return [...filtered, entry];
      });
    },
    [machines, month, year],
  );

  const handleSignatureChange = useCallback(
    (day: number, field: 'operator' | 'shift_incharge', value: string) => {
      const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      const machineId = machines[0]?.id;
      if (!machineId || templates.length === 0) return;

      const entry: CreateChecklistEntryRequest = {
        machine_id: machineId,
        template_id: templates[0].id,
        date: dateStr,
        [field]: value,
      };

      setPendingChanges((prev) => {
        const existing = prev.find(
          (e) => e.template_id === templates[0].id && e.date === dateStr,
        );
        if (existing) {
          return prev.map((e) =>
            e.template_id === templates[0].id && e.date === dateStr
              ? { ...e, [field]: value }
              : e,
          );
        }
        return [...prev, entry];
      });
    },
    [machines, templates, month, year],
  );

  const handleSave = async () => {
    if (pendingChanges.length === 0) return;
    try {
      await bulkCreate.mutateAsync(pendingChanges);
      setPendingChanges([]);
      toast.success('Checklist saved');
    } catch {
      toast.error('Failed to save checklist');
    }
  };

  const machineLabel =
    MACHINE_TYPE_OPTIONS.find((o) => o.value === selectedMachineType)?.label ?? selectedMachineType;

  return (
    <div className="space-y-6 p-6">
      <DashboardHeader
        title="Machine Maintenance Checklists"
        description="Monthly calendar view for machine maintenance tasks"
        primaryAction={{
          label: 'Save All Changes',
          icon: <Save className="h-4 w-4 mr-2" />,
          onClick: handleSave,
        }}
      />

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-wrap items-center gap-4">
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">Machine Type</label>
              <select
                value={selectedMachineType}
                onChange={(e) => setSelectedMachineType(e.target.value)}
                className="h-9 rounded-md border border-input bg-background px-3 text-sm"
              >
                {MACHINE_TYPE_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">Line</label>
              <select
                value={selectedLine ?? ''}
                onChange={(e) =>
                  setSelectedLine(e.target.value ? Number(e.target.value) : undefined)
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

            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">Month</label>
              <div className="flex items-center gap-1">
                <Button variant="outline" size="icon" className="h-9 w-9" onClick={prevMonth}>
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <span className="text-sm font-medium min-w-[140px] text-center">
                  {MONTH_NAMES[month - 1]} {year}
                </span>
                <Button variant="outline" size="icon" className="h-9 w-9" onClick={nextMonth}>
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Frequency Tabs */}
      <FrequencyTabs active={frequency} onChange={setFrequency} />

      {/* Calendar Grid */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Wrench className="h-4 w-4" />
            {machineLabel} — {frequency === 'DAILY' ? 'Daily' : frequency === 'WEEKLY' ? 'Weekly' : 'Monthly'} Checklist — {MONTH_NAMES[month - 1]} {year}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ChecklistCalendarGrid
            templates={templates}
            entries={entries}
            month={month}
            year={year}
            frequency={frequency}
            onCellChange={handleCellChange}
            onSignatureChange={handleSignatureChange}
          />
        </CardContent>
      </Card>

      {/* Pending changes indicator */}
      {pendingChanges.length > 0 && (
        <div className="fixed bottom-6 right-6 z-50">
          <Button onClick={handleSave} disabled={bulkCreate.isPending} className="shadow-lg">
            <Save className="h-4 w-4 mr-2" />
            {bulkCreate.isPending
              ? 'Saving...'
              : `Save ${pendingChanges.length} change(s)`}
          </Button>
        </div>
      )}
    </div>
  );
}
