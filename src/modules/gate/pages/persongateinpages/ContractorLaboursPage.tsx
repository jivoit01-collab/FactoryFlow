import {
  ArrowLeft,
  CircleCheck,
  CircleMinus,
  Clock,
  LogIn,
  LogOut,
  Search,
  Users,
} from 'lucide-react';
import { useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { toast } from 'sonner';

import { Badge, Button, Card, CardContent, Input, Label } from '@/shared/components/ui';
import { cn } from '@/shared/utils';

import { PERSON_TYPE_IDS } from '../../api/personGateIn/personGateIn.api';
import type { ContractorLabourStatus, Gate } from '../../api/personGateIn/personGateIn.api';
import {
  useBulkCreateEntry,
  useBulkExitEntry,
  useContractorLaboursStatus,
} from '../../api/personGateIn/personGateIn.queries';
import { GateSelect } from '../../components/persongatein/GateSelect';

function getCurrentLocalDateTime(): string {
  const now = new Date();
  const offset = now.getTimezoneOffset();
  const local = new Date(now.getTime() - offset * 60000);
  return local.toISOString().slice(0, 16);
}

export default function ContractorLaboursPage() {
  const navigate = useNavigate();
  const { contractorId } = useParams<{ contractorId: string }>();
  const contractorIdNum = contractorId ? Number(contractorId) : null;

  const [search, setSearch] = useState('');
  const [selectedGate, setSelectedGate] = useState<Gate | null>(null);
  const [actualEntryTime, setActualEntryTime] = useState(getCurrentLocalDateTime());
  const [processingLabourIds, setProcessingLabourIds] = useState<Set<number>>(new Set());
  const [bulkAction, setBulkAction] = useState<'entry' | 'exit' | null>(null);

  const {
    data: status,
    isLoading,
    isError,
  } = useContractorLaboursStatus(contractorIdNum);

  const bulkCreateMutation = useBulkCreateEntry();
  const bulkExitMutation = useBulkExitEntry();

  const filteredLabours = useMemo(() => {
    if (!status?.labours) return [];
    if (!search.trim()) return status.labours;
    const q = search.toLowerCase();
    return status.labours.filter(
      (l) =>
        l.name.toLowerCase().includes(q) ||
        l.mobile?.toLowerCase().includes(q) ||
        l.skill_type?.toLowerCase().includes(q),
    );
  }, [status?.labours, search]);

  const insideLabours = useMemo(
    () => filteredLabours.filter((l) => l.is_inside),
    [filteredLabours],
  );
  const outsideLabours = useMemo(
    () => filteredLabours.filter((l) => !l.is_inside),
    [filteredLabours],
  );

  const getActualEntryTimeISO = (): string | undefined => {
    if (!actualEntryTime) return undefined;
    return new Date(actualEntryTime).toISOString();
  };

  const handleSingleEntry = async (labour: ContractorLabourStatus) => {
    if (!selectedGate) {
      toast.error('Please select a gate first');
      return;
    }
    if (!contractorIdNum) return;

    setProcessingLabourIds((prev) => new Set(prev).add(labour.id));
    try {
      const result = await bulkCreateMutation.mutateAsync({
        contractor_id: contractorIdNum,
        gate_in: selectedGate.id,
        person_type: PERSON_TYPE_IDS.LABOUR,
        actual_entry_time: getActualEntryTimeISO(),
        labours: [{ labour_id: labour.id }],
      });
      const item = result.results[0];
      if (item?.status === 'created') {
        toast.success(`${labour.name} entered`);
      } else {
        toast.warning(`${labour.name}: ${item?.reason || 'Skipped'}`);
      }
    } catch {
      toast.error(`Failed to create entry for ${labour.name}`);
    } finally {
      setProcessingLabourIds((prev) => {
        const next = new Set(prev);
        next.delete(labour.id);
        return next;
      });
    }
  };

  const handleSingleExit = async (labour: ContractorLabourStatus) => {
    if (!selectedGate) {
      toast.error('Please select a gate first');
      return;
    }
    if (!contractorIdNum) return;

    setProcessingLabourIds((prev) => new Set(prev).add(labour.id));
    try {
      const result = await bulkExitMutation.mutateAsync({
        contractor_id: contractorIdNum,
        gate_out: selectedGate.id,
        labours: [{ labour_id: labour.id }],
      });
      const item = result.results[0];
      if (item?.status === 'exited') {
        toast.success(`${labour.name} exited`);
      } else {
        toast.warning(`${labour.name}: ${item?.reason || 'Skipped'}`);
      }
    } catch {
      toast.error(`Failed to mark exit for ${labour.name}`);
    } finally {
      setProcessingLabourIds((prev) => {
        const next = new Set(prev);
        next.delete(labour.id);
        return next;
      });
    }
  };

  const handleBulkEntry = async () => {
    if (!selectedGate) {
      toast.error('Please select a gate first');
      return;
    }
    if (!contractorIdNum || outsideLabours.length === 0) return;

    setBulkAction('entry');
    try {
      const result = await bulkCreateMutation.mutateAsync({
        contractor_id: contractorIdNum,
        gate_in: selectedGate.id,
        person_type: PERSON_TYPE_IDS.LABOUR,
        actual_entry_time: getActualEntryTimeISO(),
        labours: outsideLabours.map((l) => ({ labour_id: l.id })),
      });
      toast.success(
        `${result.total_created} entered${result.total_skipped > 0 ? `, ${result.total_skipped} skipped` : ''}`,
      );
    } catch {
      toast.error('Bulk entry failed');
    } finally {
      setBulkAction(null);
    }
  };

  const handleBulkExit = async () => {
    if (!selectedGate) {
      toast.error('Please select a gate first');
      return;
    }
    if (!contractorIdNum || insideLabours.length === 0) return;

    setBulkAction('exit');
    try {
      const result = await bulkExitMutation.mutateAsync({
        contractor_id: contractorIdNum,
        gate_out: selectedGate.id,
        labours: insideLabours.map((l) => ({ labour_id: l.id })),
      });
      toast.success(
        `${result.total_exited} exited${result.total_skipped > 0 ? `, ${result.total_skipped} skipped` : ''}`,
      );
    } catch {
      toast.error('Bulk exit failed');
    } finally {
      setBulkAction(null);
    }
  };

  const formatDate = (date?: string) => {
    if (!date) return '-';
    try {
      return new Date(date).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      });
    } catch {
      return date;
    }
  };

  const isPermitExpired = (date?: string) => {
    if (!date) return false;
    try {
      return new Date(date) < new Date();
    } catch {
      return false;
    }
  };

  if (!contractorIdNum) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-muted-foreground">
        <p>Invalid contractor ID</p>
        <Button variant="link" onClick={() => navigate('/gate/visitor-labour/contractors')}>
          Back to contractors
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate('/gate/visitor-labour/contractors')}
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h2 className="text-3xl font-bold tracking-tight">
              {status?.contractor_name || 'Contractor Labours'}
            </h2>
            <p className="text-muted-foreground">
              Manage labour entry and exit for this contractor
            </p>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      {status && (
        <div className="grid gap-4 grid-cols-2 sm:grid-cols-3">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <Users className="h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="text-2xl font-bold">{status.total_active_labours}</p>
                  <p className="text-xs text-muted-foreground">Total Active</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <LogIn className="h-5 w-5 text-green-600" />
                <div>
                  <p className="text-2xl font-bold text-green-600">
                    {status.total_currently_inside}
                  </p>
                  <p className="text-xs text-muted-foreground">Currently Inside</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <LogOut className="h-5 w-5 text-gray-500" />
                <div>
                  <p className="text-2xl font-bold text-gray-500">
                    {status.total_active_labours - status.total_currently_inside}
                  </p>
                  <p className="text-xs text-muted-foreground">Outside</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Controls */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end">
            {/* Gate Selector */}
            <div className="w-full sm:w-64">
              <Label className="mb-1.5 block">Gate *</Label>
              <GateSelect
                value={selectedGate?.id}
                onChange={setSelectedGate}
                placeholder="Select gate for entry/exit"
                required
              />
            </div>

            {/* Actual Entry Time */}
            <div className="w-full sm:w-56">
              <Label className="mb-1.5 block">
                <Clock className="h-3.5 w-3.5 inline mr-1" />
                Entry Time
              </Label>
              <Input
                type="datetime-local"
                value={actualEntryTime}
                onChange={(e) => setActualEntryTime(e.target.value)}
              />
            </div>

            {/* Search */}
            <div className="relative w-full sm:w-64">
              <Label className="mb-1.5 block">Search</Label>
              <Search className="absolute left-3 bottom-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by name, mobile, skill..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10"
              />
            </div>

            {/* Bulk Actions */}
            <div className="flex gap-2 sm:ml-auto">
              <Button
                variant="default"
                size="sm"
                onClick={handleBulkEntry}
                disabled={
                  !selectedGate ||
                  outsideLabours.length === 0 ||
                  bulkAction !== null
                }
              >
                <LogIn className="h-4 w-4 mr-1" />
                {bulkAction === 'entry' ? 'Processing...' : `Entry All (${outsideLabours.length})`}
              </Button>
              <Button
                variant="destructive"
                size="sm"
                onClick={handleBulkExit}
                disabled={
                  !selectedGate ||
                  insideLabours.length === 0 ||
                  bulkAction !== null
                }
              >
                <LogOut className="h-4 w-4 mr-1" />
                {bulkAction === 'exit' ? 'Processing...' : `Exit All (${insideLabours.length})`}
              </Button>
            </div>
          </div>
          {!selectedGate && (
            <p className="text-xs text-amber-600 mt-2">
              Select a gate to enable entry/exit actions
            </p>
          )}
        </CardContent>
      </Card>

      {/* Labour Table */}
      {isLoading ? (
        <div className="flex items-center justify-center h-64">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        </div>
      ) : isError ? (
        <div className="flex flex-col items-center justify-center h-64 text-muted-foreground rounded-md border">
          <p className="text-lg">Failed to load labours</p>
          <p className="text-sm">Please try again later</p>
        </div>
      ) : filteredLabours.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-64 text-muted-foreground rounded-md border">
          <p className="text-lg">No labours found</p>
          {search && <p className="text-sm">Try a different search term</p>}
        </div>
      ) : (
        <div className="rounded-md border overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[700px]">
              <thead className="bg-muted/50">
                <tr>
                  <th className="p-3 text-left text-sm font-medium">Name</th>
                  <th className="p-3 text-left text-sm font-medium">Mobile</th>
                  <th className="p-3 text-left text-sm font-medium">Skill</th>
                  <th className="p-3 text-left text-sm font-medium">Permit Valid Till</th>
                  <th className="p-3 text-center text-sm font-medium">Status</th>
                  <th className="p-3 text-right text-sm font-medium">Action</th>
                </tr>
              </thead>
              <tbody>
                {filteredLabours.map((labour) => {
                  const isProcessing = processingLabourIds.has(labour.id);
                  return (
                    <tr key={labour.id} className="border-t hover:bg-muted/50">
                      <td className="p-3 text-sm font-medium">{labour.name}</td>
                      <td className="p-3 text-sm">{labour.mobile || '-'}</td>
                      <td className="p-3 text-sm">{labour.skill_type || '-'}</td>
                      <td className="p-3 text-sm">
                        <span
                          className={cn(
                            isPermitExpired(labour.permit_valid_till) &&
                              'text-red-600 dark:text-red-400',
                          )}
                        >
                          {formatDate(labour.permit_valid_till)}
                          {isPermitExpired(labour.permit_valid_till) && ' (Expired)'}
                        </span>
                      </td>
                      <td className="p-3 text-center">
                        {labour.is_inside ? (
                          <Badge
                            variant="default"
                            className="bg-green-100 text-green-800 hover:bg-green-100 dark:bg-green-900 dark:text-green-200"
                          >
                            <CircleCheck className="h-3 w-3 mr-1" />
                            Inside
                          </Badge>
                        ) : (
                          <Badge variant="secondary">
                            <CircleMinus className="h-3 w-3 mr-1" />
                            Outside
                          </Badge>
                        )}
                      </td>
                      <td className="p-3 text-right">
                        {labour.is_inside ? (
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => handleSingleExit(labour)}
                            disabled={!selectedGate || isProcessing || bulkAction !== null}
                          >
                            {isProcessing ? (
                              <div className="h-3 w-3 animate-spin rounded-full border-2 border-white border-t-transparent mr-1" />
                            ) : (
                              <LogOut className="h-3 w-3 mr-1" />
                            )}
                            Exit
                          </Button>
                        ) : (
                          <Button
                            variant="default"
                            size="sm"
                            className="bg-green-600 hover:bg-green-700"
                            onClick={() => handleSingleEntry(labour)}
                            disabled={!selectedGate || isProcessing || bulkAction !== null}
                          >
                            {isProcessing ? (
                              <div className="h-3 w-3 animate-spin rounded-full border-2 border-white border-t-transparent mr-1" />
                            ) : (
                              <LogIn className="h-3 w-3 mr-1" />
                            )}
                            Entry
                          </Button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
