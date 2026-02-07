import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, AlertCircle, ShieldX, RefreshCw } from 'lucide-react'
import { Button, Card, CardContent } from '@/shared/components/ui'
import { useGRPODetail } from '../api'
import { GRPO_STATUS_CONFIG } from '../constants'
import type { ApiError } from '@/core/api/types'

// Format date/time for display
const formatDateTime = (dateTime?: string | null) => {
  if (!dateTime) return '-'
  try {
    const date = new Date(dateTime)
    return date.toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  } catch {
    return dateTime
  }
}

export default function GRPOHistoryDetailPage() {
  const navigate = useNavigate()
  const { postingId } = useParams<{ postingId: string }>()
  const id = postingId ? parseInt(postingId, 10) : null

  const { data: posting, isLoading, error, refetch } = useGRPODetail(id)

  const apiError = error as ApiError | null
  const isPermissionError = apiError?.status === 403

  const statusConfig = posting ? GRPO_STATUS_CONFIG[posting.status] : null

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-2 mb-1">
        <Button
          variant="ghost"
          size="sm"
          className="h-8 w-8 p-0"
          onClick={() => navigate('/grpo/history')}
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <h2 className="text-3xl font-bold tracking-tight">Posting Detail</h2>
      </div>

      {/* Permission Error */}
      {isPermissionError && (
        <div className="flex items-start gap-3 p-4 rounded-lg border border-destructive/50 bg-destructive/5">
          <ShieldX className="h-5 w-5 text-destructive flex-shrink-0 mt-0.5" />
          <div className="flex-1 min-w-0">
            <p className="font-medium text-destructive">Permission Denied</p>
            <p className="text-sm text-muted-foreground mt-1">
              {apiError?.message || 'You do not have permission to view this posting.'}
            </p>
          </div>
        </div>
      )}

      {/* General Error */}
      {error && !isPermissionError && (
        <div className="flex items-start gap-3 p-4 rounded-lg border border-yellow-500/50 bg-yellow-50 dark:bg-yellow-900/10">
          <AlertCircle className="h-5 w-5 text-yellow-600 flex-shrink-0 mt-0.5" />
          <div className="flex-1 min-w-0">
            <p className="font-medium text-yellow-800 dark:text-yellow-400">Failed to Load</p>
            <p className="text-sm text-muted-foreground mt-1">
              {apiError?.message || 'An error occurred while loading posting detail.'}
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={() => refetch()}>
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
      )}

      {/* Loading State */}
      {isLoading && (
        <div className="flex items-center justify-center h-48">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        </div>
      )}

      {/* Posting Detail */}
      {!isLoading && !error && posting && (
        <>
          {/* Info Card */}
          <Card>
            <CardContent className="p-4 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold">Posting Information</h3>
                {statusConfig && (
                  <span
                    className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${statusConfig.bgColor} ${statusConfig.color}`}
                  >
                    {statusConfig.label}
                  </span>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <span className="text-muted-foreground">Entry No</span>
                  <p className="font-medium">{posting.entry_no}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">PO Number</span>
                  <p className="font-medium">{posting.po_number}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">SAP Doc Number</span>
                  <p className="font-medium">{posting.sap_doc_num ?? '-'}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">SAP Doc Entry</span>
                  <p className="font-medium">{posting.sap_doc_entry ?? '-'}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Total Value</span>
                  <p className="font-medium">
                    {posting.sap_doc_total
                      ? parseFloat(posting.sap_doc_total).toLocaleString('en-IN', {
                          style: 'currency',
                          currency: 'INR',
                        })
                      : '-'}
                  </p>
                </div>
                <div>
                  <span className="text-muted-foreground">Posted At</span>
                  <p className="font-medium">{formatDateTime(posting.posted_at)}</p>
                </div>
              </div>

              {/* Error message for failed postings */}
              {posting.error_message && (
                <div className="flex items-start gap-2 p-3 rounded-md bg-destructive/5 border border-destructive/20">
                  <AlertCircle className="h-4 w-4 text-destructive flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-destructive">Error</p>
                    <p className="text-xs text-muted-foreground">{posting.error_message}</p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Line Items */}
          {posting.lines && posting.lines.length > 0 && (
            <Card>
              <CardContent className="p-4 space-y-3">
                <h3 className="font-semibold">Posted Items</h3>
                <div className="space-y-2">
                  {posting.lines.map((line) => (
                    <div
                      key={line.id}
                      className="flex items-center justify-between p-2 rounded-md border bg-muted/30"
                    >
                      <div>
                        <p className="text-sm font-medium">
                          {line.item_code} - {line.item_name}
                        </p>
                      </div>
                      <span className="text-sm font-semibold">{line.quantity_posted}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Back Button */}
          <Button variant="outline" onClick={() => navigate('/grpo/history')}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to History
          </Button>
        </>
      )}
    </div>
  )
}
