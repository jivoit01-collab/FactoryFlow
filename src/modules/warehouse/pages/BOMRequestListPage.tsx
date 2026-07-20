import { AlertCircle, CheckCircle2, ClipboardList, Clock, XCircle } from 'lucide-react';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { DashboardHeader } from '@/shared/components/dashboard/DashboardHeader';
import {
  Badge,
  Card,
  CardContent,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/shared/components/ui';

import { useBOMRequests } from '../api';
import type { BOMRequestStatus } from '../types';

function StatusBadge({ status }: { status: BOMRequestStatus }) {
  const config: Record<BOMRequestStatus, { label: string; variant: string; icon: typeof Clock }> = {
    PENDING: { label: 'Pending', variant: 'bg-amber-100 text-amber-800', icon: Clock },
    APPROVED: { label: 'Approved', variant: 'bg-green-100 text-green-800', icon: CheckCircle2 },
    PARTIALLY_APPROVED: { label: 'Partial', variant: 'bg-blue-100 text-blue-800', icon: AlertCircle },
    REJECTED: { label: 'Rejected', variant: 'bg-red-100 text-red-800', icon: XCircle },
  };
  const c = config[status];
  const Icon = c.icon;
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${c.variant}`}>
      <Icon className="h-3 w-3" />
      {c.label}
    </span>
  );
}

function IssueBadge({ status }: { status: string }) {
  if (status === 'NOT_ISSUED') return <Badge variant="outline">Not Issued</Badge>;
  if (status === 'PARTIALLY_ISSUED') {
    return <Badge className="bg-amber-100 text-amber-800 border-0">Partial</Badge>;
  }
  return <Badge className="bg-green-100 text-green-800 border-0">Fully Issued</Badge>;
}

export default function BOMRequestListPage() {
  const navigate = useNavigate();
  const [statusFilter, setStatusFilter] = useState<string>('ALL');

  const { data: requests = [], isLoading } = useBOMRequests(
    statusFilter === 'ALL' ? undefined : statusFilter,
  );

  return (
    <div className="space-y-6">
      <DashboardHeader title="BOM Requests" subtitle="Review and approve material requests from production" />

      <div className="flex flex-wrap gap-3">
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All Statuses</SelectItem>
            <SelectItem value="PENDING">Pending</SelectItem>
            <SelectItem value="APPROVED">Approved</SelectItem>
            <SelectItem value="PARTIALLY_APPROVED">Partially Approved</SelectItem>
            <SelectItem value="REJECTED">Rejected</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <ClipboardList className="h-5 w-5 animate-pulse mr-2 text-muted-foreground" />
          <span className="text-muted-foreground">Loading requests...</span>
        </div>
      ) : requests.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <ClipboardList className="h-10 w-10 text-muted-foreground mb-2" />
            <p className="text-muted-foreground">No BOM requests found</p>
          </CardContent>
        </Card>
      ) : (
        <div className="overflow-x-auto rounded-md border">
          <table className="w-full min-w-[1040px] text-sm">
            <thead>
              <tr className="border-b bg-muted/50 text-left">
                <th className="px-3 py-2 font-medium">Request</th>
                <th className="px-3 py-2 font-medium">Run</th>
                <th className="px-3 py-2 font-medium">Product</th>
                <th className="px-3 py-2 text-right font-medium">Required Qty</th>
                <th className="px-3 py-2 font-medium">Line</th>
                <th className="px-3 py-2 text-right font-medium">Materials</th>
                <th className="px-3 py-2 font-medium">Requested By</th>
                <th className="px-3 py-2 font-medium">Status</th>
                <th className="px-3 py-2 font-medium">Issue</th>
              </tr>
            </thead>
            <tbody>
              {requests.map((req) => (
                <tr
                  key={req.id}
                  className="cursor-pointer border-b transition-colors last:border-b-0 hover:bg-muted/50"
                  onClick={() => navigate(`/warehouse/bom-requests/${req.id}`)}
                >
                  <td className="px-3 py-3 font-semibold">#{req.id}</td>
                  <td className="px-3 py-3">
                    <p className="flex items-center gap-1.5 font-medium">
                      Run #{req.run_number}
                      {req.source === 'blowing' && (
                        <span className="rounded-full bg-purple-100 px-1.5 py-0.5 text-[10px] font-medium text-purple-700 dark:bg-purple-900/40 dark:text-purple-300">
                          Blowing
                        </span>
                      )}
                    </p>
                    <p className="text-xs text-muted-foreground">{req.run_date}</p>
                  </td>
                  <td className="px-3 py-3">
                    <p className="max-w-[320px] truncate font-medium">{req.product || 'N/A'}</p>
                  </td>
                  <td className="px-3 py-3 text-right font-medium">{req.required_qty}</td>
                  <td className="px-3 py-3 font-medium">{req.line_name}</td>
                  <td className="px-3 py-3 text-right font-medium">{req.lines_count ?? '-'} items</td>
                  <td className="px-3 py-3 text-muted-foreground">
                    {req.requested_by_name || 'Unknown'}
                  </td>
                  <td className="px-3 py-3">
                    <StatusBadge status={req.status} />
                  </td>
                  <td className="px-3 py-3">
                    {req.status !== 'PENDING' && req.status !== 'REJECTED'
                      ? <IssueBadge status={req.material_issue_status} />
                      : <span className="text-xs text-muted-foreground">-</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
