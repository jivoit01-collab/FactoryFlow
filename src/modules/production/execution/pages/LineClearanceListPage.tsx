import { Plus } from 'lucide-react';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { DashboardHeader } from '@/shared/components/dashboard/DashboardHeader';
import { Card, CardContent, Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/shared/components/ui';

import { useLineClearances } from '../api';
import { ClearanceStatusBadge } from '../components/ClearanceStatusBadge';

function LineClearanceListPage() {
  const navigate = useNavigate();
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const { data: clearances = [], isLoading } = useLineClearances(undefined, statusFilter === 'ALL' ? undefined : statusFilter);

  return (
    <div className="space-y-6">
      <DashboardHeader
        title="Line Clearance"
        description="Pre-production checklists and QA approvals"
        primaryAction={{
          label: 'New Clearance',
          icon: <Plus className="h-4 w-4 mr-2" />,
          onClick: () => navigate('/production/execution/line-clearance/create'),
        }}
      />

      <div className="flex gap-4">
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="All Statuses" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All</SelectItem>
            <SelectItem value="DRAFT">Draft</SelectItem>
            <SelectItem value="SUBMITTED">Submitted</SelectItem>
            <SelectItem value="CLEARED">Cleared</SelectItem>
            <SelectItem value="NOT_CLEARED">Not Cleared</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <Card><CardContent className="p-8 animate-pulse bg-muted/50" /></Card>
      ) : clearances.length > 0 ? (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/50">
                <th className="text-left p-3 font-medium">ID</th>
                <th className="text-left p-3 font-medium">Run</th>
                <th className="text-left p-3 font-medium">Date</th>
                <th className="text-left p-3 font-medium">Line</th>
                <th className="text-left p-3 font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {clearances.map((c) => (
                <tr
                  key={c.id}
                  className="border-b hover:bg-muted/30 cursor-pointer"
                  onClick={() => navigate(`/production/execution/line-clearance/${c.id}`)}
                >
                  <td className="p-3 font-medium">{c.document_id || `#${c.id}`}</td>
                  <td className="p-3">{c.run_number ? `Run #${c.run_number}` : <span className="text-muted-foreground">—</span>}</td>
                  <td className="p-3">{c.date}</td>
                  <td className="p-3">{c.line_name || `Line #${c.line}`}</td>
                  <td className="p-3"><ClearanceStatusBadge status={c.status} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <Card>
          <CardContent className="p-12 text-center text-muted-foreground">
            No line clearances found.
          </CardContent>
        </Card>
      )}
    </div>
  );
}

export default LineClearanceListPage;
