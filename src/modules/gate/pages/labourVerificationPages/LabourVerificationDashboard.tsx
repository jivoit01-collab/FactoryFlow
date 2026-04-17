import { ArrowLeft, Bell, CheckCircle, Clock, Loader2, Lock, Users } from 'lucide-react';
import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

import { usePermission } from '@/core/auth/hooks/usePermission';
import { GATE_PERMISSIONS } from '@/config/permissions';
import {
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/shared/components/ui';

import {
  useCreateVerificationRequest,
  useCloseVerificationRequest,
  useTodayVerificationRequest,
  useVerificationRequests,
} from '../../api/labourVerification/labourVerification.queries';

export default function LabourVerificationDashboard() {
  const navigate = useNavigate();
  const { hasPermission } = usePermission();
  const canCreate = hasPermission(GATE_PERMISSIONS.LABOUR_VERIFICATION.CREATE_REQUEST);
  const canClose = hasPermission(GATE_PERMISSIONS.LABOUR_VERIFICATION.CLOSE_REQUEST);
  const canSubmit = hasPermission(GATE_PERMISSIONS.LABOUR_VERIFICATION.SUBMIT_RESPONSE);

  const { data: todayData, isLoading: todayLoading } = useTodayVerificationRequest();
  const { data: historyData } = useVerificationRequests({ page_size: 10 });
  const createMutation = useCreateVerificationRequest();
  const closeMutation = useCloseVerificationRequest();

  const todayRequest = todayData?.exists ? todayData : null;

  const handleCreateRequest = async () => {
    try {
      const result = await createMutation.mutateAsync();
      navigate(`/gate/labour/verification/${result.id}`);
    } catch {
      // Error handled by mutation
    }
  };

  const handleCloseRequest = async () => {
    if (!todayRequest) return;
    try {
      await closeMutation.mutateAsync(todayRequest.id);
    } catch {
      // Error handled by mutation
    }
  };

  // If user is a department supervisor, redirect to respond page
  useEffect(() => {
    if (canSubmit && !canCreate && todayRequest) {
      navigate(`/gate/labour/verification/respond/${todayRequest.id}`, { replace: true });
    }
  }, [canSubmit, canCreate, todayRequest, navigate]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate('/gate/labour')}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h2 className="text-3xl font-bold tracking-tight">Labour Verification</h2>
            <p className="text-muted-foreground">
              Request and track department labour counts
            </p>
          </div>
        </div>
      </div>

      {todayLoading ? (
        <div className="flex items-center justify-center h-48">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        </div>
      ) : (
        <>
          {/* Today's Request Status */}
          {!todayRequest ? (
            // No request exists for today
            canCreate && (
              <Card className="border-dashed">
                <CardContent className="flex flex-col items-center justify-center py-12 gap-4">
                  <Bell className="h-12 w-12 text-muted-foreground" />
                  <div className="text-center">
                    <h3 className="text-lg font-semibold">No Verification Request Today</h3>
                    <p className="text-sm text-muted-foreground mt-1">
                      Send a request to all department supervisors to submit their labour count
                    </p>
                  </div>
                  <Button
                    onClick={handleCreateRequest}
                    disabled={createMutation.isPending}
                    size="lg"
                  >
                    {createMutation.isPending ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Sending...
                      </>
                    ) : (
                      <>
                        <Bell className="h-4 w-4 mr-2" />
                        Send Verification Request
                      </>
                    )}
                  </Button>
                </CardContent>
              </Card>
            )
          ) : (
            // Request exists for today
            <>
              {/* Summary Cards */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <Card>
                  <CardContent className="p-4 text-center">
                    <div className="text-2xl font-bold">{todayRequest.total_departments}</div>
                    <div className="text-xs text-muted-foreground mt-1">Total Departments</div>
                  </CardContent>
                </Card>
                <Card className="bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800">
                  <CardContent className="p-4 text-center">
                    <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                      {todayRequest.submitted_count}
                    </div>
                    <div className="text-xs text-muted-foreground mt-1">Submitted</div>
                  </CardContent>
                </Card>
                <Card className="bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800">
                  <CardContent className="p-4 text-center">
                    <div className="text-2xl font-bold text-amber-600 dark:text-amber-400">
                      {todayRequest.pending_count}
                    </div>
                    <div className="text-xs text-muted-foreground mt-1">Pending</div>
                  </CardContent>
                </Card>
                <Card className="bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800">
                  <CardContent className="p-4 text-center">
                    <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                      {todayRequest.total_labour_count}
                    </div>
                    <div className="text-xs text-muted-foreground mt-1">Total Labour Count</div>
                  </CardContent>
                </Card>
              </div>

              {/* Department Responses */}
              <Card>
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base font-medium flex items-center gap-2">
                      <Users className="h-4 w-4" />
                      Department Responses
                      <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                        todayRequest.status === 'OPEN'
                          ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                          : 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300'
                      }`}>
                        {todayRequest.status}
                      </span>
                    </CardTitle>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => navigate(`/gate/labour/verification/${todayRequest.id}`)}
                      >
                        View Details
                      </Button>
                      {canClose && todayRequest.status === 'OPEN' && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={handleCloseRequest}
                          disabled={closeMutation.isPending}
                        >
                          {closeMutation.isPending ? (
                            <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                          ) : (
                            <Lock className="h-3 w-3 mr-1" />
                          )}
                          Close Request
                        </Button>
                      )}
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {todayRequest.responses?.map((response) => (
                      <div
                        key={response.id}
                        className="flex items-center justify-between p-3 rounded-lg border bg-card"
                      >
                        <div className="flex items-center gap-3">
                          {response.status === 'SUBMITTED' ? (
                            <CheckCircle className="h-4 w-4 text-green-600 dark:text-green-400" />
                          ) : (
                            <Clock className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                          )}
                          <div>
                            <span className="text-sm font-medium">{response.department_name}</span>
                            {response.status === 'SUBMITTED' && response.submitted_by_name && (
                              <p className="text-xs text-muted-foreground">
                                by {response.submitted_by_name}
                              </p>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          {response.status === 'SUBMITTED' ? (
                            <span className="text-sm font-bold">
                              {response.labour_count} labourers
                            </span>
                          ) : (
                            <span className="text-xs text-amber-600 dark:text-amber-400 font-medium">
                              Pending
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </>
          )}

          {/* History */}
          {historyData && historyData.results.length > 0 && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base font-medium flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  Past Verification Requests
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {historyData.results
                    .filter((r) => !todayRequest || r.id !== todayRequest.id)
                    .map((request) => (
                      <div
                        key={request.id}
                        className="flex items-center justify-between p-3 rounded-lg border bg-card cursor-pointer hover:bg-muted/50 transition-colors"
                        onClick={() => navigate(`/gate/labour/verification/${request.id}`)}
                      >
                        <div>
                          <span className="text-sm font-medium">{request.date}</span>
                          <span className={`ml-2 inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                            request.status === 'OPEN'
                              ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                              : 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300'
                          }`}>
                            {request.status}
                          </span>
                        </div>
                        <div className="flex items-center gap-4 text-sm text-muted-foreground">
                          <span>{request.submitted_count}/{request.total_departments} submitted</span>
                          <span className="font-semibold text-foreground">
                            {request.total_labour_count} labourers
                          </span>
                        </div>
                      </div>
                    ))}
                </div>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
}
