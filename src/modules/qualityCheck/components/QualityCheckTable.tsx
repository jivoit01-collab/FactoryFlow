import { useNavigate } from 'react-router-dom'
import { Eye, Pencil, Trash2 } from 'lucide-react'
import { Button } from '@/shared/components/ui'
import { formatDateTime } from '@/shared/utils'
import { QualityStatusBadge } from './QualityStatusBadge'
import type { QualityCheckEntry } from '../types/qualityCheck.types'

interface QualityCheckTableProps {
  data: QualityCheckEntry[]
  onDelete?: (id: string) => void
  isLoading?: boolean
}

export function QualityCheckTable({ data, onDelete, isLoading }: QualityCheckTableProps) {
  const navigate = useNavigate()

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    )
  }

  if (data.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-muted-foreground">
        <p>No quality checks found</p>
      </div>
    )
  }

  return (
    <div className="rounded-md border">
      <table className="w-full">
        <thead className="bg-muted/50">
          <tr>
            <th className="p-3 text-left text-sm font-medium">Vehicle No.</th>
            <th className="p-3 text-left text-sm font-medium">Material</th>
            <th className="p-3 text-left text-sm font-medium">Supplier</th>
            <th className="p-3 text-left text-sm font-medium">Inspector</th>
            <th className="p-3 text-left text-sm font-medium">Check Date</th>
            <th className="p-3 text-left text-sm font-medium">Status</th>
            <th className="p-3 text-left text-sm font-medium">Actions</th>
          </tr>
        </thead>
        <tbody>
          {data.map((entry) => (
            <tr key={entry.id} className="border-t">
              <td className="p-3 text-sm font-medium">{entry.vehicleNumber}</td>
              <td className="p-3 text-sm">{entry.materialType}</td>
              <td className="p-3 text-sm">{entry.supplierName}</td>
              <td className="p-3 text-sm">{entry.inspectorName}</td>
              <td className="p-3 text-sm">{formatDateTime(entry.checkDate)}</td>
              <td className="p-3">
                <QualityStatusBadge status={entry.status} />
              </td>
              <td className="p-3">
                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => navigate(`/quality-check/${entry.id}`)}
                  >
                    <Eye className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => navigate(`/quality-check/${entry.id}?edit=true`)}
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                  {onDelete && (
                    <Button variant="ghost" size="icon" onClick={() => onDelete(entry.id)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
