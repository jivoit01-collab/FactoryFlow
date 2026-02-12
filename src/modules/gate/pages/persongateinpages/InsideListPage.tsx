import { ArrowLeft, Clock, LogOut, Search, UserCheck } from 'lucide-react'
import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'

import { Button, Card, CardContent, CardHeader, CardTitle, Input } from '@/shared/components/ui'

import type { EntryLog } from '../../api/personGateIn/personGateIn.api'
import { useExitPersonEntry, useInsideList } from '../../api/personGateIn/personGateIn.queries'
import { GateSelect } from '../../components'

export default function InsideListPage() {
  const navigate = useNavigate()
  const [search, setSearch] = useState('')
  const [exitingId, setExitingId] = useState<number | null>(null)
  const [selectedGate, setSelectedGate] = useState<number | null>(null)

  const { data: insideList = [], isLoading, refetch } = useInsideList()
  const exitMutation = useExitPersonEntry()

  // Filter entries based on search query
  const filteredData = useMemo(() => {
    if (!search.trim()) return insideList

    const searchLower = search.toLowerCase()
    return insideList.filter(
      (entry) =>
        entry.name_snapshot?.toLowerCase().includes(searchLower) ||
        entry.purpose?.toLowerCase().includes(searchLower) ||
        entry.gate_in?.name?.toLowerCase().includes(searchLower) ||
        entry.vehicle_no?.toLowerCase().includes(searchLower)
    )
  }, [insideList, search])

  // Group by person type
  const groupedData = useMemo(() => {
    const visitors: EntryLog[] = []
    const labours: EntryLog[] = []

    filteredData.forEach((entry) => {
      if (entry.visitor) {
        visitors.push(entry)
      } else if (entry.labour) {
        labours.push(entry)
      }
    })

    return { visitors, labours }
  }, [filteredData])

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

  // Format time duration
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

  // Handle exit
  const handleExit = async (entryId: number) => {
    if (!selectedGate) return

    try {
      await exitMutation.mutateAsync({
        id: entryId,
        data: { gate_out: selectedGate },
      })
      setExitingId(null)
      setSelectedGate(null)
      refetch()
    } catch (error) {
      console.error('Failed to exit:', error)
    }
  }

  // Entry card component
  const EntryCard = ({ entry }: { entry: EntryLog }) => (
    <div
      className="flex items-center justify-between p-3 rounded-lg border bg-card hover:bg-muted/50 transition-colors cursor-pointer"
      onClick={() => navigate(`/gate/visitor-labour/entry/${entry.id}`)}
    >
      <div className="flex items-center gap-3 min-w-0 flex-1">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-medium text-sm truncate">{entry.name_snapshot}</span>
          </div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
            <span>via {entry.gate_in?.name || 'Unknown Gate'}</span>
            {entry.purpose && (
              <>
                <span>•</span>
                <span className="truncate max-w-[150px]">{entry.purpose}</span>
              </>
            )}
          </div>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <div className="text-right hidden sm:block">
          <div className="text-xs text-muted-foreground">{formatDateTime(entry.entry_time)}</div>
          <div className="flex items-center gap-1 text-xs text-green-600 dark:text-green-400">
            <Clock className="h-3 w-3" />
            {formatDuration(entry.entry_time)}
          </div>
        </div>

        {exitingId === entry.id ? (
          <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
            <div className="w-40">
              <GateSelect
                value={selectedGate ? String(selectedGate) : undefined}
                onChange={(gateId) => setSelectedGate(gateId)}
                placeholder="Select Gate"
              />
            </div>
            <Button
              size="sm"
              variant="default"
              onClick={() => handleExit(entry.id)}
              disabled={!selectedGate || exitMutation.isPending}
            >
              {exitMutation.isPending ? 'Exiting...' : 'Confirm'}
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => {
                setExitingId(null)
                setSelectedGate(null)
              }}
            >
              Cancel
            </Button>
          </div>
        ) : (
          <Button
            size="sm"
            variant="outline"
            onClick={(e) => {
              e.stopPropagation()
              setExitingId(entry.id)
            }}
          >
            <LogOut className="h-3 w-3 mr-1" />
            Exit
          </Button>
        )}
      </div>
    </div>
  )

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate('/gate/visitor-labour')}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h2 className="text-3xl font-bold tracking-tight">Currently Inside</h2>
            <p className="text-muted-foreground">
              {insideList.length} {insideList.length === 1 ? 'person' : 'people'} currently inside
              the premises
            </p>
          </div>
        </div>
      </div>

      {/* Search */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search by name, purpose, gate..."
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
          <UserCheck className="h-12 w-12 mb-2" />
          <p className="text-lg">No one inside currently</p>
        </div>
      ) : (
        <div className="grid gap-6 md:grid-cols-2">
          {/* Visitors Section */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <span className="inline-flex items-center justify-center h-6 w-6 rounded-full bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400 text-xs font-medium">
                  {groupedData.visitors.length}
                </span>
                Visitors
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {groupedData.visitors.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">No visitors inside</p>
              ) : (
                groupedData.visitors.map((entry) => <EntryCard key={entry.id} entry={entry} />)
              )}
            </CardContent>
          </Card>

          {/* Labours Section */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <span className="inline-flex items-center justify-center h-6 w-6 rounded-full bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400 text-xs font-medium">
                  {groupedData.labours.length}
                </span>
                Labours
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {groupedData.labours.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">No labours inside</p>
              ) : (
                groupedData.labours.map((entry) => <EntryCard key={entry.id} entry={entry} />)
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}
