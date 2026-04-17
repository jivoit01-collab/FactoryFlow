import { ArrowLeft, CheckCircle, ChevronDown, ChevronUp, Clock, Lock, Loader2, Users } from 'lucide-react';
import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';

import { usePermission } from '@/core/auth/hooks/usePermission';
import { GATE_PERMISSIONS } from '@/config/permissions';
import {
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/shared/components/ui';

import type { DepartmentLabourResponse } from '../../api/labourVerification/labourVerification.api';
import {
  useVerificationRequestDetail,
  useCloseVerificationRequest,
} from '../../api/labourVerification/labourVerification.queries';

export default function LabourVerificationDetailPage() {
  const { requestId } = useParams<{ requestId: string }>();
  const navigate = useNavigate();
  const { hasPermission } = usePermission();
  const canClose = hasPermission(GATE_PERMISSIONS.LABOUR_VERIFICATION.CLOSE_REQUEST);

  const { data: request, isLoading } = useVerificationRequestDetail(
    requestId ? Number(requestId) : null,
  );
  const closeMutation = useCloseVerificationRequest();
  const [expandedDept, setExpandedDept] = useState<number | null>(null);

  const handleClose = async () => {
    if (!request) return;
    try {
      await closeMutation.mutateAsync(request.id);
    } catch {
      // Error handled by mutation
    }
  };

  const formatDateTime = (dateTime?: string | null) => {
    if (!dateTime) return '-';
    try {
      const date = new Date(dateTime);
      return date.toLocaleString('en-US', {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return dateTime;
    }
  };

  const ResponseRow = ({ response }: { response: DepartmentLabourResponse }) => {
    const isExpanded = expandedDept === response.id;
    const hasDetails = response.labour_details && response.labour_details.length > 0;

    return (
      <div className="border rounded-lg overflow-hidden">
        <div
          className={`flex items-center justify-between p-3 ${hasDetails && response.status === 'SUBMITTED' ? 'cursor-pointer hover:bg-muted/50' : ''}`}
          onClick={() => {
            if (hasDetails && response.status === 'SUBMITTED') {
              setExpandedDept(isExpanded ? null : response.id);
            }
          }}
        >
          <div className="flex items-center gap-3">
            {response.status === 'SUBMITTED' ? (
              <CheckCircle className="h-4 w-4 text-green-600 dark:text-green-400 flex-shrink-0" />
            ) : (
              <Clock className="h-4 w-4 text-amber-600 dark:text-amber-400 flex-shrink-0" />
            )}
            <div>
              <span className="text-sm font-medium">{response.department_name}</span>
              {response.status === 'SUBMITTED' && (
                <p className="text-xs text-muted-foreground">
                  by {response.submitted_by_name} at {formatDateTime(response.submitted_at)}
                </p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-3">
            {response.status === 'SUBMITTED' ? (
              <>
                <span className="text-sm font-bold">{response.labour_count} labourers</span>
                {hasDetails && (
                  isExpanded ? (
                    <ChevronUp className="h-4 w-4 text-muted-foreground" />
                  ) : (
                    <ChevronDown className="h-4 w-4 text-muted-foreground" />
                  )
                )}
              </>
            ) : (
              <span className="text-xs text-amber-600 dark:text-amber-400 font-medium">
                Pending
              </span>
            )}
          </div>
        </div>

        {/* Expanded Details */}
        {isExpanded && hasDetails && (
          <div className="border-t bg-muted/30 p-3">
            {response.remarks && (
              <p className="text-sm text-muted-foreground mb-3">
                <span className="font-medium">Remarks:</span> {response.remarks}
              </p>
            )}
            <div className="rounded-md border overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-muted/50">
                  <tr>
                    <th className="p-2 text-left font-medium">#</th>
                    <th className="p-2 text-left font-medium">Name</th>
                    <th className="p-2 text-left font-medium">Contractor</th>
                    <th className="p-2 text-left font-medium">Skill Type</th>
                  </tr>
                </thead>
                <tbody>
                  {response.labour_details.map((detail, idx) => (
                    <tr key={idx} className="border-t">
                      <td className="p-2 text-muted-foreground">{idx + 1}</td>
                      <td className="p-2 font-medium">{detail.name || '-'}</td>
                      <td className="p-2 text-muted-foreground">{detail.contractor || '-'}</td>
                      <td className="p-2 text-muted-foreground">{detail.skill_type || '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    );
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  if (!request) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-muted-foreground">
        <p>Verification request not found</p>
        <Button variant="link" onClick={() => navigate('/gate/labour/verification')}>
          Go back
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate('/gate/labour/verification')}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h2 className="text-3xl font-bold tracking-tight">
              Verification - {request.date}
            </h2>
            <p className="text-muted-foreground">
              Created by {request.created_by_name} at {formatDateTime(request.created_at)}
            </p>
          </div>
        </div>
        {canClose && request.status === 'OPEN' && (
          <Button
            variant="outline"
            onClick={handleClose}
            disabled={closeMutation.isPending}
          >
            {closeMutation.isPending ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Lock className="h-4 w-4 mr-2" />
            )}
            Close Request
          </Button>
        )}
      </div>

      {/* Summary */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold">{request.total_departments}</div>
            <div className="text-xs text-muted-foreground mt-1">Departments</div>
          </CardContent>
        </Card>
        <Card className="bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800">
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-green-600 dark:text-green-400">
              {request.submitted_count}
            </div>
            <div className="text-xs text-muted-foreground mt-1">Submitted</div>
          </CardContent>
        </Card>
        <Card className="bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800">
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-amber-600 dark:text-amber-400">
              {request.pending_count}
            </div>
            <div className="text-xs text-muted-foreground mt-1">Pending</div>
          </CardContent>
        </Card>
        <Card className="bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800">
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
              {request.total_labour_count}
            </div>
            <div className="text-xs text-muted-foreground mt-1">Total Labourers</div>
          </CardContent>
        </Card>
      </div>

      {/* Responses */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-medium flex items-center gap-2">
            <Users className="h-4 w-4" />
            Department Responses
            <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
              request.status === 'OPEN'
                ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                : 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300'
            }`}>
              {request.status}
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {request.responses?.map((response) => (
              <ResponseRow key={response.id} response={response} />
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
