import { ArrowLeft, Edit2, Plus, Search, Trash2, Users } from 'lucide-react';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';

import {
  Badge,
  Button,
  Checkbox,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Input,
  Label,
} from '@/shared/components/ui';
import { cn } from '@/shared/utils';

import type { AttendanceEmployee } from '../../api/attendance/attendance.api';
import {
  useAttendanceEmployees,
  useCreateAttendanceEmployee,
  useDeleteAttendanceEmployee,
  useUpdateAttendanceEmployee,
} from '../../api/attendance/attendance.queries';
import { DepartmentSelect } from '../../components';
import { ConfirmDialog } from '../../components/attendance';

interface EmployeeFormState {
  employee_code: string;
  name: string;
  department: number | '';
  department_name: string;
  is_active: boolean;
}

const EMPTY_FORM: EmployeeFormState = {
  employee_code: '',
  name: '',
  department: '',
  department_name: '',
  is_active: true,
};

export default function EmployeesPage() {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<AttendanceEmployee | null>(null);
  const [formData, setFormData] = useState<EmployeeFormState>(EMPTY_FORM);
  const [apiErrors, setApiErrors] = useState<Record<string, string>>({});
  const [deleteTarget, setDeleteTarget] = useState<AttendanceEmployee | null>(null);

  const { data: employees = [], isLoading } = useAttendanceEmployees();
  const createMutation = useCreateAttendanceEmployee();
  const updateMutation = useUpdateAttendanceEmployee();
  const deleteMutation = useDeleteAttendanceEmployee();

  const isSaving = createMutation.isPending || updateMutation.isPending;

  const filtered = employees.filter(
    (e) =>
      e.name.toLowerCase().includes(search.toLowerCase()) ||
      e.employee_code.toLowerCase().includes(search.toLowerCase()) ||
      (e.department_name?.toLowerCase().includes(search.toLowerCase()) ?? false),
  );

  const clearError = (field: string) =>
    setApiErrors((prev) => {
      if (!prev[field]) return prev;
      const n = { ...prev };
      delete n[field];
      return n;
    });

  const openCreate = () => {
    setEditing(null);
    setFormData(EMPTY_FORM);
    setApiErrors({});
    setShowForm(true);
  };

  const openEdit = (employee: AttendanceEmployee) => {
    setEditing(employee);
    setFormData({
      employee_code: employee.employee_code,
      name: employee.name,
      department: employee.department,
      department_name: employee.department_name || '',
      is_active: employee.is_active,
    });
    setApiErrors({});
    setShowForm(true);
  };

  const handleFormOpenChange = (next: boolean) => {
    setShowForm(next);
    if (!next) {
      setEditing(null);
      setApiErrors({});
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const errors: Record<string, string> = {};
    if (!formData.employee_code.trim()) errors.employee_code = 'Employee code is required';
    if (!formData.name.trim()) errors.name = 'Name is required';
    if (!formData.department) errors.department = 'Department is required';
    if (Object.keys(errors).length > 0) {
      setApiErrors(errors);
      return;
    }

    const payload = {
      employee_code: formData.employee_code.trim(),
      name: formData.name.trim(),
      department: formData.department as number,
      is_active: formData.is_active,
    };

    try {
      if (editing) {
        await updateMutation.mutateAsync({ id: editing.id, data: payload });
        toast.success(`Updated ${payload.name}`);
      } else {
        await createMutation.mutateAsync(payload);
        toast.success(`Added ${payload.name}`);
      }
      handleFormOpenChange(false);
    } catch (error: unknown) {
      const err = error as { errors?: Record<string, string[]>; message?: string };
      const fieldErrors: Record<string, string> = {};
      if (err.errors) {
        Object.entries(err.errors).forEach(([field, messages]) => {
          if (Array.isArray(messages) && messages.length > 0) fieldErrors[field] = messages[0];
        });
      }
      setApiErrors(fieldErrors);
      toast.error(err.message || 'Could not save employee');
    }
  };

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    try {
      await deleteMutation.mutateAsync(deleteTarget.id);
      toast.success(`Deleted ${deleteTarget.name}`);
      setDeleteTarget(null);
    } catch (error: unknown) {
      const err = error as { message?: string };
      toast.error(err.message || 'Could not delete employee');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate('/gate/attendance')}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h2 className="text-3xl font-bold tracking-tight">Employees</h2>
            <p className="text-muted-foreground">Manage the employee register for attendance</p>
          </div>
        </div>
        <Button onClick={openCreate}>
          <Plus className="h-4 w-4 mr-2" />
          Add Employee
        </Button>
      </div>

      {/* Search */}
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Search by name, code or department..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Employee List */}
      {isLoading ? (
        <div className="flex items-center justify-center h-64">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-64 gap-3 text-muted-foreground rounded-md border border-dashed">
          <Users className="h-8 w-8" />
          <p className="text-lg">{search ? 'No employees match your search' : 'No employees yet'}</p>
          {!search && (
            <Button variant="outline" size="sm" onClick={openCreate}>
              <Plus className="h-4 w-4 mr-2" />
              Add your first employee
            </Button>
          )}
        </div>
      ) : (
        <div className="rounded-md border overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[600px]">
              <thead className="bg-muted/50">
                <tr>
                  <th className="p-3 text-left text-sm font-medium">Code</th>
                  <th className="p-3 text-left text-sm font-medium">Name</th>
                  <th className="p-3 text-left text-sm font-medium">Department</th>
                  <th className="p-3 text-left text-sm font-medium">Status</th>
                  <th className="p-3 text-right text-sm font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((employee) => (
                  <tr key={employee.id} className="border-t hover:bg-muted/50">
                    <td className="p-3 text-sm font-medium">{employee.employee_code}</td>
                    <td className="p-3 text-sm">{employee.name}</td>
                    <td className="p-3 text-sm">{employee.department_name || '-'}</td>
                    <td className="p-3 text-sm">
                      <Badge variant={employee.is_active ? 'success' : 'secondary'}>
                        {employee.is_active ? 'Active' : 'Inactive'}
                      </Badge>
                    </td>
                    <td className="p-3 text-right">
                      <div className="flex justify-end gap-1">
                        <Button variant="ghost" size="sm" onClick={() => openEdit(employee)}>
                          <Edit2 className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setDeleteTarget(employee)}
                        >
                          <Trash2 className="h-3.5 w-3.5 text-destructive" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Add / Edit dialog */}
      <Dialog open={showForm} onOpenChange={handleFormOpenChange}>
        <DialogContent className="sm:max-w-[460px]">
          <DialogHeader>
            <DialogTitle>{editing ? 'Edit Employee' : 'Add Employee'}</DialogTitle>
            <DialogDescription>
              {editing
                ? 'Update this employee’s details.'
                : 'Add an employee to the attendance register.'}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="employee_code">
                Employee Code <span className="text-destructive">*</span>
              </Label>
              <Input
                id="employee_code"
                value={formData.employee_code}
                onChange={(e) => {
                  setFormData((prev) => ({ ...prev, employee_code: e.target.value }));
                  clearError('employee_code');
                }}
                placeholder="e.g., EMP001"
                disabled={isSaving}
                className={cn(apiErrors.employee_code && 'border-destructive')}
              />
              {apiErrors.employee_code && (
                <p className="text-sm text-destructive">{apiErrors.employee_code}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="employee_name">
                Name <span className="text-destructive">*</span>
              </Label>
              <Input
                id="employee_name"
                value={formData.name}
                onChange={(e) => {
                  setFormData((prev) => ({ ...prev, name: e.target.value }));
                  clearError('name');
                }}
                placeholder="Employee name"
                disabled={isSaving}
                className={cn(apiErrors.name && 'border-destructive')}
              />
              {apiErrors.name && <p className="text-sm text-destructive">{apiErrors.name}</p>}
            </div>

            <DepartmentSelect
              label="Department"
              required
              disabled={isSaving}
              value={formData.department}
              initialDisplayText={formData.department_name}
              error={apiErrors.department}
              onChange={(departmentId, departmentName) => {
                setFormData((prev) => ({
                  ...prev,
                  department: departmentId,
                  department_name: departmentName,
                }));
                clearError('department');
              }}
            />

            <div className="flex items-center gap-2">
              <Checkbox
                id="is_active"
                checked={formData.is_active}
                onCheckedChange={(checked) =>
                  setFormData((prev) => ({ ...prev, is_active: checked }))
                }
                disabled={isSaving}
              />
              <Label htmlFor="is_active" className="text-sm font-normal">
                Active
              </Label>
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => handleFormOpenChange(false)}
                disabled={isSaving}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isSaving}>
                {isSaving ? 'Saving...' : editing ? 'Update' : 'Add'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete confirmation */}
      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title="Delete employee?"
        description={
          deleteTarget
            ? `${deleteTarget.name} (${deleteTarget.employee_code}) will be removed from the register. An employee who already has attendance records can’t be deleted — deactivate them instead.`
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
