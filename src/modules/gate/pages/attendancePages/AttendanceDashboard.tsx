import {
  ChevronDown,
  ChevronRight,
  ClipboardList,
  Download,
  Plus,
  Trash2,
  Users,
} from 'lucide-react';
import { Fragment, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';

import { GATE_PERMISSIONS } from '@/config/permissions';
import { usePermission } from '@/core/auth';
import { Badge, Button, Card, CardContent, Input, Label } from '@/shared/components/ui';

import type { AttendanceRecord } from '../../api/attendance/attendance.api';
import {
  useAttendanceRecords,
  useDeleteAttendanceRecord,
} from '../../api/attendance/attendance.queries';
import { ConfirmDialog, ExportDialog } from '../../components/attendance';

function getToday(): string {
  const now = new Date();
  const offset = now.getTimezoneOffset();
  return new Date(now.getTime() - offset * 60000).toISOString().slice(0, 10);
}

interface EmployeeDayGroup {
  employeeId: number;
  code: string;
  name: string;
  department: string;
  records: AttendanceRecord[];
  firstIn: AttendanceRecord | null;
  lastOut: AttendanceRecord | null;
}

function PhotoThumb({ record }: { record: AttendanceRecord }) {
  if (!record.photo) return null;
  return (
    <a href={record.photo} target="_blank" rel="noopener noreferrer" className="inline-block">
      <img
        src={record.photo}
        alt={`Proof at ${record.time?.slice(0, 5)}`}
        className="h-9 w-9 rounded object-cover border transition-opacity hover:opacity-80"
      />
    </a>
  );
}

export default function AttendanceDashboard() {
  const navigate = useNavigate();
  const { hasPermission } = usePermission();
  const [date, setDate] = useState<string>(getToday());
  const [expanded, setExpanded] = useState<number | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<AttendanceRecord | null>(null);
  const [showExport, setShowExport] = useState(false);

  const { data: records = [], isLoading } = useAttendanceRecords({ date });
  const deleteMutation = useDeleteAttendanceRecord();

  const canCreate = hasPermission(GATE_PERMISSIONS.ATTENDANCE.CREATE);
  const canDelete = hasPermission(GATE_PERMISSIONS.ATTENDANCE.DELETE);
  const canManageEmployees = hasPermission(GATE_PERMISSIONS.ATTENDANCE.VIEW_EMPLOYEE);

  const isToday = date === getToday();

  // Group the day's marks into one register row per employee.
  const groups = useMemo<EmployeeDayGroup[]>(() => {
    const map = new Map<number, AttendanceRecord[]>();
    for (const r of records) {
      const list = map.get(r.employee) ?? [];
      list.push(r);
      map.set(r.employee, list);
    }
    const result: EmployeeDayGroup[] = [];
    for (const [employeeId, recs] of map) {
      const sorted = [...recs].sort((a, b) => a.time.localeCompare(b.time));
      const ins = sorted.filter((r) => r.direction === 'IN');
      const outs = sorted.filter((r) => r.direction === 'OUT');
      const detail = sorted[0].employee_detail;
      result.push({
        employeeId,
        code: detail?.employee_code ?? '-',
        name: detail?.name ?? '-',
        department: detail?.department_name ?? '-',
        records: sorted,
        firstIn: ins[0] ?? null,
        lastOut: outs.length ? outs[outs.length - 1] : null,
      });
    }
    result.sort((a, b) => a.name.localeCompare(b.name));
    return result;
  }, [records]);

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    try {
      await deleteMutation.mutateAsync(deleteTarget.id);
      toast.success('Attendance record deleted');
      setDeleteTarget(null);
    } catch (error: unknown) {
      const err = error as { message?: string };
      toast.error(err.message || 'Could not delete record');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Attendance</h2>
          <p className="text-muted-foreground">
            Manual attendance register — used when the punching machine is unavailable
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={() => setShowExport(true)}>
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
          {canManageEmployees && (
            <Button variant="outline" onClick={() => navigate('/gate/attendance/employees')}>
              <Users className="h-4 w-4 mr-2" />
              Employees
            </Button>
          )}
          {canCreate && (
            <Button onClick={() => navigate('/gate/attendance/new')}>
              <Plus className="h-4 w-4 mr-2" />
              Mark Attendance
            </Button>
          )}
        </div>
      </div>

      {/* Date filter + summary */}
      <Card>
        <CardContent className="flex flex-col gap-4 pt-6 sm:flex-row sm:items-end sm:justify-between">
          <div className="max-w-xs">
            <Label htmlFor="attendance-date">Date</Label>
            <Input
              id="attendance-date"
              type="date"
              max={getToday()}
              value={date}
              onChange={(e) => {
                setDate(e.target.value);
                setExpanded(null);
              }}
              className="mt-1"
            />
          </div>
          {!isLoading && (
            <Badge variant="secondary" className="w-fit text-sm">
              {groups.length} {groups.length === 1 ? 'employee' : 'employees'} · {records.length}{' '}
              {records.length === 1 ? 'mark' : 'marks'} {isToday ? 'today' : 'on this date'}
            </Badge>
          )}
        </CardContent>
      </Card>

      {/* Register */}
      {isLoading ? (
        <div className="flex items-center justify-center h-64">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        </div>
      ) : groups.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-64 gap-3 text-muted-foreground rounded-md border border-dashed">
          <ClipboardList className="h-8 w-8" />
          <p className="text-lg">No attendance marked for this date</p>
          {canCreate && isToday && (
            <Button variant="outline" size="sm" onClick={() => navigate('/gate/attendance/new')}>
              <Plus className="h-4 w-4 mr-2" />
              Mark the first entry
            </Button>
          )}
        </div>
      ) : (
        <div className="rounded-md border overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px]">
              <thead className="bg-muted/50">
                <tr>
                  <th className="w-8 p-3" />
                  <th className="p-3 text-left text-sm font-medium">Code</th>
                  <th className="p-3 text-left text-sm font-medium">Name</th>
                  <th className="p-3 text-left text-sm font-medium">Department</th>
                  <th className="p-3 text-left text-sm font-medium">First In</th>
                  <th className="p-3 text-left text-sm font-medium">Last Out</th>
                  <th className="p-3 text-left text-sm font-medium">Marks</th>
                </tr>
              </thead>
              <tbody>
                {groups.map((group) => {
                  const isOpen = expanded === group.employeeId;
                  return (
                    <Fragment key={group.employeeId}>
                      <tr
                        className="border-t hover:bg-muted/50 cursor-pointer"
                        onClick={() => setExpanded(isOpen ? null : group.employeeId)}
                      >
                        <td className="p-3 text-muted-foreground">
                          {isOpen ? (
                            <ChevronDown className="h-4 w-4" />
                          ) : (
                            <ChevronRight className="h-4 w-4" />
                          )}
                        </td>
                        <td className="p-3 text-sm font-medium">{group.code}</td>
                        <td className="p-3 text-sm">{group.name}</td>
                        <td className="p-3 text-sm">{group.department}</td>
                        <td className="p-3 text-sm">
                          <div className="flex items-center gap-2">
                            {group.firstIn ? (
                              <>
                                <span className="tabular-nums">
                                  {group.firstIn.time.slice(0, 5)}
                                </span>
                                <PhotoThumb record={group.firstIn} />
                              </>
                            ) : (
                              <span className="text-muted-foreground">—</span>
                            )}
                          </div>
                        </td>
                        <td className="p-3 text-sm">
                          <div className="flex items-center gap-2">
                            {group.lastOut ? (
                              <>
                                <span className="tabular-nums">
                                  {group.lastOut.time.slice(0, 5)}
                                </span>
                                <PhotoThumb record={group.lastOut} />
                              </>
                            ) : (
                              <span className="text-muted-foreground">—</span>
                            )}
                          </div>
                        </td>
                        <td className="p-3 text-sm">
                          <Badge variant="secondary">{group.records.length}</Badge>
                        </td>
                      </tr>

                      {isOpen && (
                        <tr className="border-t bg-muted/30">
                          <td />
                          <td colSpan={6} className="p-3">
                            <div className="space-y-2">
                              {group.records.map((record) => (
                                <div
                                  key={record.id}
                                  className="flex items-center gap-3 rounded-md border bg-background px-3 py-2"
                                >
                                  <Badge variant={record.direction === 'IN' ? 'success' : 'warning'}>
                                    {record.direction === 'IN' ? 'In' : 'Out'}
                                  </Badge>
                                  <span className="text-sm tabular-nums font-medium">
                                    {record.time.slice(0, 5)}
                                  </span>
                                  <PhotoThumb record={record} />
                                  <span className="text-xs text-muted-foreground">
                                    {record.created_by_name ?? ''}
                                  </span>
                                  {canDelete && (
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      className="ml-auto"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setDeleteTarget(record);
                                      }}
                                    >
                                      <Trash2 className="h-3.5 w-3.5 text-destructive" />
                                    </Button>
                                  )}
                                </div>
                              ))}
                            </div>
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Export */}
      <ExportDialog open={showExport} onOpenChange={setShowExport} defaultDate={date} />

      {/* Delete confirmation */}
      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title="Delete attendance record?"
        description={
          deleteTarget
            ? `The ${deleteTarget.direction === 'IN' ? 'In' : 'Out'} mark at ${deleteTarget.time?.slice(0, 5)} will be permanently removed.`
            : ''
        }
        confirmLabel="Delete"
        destructive
        loading={deleteMutation.isPending}
        onConfirm={handleConfirmDelete}
      />
    </div>
  );
}
