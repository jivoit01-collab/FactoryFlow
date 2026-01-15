import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, Search } from 'lucide-react'
import { Button, Input } from '@/shared/components/ui'
import { GateInTable } from '../components/GateInTable'
import { GateInStatus, type GateInEntry } from '../types/gateIn.types'

// Mock data - replace with useGateInList() when API is ready
const mockData: GateInEntry[] = [
  {
    id: '1',
    vehicleNumber: 'MH12AB1234',
    driverName: 'Ramesh Kumar',
    driverPhone: '9876543210',
    materialType: 'raw_material',
    quantity: 500,
    unit: 'kg',
    supplierName: 'ABC Suppliers',
    poNumber: 'PO-2024-001',
    status: GateInStatus.APPROVED,
    entryTime: new Date().toISOString(),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: '2',
    vehicleNumber: 'MH14CD5678',
    driverName: 'Suresh Patil',
    driverPhone: '9876543211',
    materialType: 'packaging',
    quantity: 200,
    unit: 'boxes',
    supplierName: 'XYZ Packaging',
    status: GateInStatus.PENDING,
    entryTime: new Date().toISOString(),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
]

export default function GateInListPage() {
  const navigate = useNavigate()
  const [search, setSearch] = useState('')

  // TODO: Replace with actual API call
  // const { data, isLoading } = useGateInList({ search })
  const data = mockData
  const isLoading = false

  const filteredData = data.filter(
    (entry) =>
      entry.vehicleNumber.toLowerCase().includes(search.toLowerCase()) ||
      entry.driverName.toLowerCase().includes(search.toLowerCase()) ||
      entry.supplierName.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Gate In</h2>
          <p className="text-muted-foreground">Manage incoming vehicle entries</p>
        </div>
        <Button onClick={() => navigate('/gate-in/new')}>
          <Plus className="h-4 w-4 mr-2" />
          New Entry
        </Button>
      </div>

      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search by vehicle, driver, or supplier..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      <GateInTable data={filteredData} isLoading={isLoading} />
    </div>
  )
}
