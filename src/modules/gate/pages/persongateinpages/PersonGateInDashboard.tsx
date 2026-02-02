import { useNavigate } from 'react-router-dom'
import {
  Plus,
  ChevronRight,
  Users,
  LogIn,
  UserCheck,
  Clock,
  AlertTriangle,
} from 'lucide-react'
import { Button, Card, CardContent, CardHeader, CardTitle } from '@/shared/components/ui'
import { usePersonGateInDashboard } from '../../api/personGateIn/personGateIn.queries'
import { PERSON_TYPE_IDS } from '../../api/personGateIn/personGateIn.api'

// Status badge styling
const getStatusBadgeClass = (status: string) => {
  switch (status) {
    case 'IN':
      return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
    case 'OUT':
      return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400'
    case 'CANCELLED':
      return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'
    default:
      return 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300'
  }
}

export default function PersonGateInDashboard() {
  const navigate = useNavigate()

  // Fetch dashboard data from single API
  const { data: dashboard, isLoading } = usePersonGateInDashboard()

  // Format date/time for display
  const formatDateTime = (dateTime?: string) => {
    if (!dateTime) return '-'
    try {
      const date = new Date(dateTime)
      return date.toLocaleString('en-US', {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })
    } catch {
      return dateTime
    }
  }

  // Format time duration (how long inside)
  const formatDuration = (entryTime?: string) => {
    if (!entryTime) return '-'
    try {
      const entry = new Date(entryTime)
      const now = new Date()
      const diffMs = now.getTime() - entry.getTime()
      const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
      const diffMins = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60))

      if (diffHours > 0) {
        return `${diffHours}h ${diffMins}m`
      }
      return `${diffMins}m`
    } catch {
      return '-'
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Visitor/Labour</h2>
          <p className="text-muted-foreground">
            Manage visitor and labour gate entries
          </p>
        </div>
        <Button onClick={() => navigate('/gate/visitor-labour/new')} className="w-full sm:w-auto">
          <Plus className="h-4 w-4 mr-2" />
          New Entry
        </Button>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center h-48">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        </div>
      ) : (
        <>
          {/* Current Status */}
          <Card
            className="bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800 cursor-pointer hover:shadow-md transition-shadow"
            onClick={() => navigate('/gate/visitor-labour/inside')}
          >
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <UserCheck className="h-5 w-5 text-green-600 dark:text-green-400" />
                  <span className="text-sm font-medium text-green-600 dark:text-green-400">
                    Total Inside Now
                  </span>
                </div>
                <span className="text-3xl font-bold text-green-600 dark:text-green-400">
                  {dashboard?.current.total_inside ?? 0}
                </span>
              </div>
              <div className="mt-3 pt-3 border-t border-green-200 dark:border-green-800 flex items-center justify-between text-sm text-muted-foreground">
                <div className="flex items-center gap-4">
                  <span>
                    <span className="font-semibold text-purple-600 dark:text-purple-400">{dashboard?.current.visitors_inside ?? 0}</span> Visitors
                  </span>
                  <span>
                    <span className="font-semibold text-orange-600 dark:text-orange-400">{dashboard?.current.labours_inside ?? 0}</span> Labours
                  </span>
                </div>
                {(dashboard?.current.long_duration_count ?? 0) > 0 && (
                  <span className="flex items-center gap-1 text-amber-600 dark:text-amber-400">
                    <AlertTriangle className="h-3.5 w-3.5" />
                    <span className="font-semibold">{dashboard?.current.long_duration_count}</span> Long Duration
                  </span>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Recent Entries - Shown at top, limited to 3 */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-medium text-muted-foreground">Recent Entries</h3>
              <button
                onClick={() => navigate('/gate/visitor-labour/all')}
                className="text-xs text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1"
              >
                View all
                <ChevronRight className="h-3 w-3" />
              </button>
            </div>

            {!dashboard?.recent_entries || dashboard.recent_entries.length === 0 ? (
              <div className="flex items-center justify-center h-24 text-sm text-muted-foreground border rounded-lg">
                No recent entries
              </div>
            ) : (
              <div className="space-y-2">
                {dashboard.recent_entries.slice(0, 3).map((entry) => (
                  <div
                    key={entry.id}
                    className="flex items-center justify-between px-3 py-2 rounded-md border bg-card hover:bg-muted/50 transition-colors cursor-pointer"
                    onClick={() => navigate(`/gate/visitor-labour/entry/${entry.id}`)}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-sm">{entry.name_snapshot}</span>
                        <span
                          className={`inline-flex items-center rounded-full px-1.5 py-0.5 text-[10px] font-medium ${getStatusBadgeClass(entry.status)}`}
                        >
                          {entry.status}
                        </span>
                      </div>
                      {entry.purpose && (
                        <span className="text-xs text-muted-foreground hidden sm:inline truncate max-w-[150px]">
                          {entry.purpose}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="text-right hidden sm:block">
                        <span className="text-xs text-muted-foreground">
                          {formatDateTime(entry.entry_time)}
                        </span>
                        {entry.status === 'IN' && (
                          <span className="text-xs text-green-600 dark:text-green-400 ml-2">
                            ({formatDuration(entry.entry_time)})
                          </span>
                        )}
                      </div>
                      <ChevronRight className="h-4 w-4 text-muted-foreground" />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Today's Stats */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-medium flex items-center gap-2">
                <Clock className="h-4 w-4" />
                Today's Activity
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <div
                  className="text-center p-3 rounded-lg bg-muted/50 cursor-pointer hover:bg-muted transition-colors"
                  onClick={() => navigate('/gate/visitor-labour/all')}
                >
                  <div className="text-2xl font-bold">{dashboard?.today.total_entries ?? 0}</div>
                  <div className="text-xs text-muted-foreground">Total Entries</div>
                </div>
                <div
                  className="text-center p-3 rounded-lg bg-muted/50 cursor-pointer hover:bg-muted transition-colors"
                  onClick={() => navigate(`/gate/visitor-labour/all?person_type=${PERSON_TYPE_IDS.VISITOR}`)}
                >
                  <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">
                    {dashboard?.today.visitors ?? 0}
                  </div>
                  <div className="text-xs text-muted-foreground">Visitors</div>
                </div>
                <div
                  className="text-center p-3 rounded-lg bg-muted/50 cursor-pointer hover:bg-muted transition-colors"
                  onClick={() => navigate(`/gate/visitor-labour/all?person_type=${PERSON_TYPE_IDS.LABOUR}`)}
                >
                  <div className="text-2xl font-bold text-orange-600 dark:text-orange-400">
                    {dashboard?.today.labours ?? 0}
                  </div>
                  <div className="text-xs text-muted-foreground">Labours</div>
                </div>
                <div
                  className="text-center p-3 rounded-lg bg-muted/50 cursor-pointer hover:bg-muted transition-colors"
                  onClick={() => navigate('/gate/visitor-labour/all?status=OUT')}
                >
                  <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                    {dashboard?.today.exits ?? 0}
                  </div>
                  <div className="text-xs text-muted-foreground">Exits</div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Gate-wise & Person Type Stats */}
          <div className="grid lg:grid-cols-2 gap-4">
            {/* Gate-wise Stats */}
            {dashboard?.gate_wise && dashboard.gate_wise.length > 0 && (
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base font-medium flex items-center gap-2">
                    <LogIn className="h-4 w-4" />
                    Gate-wise Inside Count
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {dashboard.gate_wise.map((gate) => (
                      <div
                        key={gate.id}
                        className="flex items-center justify-between p-2 rounded-lg bg-muted/30 cursor-pointer hover:bg-muted transition-colors"
                        onClick={() => navigate(`/gate/visitor-labour/all?gate_in=${gate.id}&status=IN`)}
                      >
                        <span className="text-sm font-medium">{gate.name}</span>
                        <span className="text-sm font-bold text-green-600 dark:text-green-400">
                          {gate.inside_count}
                        </span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Person Type Stats */}
            {dashboard?.person_type_wise && dashboard.person_type_wise.length > 0 && (
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base font-medium flex items-center gap-2">
                    <Users className="h-4 w-4" />
                    Person Type Breakdown
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {dashboard.person_type_wise.map((type) => (
                      <div
                        key={type.id}
                        className="flex items-center justify-between p-2 rounded-lg bg-muted/30 cursor-pointer hover:bg-muted transition-colors"
                        onClick={() => navigate(`/gate/visitor-labour/all?person_type=${type.id}`)}
                      >
                        <span className="text-sm font-medium">{type.name}</span>
                        <div className="flex items-center gap-4">
                          <span className="text-xs text-muted-foreground">
                            Inside: <span className="font-bold text-green-600 dark:text-green-400">{type.inside_count}</span>
                          </span>
                          <span className="text-xs text-muted-foreground">
                            Today: <span className="font-bold">{type.today_count}</span>
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Quick Actions */}
          <div>
            <h3 className="text-sm font-medium text-muted-foreground mb-3">Quick Actions</h3>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              <Button
                variant="outline"
                className="h-auto py-3 flex flex-col items-center gap-1"
                onClick={() => navigate('/gate/visitor-labour/new?type=visitor')}
              >
                <Users className="h-5 w-5" />
                <span className="text-xs">Visitor Entry</span>
              </Button>
              <Button
                variant="outline"
                className="h-auto py-3 flex flex-col items-center gap-1"
                onClick={() => navigate('/gate/visitor-labour/new?type=labour')}
              >
                <Users className="h-5 w-5" />
                <span className="text-xs">Labour Entry</span>
              </Button>
              <Button
                variant="outline"
                className="h-auto py-3 flex flex-col items-center gap-1"
                onClick={() => navigate('/gate/visitor-labour/visitors')}
              >
                <Users className="h-5 w-5" />
                <span className="text-xs">Manage Visitors</span>
              </Button>
              <Button
                variant="outline"
                className="h-auto py-3 flex flex-col items-center gap-1"
                onClick={() => navigate('/gate/visitor-labour/labours')}
              >
                <Users className="h-5 w-5" />
                <span className="text-xs">Manage Labours</span>
              </Button>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
