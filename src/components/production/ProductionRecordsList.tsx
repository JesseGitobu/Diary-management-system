// src/components/production/ProductionRecordsList.tsx

'use client'

import React, { useState, useMemo } from 'react'
import { Card, CardContent } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { 
  Eye, 
  Edit, 
  Trash2, 
  Clock, 
  Droplets, 
  Thermometer,
  Activity,
  MoreHorizontal,
  Calendar,
  Filter,
  ChevronLeft,
  ChevronRight,
  AlertTriangle,
  CheckCircle,
  ChevronDown,
  Users
} from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/DropdownMenu'

type ViewTab = 'individual' | 'groups'

interface ProductionRecord {
  id: string
  animal_id: string
  record_date: string
  milk_volume: number
  milk_safety_status?: 'safe' | 'unsafe_health' | 'unsafe_colostrum'
  fat_content?: number
  protein_content?: number
  somatic_cell_count?: number
  lactose_content?: number
  temperature?: number
  ph_level?: number
  notes?: string
  created_at: string
  recording_type?: 'individual' | 'group'
  milking_group_id?: string
  milking_session_id?: string
  animals?: {
    id: string
    tag_number: string
    name?: string
  }
}

interface GroupData {
  milking_group_id: string | null
  totalMilkVolume: number
  recordCount: number
  mostRecentSession: ProductionRecord | null
  animalRecords: ProductionRecord[]
}

interface MilkingGroup {
  id: string
  category_name: string
}

interface ProductionRecordsListProps {
  records: ProductionRecord[]
  canEdit: boolean
  farmId?: string
  onEdit?: (record: ProductionRecord) => void
  onDelete?: (recordId: string) => void
  onView?: (record: ProductionRecord) => void
  isMobile?: boolean
}

// Consistent, hydration-safe date formatting
const formatDate = (dateString: string) => {
  return new Date(dateString).toLocaleDateString('en-GB', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  })
}

const formatDateTime = (dateString: string) => {
  return new Date(dateString).toLocaleString('en-GB', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export function ProductionRecordsList({ 
  records, 
  canEdit, 
  farmId,
  onEdit,
  onDelete,
  onView,
  isMobile = false 
}: ProductionRecordsListProps) {
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [currentPage, setCurrentPage] = useState(1)
  const [filterSession, setFilterSession] = useState<string>('all')
  const [filterSafetyStatus, setFilterSafetyStatus] = useState<string>('all')
  const [filterDateFrom, setFilterDateFrom] = useState<string>('')
  const [filterDateTo, setFilterDateTo] = useState<string>('')
  const [viewTab, setViewTab] = useState<ViewTab>('individual')
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set())
  const [milkingGroups, setMilkingGroups] = useState<Map<string, string>>(new Map())
  const [availableSessions, setAvailableSessions] = useState<Array<{ id: string; name: string }>>([])
  
  const RECORDS_PER_PAGE = 10

  // Fetch milking sessions on mount
  React.useEffect(() => {
    if (!farmId) return

    const fetchMilkingSessions = async () => {
      try {
        console.log(`[SessionFilter] Fetching sessions for farm: ${farmId}`)
        const response = await fetch(`/api/farms/${farmId}/production/milking-sessions-list`)
        if (response.ok) {
          const result = await response.json()
          console.log('[SessionFilter] API Response:', result)
          console.log('[SessionFilter] Sessions to populate dropdown:', result.data?.map((s: any) => ({ id: s.id, name: s.name })))
          setAvailableSessions(result.data || [])
        } else {
          const error = await response.text()
          console.error('[SessionFilter] API returned error:', response.status, error)
        }
      } catch (error) {
        console.error('[SessionFilter] Error fetching milking sessions:', error)
        console.log('[SessionFilter] Using fallback default sessions')
        setAvailableSessions([
          { id: 'morning', name: 'Morning' },
          { id: 'afternoon', name: 'Afternoon' },
          { id: 'evening', name: 'Evening' },
        ])
      }
    }

    fetchMilkingSessions()
  }, [farmId])

  // Fetch milking group names on mount
  React.useEffect(() => {
    if (!farmId) return

    const fetchMilkingGroups = async () => {
      try {
        const response = await fetch(`/api/farms/${farmId}/production/milking-groups`)
        if (response.ok) {
          const result = await response.json()
          const groups = result.data || result
          const groupMap = new Map<string, string>()
          groups.forEach((group: any) => {
            groupMap.set(group.id, group.category_name)
          })
          setMilkingGroups(groupMap)
        }
      } catch (error) {
        console.error('Error fetching milking groups:', error)
      }
    }

    fetchMilkingGroups()
  }, [farmId])

  // Apply filters
  const filteredRecords = useMemo(() => {
    return records.filter(record => {
      // Session filter - use milking_session_id
      if (filterSession !== 'all' && record.milking_session_id !== filterSession) {
        return false
      }

      // Safety status filter
      if (filterSafetyStatus !== 'all' && record.milk_safety_status !== filterSafetyStatus) {
        return false
      }

      // Date range filter
      if (filterDateFrom && new Date(record.record_date) < new Date(filterDateFrom)) {
        return false
      }
      if (filterDateTo && new Date(record.record_date) > new Date(filterDateTo)) {
        return false
      }

      return true
    })
  }, [records, filterSession, filterSafetyStatus, filterDateFrom, filterDateTo])

  // Individual tab shows ALL records; Groups tab shows aggregated group data
  const individualRecords = useMemo(() => {
    return filteredRecords // Show all records regardless of recording_type
  }, [filteredRecords])

  // Group records by milking_group_id for groups view
  const groupedRecords = useMemo(() => {
    const groupMap = new Map<string | null, ProductionRecord[]>()
    
    filteredRecords
      .filter(r => r.recording_type === 'group')
      .forEach(record => {
        const groupId = record.milking_group_id || 'default'
        if (!groupMap.has(groupId)) {
          groupMap.set(groupId, [])
        }
        groupMap.get(groupId)!.push(record)
      })

    const groups: GroupData[] = Array.from(groupMap.entries()).map(([groupId, records]) => {
      const sortedByDate = [...records].sort((a, b) => 
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      )
      
      return {
        milking_group_id: groupId === 'default' ? null : groupId,
        totalMilkVolume: records.reduce((sum, r) => sum + (r.milk_volume || 0), 0),
        recordCount: records.length,
        mostRecentSession: sortedByDate[0] || null,
        animalRecords: records
      }
    })

    // Sort by most recent session date
    return groups.sort((a, b) => {
      const dateA = a.mostRecentSession?.created_at || ''
      const dateB = b.mostRecentSession?.created_at || ''
      return new Date(dateB).getTime() - new Date(dateA).getTime()
    })
  }, [filteredRecords])

  // Reset to page 1 when filters change
  const resetPagination = () => {
    setCurrentPage(1)
  }

  const handleViewTabChange = (tab: ViewTab) => {
    setViewTab(tab)
    setCurrentPage(1)
    setExpandedGroups(new Set())
  }

  const handleFilterSessionChange = (session: string) => {
    console.log('[SessionFilter] Selected session:', session)
    console.log('[SessionFilter] Available sessions:', availableSessions)
    setFilterSession(session)
    resetPagination()
  }

  const handleFilterSafetyChange = (safety: string) => {
    setFilterSafetyStatus(safety)
    resetPagination()
  }

  const handleFilterDateFromChange = (date: string) => {
    setFilterDateFrom(date)
    resetPagination()
  }

  const handleFilterDateToChange = (date: string) => {
    setFilterDateTo(date)
    resetPagination()
  }

  const clearFilters = () => {
    setFilterSession('all')
    setFilterSafetyStatus('all')
    setFilterDateFrom('')
    setFilterDateTo('')
    setCurrentPage(1)
  }
  
  const handleDelete = async (recordId: string) => {
    if (!confirm('Are you sure you want to delete this production record?')) {
      return
    }
    
    setDeletingId(recordId)
    
    try {
      const response = await fetch(`/api/production/${recordId}`, {
        method: 'DELETE',
      })
      
      if (!response.ok) {
        throw new Error('Failed to delete record')
      }
      
      if (onDelete) {
        onDelete(recordId)
      } else {
        window.location.reload()
      }
    } catch (error) {
      console.error('Error deleting record:', error)
      alert('Failed to delete record. Please try again.')
    } finally {
      setDeletingId(null)
    }
  }
  
  const getSessionBadgeColor = (sessionId?: string) => {
    // Get session name from availableSessions to determine color
    const sessionName = availableSessions.find(s => s.id === sessionId)?.name?.toLowerCase() || ''
    if (sessionName.includes('morning')) return 'bg-blue-100 text-blue-800'
    if (sessionName.includes('afternoon')) return 'bg-yellow-100 text-yellow-800'
    if (sessionName.includes('evening')) return 'bg-purple-100 text-purple-800'
    return 'bg-gray-100 text-gray-800'
  }

  const getSessionName = (sessionId?: string) => {
    return availableSessions.find(s => s.id === sessionId)?.name || sessionId || 'Unknown Session'
  }

  // Helper function to get first and last session times
  const getFirstAndLastSessionTimes = () => {
    if (availableSessions.length === 0) return { firstTime: '00:00', lastTime: '23:59' }
    // Assuming sessions in availableSessions are in configured order
    const firstSession = availableSessions[0]
    const lastSession = availableSessions[availableSessions.length - 1]
    return {
      firstTime: firstSession.id || '00:00',
      lastTime: lastSession.id || '23:59',
      firstSessionId: firstSession.id,
      lastSessionId: lastSession.id
    }
  }

  // Helper function to calculate the "milking cycle date" for a record
  // A cycle runs from first session to last session, potentially crossing calendar days
  const calculateMilkingCycleDate = (record: ProductionRecord) => {
    const { firstSessionId } = getFirstAndLastSessionTimes()
    if (!firstSessionId) return record.record_date
    
    // Get the index of the record's session in availableSessions
    const recordSessionIndex = availableSessions.findIndex(s => s.id === record.milking_session_id)
    const firstSessionIndex = availableSessions.findIndex(s => s.id === firstSessionId)
    
    // If the record's session comes before the first session in the configured order,
    // it belongs to the previous day's cycle
    if (recordSessionIndex < firstSessionIndex) {
      const prevDate = new Date(record.record_date)
      prevDate.setDate(prevDate.getDate() - 1)
      return prevDate.toISOString().split('T')[0]
    }
    
    return record.record_date
  }

  // Group records by milking cycle when "All Sessions" is selected
  const milkingCycleGroupedRecords = useMemo(() => {
    if (filterSession !== 'all') return null
    
    const cycleMap = new Map<string, ProductionRecord[]>()
    
    filteredRecords.forEach(record => {
      const cycleDate = calculateMilkingCycleDate(record)
      if (!cycleMap.has(cycleDate)) {
        cycleMap.set(cycleDate, [])
      }
      cycleMap.get(cycleDate)!.push(record)
    })
    
    return cycleMap
  }, [filteredRecords, filterSession, availableSessions])

  // Create daily summary data for individual animals view
  const dailySummaryRecords = useMemo(() => {
    if (!milkingCycleGroupedRecords) return null
    
    const summaries: Array<{
      cycleDate: string
      animal_id: string
      animalName: string
      animalTag: string
      totalMilkVolume: number
      recordCount: number
      avgFatContent: number | null
      avgProteinContent: number | null
      sessions: string[]
      records: ProductionRecord[]
    }> = []
    
    milkingCycleGroupedRecords.forEach((cycleRecords, cycleDate) => {
      const byAnimal = new Map<string, ProductionRecord[]>()
      
      cycleRecords.forEach(record => {
        const animalId = record.animal_id
        if (!byAnimal.has(animalId)) {
          byAnimal.set(animalId, [])
        }
        byAnimal.get(animalId)!.push(record)
      })
      
      byAnimal.forEach((animalRecords, animalId) => {
        const totalVolume = animalRecords.reduce((sum, r) => sum + (r.milk_volume || 0), 0)
        const fatRecords = animalRecords.filter(r => r.fat_content)
        const proteinRecords = animalRecords.filter(r => r.protein_content)
        const avgFat = fatRecords.length > 0 
          ? fatRecords.reduce((sum, r) => sum + (r.fat_content || 0), 0) / fatRecords.length
          : null
        const avgProtein = proteinRecords.length > 0
          ? proteinRecords.reduce((sum, r) => sum + (r.protein_content || 0), 0) / proteinRecords.length
          : null
        const sessions = [...new Set(animalRecords.map(r => r.milking_session_id).filter(Boolean as any))]
        
        summaries.push({
          cycleDate,
          animal_id: animalId,
          animalName: animalRecords[0].animals?.name || `Animal ${animalRecords[0].animals?.tag_number}`,
          animalTag: animalRecords[0].animals?.tag_number || '',
          totalMilkVolume: totalVolume,
          recordCount: animalRecords.length,
          avgFatContent: avgFat,
          avgProteinContent: avgProtein,
          sessions: sessions as string[],
          records: animalRecords
        })
      })
    })
    
    // Sort by cycle date (most recent first), then by animal name
    return summaries.sort((a, b) => {
      const dateCompare = new Date(b.cycleDate).getTime() - new Date(a.cycleDate).getTime()
      return dateCompare !== 0 ? dateCompare : a.animalName.localeCompare(b.animalName)
    })
  }, [milkingCycleGroupedRecords])

  // Create daily summary data for groups view
  const dailySummaryGroups = useMemo(() => {
    if (!milkingCycleGroupedRecords) return null
    
    const summaries: Array<{
      cycleDate: string
      milking_group_id: string | null
      groupName: string
      totalMilkVolume: number
      totalRecords: number
      avgFatContent: number | null
      avgProteinContent: number | null
      animalCount: number
      records: ProductionRecord[]
    }> = []
    
    milkingCycleGroupedRecords.forEach((cycleRecords, cycleDate) => {
      const byGroup = new Map<string | null, ProductionRecord[]>()
      
      cycleRecords.forEach(record => {
        const groupId = record.milking_group_id || 'default'
        if (!byGroup.has(groupId)) {
          byGroup.set(groupId, [])
        }
        byGroup.get(groupId)!.push(record)
      })
      
      byGroup.forEach((groupRecords, groupId) => {
        const totalVolume = groupRecords.reduce((sum, r) => sum + (r.milk_volume || 0), 0)
        const fatRecords = groupRecords.filter(r => r.fat_content)
        const proteinRecords = groupRecords.filter(r => r.protein_content)
        const avgFat = fatRecords.length > 0
          ? fatRecords.reduce((sum, r) => sum + (r.fat_content || 0), 0) / fatRecords.length
          : null
        const avgProtein = proteinRecords.length > 0
          ? proteinRecords.reduce((sum, r) => sum + (r.protein_content || 0), 0) / proteinRecords.length
          : null
        const uniqueAnimals = new Set(groupRecords.map(r => r.animal_id)).size
        const actualGroupId = groupId === 'default' ? null : (groupId as string)
        const groupName = groupId !== 'default' ? milkingGroups.get(groupId as string) : null
        
        summaries.push({
          cycleDate,
          milking_group_id: actualGroupId,
          groupName: groupName || (groupId === 'default' ? 'Default Group' : `Milking Group ${groupId}`),
          totalMilkVolume: totalVolume,
          totalRecords: groupRecords.length,
          avgFatContent: avgFat,
          avgProteinContent: avgProtein,
          animalCount: uniqueAnimals,
          records: groupRecords
        })
      })
    })
    
    // Sort by cycle date (most recent first), then by group name
    return summaries.sort((a, b) => {
      const dateCompare = new Date(b.cycleDate).getTime() - new Date(a.cycleDate).getTime()
      return dateCompare !== 0 ? dateCompare : a.groupName.localeCompare(b.groupName)
    })
  }, [milkingCycleGroupedRecords, milkingGroups])

  // Pagination - now declared after all summary memos
  const displayData = useMemo(() => {
    if (filterSession === 'all') {
      return viewTab === 'individual' ? (dailySummaryRecords || []) : (dailySummaryGroups || [])
    }
    return viewTab === 'individual' ? individualRecords : groupedRecords
  }, [filterSession, viewTab, dailySummaryRecords, dailySummaryGroups, individualRecords, groupedRecords])
  
  const totalPages = Math.ceil(displayData.length / RECORDS_PER_PAGE)
  const startIndex = (currentPage - 1) * RECORDS_PER_PAGE
  const endIndex = startIndex + RECORDS_PER_PAGE
  const paginatedData = displayData.slice(startIndex, endIndex)

  const getSafetyStatusBadge = (status?: string) => {
    switch (status) {
      case 'safe':
        return { label: 'Safe', color: 'bg-green-100 text-green-800', icon: CheckCircle }
      case 'unsafe_health':
        return { label: 'Unsafe - Health', color: 'bg-red-100 text-red-800', icon: AlertTriangle }
      case 'unsafe_colostrum':
        return { label: 'Colostrum', color: 'bg-yellow-100 text-yellow-800', icon: AlertTriangle }
      default:
        return { label: 'Unknown', color: 'bg-gray-100 text-gray-800', icon: AlertTriangle }
    }
  }
  
  const getQualityIndicator = (fatContent?: number, proteinContent?: number) => {
    if (!fatContent || !proteinContent) return null
    const fatGood = fatContent >= 3.5 && fatContent <= 4.5
    const proteinGood = proteinContent >= 3.0 && proteinContent <= 3.5
    if (fatGood && proteinGood) return { label: 'Excellent', color: 'bg-green-100 text-green-800' }
    if (fatGood || proteinGood) return { label: 'Good', color: 'bg-yellow-100 text-yellow-800' }
    return { label: 'Needs Attention', color: 'bg-red-100 text-red-800' }
  }

  const getRecordingTypeBadge = (recordingType?: string) => {
    switch (recordingType) {
      case 'group':
        return { label: 'Group Recording', color: 'bg-purple-100 text-purple-800', icon: Users }
      case 'individual':
      default:
        return { label: 'Individual Recording', color: 'bg-blue-100 text-blue-800', icon: Droplets }
    }
  }
  
  if (records.length === 0) {
    return (
      <div className="text-center py-12">
        <Droplets className="mx-auto h-12 w-12 text-gray-400" />
        <h3 className="mt-4 text-lg font-medium text-gray-900">No production records</h3>
        <p className="mt-2 text-sm text-gray-500">
          Start by recording your first milk production data.
        </p>
        <Button className="mt-4">
          <Droplets className="mr-2 h-4 w-4" />
          Record Production
        </Button>
      </div>
    )
  }
  
  return (
    <div className="space-y-6">
      {/* Filter Section */}
      <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold text-gray-900 flex items-center">
            <Filter className="w-4 h-4 mr-2" />
            Filter Records
          </h3>
          {(filterSession !== 'all' || filterSafetyStatus !== 'all' || filterDateFrom || filterDateTo) && (
            <Button 
              variant="ghost" 
              size="sm"
              onClick={clearFilters}
              className="text-blue-600 hover:text-blue-700"
            >
              Clear All
            </Button>
          )}
        </div>

        <div className={`grid gap-3 ${isMobile ? 'grid-cols-1' : 'grid-cols-1 md:grid-cols-2 lg:grid-cols-4'}`}>
          {/* Session Filter */}
          <div>
            <label htmlFor="filter-session" className="block text-xs font-medium text-gray-700 mb-1">
              Milking Session
            </label>
            <select
              id="filter-session"
              value={filterSession}
              onChange={(e) => handleFilterSessionChange(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-farm-green"
            >
              <option value="all">All Sessions</option>
              {availableSessions.map((session) => (
                <option key={session.id} value={session.id}>
                  {session.name}
                </option>
              ))}
            </select>
          </div>

          {/* Safety Status Filter */}
          <div>
            <label htmlFor="filter-safety" className="block text-xs font-medium text-gray-700 mb-1">
              Milk Safety Status
            </label>
            <select
              id="filter-safety"
              value={filterSafetyStatus}
              onChange={(e) => handleFilterSafetyChange(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-farm-green"
            >
              <option value="all">All Status</option>
              <option value="safe">Safe</option>
              <option value="unsafe_health">Unsafe - Health</option>
              <option value="unsafe_colostrum">Colostrum</option>
            </select>
          </div>

          {/* Date From Filter */}
          <div>
            <label htmlFor="filter-date-from" className="block text-xs font-medium text-gray-700 mb-1">
              From Date
            </label>
            <input
              id="filter-date-from"
              type="date"
              value={filterDateFrom}
              onChange={(e) => handleFilterDateFromChange(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-farm-green"
            />
          </div>

          {/* Date To Filter */}
          <div>
            <label htmlFor="filter-date-to" className="block text-xs font-medium text-gray-700 mb-1">
              To Date
            </label>
            <input
              id="filter-date-to"
              type="date"
              value={filterDateTo}
              onChange={(e) => handleFilterDateToChange(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-farm-green"
            />
          </div>
        </div>

        {/* Filter Results Summary */}
        <div className="mt-3 pt-3 border-t border-gray-200">
          <p className="text-xs text-gray-600">
            {filterSession === 'all' ? (
              <>
                Showing <span className="font-semibold">{paginatedData.length}</span> of <span className="font-semibold">{displayData.length}</span> daily {viewTab === 'individual' ? 'animal totals' : 'group totals'}
              </>
            ) : (
              <>
                Showing <span className="font-semibold">{paginatedData.length}</span> of <span className="font-semibold">{displayData.length}</span> {viewTab === 'individual' ? 'records' : 'groups'}
                {displayData.length < filteredRecords.length && ` (${filteredRecords.length - displayData.length} filtered out)`}
              </>
            )}
          </p>
        </div>
      </div>

      {/* View Tab Selector */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200">
        <div className="flex items-center p-1">
          <button
            onClick={() => handleViewTabChange('individual')}
            className={`flex-1 px-4 py-3 rounded-lg font-semibold text-sm transition-all duration-200 flex items-center justify-center space-x-2 ${
              viewTab === 'individual'
                ? 'bg-gradient-to-r from-farm-green/20 to-farm-green/10 text-farm-green shadow-sm border border-farm-green/30'
                : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
            }`}
          >
            <Droplets className={`w-4 h-4 ${viewTab === 'individual' ? 'text-farm-green' : 'text-gray-400'}`} />
            <span>Individual Animals</span>
          </button>
          <button
            onClick={() => handleViewTabChange('groups')}
            className={`flex-1 px-4 py-3 rounded-lg font-semibold text-sm transition-all duration-200 flex items-center justify-center space-x-2 ${
              viewTab === 'groups'
                ? 'bg-gradient-to-r from-farm-green/20 to-farm-green/10 text-farm-green shadow-sm border border-farm-green/30'
                : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
            }`}
          >
            <Users className={`w-4 h-4 ${viewTab === 'groups' ? 'text-farm-green' : 'text-gray-400'}`} />
            <span>Milking Groups</span>
          </button>
        </div>
      </div>

      {/* Records List */}
      {paginatedData.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 rounded-lg border border-gray-200">
          <Droplets className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-4 text-lg font-medium text-gray-900">No {viewTab === 'individual' ? 'records' : 'groups'} match your filters</h3>
          <p className="mt-2 text-sm text-gray-500">
            Try adjusting your filter criteria
          </p>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={clearFilters}
            className="mt-4"
          >
            Clear Filters
          </Button>
        </div>
      ) : filterSession === 'all' && viewTab === 'individual' && dailySummaryRecords ? (
        // Daily totals view for individual animals
        <div className="space-y-4">
          {dailySummaryRecords.map((summary, idx) => {
            const qualityIndicator = getQualityIndicator(summary.avgFatContent || undefined, summary.avgProteinContent || undefined)
            
            return (
              <Card key={`summary-${summary.cycleDate}-${summary.animal_id}`} className="hover:shadow-md transition-shadow overflow-hidden">
                <CardContent className="p-4 md:p-6">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start space-x-4 flex-1 min-w-0">
                      <div className="flex-shrink-0">
                        <div className="w-12 h-12 bg-farm-green/10 rounded-lg flex items-center justify-center">
                          <Droplets className="w-6 h-6 text-farm-green" />
                        </div>
                      </div>
                      
                      <div className="min-w-0 flex-1">
                        {/* Header Row */}
                        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2 mb-3">
                          <div>
                            <h4 className="text-base md:text-lg font-semibold text-gray-900 truncate">
                              {summary.animalName}
                            </h4>
                            <p className="text-xs md:text-sm text-gray-600">
                              Tag: {summary.animalTag}
                            </p>
                          </div>

                          <div className="flex flex-wrap items-center gap-2">
                            <Badge className="bg-blue-100 text-blue-800">
                              <Calendar className="w-3 h-3 mr-1" />
                              {formatDate(summary.cycleDate)}
                            </Badge>
                            <Badge className="bg-indigo-100 text-indigo-800">
                              <Clock className="w-3 h-3 mr-1" />
                              {summary.recordCount} session{summary.recordCount !== 1 ? 's' : ''}
                            </Badge>
                            {qualityIndicator && (
                              <Badge className={qualityIndicator.color}>
                                {qualityIndicator.label}
                              </Badge>
                            )}
                          </div>
                        </div>
                        
                        {/* Production Metrics Grid */}
                        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-2">
                          <div className="text-center p-2 md:p-3 bg-blue-50 rounded">
                            <p className="text-lg md:text-2xl font-bold text-blue-600">{summary.totalMilkVolume.toFixed(1)}</p>
                            <p className="text-xs text-blue-600 font-medium">Total Liters</p>
                          </div>
                          {summary.avgFatContent !== null && (
                            <div className="text-center p-2 md:p-3 bg-orange-50 rounded">
                              <p className="text-base md:text-xl font-bold text-orange-600">{summary.avgFatContent.toFixed(2)}%</p>
                              <p className="text-xs text-orange-600 font-medium">Avg Fat</p>
                            </div>
                          )}
                          {summary.avgProteinContent !== null && (
                            <div className="text-center p-2 md:p-3 bg-green-50 rounded">
                              <p className="text-base md:text-xl font-bold text-green-600">{summary.avgProteinContent.toFixed(2)}%</p>
                              <p className="text-xs text-green-600 font-medium">Avg Protein</p>
                            </div>
                          )}
                          <div className="text-center p-2 md:p-3 bg-purple-50 rounded">
                            <p className="text-base md:text-lg font-bold text-purple-600">{summary.recordCount}</p>
                            <p className="text-xs text-purple-600 font-medium">Records</p>
                          </div>
                        </div>

                        {/* Sessions in this cycle */}
                        <div className="mt-4 pt-4 border-t border-gray-200">
                          <p className="text-xs font-semibold text-gray-600 mb-2">Sessions in cycle:</p>
                          <div className="flex flex-wrap gap-2">
                            {summary.sessions.map(sessionId => (
                              <Badge key={sessionId} className={getSessionBadgeColor(sessionId)}>
                                {getSessionName(sessionId)}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      ) : filterSession === 'all' && viewTab === 'groups' && dailySummaryGroups ? (
        // Daily totals view for milking groups
        <div className="space-y-4">
          {dailySummaryGroups.map((summary) => {
            const qualityIndicator = getQualityIndicator(summary.avgFatContent || undefined, summary.avgProteinContent || undefined)
            
            return (
              <Card key={`group-summary-${summary.cycleDate}-${summary.milking_group_id}`} className="hover:shadow-md transition-shadow overflow-hidden">
                <CardContent className="p-4 md:p-6">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start space-x-4 flex-1 min-w-0">
                      <div className="flex-shrink-0">
                        <div className="w-12 h-12 bg-farm-green/10 rounded-lg flex items-center justify-center">
                          <Users className="w-6 h-6 text-farm-green" />
                        </div>
                      </div>
                      
                      <div className="min-w-0 flex-1">
                        {/* Header Row */}
                        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2 mb-3">
                          <div>
                            <h4 className="text-base md:text-lg font-semibold text-gray-900 truncate">
                              {summary.groupName}
                            </h4>
                            <p className="text-xs md:text-sm text-gray-600">
                              {summary.animalCount} animal{summary.animalCount !== 1 ? 's' : ''} • {summary.totalRecords} milking record{summary.totalRecords !== 1 ? 's' : ''}
                            </p>
                          </div>

                          <div className="flex flex-wrap items-center gap-2">
                            <Badge className="bg-blue-100 text-blue-800">
                              <Calendar className="w-3 h-3 mr-1" />
                              {formatDate(summary.cycleDate)}
                            </Badge>
                            {qualityIndicator && (
                              <Badge className={qualityIndicator.color}>
                                {qualityIndicator.label}
                              </Badge>
                            )}
                          </div>
                        </div>
                        
                        {/* Production Metrics Grid */}
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                          <div className="text-center p-2 md:p-3 bg-blue-50 rounded">
                            <p className="text-lg md:text-2xl font-bold text-blue-600">{summary.totalMilkVolume.toFixed(1)}</p>
                            <p className="text-xs text-blue-600 font-medium">Total Liters</p>
                          </div>
                          {summary.avgFatContent !== null && (
                            <div className="text-center p-2 md:p-3 bg-orange-50 rounded">
                              <p className="text-base md:text-xl font-bold text-orange-600">{summary.avgFatContent.toFixed(2)}%</p>
                              <p className="text-xs text-orange-600 font-medium">Avg Fat</p>
                            </div>
                          )}
                          {summary.avgProteinContent !== null && (
                            <div className="text-center p-2 md:p-3 bg-green-50 rounded">
                              <p className="text-base md:text-xl font-bold text-green-600">{summary.avgProteinContent.toFixed(2)}%</p>
                              <p className="text-xs text-green-600 font-medium">Avg Protein</p>
                            </div>
                          )}
                          <div className="text-center p-2 md:p-3 bg-purple-50 rounded">
                            <p className="text-base md:text-lg font-bold text-purple-600">{summary.totalRecords}</p>
                            <p className="text-xs text-purple-600 font-medium">Records</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      ) : viewTab === 'individual' ? (
        // Individual records view
        <div className="space-y-4">
          {(paginatedData as any[]).map((record) => {
            const qualityIndicator = getQualityIndicator(record.avgFatContent || undefined, record.avgProteinContent || undefined)
            const safetyStatus = getSafetyStatusBadge(record.milk_safety_status)
            const recordingTypeBadge = getRecordingTypeBadge(record.recording_type)
            const SafetyIcon = safetyStatus.icon
            const RecordingTypeIcon = recordingTypeBadge.icon
            
            return (
              <Card key={record.id} className="hover:shadow-md transition-shadow overflow-hidden">
                <CardContent className="p-4 md:p-6">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start space-x-4 flex-1 min-w-0">
                      <div className="flex-shrink-0">
                        <div className="w-12 h-12 bg-farm-green/10 rounded-lg flex items-center justify-center">
                          <Droplets className="w-6 h-6 text-farm-green" />
                        </div>
                      </div>
                      
                      <div className="min-w-0 flex-1">
                        {/* Header Row */}
                        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2 mb-3">
                          <div>
                            <h4 className="text-base md:text-lg font-semibold text-gray-900 truncate">
                              {record.animals?.name || `Animal ${record.animals?.tag_number}`}
                            </h4>
                            <p className="text-xs md:text-sm text-gray-600">
                              Tag: {record.animals?.tag_number}
                            </p>
                          </div>

                          <div className="flex flex-wrap items-center gap-2">
                            <Badge className={getSessionBadgeColor(record.milking_session_id)}>
                              <Clock className="w-3 h-3 mr-1" />
                              {getSessionName(record.milking_session_id)}
                            </Badge>
                            <Badge className={safetyStatus.color}>
                              <SafetyIcon className="w-3 h-3 mr-1" />
                              {safetyStatus.label}
                            </Badge>
                            <Badge className={recordingTypeBadge.color}>
                              <RecordingTypeIcon className="w-3 h-3 mr-1" />
                              {recordingTypeBadge.label}
                            </Badge>
                            {qualityIndicator && (
                              <Badge className={qualityIndicator.color}>
                                {qualityIndicator.label}
                              </Badge>
                            )}
                          </div>
                        </div>
                        
                        {/* Date Info */}
                        <div className="flex items-center space-x-4 text-xs md:text-sm text-gray-600 mb-4">
                          <span className="flex items-center">
                            <Calendar className="w-4 h-4 mr-1" />
                            {formatDate(record.record_date)}
                          </span>
                          <span className="text-gray-400">•</span>
                          <span className="text-gray-500">
                            Recorded: {formatDateTime(record.created_at)}
                          </span>
                        </div>
                        
                        {/* Production Metrics Grid */}
                        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2 mb-4">
                          <div className="text-center p-2 md:p-3 bg-blue-50 rounded">
                            <p className="text-lg md:text-2xl font-bold text-blue-600">{record.milk_volume}</p>
                            <p className="text-xs text-blue-600 font-medium">Liters</p>
                          </div>
                          {record.fat_content && (
                            <div className="text-center p-2 md:p-3 bg-orange-50 rounded">
                              <p className="text-base md:text-xl font-bold text-orange-600">{record.fat_content}%</p>
                              <p className="text-xs text-orange-600 font-medium">Fat</p>
                            </div>
                          )}
                          {record.protein_content && (
                            <div className="text-center p-2 md:p-3 bg-green-50 rounded">
                              <p className="text-base md:text-xl font-bold text-green-600">{record.protein_content}%</p>
                              <p className="text-xs text-green-600 font-medium">Protein</p>
                            </div>
                          )}
                          {record.somatic_cell_count && (
                            <div className="text-center p-2 md:p-3 bg-purple-50 rounded">
                              <p className="text-sm md:text-base font-bold text-purple-600">
                                {(record.somatic_cell_count / 1000).toFixed(0)}k
                              </p>
                              <p className="text-xs text-purple-600 font-medium">SCC</p>
                            </div>
                          )}
                          {record.temperature && (
                            <div className="text-center p-2 md:p-3 bg-red-50 rounded">
                              <p className="text-base md:text-xl font-bold text-red-600">{record.temperature}°C</p>
                              <p className="text-xs text-red-600 font-medium">Temp</p>
                            </div>
                          )}
                          {record.ph_level && (
                            <div className="text-center p-2 md:p-3 bg-indigo-50 rounded">
                              <p className="text-base md:text-xl font-bold text-indigo-600">{record.ph_level}</p>
                              <p className="text-xs text-indigo-600 font-medium">pH</p>
                            </div>
                          )}
                        </div>
                        
                        {/* Notes Section */}
                        {record.notes && (
                          <div className="mb-3 p-3 bg-gray-50 rounded border border-gray-200">
                            <p className="text-xs md:text-sm text-gray-700">
                              <span className="font-semibold block mb-1">Notes:</span> 
                              <span className="text-gray-600">{record.notes}</span>
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                    
                    {/* Action Buttons */}
                    {canEdit && (
                      <div className="flex-shrink-0 flex items-center gap-2">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                              <MoreHorizontal className="w-4 h-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => onView?.(record)} className="cursor-pointer flex items-center">
                              <Eye className="w-4 h-4 mr-2" />
                              View Details
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => onEdit?.(record)} className="cursor-pointer flex items-center">
                              <Edit className="w-4 h-4 mr-2" />
                              Edit Record
                            </DropdownMenuItem>
                            <DropdownMenuItem 
                              onClick={() => handleDelete(record.id)}
                              disabled={deletingId === record.id}
                              className="cursor-pointer flex items-center text-red-600 focus:text-red-600 focus:bg-red-50"
                            >
                              <Trash2 className="w-4 h-4 mr-2" />
                              {deletingId === record.id ? 'Deleting...' : 'Delete'}
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      ) : (
        // Groups view
        <div className="space-y-4">
          {(paginatedData as any[]).map((summary: any, index) => {
            const isExpanded = expandedGroups.has(summary.milking_group_id || 'default')
            const recentQuality = getQualityIndicator(summary.avgFatContent || undefined, summary.avgProteinContent || undefined)
            const mostRecent = summary.records && summary.records.length > 0 ? summary.records[0] : null
            const recentSafety = mostRecent ? getSafetyStatusBadge(mostRecent.milk_safety_status) : null
            const RecentSafetyIcon = recentSafety?.icon
            const displayGroupName = summary.groupName || summary.milking_group_id || `Milking Group ${index + 1}`
            
            return (
              <Card key={`group-${index}`} className="hover:shadow-md transition-shadow overflow-hidden">
                <CardContent className="p-4 md:p-6">
                  {/* Group Header */}
                  <button
                    onClick={() => {
                      const newSet = new Set(expandedGroups)
                      const groupKey = summary.milking_group_id || 'default'
                      if (newSet.has(groupKey)) {
                        newSet.delete(groupKey)
                      } else {
                        newSet.add(groupKey)
                      }
                      setExpandedGroups(newSet)
                    }}
                    className="w-full text-left"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex items-start space-x-4 flex-1 min-w-0">
                        <div className="flex-shrink-0">
                          <div className="w-12 h-12 bg-farm-green/10 rounded-lg flex items-center justify-center">
                            <Users className="w-6 h-6 text-farm-green" />
                          </div>
                        </div>
                        
                        <div className="min-w-0 flex-1">
                          <h4 className="text-base md:text-lg font-semibold text-gray-900">
                            {displayGroupName}
                          </h4>
                          <p className="text-sm text-gray-600 mt-1">
                            {summary.animalCount || summary.recordCount || summary.totalRecords} animal{summary.animalCount !== 1 ? 's' : ''} recorded
                          </p>
                          
                          {/* Most Recent Session Info */}
                          {mostRecent && (
                            <div className="mt-3 space-y-2">
                              <p className="text-xs text-gray-600">
                                <span className="font-semibold">Most Recent Session:</span> {formatDateTime(mostRecent.created_at)}
                              </p>
                              <div className="flex flex-wrap items-center gap-2">
                                <Badge className={getSessionBadgeColor(mostRecent.milking_session_id)}>
                                  <Clock className="w-3 h-3 mr-1" />
                                  {getSessionName(mostRecent.milking_session_id)}
                                </Badge>
                                {RecentSafetyIcon && (
                                  <Badge className={recentSafety?.color}>
                                    <RecentSafetyIcon className="w-3 h-3 mr-1" />
                                    {recentSafety?.label}
                                  </Badge>
                                )}
                                {recentQuality && (
                                  <Badge className={recentQuality.color}>
                                    {recentQuality.label}
                                  </Badge>
                                )}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                      
                      {/* Group Stats */}
                      <div className="flex-shrink-0 text-right">
                        <div className="text-2xl font-bold text-farm-green">
                          {summary.totalMilkVolume.toFixed(1)}
                        </div>
                        <p className="text-xs text-gray-600 font-medium">Total Liters</p>
                        <div className="mt-3 text-gray-500 hover:text-gray-700 flex justify-end pointer-events-none">
                          <ChevronDown 
                            className={`w-5 h-5 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                          />
                        </div>
                      </div>
                    </div>
                  </button>
                  
                  {/* Expanded Animals List */}
                  {isExpanded && (
                    <div className="mt-6 pt-6 border-t border-gray-200 space-y-3">
                      <h5 className="font-semibold text-gray-900 mb-3">Animals in this group:</h5>
                      {summary.records.map((record: ProductionRecord) => {
                        const recordingTypeBadge = getRecordingTypeBadge(record.recording_type)
                        const RecordingTypeIcon = recordingTypeBadge.icon
                        
                        return (
                          <div
                            key={record.id}
                            className="p-3 bg-gray-50 rounded-lg border border-gray-200 hover:border-gray-300 transition-colors"
                          >
                            <div className="flex items-start justify-between">
                              <div className="flex-1">
                                <p className="font-medium text-gray-900">
                                  {record.animals?.name || `Animal #${record.animals?.tag_number}`}
                                </p>
                                <p className="text-xs text-gray-600 mt-1">
                                  Tag: {record.animals?.tag_number}
                                </p>
                                <div className="flex items-center space-x-3 mt-2 text-xs text-gray-600">
                                  <span className="flex items-center">
                                    <Droplets className="w-3 h-3 mr-1" />
                                    {record.milk_volume}L
                                  </span>
                                  <span className="flex items-center">
                                    <Clock className="w-3 h-3 mr-1" />
                                    {getSessionName(record.milking_session_id)}
                                  </span>
                                  <span>{formatDate(record.record_date)}</span>
                                </div>
                                <div className="mt-2">
                                  <Badge className={recordingTypeBadge.color}>
                                    <RecordingTypeIcon className="w-3 h-3 mr-1" />
                                    {recordingTypeBadge.label}
                                  </Badge>
                                </div>
                              </div>
                              {canEdit && (
                                <DropdownMenu>
                                  <DropdownMenuTrigger asChild>
                                    <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                                      <MoreHorizontal className="w-4 h-4" />
                                    </Button>
                                  </DropdownMenuTrigger>
                                  <DropdownMenuContent align="end">
                                    <DropdownMenuItem onClick={() => onView?.(record)} className="cursor-pointer flex items-center">
                                      <Eye className="w-4 h-4 mr-2" />
                                      View Details
                                    </DropdownMenuItem>
                                    <DropdownMenuItem onClick={() => onEdit?.(record)} className="cursor-pointer flex items-center">
                                      <Edit className="w-4 h-4 mr-2" />
                                      Edit Record
                                    </DropdownMenuItem>
                                    <DropdownMenuItem 
                                      onClick={() => handleDelete(record.id)}
                                      disabled={deletingId === record.id}
                                      className="cursor-pointer flex items-center text-red-600 focus:text-red-600 focus:bg-red-50"
                                    >
                                      <Trash2 className="w-4 h-4 mr-2" />
                                      {deletingId === record.id ? 'Deleting...' : 'Delete'}
                                    </DropdownMenuItem>
                                  </DropdownMenuContent>
                                </DropdownMenu>
                              )}
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  )}
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}

      {/* Pagination Controls */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border border-gray-200">
          <div className="text-sm text-gray-600">
            Page <span className="font-semibold">{currentPage}</span> of <span className="font-semibold">{totalPages}</span>
            <span className="ml-3">
              ({startIndex + 1}-{Math.min(endIndex, filteredRecords.length)} of {filteredRecords.length})
            </span>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
              disabled={currentPage === 1}
              className="flex items-center gap-1"
            >
              <ChevronLeft className="w-4 h-4" />
              Previous
            </Button>

            <div className="flex items-center gap-1">
              {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                <Button
                  key={page}
                  variant={currentPage === page ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setCurrentPage(page)}
                  className="w-8 h-8 p-0"
                >
                  {page}
                </Button>
              ))}
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
              disabled={currentPage === totalPages}
              className="flex items-center gap-1"
            >
              Next
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
