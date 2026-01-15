import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, Search } from 'lucide-react'
import { Button, Input } from '@/shared/components/ui'
import { QualityCheckTable } from '../components/QualityCheckTable'
import { QualityCheckStatus, type QualityCheckEntry } from '../types/qualityCheck.types'

// Mock data - replace with useQualityCheckList() when API is ready
const mockData: QualityCheckEntry[] = [
  {
    id: '1',
    gateInId: '1',
    vehicleNumber: 'MH12AB1234',
    materialType: 'Raw Material',
    supplierName: 'ABC Suppliers',
    inspectorId: '1',
    inspectorName: 'Priya Sharma',
    status: QualityCheckStatus.PASSED,
    checkDate: new Date().toISOString(),
    results: [
      { parameter: 'Appearance', expectedValue: 'Clear', actualValue: 'Clear', passed: true },
      { parameter: 'Purity', expectedValue: '>99%', actualValue: '99.5%', passed: true },
    ],
    samplesTaken: 3,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: '2',
    gateInId: '2',
    vehicleNumber: 'MH14CD5678',
    materialType: 'Packaging',
    supplierName: 'XYZ Packaging',
    inspectorId: '2',
    inspectorName: 'Amit Patel',
    status: QualityCheckStatus.PENDING,
    checkDate: new Date().toISOString(),
    results: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
]

export default function QualityCheckListPage() {
  const navigate = useNavigate()
  const [search, setSearch] = useState('')

  // TODO: Replace with actual API call
  // const { data, isLoading } = useQualityCheckList({ search })
  const data = mockData
  const isLoading = false

  const filteredData = data.filter(
    (entry) =>
      entry.vehicleNumber.toLowerCase().includes(search.toLowerCase()) ||
      entry.supplierName.toLowerCase().includes(search.toLowerCase()) ||
      entry.inspectorName.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Quality Check</h2>
          <p className="text-muted-foreground">Manage quality inspections</p>
        </div>
        <Button onClick={() => navigate('/quality-check/new')}>
          <Plus className="h-4 w-4 mr-2" />
          New Check
        </Button>
      </div>

      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search by vehicle, supplier, or inspector..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      <QualityCheckTable data={filteredData} isLoading={isLoading} />
    </div>
  )
}
