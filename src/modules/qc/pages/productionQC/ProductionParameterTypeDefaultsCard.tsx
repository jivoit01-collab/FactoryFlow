import { Plus, Trash2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';

import { confirmDialog } from '@/shared/components';
import { Button, Card, CardContent, CardDescription, CardHeader } from '@/shared/components/ui';

import {
  useDeleteProductionParameterTypeDefault,
  useProductionParameterTypeDefaults,
} from '../../api/productionQC/productionQC.queries';
import type {
  ProductionParameterType,
  ProductionParameterTypeDefault,
} from '../../types/productionQC.types';
import { setsSpec } from '../../utils/productionQCDefaults';

/**
 * A report's defaults — one per SKU, say. Each sets the standards an entry made
 * with it is judged on, and values it pre-fills. Each opens on its own page.
 */
export function ProductionParameterTypeDefaultsCard({ type }: { type: ProductionParameterType }) {
  const navigate = useNavigate();
  const { data: defaults = [], isLoading } = useProductionParameterTypeDefaults(type.id);
  const deleteDefault = useDeleteProductionParameterTypeDefault();
  const base = `/qc/qa-reports/types/${type.id}/defaults`;

  const handleDelete = async (item: ProductionParameterTypeDefault) => {
    const confirmed = await confirmDialog({
      title: `Remove ${item.name}?`,
      description:
        'New entries can no longer pick it. Entries already made with it keep its name and the standards they were judged on.',
      confirmLabel: 'Remove',
      destructive: true,
    });
    if (!confirmed) return;
    try {
      await deleteDefault.mutateAsync(item.id);
      toast.success(`${item.name} removed`);
    } catch {
      // The api client already toasts the reason.
    }
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-4 space-y-0">
        <CardDescription>
          Standards differ by SKU: a default sets them, and pre-fills values, for an entry made with
          it. An entry can also be made with none, on the report&apos;s own standards.
        </CardDescription>
        <Button size="sm" onClick={() => navigate(`${base}/new`)}>
          <Plus className="mr-2 h-4 w-4" />
          Add Default
        </Button>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex justify-center py-8">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          </div>
        ) : defaults.length === 0 ? (
          <div className="py-8 text-center text-sm text-muted-foreground">
            No defaults yet — entries use the report&apos;s own standards.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[480px] text-sm">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="p-3 text-left font-medium">Default</th>
                  <th className="p-3 text-center font-medium">Standards set</th>
                  <th className="p-3 text-center font-medium">Pre-filled values</th>
                  <th className="p-3 text-center font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {defaults.map((item) => (
                  <tr
                    key={item.id}
                    className="cursor-pointer border-b hover:bg-muted/50"
                    onClick={() => navigate(`${base}/${item.id}`)}
                  >
                    <td className="p-3 font-medium">{item.name}</td>
                    <td className="p-3 text-center">{item.values.filter(setsSpec).length}</td>
                    <td className="p-3 text-center">
                      {item.values.filter((value) => value.value.trim()).length}
                    </td>
                    <td className="p-3 text-center">
                      <Button
                        size="sm"
                        variant="outline"
                        aria-label={`Remove ${item.name}`}
                        disabled={deleteDefault.isPending}
                        onClick={(event) => {
                          event.stopPropagation();
                          handleDelete(item);
                        }}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
