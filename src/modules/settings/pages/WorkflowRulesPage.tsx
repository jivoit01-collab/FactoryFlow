import { Plus, Search, ShieldCheck } from 'lucide-react';
import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { DashboardHeader } from '@/shared/components/dashboard/DashboardHeader';
import {
  Button,
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Input,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Switch,
} from '@/shared/components/ui';

import { useActionPoints, useDeleteRule, useWorkflowRules } from '../api';
import { RuleCard } from '../components';
import type { WorkflowRule } from '../types';

export default function WorkflowRulesPage() {
  const navigate = useNavigate();
  const [actionKeyFilter, setActionKeyFilter] = useState<string>('');
  const [showActiveOnly, setShowActiveOnly] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [deleteTarget, setDeleteTarget] = useState<WorkflowRule | null>(null);

  const { data: actionPointsData } = useActionPoints();
  const { data: rules, isLoading } = useWorkflowRules(actionKeyFilter || undefined);
  const deleteMutation = useDeleteRule();

  // Flatten action points for the filter dropdown
  const allActionPoints = useMemo(() => {
    if (!actionPointsData?.categories) return [];
    return Object.values(actionPointsData.categories).flat();
  }, [actionPointsData]);

  // Filter rules
  const filteredRules = useMemo(() => {
    if (!rules) return [];
    let result = rules;
    if (showActiveOnly) {
      result = result.filter((r) => r.is_active);
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (r) =>
          r.name.toLowerCase().includes(q) ||
          r.description.toLowerCase().includes(q) ||
          r.action_key.toLowerCase().includes(q) ||
          r.condition_type.toLowerCase().includes(q),
      );
    }
    return result;
  }, [rules, showActiveOnly, searchQuery]);

  const handleEdit = (rule: WorkflowRule) => {
    navigate(`/settings/rules/${rule.id}/edit`);
  };

  const handleDeleteConfirm = () => {
    if (!deleteTarget) return;
    deleteMutation.mutate(deleteTarget.id, {
      onSuccess: () => setDeleteTarget(null),
    });
  };

  return (
    <div className="space-y-6">
      <DashboardHeader
        title="Workflow Rules"
        description="Configure rules that gate actions across the factory management system"
        primaryAction={{
          label: 'Add Rule',
          icon: <Plus className="mr-2 h-4 w-4" />,
          onClick: () => navigate('/settings/rules/new'),
        }}
      />

      {/* Filters */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search rules..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={actionKeyFilter} onValueChange={setActionKeyFilter}>
          <SelectTrigger className="w-full sm:w-[220px]">
            <SelectValue placeholder="All action points" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="">All action points</SelectItem>
            {allActionPoints.map((ap) => (
              <SelectItem key={ap.key} value={ap.key}>
                {ap.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <label className="flex items-center gap-2 text-sm whitespace-nowrap">
          <Switch checked={showActiveOnly} onCheckedChange={setShowActiveOnly} />
          Active only
        </label>
      </div>

      {/* Rules List */}
      {isLoading ? (
        <div className="grid gap-4 md:grid-cols-2">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-48 animate-pulse rounded-lg bg-muted" />
          ))}
        </div>
      ) : filteredRules.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-16">
          <ShieldCheck className="mb-4 h-12 w-12 text-muted-foreground/40" />
          <h3 className="text-lg font-medium">No rules found</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            {rules?.length === 0
              ? 'Get started by creating your first workflow rule'
              : 'Try adjusting your filters'}
          </p>
          {rules?.length === 0 && (
            <Button className="mt-4" onClick={() => navigate('/settings/rules/new')}>
              <Plus className="mr-2 h-4 w-4" />
              Create Rule
            </Button>
          )}
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {filteredRules.map((rule) => (
            <RuleCard
              key={rule.id}
              rule={rule}
              onEdit={handleEdit}
              onDelete={setDeleteTarget}
            />
          ))}
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteTarget !== null} onOpenChange={() => setDeleteTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Rule</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Are you sure you want to delete <strong>{deleteTarget?.name}</strong>? This action
            cannot be undone.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteTarget(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteConfirm}
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending ? 'Deleting...' : 'Delete'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
