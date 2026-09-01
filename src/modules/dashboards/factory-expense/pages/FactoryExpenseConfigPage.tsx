import { ArrowLeft, Bolt, HardHat, MonitorPlay, Users } from 'lucide-react';
import { Link } from 'react-router-dom';

import { Button, Tabs, TabsContent, TabsList, TabsTrigger } from '@/shared/components/ui';

import { useExpenseDepartments } from '../api';
import {
  BoardSettingsTab,
  LabourRateTab,
  MaintenanceTab,
  SalaryTab,
} from '../components/config';

/**
 * Everything the wall board needs that no register can tell it.
 *
 * The gate counts labourers but not what they cost; the electricity register
 * knows units but the board has to be told which meters are ours; nothing in
 * FactoryFlow knows the salary bill at all. Those three gaps, plus the targets
 * the numbers are judged against, are exactly what these four tabs fill.
 *
 * Each tab saves on its own — there is no page-wide Save — because an admin
 * setting a labour rate should not have to re-confirm last month's salaries to
 * make it stick.
 */
export default function FactoryExpenseConfigPage() {
  const { data: departments = [] } = useExpenseDepartments();

  return (
    <div className="flex flex-col gap-6 p-4 sm:p-6">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <h1 className="text-2xl font-bold tracking-tight">Factory Expense — Configuration</h1>
          <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
            What a labourer costs, what each department&rsquo;s salary bill is, what counts
            as maintenance, and the targets the wall measures against. Nothing here comes
            from SAP.
          </p>
        </div>
        <Button asChild variant="outline" className="gap-2">
          <Link to="/dashboards/factory-expense">
            <ArrowLeft className="h-4 w-4" />
            Back to the board
          </Link>
        </Button>
      </header>

      <Tabs defaultValue="labour">
        <TabsList>
          <TabsTrigger value="labour" className="gap-2">
            <HardHat className="h-4 w-4" />
            Labour rate
          </TabsTrigger>
          <TabsTrigger value="salary" className="gap-2">
            <Users className="h-4 w-4" />
            Salary
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

        <TabsContent value="labour" className="mt-6">
          <LabourRateTab departments={departments} />
        </TabsContent>
        <TabsContent value="salary" className="mt-6">
          <SalaryTab departments={departments} />
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
