import {
  ArrowLeft,
  Briefcase,
  Car,
  CheckCircle2,
  Clock,
  FileText,
  LogOut,
  MapPin,
  Phone,
  User,
  XCircle,
} from 'lucide-react';
import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';

import { Button, Card, CardContent, CardHeader, CardTitle } from '@/shared/components/ui';

import {
  useCancelPersonEntry,
  useExitPersonEntry,
  useLabour,
  usePersonEntry,
  useVisitor,
} from '../../api/personGateIn/personGateIn.queries';
import { GateSelect } from '../../components';

export default function EntryDetailPage() {
  const navigate = useNavigate();
  const { entryId } = useParams<{ entryId: string }>();
  const [showExitModal, setShowExitModal] = useState(false);
  const [selectedGate, setSelectedGate] = useState<number | null>(null);

  const entryIdNumber = entryId ? parseInt(entryId, 10) : null;

  const { data: entry, isLoading, refetch } = usePersonEntry(entryIdNumber);
  const { data: visitor } = useVisitor(entry?.visitor || null);
  const { data: labour } = useLabour(entry?.labour || null);

  const exitMutation = useExitPersonEntry();
  const cancelMutation = useCancelPersonEntry();

  // Format date/time for display
  const formatDateTime = (dateTime?: string | null) => {
    if (!dateTime) return '-';
    try {
      const date = new Date(dateTime);
      return date.toLocaleString('en-US', {
        weekday: 'short',
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return dateTime;
    }
  };

  // Format duration
  const formatDuration = (entryTime?: string | null, exitTime?: string | null) => {
    if (!entryTime) return '-';
    try {
      const entry = new Date(entryTime);
      const end = exitTime ? new Date(exitTime) : new Date();
      const diffMs = end.getTime() - entry.getTime();
      const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
      const diffMins = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));

      if (diffHours > 0) {
        return `${diffHours}h ${diffMins}m`;
      }
      return `${diffMins}m`;
    } catch {
      return '-';
    }
  };

  // Get status badge
  const getStatusBadge = (status: string) => {
    switch (status?.toUpperCase()) {
      case 'IN':
        return (
          <span className="inline-flex items-center gap-1 rounded-full px-3 py-1 text-sm font-medium bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400">
            <CheckCircle2 className="h-4 w-4" />
            Inside
          </span>
        );
      case 'OUT':
        return (
          <span className="inline-flex items-center gap-1 rounded-full px-3 py-1 text-sm font-medium bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400">
            <LogOut className="h-4 w-4" />
            Exited
          </span>
        );
      case 'CANCELLED':
        return (
          <span className="inline-flex items-center gap-1 rounded-full px-3 py-1 text-sm font-medium bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400">
            <XCircle className="h-4 w-4" />
            Cancelled
          </span>
        );
      default:
        return null;
    }
  };

  // Handle exit
  const handleExit = async () => {
    if (!entryIdNumber || !selectedGate) return;

    try {
      await exitMutation.mutateAsync({
        id: entryIdNumber,
        data: { gate_out: selectedGate },
      });
      setShowExitModal(false);
      refetch();
    } catch (error) {
      console.error('Failed to exit:', error);
    }
  };

  // Handle cancel
  const handleCancel = async () => {
    if (!entryIdNumber) return;

    if (!window.confirm('Are you sure you want to cancel this entry?')) return;

    try {
      await cancelMutation.mutateAsync(entryIdNumber);
      refetch();
    } catch (error) {
      console.error('Failed to cancel:', error);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  if (!entry) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-muted-foreground">
        <p className="text-lg">Entry not found</p>
        <Button variant="link" onClick={() => navigate('/gate/visitor-labour')}>
          Go back
        </Button>
      </div>
    );
  }

  const personDetails = entry.visitor ? visitor : labour;
  const isVisitor = !!entry.visitor;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <div className="flex items-center gap-3">
              <h2 className="text-3xl font-bold tracking-tight">{entry.name_snapshot}</h2>
              {getStatusBadge(entry.status)}
            </div>
            <p className="text-muted-foreground">{isVisitor ? 'Visitor' : 'Labour'} Entry</p>
          </div>
        </div>

        {/* Actions */}
        {entry.status === 'IN' && (
          <div className="flex gap-2">
            <Button variant="outline" onClick={handleCancel} disabled={cancelMutation.isPending}>
              <XCircle className="h-4 w-4 mr-2" />
              Cancel Entry
            </Button>
            <Button onClick={() => setShowExitModal(true)}>
              <LogOut className="h-4 w-4 mr-2" />
              Mark Exit
            </Button>
          </div>
        )}
      </div>

      {/* Exit Modal */}
      {showExitModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <Card className="w-full max-w-md mx-4">
            <CardHeader>
              <CardTitle>Mark Exit</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <GateSelect
                  value={selectedGate ? String(selectedGate) : undefined}
                  onChange={(gateId) => setSelectedGate(gateId)}
                  label="Exit Gate"
                />
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={() => setShowExitModal(false)}
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleExit}
                  disabled={!selectedGate || exitMutation.isPending}
                  className="flex-1"
                >
                  {exitMutation.isPending ? 'Processing...' : 'Confirm Exit'}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Entry Information */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Entry Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="flex items-start gap-3">
                <MapPin className="h-4 w-4 text-muted-foreground mt-0.5" />
                <div>
                  <p className="text-sm text-muted-foreground">Entry Gate</p>
                  <p className="font-medium">{entry.gate_in?.name || '-'}</p>
                  {entry.gate_in?.location && (
                    <p className="text-xs text-muted-foreground">{entry.gate_in.location}</p>
                  )}
                </div>
              </div>

              <div className="flex items-start gap-3">
                <MapPin className="h-4 w-4 text-muted-foreground mt-0.5" />
                <div>
                  <p className="text-sm text-muted-foreground">Exit Gate</p>
                  <p className="font-medium">{entry.gate_out?.name || '-'}</p>
                  {entry.gate_out?.location && (
                    <p className="text-xs text-muted-foreground">{entry.gate_out.location}</p>
                  )}
                </div>
              </div>

              <div className="flex items-start gap-3">
                <Clock className="h-4 w-4 text-muted-foreground mt-0.5" />
                <div>
                  <p className="text-sm text-muted-foreground">Entry Time</p>
                  <p className="font-medium">{formatDateTime(entry.entry_time)}</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <Clock className="h-4 w-4 text-muted-foreground mt-0.5" />
                <div>
                  <p className="text-sm text-muted-foreground">Exit Time</p>
                  <p className="font-medium">{formatDateTime(entry.exit_time)}</p>
                </div>
              </div>
            </div>

            <div className="pt-2 border-t">
              <div className="flex items-start gap-3">
                <Clock className="h-4 w-4 text-muted-foreground mt-0.5" />
                <div>
                  <p className="text-sm text-muted-foreground">Duration</p>
                  <p className="font-medium text-lg">
                    {formatDuration(entry.entry_time, entry.exit_time)}
                  </p>
                </div>
              </div>
            </div>

            {entry.purpose && (
              <div className="pt-2 border-t">
                <div className="flex items-start gap-3">
                  <Briefcase className="h-4 w-4 text-muted-foreground mt-0.5" />
                  <div>
                    <p className="text-sm text-muted-foreground">Purpose</p>
                    <p className="font-medium">{entry.purpose}</p>
                  </div>
                </div>
              </div>
            )}

            {entry.vehicle_no && (
              <div className="pt-2 border-t">
                <div className="flex items-start gap-3">
                  <Car className="h-4 w-4 text-muted-foreground mt-0.5" />
                  <div>
                    <p className="text-sm text-muted-foreground">Vehicle Number</p>
                    <p className="font-medium">{entry.vehicle_no}</p>
                  </div>
                </div>
              </div>
            )}

            {entry.remarks && (
              <div className="pt-2 border-t">
                <div className="flex items-start gap-3">
                  <FileText className="h-4 w-4 text-muted-foreground mt-0.5" />
                  <div>
                    <p className="text-sm text-muted-foreground">Remarks</p>
                    <p className="font-medium">{entry.remarks}</p>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Person Details */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">
              {isVisitor ? 'Visitor Details' : 'Labour Details'}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-start gap-3">
              <User className="h-4 w-4 text-muted-foreground mt-0.5" />
              <div>
                <p className="text-sm text-muted-foreground">Name</p>
                <p className="font-medium">{personDetails?.name || entry.name_snapshot}</p>
              </div>
            </div>

            {personDetails?.mobile && (
              <div className="flex items-start gap-3">
                <Phone className="h-4 w-4 text-muted-foreground mt-0.5" />
                <div>
                  <p className="text-sm text-muted-foreground">Mobile</p>
                  <p className="font-medium">{personDetails.mobile}</p>
                </div>
              </div>
            )}

            {isVisitor && visitor && (
              <>
                {visitor.company_name && (
                  <div className="flex items-start gap-3">
                    <Briefcase className="h-4 w-4 text-muted-foreground mt-0.5" />
                    <div>
                      <p className="text-sm text-muted-foreground">Company</p>
                      <p className="font-medium">{visitor.company_name}</p>
                    </div>
                  </div>
                )}
                {visitor.id_proof_type && (
                  <div className="flex items-start gap-3">
                    <FileText className="h-4 w-4 text-muted-foreground mt-0.5" />
                    <div>
                      <p className="text-sm text-muted-foreground">ID Proof</p>
                      <p className="font-medium">
                        {visitor.id_proof_type}: {visitor.id_proof_no}
                      </p>
                    </div>
                  </div>
                )}
              </>
            )}

            {!isVisitor && labour && (
              <>
                {labour.contractor_name && (
                  <div className="flex items-start gap-3">
                    <Briefcase className="h-4 w-4 text-muted-foreground mt-0.5" />
                    <div>
                      <p className="text-sm text-muted-foreground">Contractor</p>
                      <p className="font-medium">{labour.contractor_name}</p>
                    </div>
                  </div>
                )}
                {labour.skill_type && (
                  <div className="flex items-start gap-3">
                    <User className="h-4 w-4 text-muted-foreground mt-0.5" />
                    <div>
                      <p className="text-sm text-muted-foreground">Skill Type</p>
                      <p className="font-medium">{labour.skill_type}</p>
                    </div>
                  </div>
                )}
                {labour.permit_valid_till && (
                  <div className="flex items-start gap-3">
                    <Clock className="h-4 w-4 text-muted-foreground mt-0.5" />
                    <div>
                      <p className="text-sm text-muted-foreground">Permit Valid Till</p>
                      <p className="font-medium">{labour.permit_valid_till}</p>
                    </div>
                  </div>
                )}
              </>
            )}

            {/* Photo */}
            {(entry.photo_snapshot || personDetails?.photo) && (
              <div className="pt-2 border-t">
                <p className="text-sm text-muted-foreground mb-2">Photo</p>
                <img
                  src={entry.photo_snapshot || personDetails?.photo}
                  alt="Person"
                  className="w-24 h-24 rounded-lg object-cover border"
                />
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Metadata */}
      <Card>
        <CardContent className="py-4">
          <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
            <span>Created: {formatDateTime(entry.created_at)}</span>
            <span>•</span>
            <span>Updated: {formatDateTime(entry.updated_at)}</span>
            {entry.approved_by && (
              <>
                <span>•</span>
                <span>Approved by: Employee #{entry.approved_by}</span>
              </>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
