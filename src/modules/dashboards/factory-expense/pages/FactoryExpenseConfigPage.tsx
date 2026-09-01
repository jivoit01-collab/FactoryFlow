import { ArrowLeft, Bolt, Coins, MonitorPlay } from 'lucide-react';
import { Link } from 'react-router-dom';

import { Button, Tabs, TabsContent, TabsList, TabsTrigger } from '@/shared/components/ui';

import { BoardSettingsTab, MaintenanceTab, RatesTab } from '../components/config';

/**
 * Everything the wall board needs that no register can tell it.
 *
 * The gate counts labourers but not what they cost, and the electricity
 * register knows units but not which meters are ours. What a thing costs is
 * answered by the factory Cost Master, so the Rates tab reads it back rather
 * than offering a second place to set it; what remains here is genuinely the
 * board's own — what counts as maintenance, the monthly targets, and how the
 * wall behaves.
 *
 * Each tab saves on its own — there is no page-wide Save — because an admin
 * changing a budget should not have to re-confirm the panel layout to make it
 * stick.
 */
export default function FactoryExpenseConfigPage() {
  return (
    <div className="flex flex-col gap-6 p-4 sm:p-6">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <h1 className="text-2xl font-bold tracking-tight">Factory Expense — Configuration</h1>
          <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
            Where the wall&rsquo;s numbers come from, what counts as maintenance, and the targets it
            measures against. Rates live in the factory Cost Master; nothing here comes from SAP.
          </p>
        </div>
        <Button asChild variant="outline" className="gap-2">
          <Link to="/dashboards/factory-expense">
            <ArrowLeft className="h-4 w-4" />
            Back to the board
          </Link>
        </Button>
      </header>

      <Tabs defaultValue="rates">
        <TabsList>
          <TabsTrigger value="rates" className="gap-2">
            <Coins className="h-4 w-4" />
            Rates
          </TabsTrigger>
          <TabsTrigger value="maintenance" className="gap-2">
            <Bolt className="h-4 w-4" />
            Maintenance &amp; power
          </TabsTrigger>
          <TabsTrigger value="board" className="gap-2">
            <MonitorPlay className="h-4 w-4" />
            The wall
          </TabsTrigger>
        </TabsList>

        <TabsContent value="rates" className="mt-6">
          <RatesTab />
        </TabsContent>
        <TabsContent value="maintenance" className="mt-6">
          <MaintenanceTab />
        </TabsContent>
        <TabsContent value="board" className="mt-6">
          <BoardSettingsTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}
