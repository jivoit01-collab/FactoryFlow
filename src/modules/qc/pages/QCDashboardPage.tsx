import { useNavigate } from 'react-router-dom'
import {
  FlaskConical,
  Plus,
  ChevronRight,
  FileText,
  Clock,
  CheckCircle2,
  XCircle,
  UserCheck,
  AlertCircle,
  ShieldX,
  RefreshCw,
} from 'lucide-react'
import { Button, Card, CardContent } from '@/shared/components/ui'
import { usePendingInspections } from '../api/inspection/inspection.queries'
import type { ApiError } from '@/core/api/types'

// Status configuration with colors and icons
const DASHBOARD_CARDS = [
  {
    key: 'pending',
    label: 'Pending Inspection',
    description: 'Arrival slips awaiting QC inspection',
    color: 'text-yellow-600 dark:text-yellow-400',
    bgColor: 'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800',
    icon: Clock,
    link: '/qc/pending',
  },
  {
    key: 'draft',
    label: 'Draft',
    description: 'Inspections started but not submitted',
    color: 'text-gray-600 dark:text-gray-400',
    bgColor: 'bg-gray-50 dark:bg-gray-900/20 border-gray-200 dark:border-gray-800',
    icon: FileText,
    link: '/qc/pending',
  },
  {
    key: 'awaiting_approval',
    label: 'Awaiting Approval',
    description: 'Pending chemist or manager approval',
    color: 'text-blue-600 dark:text-blue-400',
    bgColor: 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800',
    icon: UserCheck,
    link: '/qc/approvals',
  },
  {
    key: 'approved',
    label: 'Approved',
    description: 'Completed inspections',
    color: 'text-green-600 dark:text-green-400',
    bgColor: 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800',
    icon: CheckCircle2,
    link: '/qc/pending',
  },
  {
    key: 'rejected',
    label: 'Rejected',
    description: 'Rejected inspections',
    color: 'text-red-600 dark:text-red-400',
    bgColor: 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800',
    icon: XCircle,
    link: '/qc/pending',
  },
]

export default function QCDashboardPage() {
  const navigate = useNavigate()

  // Fetch pending inspections for counts
  const { data: pendingInspections = [], isLoading, error, refetch } = usePendingInspections()

  // Check if error is a permission error (403)
  const apiError = error as ApiError | null
  const isPermissionError = apiError?.status === 403

  // Calculate counts from the data
  const counts = {
    pending: pendingInspections.filter((p) => !p.has_inspection).length,
    draft: pendingInspections.filter(
      (p) => p.has_inspection && p.inspection_status === 'DRAFT'
    ).length,
    awaiting_approval: pendingInspections.filter(
      (p) =>
        p.has_inspection &&
        (p.inspection_status === 'SUBMITTED' || p.inspection_status === 'QA_CHEMIST_APPROVED')
    ).length,
    approved: pendingInspections.filter(
      (p) =>
        p.has_inspection &&
        (p.inspection_status === 'QAM_APPROVED' || p.inspection_status === 'COMPLETED')
    ).length,
    rejected: 0, // Will be fetched from a separate endpoint if needed
  }

  const totalPending = counts.pending + counts.draft + counts.awaiting_approval

  return (
    <div className="space-y-6 pb-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1">
          <h2 className="text-3xl font-bold tracking-tight flex items-center gap-3">
            <FlaskConical className="h-8 w-8" />
            Quality Control
          </h2>
          <p className="text-muted-foreground">
            Manage raw material inspections and quality approvals
          </p>
        </div>
        <Button onClick={() => navigate('/qc/pending')}>
          <Plus className="h-4 w-4 mr-2" />
          Start Inspection
        </Button>
      </div>

      {/* Permission Error */}
      {isPermissionError && (
        <Card className="border-destructive/50 bg-destructive/5">
          <CardContent className="pt-6">
            <div className="flex items-start gap-4">
              <div className="p-3 rounded-full bg-destructive/10">
                <ShieldX className="h-6 w-6 text-destructive" />
              </div>
              <div className="flex-1">
                <p className="font-semibold text-destructive">Permission Denied</p>
                <p className="text-sm text-muted-foreground mt-1">
                  {apiError?.message || 'You do not have permission to view this data.'}
                </p>
                <p className="text-sm text-muted-foreground mt-2">
                  Please contact your administrator if you believe this is an error.
                </p>
              </div>
              <Button variant="outline" size="sm" onClick={() => refetch()}>
                <RefreshCw className="h-4 w-4 mr-2" />
                Retry
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* General API Error */}
      {error && !isPermissionError && (
        <Card className="border-yellow-500/50 bg-yellow-50 dark:bg-yellow-900/10">
          <CardContent className="pt-6">
            <div className="flex items-start gap-4">
              <div className="p-3 rounded-full bg-yellow-100 dark:bg-yellow-900/20">
                <AlertCircle className="h-6 w-6 text-yellow-600" />
              </div>
              <div className="flex-1">
                <p className="font-semibold text-yellow-800 dark:text-yellow-400">
                  Failed to Load Data
                </p>
                <p className="text-sm text-muted-foreground mt-1">
                  {apiError?.message || 'An error occurred while loading the dashboard.'}
                </p>
              </div>
              <Button variant="outline" size="sm" onClick={() => refetch()}>
                <RefreshCw className="h-4 w-4 mr-2" />
                Retry
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Summary Card */}
      <Card className="border-primary/50 bg-primary/5">
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <p className="text-sm text-muted-foreground">Total Pending Actions</p>
              <p className="text-4xl font-bold text-primary">
                {isLoading ? '...' : totalPending}
              </p>
            </div>
            <Button variant="outline" onClick={() => navigate('/qc/pending')}>
              View All
              <ChevronRight className="h-4 w-4 ml-2" />
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Status Cards Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
        {DASHBOARD_CARDS.map((card) => {
          const Icon = card.icon
          const count = counts[card.key as keyof typeof counts] ?? 0
          return (
            <Card
              key={card.key}
              className={`cursor-pointer transition-all hover:shadow-md border ${card.bgColor}`}
              onClick={() => navigate(card.link)}
            >
              <CardContent className="p-4">
                <div className="flex flex-col gap-2">
                  <div className={`${card.color}`}>
                    <Icon className="h-6 w-6" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{isLoading ? '...' : count}</p>
                    <p className={`text-sm font-medium ${card.color}`}>{card.label}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* Quick Actions */}
      <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card
          className="cursor-pointer transition-all hover:shadow-md"
          onClick={() => navigate('/qc/pending')}
        >
          <CardContent className="p-6 flex items-center gap-4">
            <div className="p-3 rounded-full bg-primary/10">
              <FlaskConical className="h-6 w-6 text-primary" />
            </div>
            <div>
              <p className="font-medium">Pending Inspections</p>
              <p className="text-sm text-muted-foreground">View arrival slips awaiting QC</p>
            </div>
            <ChevronRight className="h-5 w-5 ml-auto text-muted-foreground" />
          </CardContent>
        </Card>

        <Card
          className="cursor-pointer transition-all hover:shadow-md"
          onClick={() => navigate('/qc/approvals')}
        >
          <CardContent className="p-6 flex items-center gap-4">
            <div className="p-3 rounded-full bg-blue-100 dark:bg-blue-900/20">
              <UserCheck className="h-6 w-6 text-blue-600" />
            </div>
            <div>
              <p className="font-medium">Approvals</p>
              <p className="text-sm text-muted-foreground">Review and approve inspections</p>
            </div>
            <ChevronRight className="h-5 w-5 ml-auto text-muted-foreground" />
          </CardContent>
        </Card>

        <Card
          className="cursor-pointer transition-all hover:shadow-md"
          onClick={() => navigate('/qc/master/material-types')}
        >
          <CardContent className="p-6 flex items-center gap-4">
            <div className="p-3 rounded-full bg-purple-100 dark:bg-purple-900/20">
              <FileText className="h-6 w-6 text-purple-600" />
            </div>
            <div>
              <p className="font-medium">Material Types</p>
              <p className="text-sm text-muted-foreground">Manage material type definitions</p>
            </div>
            <ChevronRight className="h-5 w-5 ml-auto text-muted-foreground" />
          </CardContent>
        </Card>

        <Card
          className="cursor-pointer transition-all hover:shadow-md"
          onClick={() => navigate('/qc/master/parameters')}
        >
          <CardContent className="p-6 flex items-center gap-4">
            <div className="p-3 rounded-full bg-orange-100 dark:bg-orange-900/20">
              <FileText className="h-6 w-6 text-orange-600" />
            </div>
            <div>
              <p className="font-medium">QC Parameters</p>
              <p className="text-sm text-muted-foreground">Configure inspection parameters</p>
            </div>
            <ChevronRight className="h-5 w-5 ml-auto text-muted-foreground" />
          </CardContent>
        </Card>
      </div>

      {/* Recent Activity */}
      {pendingInspections.length > 0 && (
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold">Recent Arrival Slips</h3>
              <Button variant="link" onClick={() => navigate('/qc/pending')}>
                View All
              </Button>
            </div>
            <div className="space-y-3">
              {pendingInspections.slice(0, 5).map((item) => (
                <div
                  key={item.arrival_slip.id}
                  className="flex items-center justify-between p-3 rounded-lg bg-muted/50 hover:bg-muted cursor-pointer"
                  onClick={() =>
                    item.has_inspection
                      ? navigate(`/qc/inspections/${item.arrival_slip.id}`)
                      : navigate(`/qc/inspections/${item.arrival_slip.id}/new`)
                  }
                >
                  <div>
                    <p className="font-medium">{item.arrival_slip.entry_no}</p>
                    <p className="text-sm text-muted-foreground">
                      {item.arrival_slip.particulars} | {item.arrival_slip.party_name}
                    </p>
                  </div>
                  <div className="text-right">
                    <span
                      className={`text-xs px-2 py-1 rounded-full ${
                        item.has_inspection
                          ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400'
                          : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400'
                      }`}
                    >
                      {item.has_inspection ? item.inspection_status : 'Pending'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
