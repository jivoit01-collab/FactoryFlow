import { AlertCircle,CheckCircle2, ClipboardList, Clock, XCircle } from 'lucide-react';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { statusBadgeClass, type StatusVariant } from '@/config/statusColors';
import { DashboardHeader } from '@/shared/components/dashboard/DashboardHeader';
import {
  Badge,
  Button,
  Card,
  CardContent,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/shared/components/ui';

import { useBOMRequests } from '../api';
import type { BOMRequest, BOMRequestStatus } from '../types';

function StatusBadge({ status }: { status: BOMRequestStatus }) {
  const config: Record<BOMRequestStatus, { label: string; variant: StatusVariant; icon: typeof Clock }> = {
    PENDING: { label: 'Pending', variant: 'pending', icon: Clock },
    APPROVED: { label: 'Approved', variant: 'approved', icon: CheckCircle2 },
    PARTIALLY_APPROVED: { label: 'Partial', variant: 'inProgress', icon: AlertCircle },
    REJECTED: { label: 'Rejected', variant: 'rejected', icon: XCircle },
  };
  const c = config[status];
  const Icon = c.icon;
  return (
    <span className={statusBadgeClass(c.variant)}>
      <Icon className="h-3 w-3" />
      {c.label}
    </span>
  );
}

function IssueBadge({ status }: { status: string }) {
  if (status === 'NOT_ISSUED') return <Badge variant="outline">Not Issued</Badge>;
  if (status === 'PARTIALLY_ISSUED')
    return <span className={statusBadgeClass('pending')}>Partial</span>;
  return <span className={statusBadgeClass('approved')}>Fully Issued</span>;
}

function BOMRequestCard({ request, onClick }: { request: BOMRequest; onClick: () => void }) {
  return (
    <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={onClick}>
      <CardContent className="p-4 space-y-3">
        <div className="flex items-start justify-between">
          <div>
            <p className="font-semibold text-sm">BOM Request #{request.id}</p>
            <p className="text-xs text-muted-foreground">
              Run #{request.run_number} &middot; {request.run_date}
            </p>
          </div>
          <StatusBadge status={request.status} />
        </div>

        <div className="grid grid-cols-2 gap-2 text-sm">
          <div>
            <p className="text-muted-foreground text-xs">Product</p>
            <p className="font-medium truncate">{request.product || 'N/A'}</p>
          </div>
          <div>
            <p className="text-muted-foreground text-xs">Required Qty</p>
            <p className="font-medium">{request.required_qty}</p>
          </div>
          <div>
            <p className="text-muted-foreground text-xs">Line</p>
            <p className="font-medium">{request.line_name}</p>
          </div>
          <div>
            <p className="text-muted-foreground text-xs">Materials</p>
            <p className="font-medium">{request.lines_count ?? '—'} items</p>
          </div>
        </div>

        <div className="flex items-center justify-between text-xs">
          <span className="text-muted-foreground">
            By {request.requested_by_name || 'Unknown'}
          </span>
          {request.status !== 'PENDING' && request.status !== 'REJECTED' && (
            <IssueBadge status={request.material_issue_status} />
          )}
        </div>
      </CardContent>
    </Card>
  );
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
          <SelectTrigger className="w-full sm:w-[180px]">
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
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <ClipboardList className="h-12 w-12 text-muted-foreground mb-4" />
            {statusFilter !== 'ALL' ? (
              <>
                <p className="font-medium">No {statusFilter.toLowerCase().replace('_', ' ')} BOM requests</p>
                <p className="text-sm text-muted-foreground mt-1">
                  Try a different status filter to see more requests.
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-4"
                  onClick={() => setStatusFilter('ALL')}
                >
                  Show all requests
                </Button>
              </>
            ) : (
              <>
                <p className="font-medium">No BOM requests yet</p>
                <p className="text-sm text-muted-foreground mt-1 max-w-sm">
                  Requests will appear here when production teams submit material
                  requirements for a run. Nothing to approve right now.
                </p>
              </>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {requests.map((req) => (
            <BOMRequestCard
              key={req.id}
              request={req}
              onClick={() => navigate(`/warehouse/bom-requests/${req.id}`)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
