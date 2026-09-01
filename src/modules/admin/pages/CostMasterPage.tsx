import { Coins, Info, Pencil, Plus, Save, Trash2 } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';

import { usePermission } from '@/core/auth';
import { DashboardHeader } from '@/shared/components/dashboard/DashboardHeader';
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Checkbox,
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Input,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Textarea,
} from '@/shared/components/ui';
import { getErrorMessage } from '@/shared/utils';

import type {
  CostBasis,
  CostRate,
  CostScope,
  CostType,
  OrgDepartment,
} from '../api/costMaster.api';
import {
  useCostMasterRates,
  useCostTypes,
  useCreateCostType,
  useDeleteCostMasterRate,
  useDeleteCostType,
  useOrgDepartments,
  useUpdateCostType,
  useUpsertCostMasterRate,
} from '../api/costMaster.queries';

const BASIS_LABEL: Record<CostBasis, string> = {
  PER_DAY: 'Per Day (fixed)',
  PER_PERSON_DAY: 'Per Person / Day',
  PER_HOUR: 'Per Hour',
  PER_MONTH: 'Per Month',
  PER_UNIT: 'Per Electricity Unit',
  PER_CASE: 'Per Case',
  PER_BOTTLE: 'Per Bottle',
  PER_KG: 'Per Kg',
  PER_LITRE: 'Per Litre',
  FLAT: 'Flat Amount',
};

const SCOPE_HINT: Record<CostScope, string> = {
  FACTORY: 'One rate for the whole factory, every company.',
  COMPANY: "Overrides the factory-wide rate for one company's costing.",
  DEPARTMENT: 'Overrides for one department — company-specific if a company is chosen.',
  VALUE: 'Rare: a rate particular to one value, e.g. machine:BM-01.',
};

// "All companies" sentinel for the optional company context on the
// department / value scopes (radix Select can't hold an empty value).
const ALL_COMPANIES = 'all';

// Stable empty references so react-query's `undefined` loading state doesn't
// produce a fresh array each render (which would loop the re-seed effect).
const EMPTY_RATES: CostRate[] = [];
const EMPTY_TYPES: CostType[] = [];
const EMPTY_DEPARTMENTS: OrgDepartment[] = [];

interface Draft {
  basis: CostBasis;
  rate: string;
}

interface TypeForm {
  code: string;
  name: string;
  description: string;
  default_basis: CostBasis;
  is_credit: boolean;
}

const EMPTY_TYPE_FORM: TypeForm = {
  code: '',
  name: '',
  description: '',
  default_basis: 'PER_DAY',
  is_credit: false,
};

function CostMasterPage() {
  const { companies } = usePermission();
  const activeCompanies = useMemo(() => companies.filter((c) => c.is_active), [companies]);

  const [scope, setScope] = useState<CostScope>('FACTORY');
  const [companyValue, setCompanyValue] = useState<string>(ALL_COMPANIES);
  const [departmentValue, setDepartmentValue] = useState<string>('');
  const [valueKey, setValueKey] = useState<string>('');
  // Rates are effective-dated: saving does not overwrite the old rate, it adds
  // a row from this date, so past periods keep costing at their own rate.
  const [effectiveFrom, setEffectiveFrom] = useState<string>(
    () => new Date().toISOString().slice(0, 10),
  );

  const companyId =
    scope !== 'FACTORY' && companyValue !== ALL_COMPANIES ? Number(companyValue) : undefined;
  const departmentId = scope === 'DEPARTMENT' && departmentValue ? Number(departmentValue) : undefined;
  const trimmedValueKey = valueKey.trim();

  // The selected scope needs its target picked before rates can load.
  const scopeReady =
    scope === 'FACTORY' ||
    (scope === 'COMPANY' && companyId !== undefined) ||
    (scope === 'DEPARTMENT' && departmentId !== undefined) ||
    (scope === 'VALUE' && trimmedValueKey !== '');

  // Stable fallbacks (never a fresh `= []` literal): costTypes feeds the
  // draft-seeding effect's deps, and a new array every render would loop it.
  const { data: costTypesData, isLoading: typesLoading } = useCostTypes();
  const costTypes = costTypesData ?? EMPTY_TYPES;
  const { data: departmentsData } = useOrgDepartments({ enabled: scope === 'DEPARTMENT' });
  const departments = departmentsData ?? EMPTY_DEPARTMENTS;

  const rateParams = {
    scope,
    company_id: companyId,
    department_id: departmentId,
    value_key: scope === 'VALUE' ? trimmedValueKey : undefined,
  };
  const ratesQuery = useCostMasterRates(scopeReady ? rateParams : { scope: 'FACTORY' });
  const ratesData = scopeReady ? ratesQuery.data : EMPTY_RATES;

  // Fallback chain for the inherit hint: company rate, then factory rate.
  const { data: factoryRatesData } = useCostMasterRates({ scope: 'FACTORY' });
  const { data: companyRatesData } = useCostMasterRates(
    companyId !== undefined && scope !== 'COMPANY'
      ? { scope: 'COMPANY', company_id: companyId }
      : { scope: 'FACTORY' },
  );

  const rates = ratesData ?? EMPTY_RATES;
  const factoryRates = factoryRatesData ?? EMPTY_RATES;
  const companyRates =
    companyId !== undefined && scope !== 'COMPANY' ? (companyRatesData ?? EMPTY_RATES) : EMPTY_RATES;

  const ratesByType = new Map<number, CostRate>(rates.map((r) => [r.cost_type, r]));
  const inheritedByType = new Map<number, CostRate>([
    ...factoryRates.map((r) => [r.cost_type, r] as const),
    ...companyRates.map((r) => [r.cost_type, r] as const),
  ]);

  const upsert = useUpsertCostMasterRate();
  const removeRate = useDeleteCostMasterRate();

  // Local editable drafts, re-seeded whenever the scope target or fetched rates change.
  const [drafts, setDrafts] = useState<Record<number, Draft>>({});
  const scopeKey = `${scope}|${companyId ?? ''}|${departmentId ?? ''}|${trimmedValueKey}`;
  useEffect(() => {
    const next: Record<number, Draft> = {};
    for (const costType of costTypes) {
      const existing = (ratesData ?? EMPTY_RATES).find((r) => r.cost_type === costType.id);
      next[costType.id] = {
        basis: existing?.basis ?? costType.default_basis,
        rate: existing?.rate ?? '',
      };
    }
    // eslint-disable-next-line react-hooks/set-state-in-effect -- Re-seed editable drafts when the scope target or fetched rates change.
    setDrafts(next);
  }, [scopeKey, ratesData, costTypes]);

  const setDraft = (costTypeId: number, patch: Partial<Draft>) =>
    setDrafts((prev) => ({ ...prev, [costTypeId]: { ...prev[costTypeId], ...patch } }));

  const handleSaveRate = async (costType: CostType) => {
    const draft = drafts[costType.id];
    if (!draft || !scopeReady) return;
    const existing = ratesByType.get(costType.id);

    // Empty rate clears the entry at this scope (falls back to the wider scope).
    if (draft.rate.trim() === '') {
      if (existing) {
        try {
          await removeRate.mutateAsync(existing.id);
          toast.success('Rate cleared');
        } catch (err) {
          toast.error(getErrorMessage(err, 'Failed to clear rate'));
        }
      }
      return;
    }

    const value = Number(draft.rate);
    if (!Number.isFinite(value) || value < 0) {
      toast.error('Enter a valid non-negative rate');
      return;
    }

    try {
      await upsert.mutateAsync({
        cost_type_id: costType.id,
        scope,
        company_id: companyId ?? null,
        department_id: departmentId ?? null,
        value_key: scope === 'VALUE' ? trimmedValueKey : '',
        basis: draft.basis,
        rate: draft.rate,
        effective_from: effectiveFrom,
      });
      toast.success(`Rate saved, effective ${effectiveFrom}`);
    } catch (err) {
      toast.error(getErrorMessage(err, 'Failed to save rate'));
    }
  };

  // ---------------------------------------------------------------------
  // Cost type dialog (create / edit)
  // ---------------------------------------------------------------------
  const [typeDialogOpen, setTypeDialogOpen] = useState(false);
  const [editingType, setEditingType] = useState<CostType | null>(null);
  const [typeForm, setTypeForm] = useState<TypeForm>(EMPTY_TYPE_FORM);

  const createType = useCreateCostType();
  const updateType = useUpdateCostType();
  const deleteType = useDeleteCostType();
  const typeSaving = createType.isPending || updateType.isPending || deleteType.isPending;

  const openCreateType = () => {
    setEditingType(null);
    setTypeForm(EMPTY_TYPE_FORM);
    setTypeDialogOpen(true);
  };

  const openEditType = (costType: CostType) => {
    setEditingType(costType);
    setTypeForm({
      code: costType.code,
      name: costType.name,
      description: costType.description,
      default_basis: costType.default_basis,
      is_credit: costType.is_credit,
    });
    setTypeDialogOpen(true);
  };

  const handleSaveType = async () => {
    if (!typeForm.name.trim() || (!editingType && !typeForm.code.trim())) {
      toast.error('Code and name are required');
      return;
    }
    try {
      if (editingType) {
        await updateType.mutateAsync({
          id: editingType.id,
          data: {
            name: typeForm.name.trim(),
            description: typeForm.description,
            default_basis: typeForm.default_basis,
            is_credit: typeForm.is_credit,
          },
        });
        toast.success('Cost type updated');
      } else {
        await createType.mutateAsync({
          code: typeForm.code.trim(),
          name: typeForm.name.trim(),
          description: typeForm.description,
          default_basis: typeForm.default_basis,
          is_credit: typeForm.is_credit,
        });
        toast.success('Cost type created');
      }
      setTypeDialogOpen(false);
    } catch (err) {
      toast.error(getErrorMessage(err, 'Failed to save cost type'));
    }
  };

  const handleDeactivateType = async () => {
    if (!editingType) return;
    try {
      await deleteType.mutateAsync(editingType.id);
      toast.success('Cost type deactivated');
      setTypeDialogOpen(false);
    } catch (err) {
      toast.error(getErrorMessage(err, 'Failed to deactivate cost type'));
    }
  };

  const scopeName =
    scope === 'FACTORY'
      ? 'Factory-wide'
      : scope === 'COMPANY'
        ? (activeCompanies.find((c) => c.company_id === companyId)?.company_name ?? 'Company')
        : scope === 'DEPARTMENT'
          ? (departments.find((d) => d.id === departmentId)?.name ?? 'Department')
          : trimmedValueKey || 'Specific value';

  return (
    <div className="space-y-6">
      <DashboardHeader
        title="Cost Master"
        description="The single registry of every cost the factory incurs. Define the cost types once, then set factory-wide rates and narrow them per company, department, or a specific value."
        primaryAction={{
          label: 'New Cost Type',
          icon: <Plus className="mr-2 h-4 w-4" />,
          onClick: openCreateType,
        }}
      />

      {/* Scope selector */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-wrap items-end gap-4">
            <div className="space-y-1.5">
              <Label className="font-medium">Scope</Label>
              <Select value={scope} onValueChange={(v) => setScope(v as CostScope)}>
                <SelectTrigger className="w-[200px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="FACTORY">Factory-wide</SelectItem>
                  <SelectItem value="COMPANY">Company-wide</SelectItem>
                  <SelectItem value="DEPARTMENT">Department-wide</SelectItem>
                  <SelectItem value="VALUE">Specific value</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {scope !== 'FACTORY' && (
              <div className="space-y-1.5">
                <Label className="font-medium">Company</Label>
                <Select value={companyValue} onValueChange={setCompanyValue}>
                  <SelectTrigger className="w-[220px]">
                    <SelectValue placeholder="Select company" />
                  </SelectTrigger>
                  <SelectContent>
                    {scope !== 'COMPANY' && (
                      <SelectItem value={ALL_COMPANIES}>All companies</SelectItem>
                    )}
                    {activeCompanies.map((company) => (
                      <SelectItem key={company.company_id} value={String(company.company_id)}>
                        {company.company_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {scope === 'DEPARTMENT' && (
              <div className="space-y-1.5">
                <Label className="font-medium">Department</Label>
                <Select value={departmentValue} onValueChange={setDepartmentValue}>
                  <SelectTrigger className="w-[220px]">
                    <SelectValue placeholder="Select department" />
                  </SelectTrigger>
                  <SelectContent>
                    {departments.map((department) => (
                      <SelectItem key={department.id} value={String(department.id)}>
                        {department.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {scope === 'VALUE' && (
              <div className="space-y-1.5">
                <Label htmlFor="value-key" className="font-medium">
                  Value
                </Label>
                <Input
                  id="value-key"
                  className="w-[220px]"
                  placeholder="e.g. machine:BM-01"
                  value={valueKey}
                  onChange={(e) => setValueKey(e.target.value)}
                />
              </div>
            )}

            <p className="pb-2 text-xs text-muted-foreground">{SCOPE_HINT[scope]}</p>
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-3 border-t pt-4">
            <Label htmlFor="effective-from" className="min-w-fit font-medium">
              New rates effective from:
            </Label>
            <Input
              id="effective-from"
              type="date"
              className="w-[180px]"
              value={effectiveFrom}
              onChange={(e) => setEffectiveFrom(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              Costing dated before this keeps its existing rate — saving adds a new dated rate
              rather than replacing the old one.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Rates table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Coins className="h-4 w-4" />
            Rates — {scopeName}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {typesLoading ? (
            <div className="flex justify-center py-8">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
            </div>
          ) : costTypes.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              No cost types defined yet. Start with “New Cost Type”.
            </p>
          ) : !scopeReady ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              {scope === 'COMPANY'
                ? 'Pick a company to see and set its rates.'
                : scope === 'DEPARTMENT'
                  ? 'Pick a department to see and set its rates.'
                  : 'Enter a value key to see and set its rates.'}
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/50">
                    <th className="p-3 text-left font-medium">Cost Type</th>
                    <th className="w-[200px] p-3 text-left font-medium">Basis</th>
                    <th className="w-[160px] p-3 text-right font-medium">Rate (₹)</th>
                    <th className="w-[130px] p-3 text-left font-medium">In force since</th>
                    <th className="w-[150px] p-3 text-center font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {costTypes.map((costType) => {
                    const draft = drafts[costType.id] ?? {
                      basis: costType.default_basis,
                      rate: '',
                    };
                    const existing = ratesByType.get(costType.id);
                    const inherited =
                      scope !== 'FACTORY' ? inheritedByType.get(costType.id) : undefined;
                    return (
                      <tr key={costType.id} className="border-b align-top hover:bg-muted/30">
                        <td className="p-3">
                          <div className="flex items-center gap-2">
                            <span className="font-medium">{costType.name}</span>
                            <span className="text-xs text-muted-foreground">{costType.code}</span>
                            {costType.is_credit && (
                              <Badge variant="secondary" className="text-[10px]">
                                credit
                              </Badge>
                            )}
                          </div>
                          {costType.description && (
                            <p className="mt-0.5 flex items-start gap-1 text-xs text-muted-foreground">
                              <Info className="mt-0.5 h-3 w-3 shrink-0" />
                              {costType.description}
                            </p>
                          )}
                          {!existing && inherited && (
                            <p className="mt-1 text-xs text-blue-600">
                              Inherits {inherited.scope_display.toLowerCase()}: ₹{inherited.rate} ·{' '}
                              {BASIS_LABEL[inherited.basis]}
                            </p>
                          )}
                        </td>
                        <td className="p-3">
                          <Select
                            value={draft.basis}
                            onValueChange={(v) => setDraft(costType.id, { basis: v as CostBasis })}
                          >
                            <SelectTrigger className="w-full">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {(Object.keys(BASIS_LABEL) as CostBasis[]).map((basis) => (
                                <SelectItem key={basis} value={basis}>
                                  {BASIS_LABEL[basis]}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </td>
                        <td className="p-3">
                          <Input
                            type="number"
                            min={0}
                            step="0.0001"
                            className="text-right"
                            value={draft.rate}
                            placeholder={inherited ? inherited.rate : '—'}
                            onChange={(e) => setDraft(costType.id, { rate: e.target.value })}
                          />
                        </td>
                        <td className="p-3 text-xs text-muted-foreground">
                          {existing?.effective_from ?? '—'}
                        </td>
                        <td className="p-3 text-center">
                          <div className="flex justify-center gap-1">
                            <Button
                              size="sm"
                              variant="outline"
                              title="Save rate"
                              onClick={() => handleSaveRate(costType)}
                              disabled={upsert.isPending || removeRate.isPending}
                            >
                              <Save className="h-4 w-4" />
                            </Button>
                            {existing && (
                              <Button
                                size="sm"
                                variant="outline"
                                title="Clear rate at this scope"
                                onClick={() => removeRate.mutate(existing.id)}
                                disabled={removeRate.isPending}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            )}
                            <Button
                              size="sm"
                              variant="ghost"
                              title="Edit cost type"
                              onClick={() => openEditType(costType)}
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Cost type create / edit dialog */}
      <Dialog open={typeDialogOpen} onOpenChange={setTypeDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingType ? 'Edit Cost Type' : 'New Cost Type'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="type-code">Code</Label>
                <Input
                  id="type-code"
                  placeholder="labour-contract"
                  value={typeForm.code}
                  disabled={!!editingType}
                  onChange={(e) => setTypeForm((f) => ({ ...f, code: e.target.value }))}
                />
                {!editingType && (
                  <p className="text-xs text-muted-foreground">
                    Stable identifier consumers resolve rates by. Cannot change later.
                  </p>
                )}
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="type-name">Name</Label>
                <Input
                  id="type-name"
                  placeholder="Contract Labour"
                  value={typeForm.name}
                  onChange={(e) => setTypeForm((f) => ({ ...f, name: e.target.value }))}
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="type-description">Description</Label>
              <Textarea
                id="type-description"
                rows={2}
                placeholder="What this cost covers and how it is applied."
                value={typeForm.description}
                onChange={(e) => setTypeForm((f) => ({ ...f, description: e.target.value }))}
              />
            </div>
            <div className="grid grid-cols-2 items-end gap-4">
              <div className="space-y-1.5">
                <Label>Default basis</Label>
                <Select
                  value={typeForm.default_basis}
                  onValueChange={(v) => setTypeForm((f) => ({ ...f, default_basis: v as CostBasis }))}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {(Object.keys(BASIS_LABEL) as CostBasis[]).map((basis) => (
                      <SelectItem key={basis} value={basis}>
                        {BASIS_LABEL[basis]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <label className="flex items-center gap-2 pb-2 text-sm">
                <Checkbox
                  checked={typeForm.is_credit}
                  onCheckedChange={(checked) =>
                    setTypeForm((f) => ({ ...f, is_credit: checked === true }))
                  }
                />
                Credit (reduces cost, e.g. scrap recovery)
              </label>
            </div>
          </div>
          <DialogFooter className="gap-2">
            {editingType && (
              <Button
                variant="destructive"
                className="mr-auto"
                onClick={handleDeactivateType}
                disabled={typeSaving}
              >
                Deactivate
              </Button>
            )}
            <Button variant="outline" onClick={() => setTypeDialogOpen(false)} disabled={typeSaving}>
              Cancel
            </Button>
            <Button onClick={handleSaveType} disabled={typeSaving}>
              {editingType ? 'Save changes' : 'Create'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default CostMasterPage;
