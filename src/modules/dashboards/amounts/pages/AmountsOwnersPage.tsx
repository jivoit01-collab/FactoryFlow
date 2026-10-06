import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';

import { DashboardHeader } from '@/shared/components';
import { SearchableSelect } from '@/shared/components/SearchableSelect';
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/components/ui';
import { getErrorMessage } from '@/shared/utils';

import { useAmountsOwners, useSetAmountsOwner } from '../api';
import { STOCK_CATEGORIES, STOCK_CATEGORY_LABELS } from '../constants';
import type { AmountsOwnersPlant, AmountsPerson, StockCategoryKey } from '../types';

/**
 * Whom each plant's RM, PM and FG tile names.
 *
 * One person per plant per category, chosen here on purpose rather than read
 * off Admin -> Warehouse Managers: a godown there has several managers, some of
 * them service logins, and none of them is marked as the one who answers for
 * the stock. A pick saves at once; clearing the box removes the owner.
 */
export default function AmountsOwnersPage() {
  const { data, isLoading, error } = useAmountsOwners();

  return (
    <div className="space-y-6 p-6">
      <DashboardHeader
        title="Amounts board · stock owners"
        description="The person named on each plant's RM, PM and FG tile. Only active staff of that plant's company can be picked."
      />

      {isLoading && (
        <p className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> Loading owners…
        </p>
      )}
      {error && (
        <p className="text-sm text-destructive">
          {getErrorMessage(error, 'The owners could not be loaded.')}
        </p>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        {data?.plants.map((plant) => (
          <PlantOwners key={plant.company_code} plant={plant} />
        ))}
      </div>
    </div>
  );
}

function PlantOwners({ plant }: { plant: AmountsOwnersPlant }) {
  const setOwner = useSetAmountsOwner();

  const save = (category: StockCategoryKey, person: AmountsPerson | null) => {
    setOwner.mutate(
      { company: plant.company_code, category, user: person?.id ?? null },
      {
        onSuccess: () =>
          toast.success(
            person
              ? `${person.name} now owns ${plant.label} ${category}.`
              : `${plant.label} ${category} has no owner now.`,
          ),
        onError: (err) => toast.error(getErrorMessage(err, 'The owner could not be saved.')),
      },
    );
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>{plant.label}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {STOCK_CATEGORIES.map((category) => {
          const owner = plant.owners[category];
          const inputId = `owner-${plant.company_code}-${category}`;
          return (
            <SearchableSelect<AmountsPerson>
              key={category}
              inputId={inputId}
              label={`${category} · ${STOCK_CATEGORY_LABELS[category]}`}
              items={plant.candidates}
              isLoading={false}
              disabled={setOwner.isPending}
              value={owner ? String(owner.id) : ''}
              defaultDisplayText={owner?.name ?? ''}
              placeholder="Search staff…"
              getItemKey={(person) => String(person.id)}
              getItemLabel={(person) => person.name || person.email}
              filterFn={(person, term) => {
                const needle = term.trim().toLowerCase();
                if (!needle) return true;
                return (
                  person.name.toLowerCase().includes(needle) ||
                  person.email.toLowerCase().includes(needle)
                );
              }}
              renderItem={(person) => (
                <div className="w-full">
                  <div className="truncate text-sm font-medium">{person.name || person.email}</div>
                  <div className="truncate text-xs text-muted-foreground">{person.email}</div>
                </div>
              )}
              loadingText="Loading staff…"
              emptyText="Nobody is staff of this plant's company"
              notFoundText="No one matches that"
              onItemSelect={(person) => save(category, person)}
              onClear={() => {
                if (owner) save(category, null);
              }}
            />
          );
        })}
      </CardContent>
    </Card>
  );
}
