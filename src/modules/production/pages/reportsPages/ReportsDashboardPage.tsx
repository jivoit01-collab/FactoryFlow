import { BarChart2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

import { ROUTES } from '@/config/routes.config';
import { Badge, Button, Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/shared/components/ui';

interface ReportItem {
  title: string;
  description: string;
  status: 'Done' | 'In Progress' | 'Pending' | 'Not Given';
}

const reports: ReportItem[] = [
  { title: 'ME (Manufacturing Efficiency)', description: 'Overall manufacturing efficiency metrics', status: 'Done' },
  { title: 'PE (Production Efficiency)', description: 'Production line efficiency tracking', status: 'Done' },
  { title: 'Yield Report', description: 'Material yield and wastage analysis', status: 'Done' },
  { title: 'Line Clearance', description: 'Line clearance verification records', status: 'Done' },
  { title: 'Change Over Metrics', description: 'Machine/line changeover time tracking', status: 'Done' },
  { title: 'Preventive Maintenance Shop', description: 'Preventive maintenance schedule & records', status: 'In Progress' },
  { title: 'Purging Reports', description: 'Line purging and cleaning records', status: 'In Progress' },
  { title: 'EUR (Equipment Utilization)', description: 'Equipment utilization rate reports', status: 'Pending' },
  { title: 'SOP (Standard Operating Proc)', description: 'Standard operating procedure compliance', status: 'Pending' },
  { title: 'RCA & KAPPA', description: 'Root Cause Analysis & KAPPA metrics', status: 'Not Given' },
];

const statusVariant: Record<ReportItem['status'], string> = {
  Done: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  'In Progress': 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  Pending: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
  'Not Given': 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400',
};

export default function ReportsDashboardPage() {
  const navigate = useNavigate();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Reports</h2>
          <p className="text-muted-foreground">ME, PE, DPR, Yield, and all operational reports</p>
        </div>
        <Button onClick={() => navigate(ROUTES.PRODUCTION.path)}>Back to Production</Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart2 className="h-5 w-5" />
            Production Reports
          </CardTitle>
          <CardDescription>All available production reports and their current status</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {reports.map((report) => (
              <div
                key={report.title}
                className="flex items-center justify-between py-3 border-b last:border-0"
              >
                <div>
                  <p className="text-sm font-medium">{report.title}</p>
                  <p className="text-xs text-muted-foreground">{report.description}</p>
                </div>
                <span
                  className={`text-xs font-medium px-2.5 py-1 rounded-full shrink-0 ml-4 ${statusVariant[report.status]}`}
                >
                  {report.status}
                </span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
