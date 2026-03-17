import { useState } from 'react';

import { DashboardHeader } from '@/shared/components/dashboard/DashboardHeader';
import { Card, CardContent, Input, Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/shared/components/ui';

import { useMachineChecklists, useMachines } from '../api';
import { CHECKLIST_STATUS_COLORS, CHECKLIST_STATUS_LABELS, FREQUENCY_LABELS, MACHINE_TYPE_LABELS } from '../constants';

function MachineChecklistPage() {
  const [machineId, setMachineId] = useState<number | undefined>();
  const [dateFilter, setDateFilter] = useState('');
  const { data: machines = [] } = useMachines();
  const { data: checklists = [], isLoading } = useMachineChecklists(machineId, dateFilter || undefined);

  return (
    <div className="space-y-6">
      <DashboardHeader
        title="Machine Checklists"
        description="Daily, weekly & monthly maintenance checklists"
      />

      <div className="flex flex-wrap gap-4">
        <Select value={machineId ? String(machineId) : 'ALL'} onValueChange={(v) => setMachineId(v === 'ALL' ? undefined : Number(v))}>
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="All Machines" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All Machines</SelectItem>
            {machines.map((m) => (
              <SelectItem key={m.id} value={String(m.id)}>{m.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Input type="date" value={dateFilter} onChange={(e) => setDateFilter(e.target.value)} className="w-[180px]" />
      </div>

      {isLoading ? (
        <Card><CardContent className="p-8 animate-pulse bg-muted/50" /></Card>
      ) : checklists.length > 0 ? (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/50">
                <th className="text-left p-3 font-medium">Machine</th>
                <th className="text-left p-3 font-medium">Type</th>
                <th className="text-left p-3 font-medium">Task</th>
                <th className="text-left p-3 font-medium">Frequency</th>
                <th className="text-left p-3 font-medium">Date</th>
                <th className="text-left p-3 font-medium">Status</th>
                <th className="text-left p-3 font-medium">Operator</th>
              </tr>
            </thead>
            <tbody>
              {checklists.map((c) => {
                const statusColors = CHECKLIST_STATUS_COLORS[c.status];
                return (
                  <tr key={c.id} className="border-b hover:bg-muted/30">
                    <td className="p-3">{c.machine_name || `#${c.machine}`}</td>
                    <td className="p-3">{MACHINE_TYPE_LABELS[c.machine_type]}</td>
                    <td className="p-3">{c.task_description}</td>
                    <td className="p-3">{FREQUENCY_LABELS[c.frequency]}</td>
                    <td className="p-3">{c.date}</td>
                    <td className="p-3">
                      <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${statusColors.bg} ${statusColors.text} ${statusColors.darkBg} ${statusColors.darkText}`}>
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
      ) : (
        <Card>
          <CardContent className="p-12 text-center text-muted-foreground">
            No checklist entries found.
          </CardContent>
        </Card>
      )}
    </div>
  );
}

export default MachineChecklistPage;
