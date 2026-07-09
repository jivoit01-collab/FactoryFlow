import { ArrowRight, ClipboardList } from 'lucide-react';
import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { usePermission } from '@/core/auth';
import { SearchableSelect } from '@/shared/components';
import { Badge, Button, Card, CardContent } from '@/shared/components/ui';
import { cn } from '@/shared/utils';

import { GATE_ENTRY_TYPES, type GateEntryTypeConfig } from '../constants/gateEntryTypes';

const directionLabels: Record<GateEntryTypeConfig['direction'], string> = {
  in: 'Gate In',
  out: 'Gate Out',
  return: 'Gate In',
};

export default function GateNewEntryPage() {
  const navigate = useNavigate();
  const { hasAnyPermission } = usePermission();
  const [selectedEntryTypeId, setSelectedEntryTypeId] = useState<string>();

  const creatableEntryTypes = useMemo(
    () =>
      GATE_ENTRY_TYPES.filter(
        (entryType) =>
          !entryType.hideFromNewEntry && hasAnyPermission(entryType.createPermissions),
      ),
    [hasAnyPermission],
  );

  const selectedEntryType = creatableEntryTypes.find(
    (entryType) => entryType.id === selectedEntryTypeId,
  );

  const handleContinue = () => {
    if (!selectedEntryType) return;
    navigate(selectedEntryType.newEntryRoute);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">New Gate Entry</h2>
          <p className="text-muted-foreground">Choose the movement type before filling details</p>
        </div>
        <Button variant="outline" onClick={() => navigate('/gate')}>
          Back to Dashboard
        </Button>
      </div>

      <Card>
        <CardContent className="space-y-6 p-6">
          <div className="space-y-3">
            <SearchableSelect<GateEntryTypeConfig>
              inputId="gate-entry-type"
              label="Entry Type"
              required
              value={selectedEntryType?.title}
              items={creatableEntryTypes}
              isLoading={false}
              placeholder="Search and select entry type"
              loadingText="Loading entry types..."
              emptyText="No entry types available"
              notFoundText="No entry type found"
              getItemKey={(entryType) => entryType.id}
              getItemLabel={(entryType) => entryType.title}
              filterFn={(entryType, search) => {
                const query = search.toLowerCase();
                return [
                  entryType.title,
                  entryType.description,
                  directionLabels[entryType.direction],
                  ...entryType.keywords,
                ]
                  .join(' ')
                  .toLowerCase()
                  .includes(query);
              }}
              renderItem={(entryType) => {
                const Icon = entryType.icon;
                return (
                  <div className="flex min-w-0 items-start gap-3">
                    <Icon className={cn('mt-0.5 h-4 w-4 shrink-0', entryType.colorClassName)} />
                    <div className="min-w-0">
                      <div className="truncate text-sm font-medium">{entryType.title}</div>
                      <div className="truncate text-xs text-muted-foreground">
                        {entryType.description}
                      </div>
                    </div>
                  </div>
                );
              }}
              onItemSelect={(entryType) => setSelectedEntryTypeId(entryType.id)}
              onClear={() => setSelectedEntryTypeId(undefined)}
            />

            {selectedEntryType && <SelectedEntryTypeSummary entryType={selectedEntryType} />}
          </div>
        </CardContent>
      </Card>

      <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
        <Button variant="outline" onClick={() => navigate('/gate')}>
          Cancel
        </Button>
        <Button onClick={handleContinue} disabled={!selectedEntryType}>
          <ClipboardList className="h-4 w-4" />
          Continue
          <ArrowRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

function SelectedEntryTypeSummary({ entryType }: { entryType: GateEntryTypeConfig }) {
  const Icon = entryType.icon;

  return (
    <div className="rounded-md border bg-muted/30 p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex min-w-0 items-start gap-3">
          <Icon className={cn('mt-1 h-5 w-5 shrink-0', entryType.colorClassName)} />
          <div className="min-w-0">
            <div className="font-semibold">{entryType.title}</div>
            <p className="text-sm leading-5 text-muted-foreground">{entryType.description}</p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Badge variant="outline">{directionLabels[entryType.direction]}</Badge>
        </div>
      </div>
    </div>
  );
}
