import { useState } from 'react';
import { Edit, Plus, Trash2, Settings2, Copy } from 'lucide-react';
import { toast } from 'sonner';

import { DashboardHeader } from '@/shared/components/dashboard/DashboardHeader';
import {
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
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
} from '@/shared/components/ui';

import {
  useLines,
  useLineConfigs,
  useCreateLineConfig,
  useUpdateLineConfig,
  useDeleteLineConfig,
} from '../api';
import type { LineSkuConfig } from '../types';

const EMPTY_FORM = {
  config_name: '',
  sku_code: '',
  sku_name: '',
  rated_speed: '',
  labour_count: 0,
  other_manpower_count: 0,
  supervisor: '',
  operators: '',
};

function LineManagementPage() {
  const { data: lines = [] } = useLines(true);
  const [selectedLineId, setSelectedLineId] = useState<number | null>(null);
  const { data: configs = [], isLoading } = useLineConfigs(selectedLineId ?? undefined);

  const createConfig = useCreateLineConfig();
  const updateConfig = useUpdateLineConfig();
  const deleteConfig = useDeleteLineConfig();

  // Dialog state
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<LineSkuConfig | null>(null);
  const [form, setForm] = useState({ ...EMPTY_FORM });

  const openDialog = (config?: LineSkuConfig) => {
    if (config) {
      setEditing(config);
      setForm({
        config_name: config.config_name,
        sku_code: config.sku_code,
        sku_name: config.sku_name,
        rated_speed: config.rated_speed || '',
        labour_count: config.labour_count,
        other_manpower_count: config.other_manpower_count,
        supervisor: config.supervisor,
        operators: config.operators,
      });
    } else {
      setEditing(null);
      setForm({ ...EMPTY_FORM });
    }
    setDialogOpen(true);
  };

  // Duplicate an existing config
  const duplicateConfig = (config: LineSkuConfig) => {
    setEditing(null);
    setForm({
      config_name: `${config.config_name} (Copy)`,
      sku_code: config.sku_code,
      sku_name: config.sku_name,
      rated_speed: config.rated_speed || '',
      labour_count: config.labour_count,
      other_manpower_count: config.other_manpower_count,
      supervisor: config.supervisor,
      operators: config.operators,
    });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!form.config_name.trim()) {
      toast.error('Configuration name is required');
      return;
    }
    try {
      if (editing) {
        await updateConfig.mutateAsync({
          configId: editing.id,
          data: {
            config_name: form.config_name,
            sku_code: form.sku_code,
            sku_name: form.sku_name,
            rated_speed: form.rated_speed || null,
            labour_count: form.labour_count,
            other_manpower_count: form.other_manpower_count,
            supervisor: form.supervisor,
            operators: form.operators,
          },
        });
        toast.success('Configuration updated');
      } else {
        if (!selectedLineId) {
          toast.error('Select a line first');
          return;
        }
        await createConfig.mutateAsync({
          line_id: selectedLineId,
          config_name: form.config_name,
          sku_code: form.sku_code,
          sku_name: form.sku_name,
          rated_speed: form.rated_speed || null,
          labour_count: form.labour_count,
          other_manpower_count: form.other_manpower_count,
          supervisor: form.supervisor,
          operators: form.operators,
        });
        toast.success('Configuration created');
      }
      setDialogOpen(false);
    } catch {
      toast.error('Failed to save configuration');
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Delete this configuration?')) return;
    try {
      await deleteConfig.mutateAsync(id);
      toast.success('Configuration deleted');
    } catch {
      toast.error('Failed to delete');
    }
  };

  const selectedLineName = lines.find((l) => l.id === selectedLineId)?.name || '';

  return (
    <div className="space-y-6">
      <DashboardHeader
        title="Line Management"
        description="Create multiple configuration presets per line — users pick one when starting a run"
      />

      {/* Line Selector */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center gap-4 flex-wrap">
            <Label className="min-w-fit font-medium">Production Line:</Label>
            <Select
              value={selectedLineId ? String(selectedLineId) : ''}
              onValueChange={(v) => setSelectedLineId(Number(v))}
            >
              <SelectTrigger className="w-[280px]">
                <SelectValue placeholder="Select a production line" />
              </SelectTrigger>
              <SelectContent>
                {lines.map((line) => (
                  <SelectItem key={line.id} value={String(line.id)}>
                    {line.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {selectedLineId && (
              <Button onClick={() => openDialog()}>
                <Plus className="h-4 w-4 mr-2" /> Add Configuration
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Configs Table */}
      {selectedLineId ? (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings2 className="h-5 w-5" />
              Configurations for {selectedLineName} ({configs.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="py-8 flex justify-center">
                <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
              </div>
            ) : configs.length === 0 ? (
              <div className="py-12 text-center text-muted-foreground">
                <Settings2 className="h-10 w-10 mx-auto mb-3 opacity-30" />
                <p>No configurations yet for this line.</p>
                <p className="text-sm mt-1">
                  Add multiple presets (e.g., different SKUs, shifts, or speed settings).
                  Users can pick one when starting a production run.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b bg-muted/50">
                      <th className="text-left p-3 font-medium">Config Name</th>
                      <th className="text-left p-3 font-medium">SKU</th>
                      <th className="text-right p-3 font-medium">Speed (cases/hr)</th>
                      <th className="text-right p-3 font-medium">Labour</th>
                      <th className="text-right p-3 font-medium">Other Manpower</th>
                      <th className="text-left p-3 font-medium">Supervisor</th>
                      <th className="text-left p-3 font-medium">Operators</th>
                      <th className="text-center p-3 font-medium">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {configs.map((cfg) => (
                      <tr key={cfg.id} className="border-b hover:bg-muted/30">
                        <td className="p-3 font-medium">{cfg.config_name}</td>
                        <td className="p-3 text-muted-foreground text-xs">
                          {cfg.sku_code && <span className="font-mono">{cfg.sku_code}</span>}
                          {cfg.sku_code && cfg.sku_name && ' — '}
                          {cfg.sku_name}
                          {!cfg.sku_code && !cfg.sku_name && '-'}
                        </td>
                        <td className="p-3 text-right font-mono">{cfg.rated_speed || '-'}</td>
                        <td className="p-3 text-right">{cfg.labour_count}</td>
                        <td className="p-3 text-right">{cfg.other_manpower_count}</td>
                        <td className="p-3">{cfg.supervisor || '-'}</td>
                        <td className="p-3 max-w-[150px] truncate">{cfg.operators || '-'}</td>
                        <td className="p-3 text-center">
                          <div className="flex justify-center gap-1">
                            <Button
                              size="sm"
                              variant="outline"
                              title="Edit"
                              onClick={() => openDialog(cfg)}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              title="Duplicate"
                              onClick={() => duplicateConfig(cfg)}
                            >
                              <Copy className="h-4 w-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              title="Delete"
                              onClick={() => handleDelete(cfg.id)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            Select a production line above to view and manage its configurations.
          </CardContent>
        </Card>
      )}

      {/* Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {editing ? 'Edit Configuration' : 'Add Configuration'}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>
                Configuration Name <span className="text-destructive">*</span>
              </Label>
              <Input
                value={form.config_name}
                onChange={(e) => setForm({ ...form, config_name: e.target.value })}
                placeholder="e.g., Olive Oil 1L - Day Shift"
              />
              <p className="text-xs text-muted-foreground">
                This name appears in the dropdown when starting a run
              </p>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>SKU Code</Label>
                <Input
                  value={form.sku_code}
                  onChange={(e) => setForm({ ...form, sku_code: e.target.value })}
                  placeholder="e.g., FG0000001"
                />
              </div>
              <div className="space-y-2">
                <Label>SKU / Product Name</Label>
                <Input
                  value={form.sku_name}
                  onChange={(e) => setForm({ ...form, sku_name: e.target.value })}
                  placeholder="e.g., Olive Oil 1L"
                />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Rated Speed (cases/hr)</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={form.rated_speed}
                  onChange={(e) => setForm({ ...form, rated_speed: e.target.value })}
                  placeholder="e.g., 150"
                />
              </div>
              <div className="space-y-2">
                <Label>Labour Count</Label>
                <Input
                  type="number"
                  min={0}
                  value={form.labour_count}
                  onChange={(e) => setForm({ ...form, labour_count: parseInt(e.target.value) || 0 })}
                />
              </div>
              <div className="space-y-2">
                <Label>Other Manpower</Label>
                <Input
                  type="number"
                  min={0}
                  value={form.other_manpower_count}
                  onChange={(e) =>
                    setForm({ ...form, other_manpower_count: parseInt(e.target.value) || 0 })
                  }
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Supervisor</Label>
                <Input
                  value={form.supervisor}
                  onChange={(e) => setForm({ ...form, supervisor: e.target.value })}
                  placeholder="Supervisor name"
                />
              </div>
              <div className="space-y-2">
                <Label>Operators / Engineers</Label>
                <Input
                  value={form.operators}
                  onChange={(e) => setForm({ ...form, operators: e.target.value })}
                  placeholder="Operator names"
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleSave}
              disabled={createConfig.isPending || updateConfig.isPending}
            >
              {createConfig.isPending || updateConfig.isPending ? 'Saving...' : 'Save'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default LineManagementPage;
