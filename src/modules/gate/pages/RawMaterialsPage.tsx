import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, Search } from 'lucide-react'
import { Button, Input } from '@/shared/components/ui'

// Mock data - replace with actual API call when ready
// const { data, isLoading } = useRawMaterialsList()
const mockData: any[] = []

export default function RawMaterialsPage() {
  const navigate = useNavigate()
  const [search, setSearch] = useState('')

  // TODO: Replace with actual API call
  // const { data, isLoading } = useRawMaterialsList({ search })
  const data = mockData
  const isLoading = false

  const filteredData = data.filter(() => true) // Add filtering logic when needed

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Raw Materials (RM/PM/Assets)</h2>
          <p className="text-muted-foreground">
            Manage raw materials, packing materials, and assets gate entries
          </p>
        </div>
        <Button onClick={() => navigate('/gate/raw-materials/new')} className="w-full sm:w-auto">
          <Plus className="h-4 w-4 mr-2" />
          Add New Entry
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

      {isLoading ? (
        <div className="flex items-center justify-center h-64">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        </div>
      ) : filteredData.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-64 text-muted-foreground rounded-md border">
          <p className="text-lg">No entries present</p>
        </div>
      ) : (
        <div className="rounded-md border">
          <table className="w-full">
            <thead className="bg-muted/50">
              <tr>
                <th className="p-3 text-left text-sm font-medium">Vehicle No.</th>
                <th className="p-3 text-left text-sm font-medium">Driver</th>
                <th className="p-3 text-left text-sm font-medium">Material</th>
                <th className="p-3 text-left text-sm font-medium">Quantity</th>
                <th className="p-3 text-left text-sm font-medium">Entry Time</th>
                <th className="p-3 text-left text-sm font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {filteredData.map((entry) => (
                <tr key={entry.id} className="border-t">
                  <td className="p-3 text-sm font-medium">{entry.vehicleNumber}</td>
                  <td className="p-3 text-sm">{entry.driverName}</td>
                  <td className="p-3 text-sm">{entry.materialType}</td>
                  <td className="p-3 text-sm">
                    {entry.quantity} {entry.unit}
                  </td>
                  <td className="p-3 text-sm">{entry.entryTime}</td>
                  <td className="p-3 text-sm">{entry.status}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
