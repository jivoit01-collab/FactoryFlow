import { useParams, useNavigate, useSearchParams } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { Button, Card, CardContent, CardHeader, CardTitle } from '@/shared/components/ui'
import { GateInForm } from '../components/GateInForm'
import type { GateInFormData } from '../schemas/gateIn.schema'

export default function GateInDetailPage() {
  const { id } = useParams<{ id: string }>()
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()

  const isNew = id === 'new' || !id
  const isEdit = searchParams.get('edit') === 'true'

  // TODO: Replace with actual API call
  // const { data: entry, isLoading } = useGateInDetail(id!)
  // const createMutation = useCreateGateIn()
  // const updateMutation = useUpdateGateIn(id!)

  const handleSubmit = async (data: GateInFormData) => {
    try {
      if (isNew) {
        // await createMutation.mutateAsync(data)
        console.log('Create:', data)
      } else {
        // await updateMutation.mutateAsync(data)
        console.log('Update:', data)
      }
      navigate('/gate-in')
    } catch (error) {
      console.error('Error:', error)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate('/gate-in')}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h2 className="text-3xl font-bold tracking-tight">
            {isNew ? 'New Gate In Entry' : isEdit ? 'Edit Gate In Entry' : 'Gate In Details'}
          </h2>
          <p className="text-muted-foreground">
            {isNew
              ? 'Create a new gate in entry'
              : isEdit
                ? 'Update the gate in entry details'
                : 'View gate in entry details'}
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{isNew ? 'Entry Details' : `Entry #${id}`}</CardTitle>
        </CardHeader>
        <CardContent>
          <GateInForm
            onSubmit={handleSubmit}
            isEdit={!isNew}
            // defaultValues={entry}
            // isLoading={createMutation.isPending || updateMutation.isPending}
          />
        </CardContent>
      </Card>
    </div>
  )
}
