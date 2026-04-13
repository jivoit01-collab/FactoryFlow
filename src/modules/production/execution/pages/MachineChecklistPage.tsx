import { Save } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';

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
} from '@/shared/components/ui';

import {
  useBulkCreateChecklists,
  useChecklistTemplates,
  useMachineChecklists,
  useMachines,
} from '../api';
import {
  CHECKLIST_STATUS_COLORS,
  CHECKLIST_STATUS_LABELS,
  FREQUENCY_LABELS,
} from '../constants';
import type { ChecklistStatus } from '../types';

const statusOptions: ChecklistStatus[] = ['OK', 'NOT_OK', 'NA'];

function MachineChecklistPage() {
  const [searchParams] = useSearchParams();

  const [selectedMachineId, setSelectedMachineId] = useState<number | undefined>(
    searchParams.get('machine_id') ? Number(searchParams.get('machine_id')) : undefined,
  );
  const [selectedDate, setSelectedDate] = useState(
    searchParams.get('date') || new Date().toISOString().split('T')[0],
  );
  const [localStatuses, setLocalStatuses] = useState<Record<number, ChecklistStatus>>({});
  const [operator, setOperator] = useState('');

  // --- Data fetching ---
  const { data: machines = [] } = useMachines();
  const selectedMachine = useMemo(
    () => machines.find((m) => m.id === selectedMachineId),
    [machines, selectedMachineId],
  );

  const { data: templates = [] } = useChecklistTemplates(selectedMachine?.machine_type);

  const { data: existingEntries = [], isLoading: isLoadingEntries } = useMachineChecklists(
    selectedMachineId,
    selectedDate || undefined,
  );

  // History: all entries for the selected machine (no date filter)
  const { data: historyEntries = [], isLoading: isLoadingHistory } = useMachineChecklists(
    selectedMachineId,
  );

  const bulkCreate = useBulkCreateChecklists();

  // --- Pre-fill local state from existing entries ---
  const entriesKey = existingEntries.map((e) => `${e.id}:${e.status}`).join(',');
  useEffect(() => {
    if (existingEntries.length > 0) {
      const statuses: Record<number, ChecklistStatus> = {};
      let op = '';
      for (const entry of existingEntries) {
        statuses[entry.template] = entry.status;
        if (entry.operator) op = entry.operator;
      }
      setLocalStatuses(statuses);
      setOperator(op);
    } else {
      setLocalStatuses({});
      setOperator('');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [entriesKey]);

  // --- Handlers ---
  function handleStatusChange(templateId: number, status: ChecklistStatus) {
    setLocalStatuses((prev) => ({ ...prev, [templateId]: status }));
  }

  function handleSave() {
    if (!selectedMachineId || !selectedMachine || !selectedDate) {
      toast.error('Please select a machine and date.');
      return;
    }

    if (templates.length === 0) {
      toast.error('No checklist templates found for this machine type.');
      return;
    }

    const incompleteCount = templates.filter((t) => !localStatuses[t.id]).length;
    if (incompleteCount > 0) {
      toast.error(`Please set status for all ${incompleteCount} remaining task(s).`);
      return;
    }

    bulkCreate.mutate(
      {
        entries: templates.map((t) => ({
          machine_id: selectedMachineId,
          machine_type: selectedMachine.machine_type,
          template_id: t.id,
          task_description: t.task,
          frequency: t.frequency,
          date: selectedDate,
          status: localStatuses[t.id],
          operator,
          shift_incharge: '',
          remarks: '',
        })),
      },
      {
        onSuccess: () => toast.success('Checklist saved successfully.'),
        onError: () => toast.error('Failed to save checklist. Please try again.'),
      },
    );
  }

  // --- Render ---
  const showChecklist = selectedMachineId && selectedDate;

  return (
    <div className="space-y-6">
      <DashboardHeader
        title="Machine Checklists"
        description="Daily, weekly & monthly maintenance checklists"
      />

      {/* Machine & Date selectors */}
      <div className="flex flex-wrap gap-4">
        <div className="space-y-1.5">
          <Label>Machine</Label>
          <Select
            value={selectedMachineId ? String(selectedMachineId) : ''}
            onValueChange={(v) => setSelectedMachineId(v ? Number(v) : undefined)}
          >
            <SelectTrigger className="w-[220px]">
              <SelectValue placeholder="Select machine" />
            </SelectTrigger>
            <SelectContent>
              {machines.map((m) => (
                <SelectItem key={m.id} value={String(m.id)}>
                  {m.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1.5">
          <Label>Date</Label>
          <Input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="w-[180px]"
          />
        </div>
      </div>

      {/* Fill checklist section */}
      {showChecklist && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">
              Checklist for {selectedMachine?.name ?? `Machine #${selectedMachineId}`} &mdash;{' '}
              {selectedDate}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {isLoadingEntries ? (
              <div className="h-24 animate-pulse rounded bg-muted/50" />
            ) : templates.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No checklist templates found for this machine type.
              </p>
            ) : (
              <>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b bg-muted/50">
                        <th className="p-3 text-left font-medium w-10">#</th>
                        <th className="p-3 text-left font-medium">Task</th>
                        <th className="p-3 text-left font-medium w-24">Frequency</th>
                        <th className="p-3 text-left font-medium w-52">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {templates.map((t, idx) => (
                        <tr key={t.id} className="border-b hover:bg-muted/30">
                          <td className="p-3 text-muted-foreground">{idx + 1}</td>
                          <td className="p-3">{t.task}</td>
                          <td className="p-3">{FREQUENCY_LABELS[t.frequency]}</td>
                          <td className="p-3">
                            <div className="flex gap-1.5">
                              {statusOptions.map((s) => {
                                const colors = CHECKLIST_STATUS_COLORS[s];
                                const isSelected = localStatuses[t.id] === s;
                                return (
                                  <button
                                    key={s}
                                    type="button"
                                    onClick={() => handleStatusChange(t.id, s)}
                                    className={`rounded-full px-3 py-1 text-xs font-medium transition-all ${
                                      isSelected
                                        ? `${colors.bg} ${colors.text} ${colors.darkBg} ${colors.darkText} ring-2 ring-offset-1 ring-current`
                                        : 'bg-muted text-muted-foreground hover:bg-muted/80'
                                    }`}
                                  >
                                    {CHECKLIST_STATUS_LABELS[s]}
                                  </button>
                                );
                              })}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="flex flex-wrap items-end gap-4 pt-2">
                  <div className="space-y-1.5">
                    <Label htmlFor="operator-input">Operator</Label>
                    <Input
                      id="operator-input"
                      value={operator}
                      onChange={(e) => setOperator(e.target.value)}
                      placeholder="Operator name"
                      className="w-[220px]"
                    />
                  </div>

                  <Button onClick={handleSave} disabled={bulkCreate.isPending}>
                    <Save className="mr-2 h-4 w-4" />
                    {bulkCreate.isPending ? 'Saving...' : 'Save'}
                  </Button>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      )}

      {/* History section */}
      {selectedMachineId && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Recent History</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoadingHistory ? (
              <div className="h-24 animate-pulse rounded bg-muted/50" />
            ) : historyEntries.length === 0 ? (
              <p className="text-sm text-muted-foreground">No checklist entries found.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b bg-muted/50">
                      <th className="p-3 text-left font-medium">Date</th>
                      <th className="p-3 text-left font-medium">Task</th>
                      <th className="p-3 text-left font-medium">Frequency</th>
                      <th className="p-3 text-left font-medium">Status</th>
                      <th className="p-3 text-left font-medium">Operator</th>
                    </tr>
                  </thead>
                  <tbody>
                    {historyEntries.map((c) => {
                      const statusColors = CHECKLIST_STATUS_COLORS[c.status];
                      return (
                        <tr key={c.id} className="border-b hover:bg-muted/30">
                          <td className="p-3">{c.date}</td>
                          <td className="p-3">{c.task_description}</td>
                          <td className="p-3">{FREQUENCY_LABELS[c.frequency]}</td>
                          <td className="p-3">
                            <span
                              className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${statusColors.bg} ${statusColors.text} ${statusColors.darkBg} ${statusColors.darkText}`}
                            >
                              {CHECKLIST_STATUS_LABELS[c.status]}
                            </span>
                          </td>
                          <td className="p-3 text-muted-foreground">{c.operator || '-'}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

export default MachineChecklistPage;
