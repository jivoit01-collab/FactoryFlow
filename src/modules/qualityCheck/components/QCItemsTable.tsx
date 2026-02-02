import { memo } from 'react'
import { useNavigate } from 'react-router-dom'
import { Eye, PlayCircle } from 'lucide-react'
import { Button } from '@/shared/components/ui'
import { QCStatusBadge } from './QCStatusBadge'
import { QCStatus, type QCItem } from '../types/qualityCheck.types'
import { format } from 'date-fns'

interface QCItemsTableProps {
  items: QCItem[]
  onStartQC?: (item: QCItem) => void
}

// Memoized table row component for performance
const QCTableRow = memo(function QCTableRow({
  item,
  onStartQC,
  onView,
}: {
  item: QCItem
  onStartQC?: (item: QCItem) => void
  onView: (id: number) => void
}) {
  const formatDate = (dateString: string) => {
    try {
      return format(new Date(dateString), 'M/d/yyyy')
    } catch {
      return dateString
    }
  }

  return (
    <tr
      className="border-t hover:bg-muted/50 transition-colors cursor-pointer"
      onClick={() => onView(item.id)}
    >
      <td className="p-3 text-sm font-medium text-primary">{item.grnNumber}</td>
      <td className="p-3 text-sm">{item.itemName}</td>
      <td className="p-3 text-sm text-muted-foreground">{item.batchNo}</td>
      <td className="p-3 text-sm">{item.vendor}</td>
      <td className="p-3 text-sm text-muted-foreground">{formatDate(item.receivedDate)}</td>
      <td className="p-3">
        <QCStatusBadge status={item.status} />
      </td>
      <td className="p-3">
        {item.status === QCStatus.PENDING ? (
          <Button
            size="sm"
            onClick={(e) => {
              e.stopPropagation()
              onStartQC?.(item)
            }}
            className="gap-1"
          >
            <PlayCircle className="h-4 w-4" />
            Start QC
          </Button>
        ) : (
          <Button
            variant="ghost"
            size="sm"
            onClick={(e) => {
              e.stopPropagation()
              onView(item.id)
            }}
            className="gap-1 text-muted-foreground"
          >
            <Eye className="h-4 w-4" />
            View
          </Button>
        )}
      </td>
    </tr>
  )
})

export const QCItemsTable = memo(function QCItemsTable({ items, onStartQC }: QCItemsTableProps) {
  const navigate = useNavigate()

  const handleView = (id: number) => {
    navigate(`/quality-check/${id}`)
  }

  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-muted-foreground rounded-md border">
        <p className="text-lg">No items found</p>
      </div>
    )
  }

  return (
    <div className="rounded-md border overflow-hidden">
      {/* Scrollable table container with hidden scrollbar */}
      <div
        className="overflow-x-auto max-w-full"
        style={{
          scrollbarWidth: 'none',
          msOverflowStyle: 'none',
        }}
      >
        <style>
          {`
            .qc-table-scroll::-webkit-scrollbar {
              display: none;
            }
          `}
        </style>
        <div className="qc-table-scroll">
          <table className="w-full min-w-[800px]">
            <thead className="bg-muted/50">
              <tr>
                <th className="p-3 text-left text-sm font-medium">GRN Number</th>
                <th className="p-3 text-left text-sm font-medium">Item Name</th>
                <th className="p-3 text-left text-sm font-medium">Batch No</th>
                <th className="p-3 text-left text-sm font-medium">Vendor</th>
                <th className="p-3 text-left text-sm font-medium">Received Date</th>
                <th className="p-3 text-left text-sm font-medium">Status</th>
                <th className="p-3 text-left text-sm font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <QCTableRow
                  key={item.id}
                  item={item}
                  onStartQC={onStartQC}
                  onView={handleView}
                />
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
})
