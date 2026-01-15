import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { Button, Card, CardContent, CardHeader, CardTitle } from '@/shared/components/ui'

export default function QualityCheckDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()

  const isNew = id === 'new' || !id

  // TODO: Implement quality check form similar to GateInForm
  // For now, just show a placeholder

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate('/quality-check')}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h2 className="text-3xl font-bold tracking-tight">
            {isNew ? 'New Quality Check' : `Quality Check #${id}`}
          </h2>
          <p className="text-muted-foreground">
            {isNew ? 'Create a new quality inspection' : 'View quality inspection details'}
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Quality Check Details</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">
            Quality check form will be implemented here. This will include:
          </p>
          <ul className="list-disc list-inside mt-4 space-y-2 text-sm text-muted-foreground">
            <li>Select gate in entry</li>
            <li>Add quality parameters and results</li>
            <li>Mark pass/fail for each parameter</li>
            <li>Add overall remarks</li>
            <li>Record number of samples taken</li>
          </ul>
          <div className="mt-6">
            <Button variant="outline" onClick={() => navigate('/quality-check')}>
              Back to List
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
