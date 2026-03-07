import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  BarChart3,
  ClipboardCheck,
  FileText,
  Gauge,
  PieChart,
  TrendingUp,
} from 'lucide-react';

import { Button, Card, CardContent, CardHeader, CardTitle, Input, Label } from '@/shared/components/ui';
import { DashboardHeader } from '@/shared/components/dashboard/DashboardHeader';

import { useAnalytics, useOEE, useProductionLines } from '../api/execution.queries';

const REPORT_CARDS = [
  {
    title: 'Daily Production Report',
    description: 'View hourly production, breakdowns, and efficiency for any date',
    icon: BarChart3,
    color: 'text-blue-600',
    bg: 'bg-blue-50 dark:bg-blue-900/20',
    path: '/production/execution/reports/daily',
  },
  {
    title: 'Yield Report',
    description: 'Material consumption, machine runtime, and wastage analysis',
    icon: PieChart,
    color: 'text-green-600',
    bg: 'bg-green-50 dark:bg-green-900/20',
    path: null, // Navigate from run detail
  },
  {
    title: 'Line Clearance Report',
    description: 'Pre-production clearance status and compliance',
    icon: ClipboardCheck,
    color: 'text-amber-600',
    bg: 'bg-amber-50 dark:bg-amber-900/20',
    path: '/production/execution/line-clearance',
  },
  {
    title: 'Analytics',
    description: 'OEE, efficiency trends, downtime analysis, production vs plan',
    icon: TrendingUp,
    color: 'text-purple-600',
    bg: 'bg-purple-50 dark:bg-purple-900/20',
    path: null,
  },
];

const DATE_RANGES = [
  { label: 'Last 7 days', days: 7 },
  { label: 'Last 30 days', days: 30 },
];

export default function ReportsPage() {
  const navigate = useNavigate();
  const { data: lines = [] } = useProductionLines(true);

  const [selectedRange, setSelectedRange] = useState(7);
  const [selectedLine, setSelectedLine] = useState<number | undefined>();

  const today = new Date();
  const dateFrom = new Date(today);
  dateFrom.setDate(dateFrom.getDate() - selectedRange);

  const analyticsParams = {
    date_from: dateFrom.toISOString().slice(0, 10),
    date_to: today.toISOString().slice(0, 10),
    line_id: selectedLine,
  };

  const { data: analytics } = useAnalytics(analyticsParams);
  const { data: oee } = useOEE(analyticsParams);

  return (
    <div className="space-y-6 p-6">
      <DashboardHeader
        title="Production Reports"
        description="View reports and analytics for production operations"
      />

      {/* Report Type Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {REPORT_CARDS.map((card) => (
          <Card
            key={card.title}
            className={`cursor-pointer transition-all hover:shadow-md hover:border-primary/30 ${!card.path ? 'opacity-90' : ''}`}
            onClick={() => card.path && navigate(card.path)}
          >
            <CardContent className="p-5 flex items-start gap-4">
              <div className={`p-3 rounded-lg ${card.bg}`}>
                <card.icon className={`h-6 w-6 ${card.color}`} />
              </div>
              <div>
                <h3 className="font-semibold">{card.title}</h3>
                <p className="text-sm text-muted-foreground mt-0.5">{card.description}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Analytics Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold">Analytics Overview</h3>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1">
              {DATE_RANGES.map((range) => (
                <Button
                  key={range.days}
                  size="sm"
                  variant={selectedRange === range.days ? 'default' : 'outline'}
                  onClick={() => setSelectedRange(range.days)}
                >
                  {range.label}
                </Button>
              ))}
            </div>
            <select
              value={selectedLine ?? ''}
              onChange={(e) =>
                setSelectedLine(e.target.value ? Number(e.target.value) : undefined)
              }
              className="h-9 rounded-md border border-input bg-background px-3 text-sm"
            >
              <option value="">All Lines</option>
              {lines.map((line) => (
                <option key={line.id} value={line.id}>
                  {line.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {/* OEE Card */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <Gauge className="h-4 w-4 text-blue-600" />
                OEE (Overall Equipment Effectiveness)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-blue-600">
                {oee?.oee != null ? `${oee.oee.toFixed(1)}%` : '—'}
              </p>
              {oee && (
                <div className="mt-3 space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">Availability</span>
                    <span className="font-medium">{oee.availability?.toFixed(1)}%</span>
                  </div>
                  <div className="h-1.5 rounded-full bg-gray-200 dark:bg-gray-700">
                    <div
                      className="h-1.5 rounded-full bg-blue-500"
                      style={{ width: `${Math.min(oee.availability ?? 0, 100)}%` }}
                    />
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">Performance</span>
                    <span className="font-medium">{oee.performance?.toFixed(1)}%</span>
                  </div>
                  <div className="h-1.5 rounded-full bg-gray-200 dark:bg-gray-700">
                    <div
                      className="h-1.5 rounded-full bg-amber-500"
                      style={{ width: `${Math.min(oee.performance ?? 0, 100)}%` }}
                    />
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">Quality</span>
                    <span className="font-medium">{oee.quality?.toFixed(1)}%</span>
                  </div>
                  <div className="h-1.5 rounded-full bg-gray-200 dark:bg-gray-700">
                    <div
                      className="h-1.5 rounded-full bg-green-500"
                      style={{ width: `${Math.min(oee.quality ?? 0, 100)}%` }}
                    />
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Line Efficiency Card */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-green-600" />
                Line Efficiency
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-green-600">
                {analytics?.line_efficiency != null
                  ? `${analytics.line_efficiency.toFixed(1)}%`
                  : '—'}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Target: 85%
              </p>
              {analytics?.line_efficiency != null && (
                <div className="mt-3">
                  <div className="h-2 rounded-full bg-gray-200 dark:bg-gray-700 relative">
                    <div
                      className="h-2 rounded-full bg-green-500"
                      style={{ width: `${Math.min(analytics.line_efficiency, 100)}%` }}
                    />
                    <div
                      className="absolute top-0 h-2 w-0.5 bg-red-500"
                      style={{ left: '85%' }}
                      title="Target: 85%"
                    />
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Material Loss Card */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <PieChart className="h-4 w-4 text-amber-600" />
                Material Loss
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-amber-600">
                {analytics?.material_loss_pct != null
                  ? `${analytics.material_loss_pct.toFixed(1)}%`
                  : '—'}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Threshold: 2%
              </p>
            </CardContent>
          </Card>

          {/* Downtime Card */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <FileText className="h-4 w-4 text-red-600" />
                Machine Downtime
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-red-600">
                {analytics?.downtime_hours != null
                  ? `${analytics.downtime_hours.toFixed(1)} hrs`
                  : '—'}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Total downtime in selected period
              </p>
            </CardContent>
          </Card>

          {/* Production vs Plan Card */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <BarChart3 className="h-4 w-4 text-purple-600" />
                Production vs Plan
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-purple-600">
                {analytics?.production_vs_plan_pct != null
                  ? `${analytics.production_vs_plan_pct.toFixed(1)}%`
                  : '—'}
              </p>
              <p className="text-xs text-muted-foreground mt-1">Achievement rate</p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
