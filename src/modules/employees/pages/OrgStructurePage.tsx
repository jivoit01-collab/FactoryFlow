/**
 * The two masters the organisation is built out of: departments and
 * designations.
 *
 * They share a page because they are edited together — somebody setting up the
 * company does both in one sitting — and because each on its own is a thin
 * screen.
 *
 * **Departments are drawn as the tree they are**, indented with a rail per
 * level, each row carrying its head and two headcounts: the people in that
 * department itself, and the total including everything nested under it.
 * "Technology 2 · 34 with sub-departments" is the number somebody reading a
 * tree actually means, and showing only one of them is how a department looks
 * empty when it runs a division.
 *
 * **Designations are drawn as the ladder they are**, ordered by level with the
 * level number on the rail, so the ordering *is* the visual. A grid of cards
 * would hide the one property that matters about a designation.
 *
 * Nothing here is deleted, only retired: last year's history names the
 * department somebody moved out of, and a deleted row would make that sentence
 * unreadable. The buttons say "Retire" for that reason.
 */
import {
  Building2,
  ChevronRight,
  Layers,
  Loader2,
  Pencil,
  Plus,
  Users,
} from 'lucide-react';
import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';

import { confirmDialog } from '@/shared/components';
import { DashboardError } from '@/shared/components/dashboard';
import {
  Button,
  Dialog,
  DialogBody,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Input,
  Label,
  NativeSelect,
  SelectOption,
  Switch,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
  Textarea,
} from '@/shared/components/ui';
import { cn, getErrorMessage } from '@/shared/utils';

import {
  useDepartments,
  useDesignations,
  useEmployeeMeta,
  useRetireDepartment,
  useRetireDesignation,
  useSaveDepartment,
  useSaveDesignation,
} from '../api';
import { EmployeeAvatar, EmptyState } from '../components/EmployeeBits';
import { levelAccent } from '../components/theme';
import type { Department, Designation } from '../types';

/** Departments, nested. Anything whose parent is missing becomes a root. */
function buildDepartmentTree(departments: Department[]) {
  const byParent = new Map<number | null, Department[]>();
  const known = new Set(departments.map((department) => department.id));
  departments.forEach((department) => {
    const parent =
      department.parent !== null && known.has(department.parent) ? department.parent : null;
    byParent.set(parent, [...(byParent.get(parent) ?? []), department]);
  });
  return byParent;
}

export default function OrgStructurePage() {
  const meta = useEmployeeMeta();
  const departments = useDepartments();
  const designations = useDesignations();
  const [departmentDraft, setDepartmentDraft] = useState<Partial<Department> | null>(null);
  const [designationDraft, setDesignationDraft] = useState<Partial<Designation> | null>(null);

  const canManage = !!meta.data?.permissions.can_manage_structure;
  const departmentRows = useMemo(() => departments.data?.results ?? [], [departments.data]);
  const byParent = useMemo(() => buildDepartmentTree(departmentRows), [departmentRows]);

  if (departments.isError || designations.isError) {
    return (
      <DashboardError
        message="The organisation structure could not be loaded."
        onRetry={() => {
          void departments.refetch();
          void designations.refetch();
        }}
      />
    );
  }

  function renderDepartment(department: Department, depth: number) {
    const children = byParent.get(department.id) ?? [];
    const retired = department.status === 'INACTIVE';
    return (
      <div key={department.id}>
        <div
          className={cn(
            'flex items-stretch gap-1',
            retired && 'opacity-60',
          )}
        >
          {Array.from({ length: depth }).map((_, index) => (
            <span key={index} className="ml-3 w-px shrink-0 bg-border" aria-hidden="true" />
          ))}
          <div className="flex min-w-0 flex-1 flex-wrap items-center gap-3 border-b py-2.5 pl-2">
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <span className="truncate font-medium">{department.name}</span>
                <span className="rounded bg-muted px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground">
                  {department.code}
                </span>
                {retired && (
                  <span className="rounded-full border px-1.5 py-0.5 text-[10px] text-muted-foreground">
                    Retired
                  </span>
                )}
              </div>
              {department.description && (
                <p className="mt-0.5 truncate text-xs text-muted-foreground">
                  {department.description}
                </p>
              )}
            </div>

            <div className="flex min-w-[180px] items-center gap-2">
              {department.head_detail ? (
                <Link
                  to={`/employees/${department.head_detail.id}`}
                  className="flex min-w-0 items-center gap-2 rounded px-1 py-0.5 hover:bg-muted"
                >
                  <EmployeeAvatar
                    employee={department.head_detail}
                    size="xs"
                    showStatus={false}
                  />
                  <span className="min-w-0">
                    <span className="block truncate text-xs font-medium">
                      {department.head_detail.full_name}
                    </span>
                    <span className="block text-[10px] text-muted-foreground">Head</span>
                  </span>
                </Link>
              ) : (
                <span className="text-xs text-muted-foreground">No head named</span>
              )}
            </div>

            <Link
              to={`/employees?department=${department.id}`}
              className="flex items-center gap-1.5 rounded px-1.5 py-1 text-xs text-muted-foreground hover:bg-muted hover:text-foreground"
              title="Open this department in the directory"
            >
              <Users className="h-3.5 w-3.5" />
              <span className="font-semibold tabular-nums">{department.employee_count}</span>
              {department.total_employee_count !== department.employee_count && (
                <span className="tabular-nums opacity-70">
                  / {department.total_employee_count}
                </span>
              )}
              <ChevronRight className="h-3 w-3" />
            </Link>

            {canManage && (
              <div className="flex gap-1">
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 w-7 p-0"
                  aria-label={`Edit ${department.name}`}
                  onClick={() => setDepartmentDraft(department)}
                >
                  <Pencil className="h-3.5 w-3.5" />
                </Button>
              </div>
            )}
          </div>
        </div>
        {children.map((child) => renderDepartment(child, depth + 1))}
      </div>
    );
  }

  const roots = byParent.get(null) ?? [];

  return (
    <div className="space-y-4">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Organisation structure</h1>
          <p className="text-sm text-muted-foreground">
            The departments the company is divided into, and the ladder of designations
            people sit on.
          </p>
        </div>
        <Button variant="outline" size="sm" asChild>
          <Link to="/employees">Directory</Link>
        </Button>
      </header>

      <Tabs defaultValue="departments">
        <TabsList>
          <TabsTrigger value="departments" className="gap-1.5">
            <Building2 className="h-3.5 w-3.5" />
            Departments
            <span className="tabular-nums text-muted-foreground">{departmentRows.length}</span>
          </TabsTrigger>
          <TabsTrigger value="designations" className="gap-1.5">
            <Layers className="h-3.5 w-3.5" />
            Designations
            <span className="tabular-nums text-muted-foreground">
              {designations.data?.results.length ?? 0}
            </span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="departments" className="mt-4">
          <section className="rounded-xl border bg-card shadow-sm">
            <header className="flex flex-wrap items-center justify-between gap-2 border-b px-4 py-2.5">
              <div>
                <h2 className="text-sm font-semibold">Department tree</h2>
                <p className="text-xs text-muted-foreground">
                  The first number is the people in that department; the second includes
                  everything nested under it.
                </p>
              </div>
              {canManage && (
                <Button size="sm" onClick={() => setDepartmentDraft({})} className="gap-1.5">
                  <Plus className="h-3.5 w-3.5" />
                  Add department
                </Button>
              )}
            </header>
            <div className="px-4 pb-2">
              {departments.isLoading ? (
                <div className="h-40 animate-pulse rounded-lg bg-muted/40" />
              ) : roots.length === 0 ? (
                <EmptyState
                  icon={Building2}
                  title="No departments yet"
                  hint="Start with the top-level ones — Technology, Finance, Human Resources — then nest the rest under them."
                  className="my-4 border-0"
                />
              ) : (
                roots.map((department) => renderDepartment(department, 0))
              )}
            </div>
          </section>
        </TabsContent>

        <TabsContent value="designations" className="mt-4">
          <section className="rounded-xl border bg-card shadow-sm">
            <header className="flex flex-wrap items-center justify-between gap-2 border-b px-4 py-2.5">
              <div>
                <h2 className="text-sm font-semibold">The ladder</h2>
                <p className="text-xs text-muted-foreground">
                  Level 1 is the top. This is the grade somebody holds — their place in the
                  reporting chain is a separate thing, shown on the chart.
                </p>
              </div>
              {canManage && (
                <Button size="sm" onClick={() => setDesignationDraft({})} className="gap-1.5">
                  <Plus className="h-3.5 w-3.5" />
                  Add designation
                </Button>
              )}
            </header>

            <div className="divide-y">
              {(designations.data?.results ?? []).map((designation) => {
                const accent = levelAccent(designation.level);
                const retired = designation.status === 'INACTIVE';
                return (
                  <div
                    key={designation.id}
                    className={cn(
                      'flex flex-wrap items-center gap-3 px-4 py-2.5',
                      retired && 'opacity-60',
                    )}
                  >
                    <span
                      className={cn(
                        'flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-xs font-bold tabular-nums',
                        accent.iconBg,
                        accent.icon,
                      )}
                      title={`Organisational level ${designation.level}`}
                    >
                      {designation.level}
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="truncate font-medium">{designation.name}</span>
                        <span className="rounded bg-muted px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground">
                          {designation.code}
                        </span>
                        {designation.is_managerial && (
                          <span className="rounded-full border px-1.5 py-0.5 text-[10px] text-muted-foreground">
                            Manages people
                          </span>
                        )}
                        {retired && (
                          <span className="rounded-full border px-1.5 py-0.5 text-[10px] text-muted-foreground">
                            Retired
                          </span>
                        )}
                      </div>
                      {designation.description && (
                        <p className="mt-0.5 truncate text-xs text-muted-foreground">
                          {designation.description}
                        </p>
                      )}
                    </div>
                    <Link
                      to={`/employees?designation=${designation.id}`}
                      className="flex items-center gap-1.5 rounded px-1.5 py-1 text-xs text-muted-foreground hover:bg-muted hover:text-foreground"
                    >
                      <Users className="h-3.5 w-3.5" />
                      <span className="font-semibold tabular-nums">
                        {designation.employee_count}
                      </span>
                      <ChevronRight className="h-3 w-3" />
                    </Link>
                    {canManage && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 w-7 p-0"
                        aria-label={`Edit ${designation.name}`}
                        onClick={() => setDesignationDraft(designation)}
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                    )}
                  </div>
                );
              })}
              {!designations.isLoading && !designations.data?.results.length && (
                <EmptyState
                  icon={Layers}
                  title="No designations yet"
                  hint="CEO, CTO, Director, Manager, Team Lead, Developer, Intern — one row per rung, numbered from the top."
                  className="m-4 border-0"
                />
              )}
            </div>
          </section>
        </TabsContent>
      </Tabs>

      {departmentDraft && (
        <DepartmentDialog
          draft={departmentDraft}
          departments={departmentRows}
          onClose={() => setDepartmentDraft(null)}
        />
      )}
      {designationDraft && (
        <DesignationDialog
          draft={designationDraft}
          onClose={() => setDesignationDraft(null)}
        />
      )}
    </div>
  );
}

function DepartmentDialog({
  draft,
  departments,
  onClose,
}: {
  draft: Partial<Department>;
  departments: Department[];
  onClose: () => void;
}) {
  const meta = useEmployeeMeta();
  const save = useSaveDepartment();
  const retire = useRetireDepartment();
  const [form, setForm] = useState({
    code: draft.code ?? '',
    name: draft.name ?? '',
    description: draft.description ?? '',
    parent: draft.parent ? String(draft.parent) : '',
    head: draft.head ? String(draft.head) : '',
  });

  function submit() {
    if (!form.code.trim() || !form.name.trim()) {
      toast.error('A code and a name are required.');
      return;
    }
    save.mutate(
      {
        id: draft.id,
        payload: {
          code: form.code.trim(),
          name: form.name.trim(),
          description: form.description.trim(),
          parent: form.parent ? Number(form.parent) : null,
          head: form.head ? Number(form.head) : null,
        },
      },
      {
        onSuccess: () => {
          toast.success(draft.id ? 'Department updated.' : 'Department added.');
          onClose();
        },
        onError: (error) => toast.error(getErrorMessage(error, 'Nothing was saved.')),
      },
    );
  }

  async function runRetire() {
    if (!draft.id) return;
    const confirmed = await confirmDialog({
      title: `Retire ${draft.name}?`,
      description:
        'It stops appearing in the pickers but stays on every history record that names it. Employees have to be moved out first.',
      confirmLabel: 'Retire',
      destructive: true,
    });
    if (!confirmed) return;
    retire.mutate(draft.id, {
      onSuccess: () => {
        toast.success('Department retired.');
        onClose();
      },
      onError: (error) => toast.error(getErrorMessage(error, 'It was not retired.')),
    });
  }

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{draft.id ? `Edit ${draft.name}` : 'Add a department'}</DialogTitle>
        </DialogHeader>
        <DialogBody className="space-y-3">
          <div className="grid gap-3 sm:grid-cols-[1fr_2fr]">
            <div>
              <Label htmlFor="department-code">Code</Label>
              <Input
                id="department-code"
                value={form.code}
                onChange={(event) => setForm({ ...form, code: event.target.value })}
                placeholder="ENG"
                className="mt-1 font-mono"
              />
            </div>
            <div>
              <Label htmlFor="department-name">Name</Label>
              <Input
                id="department-name"
                value={form.name}
                onChange={(event) => setForm({ ...form, name: event.target.value })}
                placeholder="Engineering"
                className="mt-1"
              />
            </div>
          </div>
          <div>
            <Label htmlFor="department-parent">Sits inside</Label>
            <NativeSelect
              id="department-parent"
              className="mt-1"
              value={form.parent}
              onChange={(event) => setForm({ ...form, parent: event.target.value })}
            >
              <SelectOption value="">Nothing — a top-level department</SelectOption>
              {departments
                .filter((department) => department.id !== draft.id)
                .map((department) => (
                  <SelectOption key={department.id} value={String(department.id)}>
                    {department.name}
                  </SelectOption>
                ))}
            </NativeSelect>
          </div>
          <div>
            <Label htmlFor="department-head">Head</Label>
            <NativeSelect
              id="department-head"
              className="mt-1"
              value={form.head}
              onChange={(event) => setForm({ ...form, head: event.target.value })}
            >
              <SelectOption value="">Nobody named yet</SelectOption>
              {(meta.data?.managers ?? []).map((manager) => (
                <SelectOption key={manager.id} value={String(manager.id)}>
                  {manager.full_name} · {manager.job_title || manager.designation_name || '—'}
                </SelectOption>
              ))}
            </NativeSelect>
          </div>
          <div>
            <Label htmlFor="department-description">Description</Label>
            <Textarea
              id="department-description"
              rows={2}
              value={form.description}
              onChange={(event) => setForm({ ...form, description: event.target.value })}
              className="mt-1"
            />
          </div>
        </DialogBody>
        <DialogFooter className="sm:justify-between">
          {draft.id ? (
            <Button
              variant="outline"
              onClick={() => void runRetire()}
              disabled={retire.isPending}
              className="text-destructive"
            >
              Retire
            </Button>
          ) : (
            <span />
          )}
          <div className="flex gap-2">
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button onClick={submit} disabled={save.isPending} className="gap-1.5">
              {save.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
              Save
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function DesignationDialog({
  draft,
  onClose,
}: {
  draft: Partial<Designation>;
  onClose: () => void;
}) {
  const save = useSaveDesignation();
  const retire = useRetireDesignation();
  const [form, setForm] = useState({
    code: draft.code ?? '',
    name: draft.name ?? '',
    description: draft.description ?? '',
    level: draft.level ? String(draft.level) : '5',
    is_managerial: draft.is_managerial ?? false,
  });

  function submit() {
    if (!form.code.trim() || !form.name.trim()) {
      toast.error('A code and a name are required.');
      return;
    }
    save.mutate(
      {
        id: draft.id,
        payload: {
          code: form.code.trim(),
          name: form.name.trim(),
          description: form.description.trim(),
          level: Number(form.level) || 5,
          is_managerial: form.is_managerial,
        },
      },
      {
        onSuccess: () => {
          toast.success(draft.id ? 'Designation updated.' : 'Designation added.');
          onClose();
        },
        onError: (error) => toast.error(getErrorMessage(error, 'Nothing was saved.')),
      },
    );
  }

  async function runRetire() {
    if (!draft.id) return;
    const confirmed = await confirmDialog({
      title: `Retire ${draft.name}?`,
      description:
        'It stops being offered for new employees but stays on the records of everybody who has held it.',
      confirmLabel: 'Retire',
      destructive: true,
    });
    if (!confirmed) return;
    retire.mutate(draft.id, {
      onSuccess: () => {
        toast.success('Designation retired.');
        onClose();
      },
      onError: (error) => toast.error(getErrorMessage(error, 'It was not retired.')),
    });
  }

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{draft.id ? `Edit ${draft.name}` : 'Add a designation'}</DialogTitle>
        </DialogHeader>
        <DialogBody className="space-y-3">
          <div className="grid gap-3 sm:grid-cols-[1fr_2fr_1fr]">
            <div>
              <Label htmlFor="designation-code">Code</Label>
              <Input
                id="designation-code"
                value={form.code}
                onChange={(event) => setForm({ ...form, code: event.target.value })}
                placeholder="SR_DEV"
                className="mt-1 font-mono"
              />
            </div>
            <div>
              <Label htmlFor="designation-name">Name</Label>
              <Input
                id="designation-name"
                value={form.name}
                onChange={(event) => setForm({ ...form, name: event.target.value })}
                placeholder="Senior Developer"
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="designation-level">Level</Label>
              <Input
                id="designation-level"
                type="number"
                min={1}
                max={20}
                value={form.level}
                onChange={(event) => setForm({ ...form, level: event.target.value })}
                className="mt-1"
              />
            </div>
          </div>
          <p className="text-[11px] text-muted-foreground">
            Level 1 is the top of the ladder (CEO); higher numbers are further down. It is the
            grade, not the reporting chain — a Senior Developer reporting to a Team Lead sits
            at chain level 3 whatever the ladder says.
          </p>
          <div className="flex items-center justify-between gap-3 rounded-md border px-3 py-2">
            <Label htmlFor="designation-managerial" className="text-sm font-normal">
              This rung is expected to manage people
            </Label>
            <Switch
              id="designation-managerial"
              checked={form.is_managerial}
              onChange={(checked) => setForm({ ...form, is_managerial: checked })}
            />
          </div>
          <div>
            <Label htmlFor="designation-description">Description</Label>
            <Textarea
              id="designation-description"
              rows={2}
              value={form.description}
              onChange={(event) => setForm({ ...form, description: event.target.value })}
              className="mt-1"
            />
          </div>
        </DialogBody>
        <DialogFooter className="sm:justify-between">
          {draft.id ? (
            <Button
              variant="outline"
              onClick={() => void runRetire()}
              disabled={retire.isPending}
              className="text-destructive"
            >
              Retire
            </Button>
          ) : (
            <span />
          )}
          <div className="flex gap-2">
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button onClick={submit} disabled={save.isPending} className="gap-1.5">
              {save.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
              Save
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
