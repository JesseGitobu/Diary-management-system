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
import { RecordProductionModal } from './RecordProductionModal'

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
  mastitis_test_performed?: boolean
  mastitis_result?: 'negative' | 'mild' | 'severe' | null
  affected_quarters?: string[] | null
  animals?: {
    id: string
    tag_number: string
    name?: string
  }
}

interface GroupData {
  milking_group_id: string | null
  groupName: string
  totalMilkVolume: number
  recordCount: number
  mostRecentSession: ProductionRecord | null
  animalRecords: ProductionRecord[]
}

interface MilkingGroup {
  id: string
  category_id: string
  category_name: string
}

interface ProductionRecordsListProps {
  records: ProductionRecord[]
  canEdit: boolean
  farmId?: string
  animals?: Array<{
    id: string
    tag_number: string
    name?: string
    gender: string
    production_status: string
  }>
  settings?: any
  onEdit?: (record: ProductionRecord) => void
  onDelete?: (recordId: string) => void
  onView?: (record: ProductionRecord) => void
  isMobile?: boolean
  onFetchDateRange?: (startDate?: string, endDate?: string) => Promise<void>
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
  animals = [],
  settings = null,
  onEdit,
  onDelete,
  onView,
  isMobile = false,
  onFetchDateRange
}: ProductionRecordsListProps) {
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [currentPage, setCurrentPage] = useState(1)
  const [filterSession, setFilterSession] = useState<string>('all')
  const [filterSafetyStatus, setFilterSafetyStatus] = useState<string>('all')
  const [filterDateFrom, setFilterDateFrom] = useState<string>('')
  const [filterDateTo, setFilterDateTo] = useState<string>('')
  const [filterDateToTouched, setFilterDateToTouched] = useState(false) // Track if user has focused on "To Date"
  const [viewTab, setViewTab] = useState<ViewTab>('individual')
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set())
  const [milkingGroups, setMilkingGroups] = useState<Map<string, string>>(new Map())
  const [groupToCategory, setGroupToCategory] = useState<Map<string, string>>(new Map()) // group ID → category ID
  const [availableCategories, setAvailableCategories] = useState<Array<{ id: string; name: string }>>([])
  const [filterCategory, setFilterCategory] = useState<string>('all')
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [editingRecord, setEditingRecord] = useState<ProductionRecord | null>(null)
  const [editingRecordType, setEditingRecordType] = useState<'individual' | 'group' | undefined>(undefined)
  const [editingGroupName, setEditingGroupName] = useState<string | undefined>(undefined)
  const [availableSessions, setAvailableSessions] = useState<Array<{ id: string; name: string }>>([])
  const [expandedSessions, setExpandedSessions] = useState<Set<string>>(new Set())
  const [selectedSession, setSelectedSession] = useState<string | null>(null) // Format: "${cycleDate}-${animalId}|${sessionId}"
  const [activeSessionBadge, setActiveSessionBadge] = useState<Record<string, string>>({}) // summaryKey → sessionId
  const [loadedDateRange, setLoadedDateRange] = useState<{ from: string; to: string } | null>(null)
  const [expandedGroupAnimals, setExpandedGroupAnimals] = useState<Set<string>>(new Set())
  const [expandedAnimalDetails, setExpandedAnimalDetails] = useState<Set<string>>(new Set()) // Track expanded animal details
  const RECORDS_PER_PAGE = 10



  // Fetch milking sessions on mount
  React.useEffect(() => {
    if (!farmId) return

    const fetchMilkingSessions = async () => {
      try {
        const response = await fetch(`/api/farms/${farmId}/production/milking-sessions-list`)
        if (response.ok) {
          const result = await response.json()
          const sessions = result.data || []

          // Store ALL sessions (with duplicates) for UUID→name mapping
          // Component will deduplicate only for dropdown display
          setAvailableSessions(sessions)
        }
      } catch (error) {
        setAvailableSessions([
          { id: 'morning', name: 'Morning' },
          { id: 'afternoon', name: 'Afternoon' },
          { id: 'evening', name: 'Evening' },
        ])
      }
    }

    fetchMilkingSessions()
  }, [farmId])

  // Fetch milking group names and categories on mount
  React.useEffect(() => {
    if (!farmId) return

    const fetchMilkingGroups = async () => {
      try {
        const response = await fetch(`/api/farms/${farmId}/production/milking-groups`)
        if (response.ok) {
          const result = await response.json()
          const groups = result.data || result
          const groupMap = new Map<string, string>()
          const groupToCategoryMap = new Map<string, string>()
          const categoriesMap = new Map<string, string>()

          groups.forEach((group: any) => {
            groupMap.set(group.id, group.category_name)
            if (group.category_id) {
              groupToCategoryMap.set(group.id, group.category_id)
              categoriesMap.set(group.category_id, group.category_name)
            }
          })

          setMilkingGroups(groupMap)
          setGroupToCategory(groupToCategoryMap)
          setAvailableCategories(Array.from(categoriesMap, ([id, name]) => ({ id, name })))
        }
      } catch (error) {
      }
    }

    fetchMilkingGroups()
  }, [farmId])

  // Smart date range fetching: if user filters to a date outside loaded range, fetch those records
  React.useEffect(() => {
    if (!onFetchDateRange || !filterDateTo || !filterDateFrom) {
      return
    }

    // Only fetch if the user has explicitly set the "To Date" filter
    if (filterDateToTouched) {
      // Fetch records for this date range to ensure they're loaded
      onFetchDateRange(filterDateFrom, filterDateTo).catch((error: any) => {
      })
    }
  }, [filterDateFrom, filterDateTo, filterDateToTouched, onFetchDateRange])

  // UUID → session name map (all pairs, no dedup — needed so every UUID resolves)
  const sessionNameMap = useMemo(() => {
    const map = new Map(availableSessions.map(s => [s.id, s.name]))
    return map
  }, [availableSessions])

  // Deduplicated sessions for dropdown display (by name only)
  const dedupedSessions = useMemo(() => {
    const seenNames = new Set<string>()
    const deduped = availableSessions.filter((session) => {
      if (seenNames.has(session.name)) {
        return false
      }
      seenNames.add(session.name)
      return true
    })
    return deduped
  }, [availableSessions])

  // Apply filters
  const filteredRecords = useMemo(() => {
    const result = records.filter((record, index) => {
      // Date range filter - only apply if values are actually set
      // filterDateFrom has a default value (today), so check if it's set
      if (filterDateFrom && filterDateFrom.trim() !== '') {
        const recordDate = new Date(record.record_date).toISOString().split('T')[0]
        const filterDate = filterDateFrom
        if (recordDate < filterDate) {
          return false
        }
      }
      
      // Only check "to date" if it's explicitly set (not empty)
      if (filterDateTo && filterDateTo.trim() !== '') {
        const recordDate = new Date(record.record_date).toISOString().split('T')[0]
        const filterDate = filterDateTo
        if (recordDate > filterDate) {
          return false
        }
      }

      // Session filter — compare by resolved name so all UUIDs for the same session type match
      if (filterSession !== 'all') {
        const recordSessionId = record.milking_session_id || ''
        const recordSessionName = sessionNameMap.get(recordSessionId) || null

        if (recordSessionName !== filterSession) {
          return false
        }
      }

      // Safety status filter
      if (filterSafetyStatus !== 'all' && record.milk_safety_status !== filterSafetyStatus) {
        return false
      }

      // Category filter
      if (filterCategory !== 'all' && record.milking_group_id) {
        const recordCategoryId = groupToCategory.get(record.milking_group_id)
        if (recordCategoryId !== filterCategory) return false
      }

      return true
    })

    return result
  }, [records, filterSession, filterSafetyStatus, filterCategory, filterDateFrom, filterDateTo, groupToCategory, sessionNameMap])

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
      const resolvedName = groupId !== 'default' ? milkingGroups.get(groupId as string) : undefined

      return {
        milking_group_id: groupId === 'default' ? null : groupId,
        groupName: resolvedName || (groupId === 'default' ? 'Default Group' : 'Milking Group'),
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
  }, [filteredRecords, milkingGroups])

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
    setFilterSession(session)
    resetPagination()
  }

  const handleFilterSafetyChange = (safety: string) => {
    setFilterSafetyStatus(safety)
    resetPagination()
  }

  const handleFilterCategoryChange = (category: string) => {
    setFilterCategory(category)
    resetPagination()
  }

  const handleFilterDateFromChange = (date: string) => {
    setFilterDateFrom(date)
    resetPagination()
  }

  const handleFilterDateToChange = (date: string) => {
    // Only accept changes if the user has actually focused on this field
    if (!filterDateToTouched) {
      return
    }
    setFilterDateTo(date)
    resetPagination()
  }

  const clearFilters = () => {
    setFilterSession('all')
    setFilterSafetyStatus('all')
    setFilterCategory('all')
    setFilterDateFrom('')
    setFilterDateTo('')
    setFilterDateToTouched(false) // Reset the touched flag
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
      alert('Failed to delete record. Please try again.')
    } finally {
      setDeletingId(null)
    }
  }

  const handleEdit = (record: ProductionRecord) => {
    setEditingRecord(record)
    setEditingRecordType(record.recording_type)
    
    // Get group name if this is a group record
    if (record.recording_type === 'group' && record.milking_group_id) {
      const groupName = milkingGroups.get(record.milking_group_id)
      setEditingGroupName(groupName)
    } else {
      setEditingGroupName(undefined)
    }
    
    setIsEditModalOpen(true)
  }

  const handleEditModalClose = () => {
    setIsEditModalOpen(false)
    setEditingRecord(null)
    setEditingRecordType(undefined)
    setEditingGroupName(undefined)
  }

  const handleEditSuccess = () => {
    handleEditModalClose()
    if (onEdit) {
      onEdit(editingRecord!)
    } else {
      window.location.reload()
    }
  }

  const getSessionBadgeColor = (sessionId?: string) => {
    const name = (sessionId ? sessionNameMap.get(sessionId) : undefined)?.toLowerCase() || ''
    if (name.includes('morning')) return 'bg-blue-100 text-blue-800'
    if (name.includes('afternoon')) return 'bg-yellow-100 text-yellow-800'
    if (name.includes('evening')) return 'bg-purple-100 text-purple-800'
    return 'bg-gray-100 text-gray-800'
  }

  const getSessionName = (sessionId?: string) => {
    if (!sessionId) return 'Unknown Session'
    return sessionNameMap.get(sessionId) || sessionId
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
      milking_group_id: string | null
      milking_group_name: string | null
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
        
        // Get milking group information from first record
        const milkingGroupId = animalRecords[0].milking_group_id || null
        const milkingGroupName = milkingGroupId ? milkingGroups.get(milkingGroupId) || null : null

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
          records: animalRecords,
          milking_group_id: milkingGroupId,
          milking_group_name: milkingGroupName
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
          groupName: groupName || (groupId === 'default' ? 'Default Group' : 'Milking Group'),
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

  // Helper function to calculate animal aggregates for a group
  const calculateAnimalAggregates = (records: ProductionRecord[] | undefined | null) => {
    if (!records || records.length === 0) {
      console.log('[ProductionRecordsList] calculateAnimalAggregates: No records provided', { records })
      return []
    }

    const aggregates = new Map<string, {
      animal_id: string
      animal_name: string
      animal_tag: string
      total_volume: number
      record_count: number
      records: ProductionRecord[]
    }>()

    records.forEach((record: ProductionRecord) => {
      const key = record.animal_id
      if (!aggregates.has(key)) {
        aggregates.set(key, {
          animal_id: record.animal_id,
          animal_name: record.animals?.name || `Animal #${record.animals?.tag_number}`,
          animal_tag: record.animals?.tag_number || '',
          total_volume: 0,
          record_count: 0,
          records: []
        })
      }
      const agg = aggregates.get(key)!
      agg.total_volume += record.milk_volume || 0
      agg.record_count += 1
      agg.records.push(record)
    })

    return Array.from(aggregates.values()).sort((a, b) => 
      b.total_volume - a.total_volume
    )
  }

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
        <Droplets className={`mx-auto text-gray-400 ${isMobile ? 'h-8 w-8' : 'h-12 w-12'}`} />
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
      <div className={`bg-gray-50 rounded-lg border border-gray-200 ${isMobile ? 'p-3' : 'p-4'}`}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold text-gray-900 flex items-center">
            <Filter className="w-4 h-4 mr-2" />
            Filter Records
          </h3>
          {(filterSession !== 'all' || filterSafetyStatus !== 'all' || filterCategory !== 'all' || filterDateFrom || filterDateTo) && (
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

        <div className={`grid gap-3 ${isMobile ? 'grid-cols-1' : 'grid-cols-1 md:grid-cols-2 lg:grid-cols-5'}`}>
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
              {dedupedSessions.map((session) => (
                <option key={session.id} value={session.name}>
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

          {/* Animal Category Filter */}
          <div>
            <label htmlFor="filter-category" className="block text-xs font-medium text-gray-700 mb-1">
              Animal Category
            </label>
            <select
              id="filter-category"
              value={filterCategory}
              onChange={(e) => handleFilterCategoryChange(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-farm-green"
            >
              <option value="all">All Categories</option>
              {availableCategories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
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
              autoComplete="off"
              value={filterDateFrom}
              onChange={(e) => {
                handleFilterDateFromChange(e.target.value)
              }}
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
              autoComplete="off"
              value={filterDateTo}
              onFocus={() => {
                setFilterDateToTouched(true)
              }}
              onBlur={() => {
              }}
              onChange={(e) => {
                handleFilterDateToChange(e.target.value)
              }}
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
            {(filterCategory !== 'all' || filterSession !== 'all' || filterSafetyStatus !== 'all' || filterDateFrom || filterDateTo) && (
              <span className="ml-2 text-blue-600 font-medium">Filters active</span>
            )}
          </p>
        </div>
      </div>

      {/* View Tab Selector */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200">
        <div className={`flex items-center ${isMobile ? 'p-0.5' : 'p-1'}`}>
          <button
            onClick={() => handleViewTabChange('individual')}
            className={`flex-1 ${isMobile ? 'px-2 py-2' : 'px-4 py-3'} rounded-lg font-semibold ${isMobile ? 'text-xs' : 'text-sm'} transition-all duration-200 flex items-center justify-center ${isMobile ? 'gap-1' : 'space-x-2'} ${viewTab === 'individual'
                ? 'bg-gradient-to-r from-farm-green/20 to-farm-green/10 text-farm-green shadow-sm border border-farm-green/30'
                : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
              }`}
          >
            <Droplets className={`${isMobile ? 'w-3 h-3' : 'w-4 h-4'} ${viewTab === 'individual' ? 'text-farm-green' : 'text-gray-400'}`} />
            <span>Individual Animals</span>
          </button>
          <button
            onClick={() => handleViewTabChange('groups')}
            className={`flex-1 ${isMobile ? 'px-2 py-2' : 'px-4 py-3'} rounded-lg font-semibold ${isMobile ? 'text-xs' : 'text-sm'} transition-all duration-200 flex items-center justify-center ${isMobile ? 'gap-1' : 'space-x-2'} ${viewTab === 'groups'
                ? 'bg-gradient-to-r from-farm-green/20 to-farm-green/10 text-farm-green shadow-sm border border-farm-green/30'
                : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
              }`}
          >
            <Users className={`${isMobile ? 'w-3 h-3' : 'w-4 h-4'} ${viewTab === 'groups' ? 'text-farm-green' : 'text-gray-400'}`} />
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
        <div className="space-y-4 max-h-[600px] overflow-y-auto [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar-track]:bg-gray-100 [&::-webkit-scrollbar-thumb]:bg-gray-300 [&::-webkit-scrollbar-thumb]:rounded pr-2">
          {(paginatedData as any[]).map((summary, idx) => {
            const qualityIndicator = getQualityIndicator(summary.avgFatContent || undefined, summary.avgProteinContent || undefined)
            const summaryKey = `${summary.cycleDate}-${summary.animal_id}`
            const isSessionViewActive = selectedSession?.startsWith(summaryKey)
            // Extract sessionId after the separator '|' to avoid UUID hyphen conflicts
            const selectedSessionId = isSessionViewActive ? selectedSession?.split('|')[1] : null
            const sessionRecords = isSessionViewActive
              ? summary.records.filter((r: ProductionRecord) => r.milking_session_id === selectedSessionId)
              : []

            return (
              <Card key={`summary-${summary.cycleDate}-${summary.animal_id}`} className="hover:shadow-md transition-shadow overflow-hidden">
                <CardContent className="p-2 md:p-3">
                  {/* Session Detail View - DEBUG CONDITION */}
                  {(() => {
                    const shouldRender = isSessionViewActive && sessionRecords.length > 0
                    return shouldRender
                  })() ? (
                    <div className="space-y-3">
                      {/* Back Button and Title */}
                      <div className="flex items-center justify-between mb-3 pb-3 border-b border-gray-200">
                        <button
                          onClick={() => {
                            setSelectedSession(null)
                          }}
                          className="flex items-center gap-1 text-sm text-blue-600 hover:text-blue-800 font-medium transition-colors"
                        >
                          ← Back to Daily View
                        </button>
                        <div className="text-sm font-semibold text-gray-900">
                          {summary.animalName} • {getSessionName(selectedSessionId || undefined)} • {formatDate(summary.cycleDate)}
                        </div>
                      </div>

                      {/* Individual Session Records */}
                      {sessionRecords.map((record: ProductionRecord) => {
                        const safetyStatus = getSafetyStatusBadge(record.milk_safety_status)
                        const SafetyIcon = safetyStatus.icon

                        return (
                          <div key={record.id} className="p-2 md:p-3 bg-stone-50 rounded-lg border border-stone-200 space-y-2">
                            {/* Time and Safety Status */}
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <Clock className="w-3 h-3 text-gray-500" />
                                <span className="text-xs md:text-sm font-medium text-gray-900">{formatDateTime(record.created_at)}</span>
                              </div>
                              <div className="flex items-center gap-1">
                                <Badge className={safetyStatus.color} style={{ fontSize: '0.7rem' }}>
                                  <SafetyIcon className="w-2 h-2 mr-0.5" />
                                  {safetyStatus.label}
                                </Badge>
                              </div>
                            </div>

                            {/* Mastitis Test and Temperature Info */}
                            <div className="grid grid-cols-2 md:grid-cols-3 gap-1 text-xs">
                              <div className="p-1.5 bg-white rounded border border-gray-200">
                                <p className="font-semibold text-gray-700">Mastitis Test</p>
                                <p className="text-gray-900">{record.mastitis_test_performed ? (record.mastitis_result ? record.mastitis_result.charAt(0).toUpperCase() + record.mastitis_result.slice(1) : 'Tested') : 'N/A'}</p>
                              </div>
                              <div className="p-1.5 bg-white rounded border border-gray-200">
                                <p className="font-semibold text-gray-700">Temperature</p>
                                <p className="text-gray-900">{record.temperature !== null && record.temperature !== undefined ? record.temperature.toFixed(1) + '°C' : 'N/A'}</p>
                              </div>
                              <div className="p-1.5 bg-white rounded border border-gray-200">
                                <p className="font-semibold text-gray-700">Milk Safety</p>
                                <p className="text-gray-900">{safetyStatus.label}</p>
                              </div>
                            </div>

                            {/* Core Metrics */}
                            <div className={`grid gap-1 ${settings?.productionTrackingMode === 'basic' ? 'grid-cols-2 md:grid-cols-2' : 'grid-cols-2 md:grid-cols-4'}`}>
                              <div className="text-center p-1.5 bg-blue-50 rounded">
                                <p className="text-sm md:text-base font-bold text-blue-600">{record.milk_volume?.toFixed(1) || 'N/A'}</p>
                                <p className="text-xs text-blue-600 font-medium">Volume (L)</p>
                              </div>
                              <div className="text-center p-1.5 bg-red-50 rounded">
                                <p className="text-sm md:text-base font-bold text-red-600">{record.temperature ? record.temperature.toFixed(1) : 'N/A'}</p>
                                <p className="text-xs text-red-600 font-medium">Temp (°C)</p>
                              </div>
                              {settings?.productionTrackingMode !== 'basic' && (
                                <>
                                  <div className="text-center p-1.5 bg-orange-50 rounded">
                                    <p className="text-sm md:text-base font-bold text-orange-600">{record.fat_content !== null && record.fat_content !== undefined ? record.fat_content.toFixed(2) : 'N/A'}</p>
                                    <p className="text-xs text-orange-600 font-medium">Fat %</p>
                                  </div>
                                  <div className="text-center p-1.5 bg-green-50 rounded">
                                    <p className="text-sm md:text-base font-bold text-green-600">{record.protein_content !== null && record.protein_content !== undefined ? record.protein_content.toFixed(2) : 'N/A'}</p>
                                    <p className="text-xs text-green-600 font-medium">Protein %</p>
                                  </div>
                                </>
                              )}
                            </div>

                            {/* Additional Metrics */}
                            {settings?.productionTrackingMode !== 'basic' && (
                              <div className="grid grid-cols-2 md:grid-cols-3 gap-1">
                                <div className="text-center p-1.5 bg-yellow-50 rounded">
                                  <p className="text-xs md:text-sm font-bold text-yellow-600">{record.somatic_cell_count !== null && record.somatic_cell_count !== undefined ? record.somatic_cell_count.toLocaleString() : 'N/A'}</p>
                                  <p className="text-xs text-yellow-600 font-medium">SCC</p>
                                </div>
                                <div className="text-center p-1.5 bg-cyan-50 rounded">
                                  <p className="text-xs md:text-sm font-bold text-cyan-600">{record.lactose_content !== null && record.lactose_content !== undefined ? record.lactose_content.toFixed(2) : 'N/A'}</p>
                                  <p className="text-xs text-cyan-600 font-medium">Lactose %</p>
                                </div>
                                <div className="text-center p-1.5 bg-indigo-50 rounded">
                                  <p className="text-xs md:text-sm font-bold text-indigo-600">{record.ph_level !== null && record.ph_level !== undefined ? record.ph_level.toFixed(2) : 'N/A'}</p>
                                  <p className="text-xs text-indigo-600 font-medium">pH</p>
                                </div>
                              </div>
                            )}

                            {/* Notes */}
                            {record.notes && (
                              <div className="p-1.5 bg-gray-100 rounded border border-gray-200">
                                <p className="text-xs text-gray-700">
                                  <span className="font-semibold">Notes:</span> {record.notes}
                                </p>
                              </div>
                            )}

                            {/* Action Buttons */}
                            {canEdit && (
                              <div className="flex gap-1 justify-end pt-1">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => onView?.(record)}
                                  className="h-6 px-2 text-xs"
                                >
                                  <Eye className="w-3 h-3 mr-1" />
                                  View
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleEdit(record)}
                                  className="h-6 px-2 text-xs"
                                >
                                  <Edit className="w-3 h-3 mr-1" />
                                  Edit
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleDelete(record.id)}
                                  disabled={deletingId === record.id}
                                  className="h-6 px-2 text-xs text-red-600 hover:text-red-800"
                                >
                                  <Trash2 className="w-3 h-3 mr-1" />
                                  {deletingId === record.id ? 'Deleting' : 'Delete'}
                                </Button>
                              </div>
                            )}
                          </div>
                        )
                      })}
                    </div>
                  ) : (
                    /* Daily Total View */
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-start space-x-2 flex-1 min-w-0">
                        <div className="flex-shrink-0">
                          <div className="w-10 h-10 bg-farm-green/10 rounded-lg flex items-center justify-center">
                            <Droplets className="w-5 h-5 text-farm-green" />
                          </div>
                        </div>

                        <div className="min-w-0 flex-1">
                          {/* Header Row */}
                          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-1 mb-2">
                            <div>
                              <h4 className="text-sm md:text-base font-semibold text-gray-900 truncate">
                                {summary.animalName}
                              </h4>
                              <p className="text-xs text-gray-600">
                                Tag: {summary.animalTag}
                              </p>
                            </div>

                            <div className="flex flex-wrap items-center gap-1">
                              <Badge className="bg-blue-100 text-blue-800 text-xs">
                                <Calendar className="w-2 h-2 mr-0.5" />
                                {formatDate(summary.cycleDate)}
                              </Badge>
                              <Badge className="bg-indigo-100 text-indigo-800 text-xs">
                                <Clock className="w-2 h-2 mr-0.5" />
                                {summary.recordCount} session{summary.recordCount !== 1 ? 's' : ''}
                              </Badge>
                              {summary.milking_group_name && (
                                <Badge className="bg-green-100 text-green-800 text-xs">
                                  <Users className="w-2 h-2 mr-0.5" />
                                  {summary.milking_group_name}
                                </Badge>
                              )}
                              {settings?.productionTrackingMode !== 'basic' && qualityIndicator && (
                                <Badge className={`${qualityIndicator.color} text-xs`}>
                                  {qualityIndicator.label}
                                </Badge>
                              )}
                            </div>
                          </div>

                          {/* Production Metrics — reactive to selected session badge */}
                          {(() => {
                            const activeId = activeSessionBadge[summaryKey]
                            const recs: any[] = activeId
                              ? summary.records.filter((r: any) => r.milking_session_id === activeId)
                              : summary.records

                            // Volume
                            const vol = recs.reduce((s: number, r: any) => s + (r.milk_volume || 0), 0)

                            // Fat & Protein averages
                            const fatVals = recs.map((r: any) => r.fat_content).filter((v: any) => v != null)
                            const avgFat = fatVals.length ? fatVals.reduce((a: number, b: number) => a + b, 0) / fatVals.length : null

                            const protVals = recs.map((r: any) => r.protein_content).filter((v: any) => v != null)
                            const avgProt = protVals.length ? protVals.reduce((a: number, b: number) => a + b, 0) / protVals.length : null

                            // Temperature average
                            const tempVals = recs.map((r: any) => r.temperature).filter((v: any) => v != null)
                            const avgTemp = tempVals.length ? tempVals.reduce((a: number, b: number) => a + b, 0) / tempVals.length : null

                            // Mastitis: first record that was tested
                            const mastitisTested = recs.find((r: any) => r.mastitis_test_performed)
                            const mastitisTxt = mastitisTested
                              ? mastitisTested.mastitis_result
                                ? mastitisTested.mastitis_result.charAt(0).toUpperCase() + mastitisTested.mastitis_result.slice(1)
                                : 'Tested'
                              : 'N/A'

                            // Milk safety: worst status wins
                            const statuses = recs.map((r: any) => r.milk_safety_status).filter(Boolean)
                            const safetyStatus = statuses.includes('unsafe_health') ? 'unsafe_health'
                              : statuses.includes('unsafe_colostrum') ? 'unsafe_colostrum'
                                : statuses.length ? 'safe'
                                  : null
                            const safetyBadge = getSafetyStatusBadge(safetyStatus as any)

                            const isFiltered = !!activeId
                            const volLabel = isFiltered ? `${getSessionName(activeId)} L` : 'Total L'

                            return (
                              <>
                                <div className={`grid gap-1 mb-1 ${settings?.productionTrackingMode === 'basic' ? 'grid-cols-2 md:grid-cols-2' : 'grid-cols-2 md:grid-cols-4'}`}>
                                  <div className={`text-center p-1 md:p-2 rounded transition-colors ${isFiltered ? 'bg-indigo-50' : 'bg-blue-50'}`}>
                                    <p className={`text-base md:text-lg font-bold ${isFiltered ? 'text-indigo-600' : 'text-blue-600'}`}>{vol.toFixed(1)}</p>
                                    <p className={`text-xs font-medium ${isFiltered ? 'text-indigo-600' : 'text-blue-600'}`}>{volLabel}</p>
                                  </div>
                                  {settings?.productionTrackingMode !== 'basic' && (
                                    <>
                                      <div className="text-center p-1 md:p-2 bg-orange-50 rounded">
                                        <p className="text-sm md:text-base font-bold text-orange-600">{avgFat !== null ? avgFat.toFixed(2) + '%' : 'N/A'}</p>
                                        <p className="text-xs text-orange-600 font-medium">Fat</p>
                                      </div>
                                      <div className="text-center p-1 md:p-2 bg-green-50 rounded">
                                        <p className="text-sm md:text-base font-bold text-green-600">{avgProt !== null ? avgProt.toFixed(2) + '%' : 'N/A'}</p>
                                        <p className="text-xs text-green-600 font-medium">Protein</p>
                                      </div>
                                    </>
                                  )}
                                  <div className="text-center p-1 md:p-2 bg-purple-50 rounded">
                                    <p className="text-sm md:text-base font-bold text-purple-600">{recs.length}</p>
                                    <p className="text-xs text-purple-600 font-medium">Records</p>
                                  </div>
                                </div>

                                <div className="grid grid-cols-3 gap-2 mt-2 pt-2 border-t border-gray-200">
                                  <div className="text-xs p-2 bg-gray-50 rounded">
                                    <p className="font-semibold text-gray-700 mb-1">Mastitis Test</p>
                                    <p className="text-gray-900">{mastitisTxt}</p>
                                  </div>
                                  <div className="text-xs p-2 bg-gray-50 rounded">
                                    <p className="font-semibold text-gray-700 mb-1">Avg Temperature</p>
                                    <p className="text-gray-900">{avgTemp !== null ? avgTemp.toFixed(1) + '°C' : 'N/A'}</p>
                                  </div>
                                  <div className={`text-xs p-2 rounded ${safetyStatus ? safetyBadge.color : 'bg-gray-50'}`}>
                                    <p className="font-semibold mb-1">Milk Safety</p>
                                    <p className="font-medium">{safetyBadge.label}</p>
                                  </div>
                                </div>
                              </>
                            )
                          })()}

                          {/* Sessions in this cycle */}
                          <div className="mt-1 pt-1 border-t border-gray-200">
                            <button
                              onClick={() => {
                                const key = `${summary.cycleDate}-${summary.animal_id}`
                                const newSet = new Set(expandedSessions)
                                if (newSet.has(key)) {
                                  newSet.delete(key)
                                } else {
                                  newSet.add(key)
                                }
                                setExpandedSessions(newSet)
                              }}
                              className="flex items-center gap-1 text-xs font-semibold text-gray-600 hover:text-gray-900 transition-colors cursor-pointer"
                            >
                              <ChevronDown
                                className={`w-3 h-3 transition-transform ${expandedSessions.has(`${summary.cycleDate}-${summary.animal_id}`) ? 'rotate-180' : ''}`}
                              />
                              Sessions in cycle ({summary.sessions.length})
                            </button>
                            {expandedSessions.has(`${summary.cycleDate}-${summary.animal_id}`) && (
                              <div className="flex flex-wrap gap-1 mt-1">
                                {summary.sessions.map((sessionId: string) => {
                                  const isActive = activeSessionBadge[summaryKey] === sessionId
                                  return (
                                    <button
                                      key={sessionId}
                                      onClick={() => {

                                        if (activeSessionBadge[summaryKey] === sessionId) {
                                          // Toggle OFF: clear both states
                                          const next = { ...activeSessionBadge }
                                          delete next[summaryKey]
                                          setActiveSessionBadge(next)
                                          setSelectedSession(null)
                                        } else {
                                          // Toggle ON: set both states at component level
                                          const newSelectedSession = `${summaryKey}|${sessionId}`
                                          setActiveSessionBadge(prev => ({ ...prev, [summaryKey]: sessionId }))
                                          setSelectedSession(newSelectedSession)
                                        }
                                      }}
                                      className="transition-all"
                                    >
                                      <Badge
                                        className={`cursor-pointer hover:opacity-80 hover:shadow-md transition-all ${isActive
                                            ? 'bg-indigo-200 text-indigo-900 ring-2 ring-indigo-400'
                                            : getSessionBadgeColor(sessionId)
                                          }`}
                                      >
                                        {getSessionName(sessionId)}
                                      </Badge>
                                    </button>
                                  )
                                })}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            )
          })}
        </div>
      ) : filterSession === 'all' && viewTab === 'groups' && dailySummaryGroups ? (
        // Daily totals view for milking groups
        <div className="space-y-4 max-h-[600px] overflow-y-auto [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar-track]:bg-gray-100 [&::-webkit-scrollbar-thumb]:bg-gray-300 [&::-webkit-scrollbar-thumb]:rounded pr-2">
          {(paginatedData as any[]).map((summary) => {
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
                            {settings?.productionTrackingMode !== 'basic' && qualityIndicator && (
                              <Badge className={qualityIndicator.color}>
                                {qualityIndicator.label}
                              </Badge>
                            )}
                          </div>
                        </div>

                        {/* Production Metrics Grid */}
                        <div className={`grid gap-2 ${settings?.productionTrackingMode === 'basic' ? 'grid-cols-2 md:grid-cols-2' : 'grid-cols-2 md:grid-cols-4'}`}>
                          <div className="text-center p-2 md:p-3 bg-blue-50 rounded">
                            <p className="text-lg md:text-2xl font-bold text-blue-600">{summary.totalMilkVolume.toFixed(1)}</p>
                            <p className="text-xs text-blue-600 font-medium">Total Liters</p>
                          </div>
                          {settings?.productionTrackingMode !== 'basic' && (
                            <>
                              <div className="text-center p-2 md:p-3 bg-orange-50 rounded">
                                <p className="text-base md:text-xl font-bold text-orange-600">{summary.avgFatContent !== null ? summary.avgFatContent.toFixed(2) + '%' : 'N/A'}</p>
                                <p className="text-xs text-orange-600 font-medium">Avg Fat</p>
                              </div>
                              <div className="text-center p-2 md:p-3 bg-green-50 rounded">
                                <p className="text-base md:text-xl font-bold text-green-600">{summary.avgProteinContent !== null ? summary.avgProteinContent.toFixed(2) + '%' : 'N/A'}</p>
                                <p className="text-xs text-green-600 font-medium">Avg Protein</p>
                              </div>
                            </>
                          )}
                          <div className="text-center p-2 md:p-3 bg-purple-50 rounded">
                            <p className="text-base md:text-lg font-bold text-purple-600">{summary.totalRecords}</p>
                            <p className="text-xs text-purple-600 font-medium">Records</p>
                          </div>
                        </div>

                        {/* Health and Safety Details */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-2 mt-4 pt-4 border-t border-gray-200">
                          <div className="text-sm p-3 bg-gray-50 rounded">
                            <p className="font-semibold text-gray-700 mb-2">Mastitis Test Status</p>
                            <p className="text-gray-900">{summary.records.some((r: ProductionRecord) => r.mastitis_test_performed) ? (summary.records.find((r: ProductionRecord) => r.mastitis_result)?.mastitis_result ? summary.records.find((r: ProductionRecord) => r.mastitis_result)?.mastitis_result?.charAt(0).toUpperCase() + summary.records.find((r: ProductionRecord) => r.mastitis_result)?.mastitis_result?.slice(1) : 'Tested') : 'N/A'}</p>
                          </div>
                          <div className="text-sm p-3 bg-gray-50 rounded">
                            <p className="font-semibold text-gray-700 mb-2">Average Temperature</p>
                            <p className="text-gray-900">{summary.records.filter((r: ProductionRecord) => r.temperature).length > 0 ? (summary.records.filter((r: ProductionRecord) => r.temperature).reduce((sum: number, r: ProductionRecord) => sum + (r.temperature || 0), 0) / summary.records.filter((r: ProductionRecord) => r.temperature).length).toFixed(1) + '°C' : 'N/A'}</p>
                          </div>
                          <div className="text-sm p-3 bg-gray-50 rounded">
                            <p className="font-semibold text-gray-700 mb-2">Milk Safety Status</p>
                            <p className="text-gray-900">{getSafetyStatusBadge(summary.records[0]?.milk_safety_status).label}</p>
                          </div>
                        </div>

                        {/* Expandable Animal Details */}
                        {(() => {
                          const groupKey = `all-${summary.cycleDate}-${summary.milking_group_id || 'default'}`
                          const isExpanded = expandedGroupAnimals.has(groupKey)
                          const animalAggregates = calculateAnimalAggregates(summary.records)

                          return (
                            <div className="mt-4 pt-4 border-t border-gray-200">
                              <button
                                onClick={() => {
                                  const newSet = new Set(expandedGroupAnimals)
                                  if (newSet.has(groupKey)) {
                                    newSet.delete(groupKey)
                                  } else {
                                    newSet.add(groupKey)
                                  }
                                  setExpandedGroupAnimals(newSet)
                                }}
                                className="w-full text-left flex items-center justify-between p-2 hover:bg-gray-50 rounded transition-colors"
                              >
                                <span className="font-semibold text-gray-900 text-sm">Animals in this group ({animalAggregates.length})</span>
                                <ChevronDown
                                  className={`w-5 h-5 text-gray-600 transition-transform flex-shrink-0 ${isExpanded ? 'rotate-180' : ''}`}
                                />
                              </button>

                              {isExpanded && (
                                <div className="mt-3 space-y-2">
                                  {animalAggregates.length === 0 ? (
                                    <p className="text-sm text-gray-500 p-3">No animals in this group</p>
                                  ) : (
                                    animalAggregates.map((animalData) => {
                                      const fatRecords = animalData.records.filter(r => r.fat_content)
                                      const proteinRecords = animalData.records.filter(r => r.protein_content)
                                      const avgFat = fatRecords.length > 0
                                        ? fatRecords.reduce((sum, r) => sum + (r.fat_content || 0), 0) / fatRecords.length
                                        : null
                                      const avgProtein = proteinRecords.length > 0
                                        ? proteinRecords.reduce((sum, r) => sum + (r.protein_content || 0), 0) / proteinRecords.length
                                        : null
                                      const qualityIndicator = getQualityIndicator(avgFat || undefined, avgProtein || undefined)
                                      const animalDetailsKey = `all-${summary.cycleDate}-${summary.milking_group_id || 'default'}-${animalData.animal_id}`
                                      const isAnimalDetailsExpanded = expandedAnimalDetails.has(animalDetailsKey)

                                      return (
                                        <div key={animalData.animal_id} className="p-3 bg-stone-50 rounded-lg border border-stone-200 space-y-2">
                                          {/* Animal Header */}
                                          <div className="flex items-center justify-between">
                                            <div>
                                              <p className="font-semibold text-gray-900">{animalData.animal_name}</p>
                                              <p className="text-xs text-gray-600">Tag: {animalData.animal_tag}</p>
                                            </div>
                                            <div className="text-right">
                                              <p className="text-lg font-bold text-farm-green">{animalData.total_volume.toFixed(1)}L</p>
                                              <p className="text-xs text-gray-600">{animalData.record_count} record{animalData.record_count !== 1 ? 's' : ''}</p>
                                            </div>
                                          </div>

                                          {/* Quality Indicator - Only show in advanced modes */}
                                          {settings?.productionTrackingMode !== 'basic' && qualityIndicator && (
                                            <div className="flex gap-1">
                                              <Badge className={qualityIndicator.color}>{qualityIndicator.label}</Badge>
                                            </div>
                                          )}

                                          {/* More Details Button */}
                                          <button
                                            onClick={() => {
                                              const newSet = new Set(expandedAnimalDetails)
                                              if (newSet.has(animalDetailsKey)) {
                                                newSet.delete(animalDetailsKey)
                                              } else {
                                                newSet.add(animalDetailsKey)
                                              }
                                              setExpandedAnimalDetails(newSet)
                                              console.log('[ProductionRecordsList] Animal details toggled:', {
                                                animalId: animalData.animal_id,
                                                animalName: animalData.animal_name,
                                                isExpanded: newSet.has(animalDetailsKey),
                                                timestamp: new Date().toISOString()
                                              })
                                            }}
                                            className="w-full flex items-center justify-between p-2 text-xs text-blue-600 hover:bg-white rounded transition-colors"
                                          >
                                            <span className="font-medium">More Details</span>
                                            <ChevronDown
                                              className={`w-4 h-4 transition-transform ${isAnimalDetailsExpanded ? 'rotate-180' : ''}`}
                                            />
                                          </button>

                                          {/* Individual Records */}
                                          {isAnimalDetailsExpanded && (
                                            <div className="mt-2 pt-2 border-t border-stone-200 space-y-2">
                                              {animalData.records.map((record: ProductionRecord) => {
                                                const safetyStatus = getSafetyStatusBadge(record.milk_safety_status)
                                                const SafetyIcon = safetyStatus.icon

                                                return (
                                                  <div key={record.id} className="p-2 bg-white rounded border border-stone-100 text-xs space-y-1">
                                                    <div className="flex items-center justify-between">
                                                      <div className="flex items-center gap-1">
                                                        <Clock className="w-3 h-3 text-gray-500" />
                                                        <span className="text-gray-700">{formatDateTime(record.created_at)}</span>
                                                      </div>
                                                      <div className="flex items-center gap-1">
                                                        <SafetyIcon className="w-3 h-3" />
                                                        <span className={`px-1.5 py-0.5 rounded text-xs font-medium ${safetyStatus.color}`}>
                                                          {safetyStatus.label}
                                                        </span>
                                                      </div>
                                                    </div>
                                                    <div className={`grid gap-1 ${settings?.productionTrackingMode === 'basic' ? 'grid-cols-1' : 'grid-cols-3'}`}>
                                                      <div className="text-center p-1 bg-blue-50 rounded">
                                                        <p className="font-bold text-blue-600">{record.milk_volume.toFixed(1)}L</p>
                                                        <p className="text-gray-600">Volume</p>
                                                      </div>
                                                      {settings?.productionTrackingMode !== 'basic' && record.fat_content && (
                                                        <div className="text-center p-1 bg-orange-50 rounded">
                                                          <p className="font-bold text-orange-600">{record.fat_content.toFixed(2)}%</p>
                                                          <p className="text-gray-600">Fat</p>
                                                        </div>
                                                      )}
                                                      {settings?.productionTrackingMode !== 'basic' && record.protein_content && (
                                                        <div className="text-center p-1 bg-green-50 rounded">
                                                          <p className="font-bold text-green-600">{record.protein_content.toFixed(2)}%</p>
                                                          <p className="text-gray-600">Protein</p>
                                                        </div>
                                                      )}
                                                    </div>
                                                  </div>
                                                )
                                              })}
                                            </div>
                                          )}
                                        </div>
                                      )
                                    })
                                  )}
                                </div>
                              )}
                            </div>
                          )
                        })()}
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
        <div className="space-y-4 max-h-[600px] overflow-y-auto [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar-track]:bg-gray-100 [&::-webkit-scrollbar-thumb]:bg-gray-300 [&::-webkit-scrollbar-thumb]:rounded pr-2">
          {(paginatedData as any[]).map((record) => {
            const qualityIndicator = getQualityIndicator(record.avgFatContent || undefined, record.avgProteinContent || undefined)
            const safetyStatus = getSafetyStatusBadge(record.milk_safety_status)
            const recordingTypeBadge = getRecordingTypeBadge(record.recording_type)
            const SafetyIcon = safetyStatus.icon
            const RecordingTypeIcon = recordingTypeBadge.icon

            return (
              <Card key={record.id} className="hover:shadow-md transition-shadow overflow-hidden">
                <CardContent className="p-2 md:p-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-start space-x-2 flex-1 min-w-0">
                      <div className="flex-shrink-0">
                        <div className="w-10 h-10 bg-farm-green/10 rounded-lg flex items-center justify-center">
                          <Droplets className="w-5 h-5 text-farm-green" />
                        </div>
                      </div>

                      <div className="min-w-0 flex-1">
                        {/* Header Row */}
                        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-1 mb-1">
                          <div>
                            <h4 className="text-sm md:text-base font-semibold text-gray-900 truncate">
                              {record.animals?.name || `Animal ${record.animals?.tag_number}`}
                            </h4>
                            <p className="text-xs text-gray-600">
                              Tag: {record.animals?.tag_number}
                            </p>
                          </div>

                          <div className="flex flex-wrap items-center gap-1">
                            <Badge className={`${getSessionBadgeColor(record.milking_session_id)} text-xs`}>
                              <Clock className="w-2 h-2 mr-0.5" />
                              {getSessionName(record.milking_session_id)}
                            </Badge>
                            <Badge className={`${safetyStatus.color} text-xs`}>
                              <SafetyIcon className="w-2 h-2 mr-0.5" />
                              {safetyStatus.label}
                            </Badge>
                            <Badge className={`${recordingTypeBadge.color} text-xs`}>
                              <RecordingTypeIcon className="w-2 h-2 mr-0.5" />
                              {recordingTypeBadge.label}
                            </Badge>
                            {qualityIndicator && (
                              <Badge className={`${qualityIndicator.color} text-xs`}>
                                {qualityIndicator.label}
                              </Badge>
                            )}
                          </div>
                        </div>

                        {/* Date Info */}
                        <div className="flex items-center space-x-2 text-xs text-gray-600 mb-2">
                          <span className="flex items-center">
                            <Calendar className="w-3 h-3 mr-0.5" />
                            {formatDate(record.record_date)}
                          </span>
                          <span className="text-gray-400">•</span>
                          <span className="text-gray-500 truncate">
                            {formatDateTime(record.created_at)}
                          </span>
                        </div>

                        {/* Production Metrics Grid */}
                        <div className={`grid gap-1 mb-2 ${settings?.productionTrackingMode === 'basic' ? 'grid-cols-2 md:grid-cols-2 lg:grid-cols-2' : 'grid-cols-2 md:grid-cols-3 lg:grid-cols-6'}`}>
                          <div className="text-center p-1 md:p-2 bg-blue-50 rounded">
                            <p className="text-base md:text-lg font-bold text-blue-600">{record.milk_volume}</p>
                            <p className="text-xs text-blue-600 font-medium">L</p>
                          </div>
                          <div className="text-center p-1 md:p-2 bg-red-50 rounded">
                            <p className="text-sm md:text-base font-bold text-red-600">{record.temperature ? record.temperature + '°C' : 'N/A'}</p>
                            <p className="text-xs text-red-600 font-medium">T</p>
                          </div>
                          {settings?.productionTrackingMode !== 'basic' && (
                            <>
                              <div className="text-center p-1 md:p-2 bg-orange-50 rounded">
                                <p className="text-sm md:text-base font-bold text-orange-600">{record.fat_content ? record.fat_content + '%' : 'N/A'}</p>
                                <p className="text-xs text-orange-600 font-medium">Fat</p>
                              </div>
                              <div className="text-center p-1 md:p-2 bg-green-50 rounded">
                                <p className="text-sm md:text-base font-bold text-green-600">{record.protein_content ? record.protein_content + '%' : 'N/A'}</p>
                                <p className="text-xs text-green-600 font-medium">Protein</p>
                              </div>
                              <div className="text-center p-1 md:p-2 bg-purple-50 rounded">
                                <p className="text-xs md:text-sm font-bold text-purple-600">
                                  {record.somatic_cell_count ? (record.somatic_cell_count / 1000).toFixed(0) + 'k' : 'N/A'}
                                </p>
                                <p className="text-xs text-purple-600 font-medium">SCC</p>
                              </div>
                              <div className="text-center p-1 md:p-2 bg-indigo-50 rounded">
                                <p className="text-sm md:text-base font-bold text-indigo-600">{record.ph_level ? record.ph_level : 'N/A'}</p>
                                <p className="text-xs text-indigo-600 font-medium">pH</p>
                              </div>
                            </>
                          )}
                        </div>

                        {/* Health and Safety Details */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-1 mt-2 pt-2 border-t border-gray-200">
                          <div className="text-xs p-2 bg-gray-50 rounded">
                            <p className="font-semibold text-gray-700 mb-0.5">Mastitis Test</p>
                            <p className="text-gray-900">{record.mastitis_test_performed ? (record.mastitis_result ? record.mastitis_result.charAt(0).toUpperCase() + record.mastitis_result.slice(1) : 'Tested') : 'N/A'}</p>
                          </div>
                          <div className="text-xs p-2 bg-gray-50 rounded">
                            <p className="font-semibold text-gray-700 mb-0.5">Temperature</p>
                            <p className="text-gray-900">{record.temperature !== null && record.temperature !== undefined ? record.temperature.toFixed(1) + '°C' : 'N/A'}</p>
                          </div>
                          <div className="text-xs p-2 bg-gray-50 rounded">
                            <p className="font-semibold text-gray-700 mb-0.5">Milk Safety</p>
                            <p className="text-gray-900">{getSafetyStatusBadge(record.milk_safety_status).label}</p>
                          </div>
                        </div>

                        {/* Notes Section */}
                        {record.notes && (
                          <div className="mb-1 p-2 bg-gray-50 rounded border border-gray-200">
                            <p className="text-xs text-gray-700">
                              <span className="font-semibold block mb-0.5">Notes:</span>
                              <span className="text-gray-600">{record.notes}</span>
                            </p>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Action Buttons */}
                    {canEdit && (
                      <div className="flex-shrink-0 flex items-center gap-1">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm" className="h-7 w-7 p-0">
                              <MoreHorizontal className="w-4 h-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => onView?.(record)} className="cursor-pointer flex items-center">
                              <Eye className="w-4 h-4 mr-2" />
                              View Details
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleEdit(record)} className="cursor-pointer flex items-center">
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
        <div className="space-y-4 max-h-[600px] overflow-y-auto [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar-track]:bg-gray-100 [&::-webkit-scrollbar-thumb]:bg-gray-300 [&::-webkit-scrollbar-thumb]:rounded pr-2">
          {(paginatedData as any[]).map((summary: any, index) => {
            const isExpanded = expandedGroups.has(summary.milking_group_id || 'default')
            const recentQuality = getQualityIndicator(summary.avgFatContent || undefined, summary.avgProteinContent || undefined)
            // Use records from dailySummaryGroups or animalRecords from groupedRecords
            const recordsArray = summary.records || summary.animalRecords
            const mostRecent = recordsArray && recordsArray.length > 0 ? recordsArray[0] : null
            const recentSafety = mostRecent ? getSafetyStatusBadge(mostRecent.milk_safety_status) : null
            const RecentSafetyIcon = recentSafety?.icon
            const displayGroupName = (summary as any).groupName || 'Milking Group'

            return (
              <Card key={`group-${index}`} className="hover:shadow-md transition-shadow overflow-hidden">
                <CardContent className="p-4 md:p-6">
                  {/* Group Header */}
                  <button
                    onClick={() => {
                      const newSet = new Set(expandedGroups)
                      const groupKey = summary.milking_group_id || 'default'
                      const isCurrentlyExpanded = newSet.has(groupKey)
                      
                      console.log('[ProductionRecordsList] Group expand/collapse clicked:', {
                        groupName: displayGroupName,
                        groupKey: groupKey,
                        isCurrentlyExpanded: isCurrentlyExpanded,
                        willBeExpanded: !isCurrentlyExpanded,
                        totalRecords: summary.records?.length || 0,
                        timestamp: new Date().toISOString()
                      })
                      
                      if (newSet.has(groupKey)) {
                        newSet.delete(groupKey)
                        console.log('[ProductionRecordsList] Group collapsed:', displayGroupName)
                      } else {
                        newSet.add(groupKey)
                        console.log('[ProductionRecordsList] Group expanded:', displayGroupName)
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

                  {/* Expanded Animals List - Aggregated by animal with total volumes */}
                  {isExpanded && (() => {
                    // Use records from dailySummaryGroups or animalRecords from groupedRecords
                    const recordsArray = summary.records || summary.animalRecords
                    const animalAggregates = calculateAnimalAggregates(recordsArray)
                    
                    console.log('[ProductionRecordsList] Rendering expanded animals list:', {
                      groupName: displayGroupName,
                      groupKey: summary.milking_group_id || 'default',
                      animalCount: animalAggregates.length,
                      totalRecords: recordsArray?.length || 0,
                      totalMilkVolume: summary.totalMilkVolume,
                      animals: animalAggregates.map(a => ({
                        name: a.animal_name,
                        tag: a.animal_tag,
                        totalVolume: a.total_volume,
                        recordCount: a.record_count
                      }))
                    })
                    
                    return (
                      <div className="mt-6 pt-6 border-t border-gray-200 space-y-3">
                        <h5 className="font-semibold text-gray-900 mb-3">Animals in this group ({animalAggregates.length}):</h5>
                        {animalAggregates.length === 0 ? (
                          <p className="text-sm text-gray-500 p-3">No animals in this group</p>
                        ) : (
                          animalAggregates.map((animalData) => {
                            const fatRecords = animalData.records.filter(r => r.fat_content)
                            const proteinRecords = animalData.records.filter(r => r.protein_content)
                            
                            const avgFat = fatRecords.length > 0
                              ? fatRecords.reduce((sum, r) => sum + (r.fat_content || 0), 0) / fatRecords.length
                              : null
                            
                            const avgProtein = proteinRecords.length > 0
                              ? proteinRecords.reduce((sum, r) => sum + (r.protein_content || 0), 0) / proteinRecords.length
                              : null
                            
                            const qualityIndicator = getQualityIndicator(avgFat || undefined, avgProtein || undefined)
                            const animalDetailsKey = `${summary.milking_group_id || 'default'}-${animalData.animal_id}`
                            const isAnimalDetailsExpanded = expandedAnimalDetails.has(animalDetailsKey)

                            return (
                              <div
                                key={animalData.animal_id}
                                className="p-4 bg-gray-50 rounded-lg border border-gray-200 hover:border-gray-300 transition-colors"
                              >
                                {/* Header with name and total */}
                                <div className="flex items-start justify-between mb-3">
                                  <div className="flex-1">
                                    <p className="font-semibold text-gray-900">
                                      {animalData.animal_name}
                                    </p>
                                    <p className="text-xs text-gray-600 mt-0.5">
                                      Tag: {animalData.animal_tag}
                                    </p>
                                  </div>
                                  <div className="text-right flex-shrink-0">
                                    <p className="text-2xl font-bold text-farm-green">
                                      {animalData.total_volume.toFixed(1)}
                                    </p>
                                    <p className="text-xs text-gray-600 font-medium">Total Liters</p>
                                  </div>
                                </div>
                                
                                {/* Stats Grid */}
                                <div className="grid grid-cols-2 gap-2 md:grid-cols-4 text-xs mb-3">
                                  <div className="p-2 bg-white rounded border border-gray-300">
                                    <p className="text-gray-600 font-semibold">Records</p>
                                    <p className="text-gray-900 font-medium">{animalData.record_count}</p>
                                  </div>
                                  <div className="p-2 bg-white rounded border border-gray-300">
                                    <p className="text-gray-600 font-semibold">Avg/Record</p>
                                    <p className="text-gray-900 font-medium">{(animalData.total_volume / animalData.record_count).toFixed(1)}L</p>
                                  </div>
                                  <div className="p-2 bg-white rounded border border-gray-300">
                                    <p className="text-gray-600 font-semibold">Fat</p>
                                    <p className="text-gray-900 font-medium">{avgFat ? avgFat.toFixed(2) + '%' : 'N/A'}</p>
                                  </div>
                                  <div className="p-2 bg-white rounded border border-gray-300">
                                    <p className="text-gray-600 font-semibold">Protein</p>
                                    <p className="text-gray-900 font-medium">{avgProtein ? avgProtein.toFixed(2) + '%' : 'N/A'}</p>
                                  </div>
                                </div>

                                {/* Quality Indicator */}
                                {qualityIndicator && (
                                  <div className="mb-3 flex items-center gap-2">
                                    <Badge className={qualityIndicator.color}>
                                      {qualityIndicator.label}
                                    </Badge>
                                  </div>
                                )}

                                {/* More Details Button */}
                                <button
                                  onClick={() => {
                                    const newSet = new Set(expandedAnimalDetails)
                                    if (newSet.has(animalDetailsKey)) {
                                      newSet.delete(animalDetailsKey)
                                      console.log('[ProductionRecordsList] Animal details collapsed:', {
                                        animalName: animalData.animal_name,
                                        animalTag: animalData.animal_tag
                                      })
                                    } else {
                                      newSet.add(animalDetailsKey)
                                      console.log('[ProductionRecordsList] Animal details expanded:', {
                                        animalName: animalData.animal_name,
                                        animalTag: animalData.animal_tag,
                                        recordCount: animalData.record_count
                                      })
                                    }
                                    setExpandedAnimalDetails(newSet)
                                  }}
                                  className="w-full flex items-center justify-between gap-2 p-3 bg-white rounded border border-gray-300 hover:bg-gray-50 transition-colors text-sm font-medium text-gray-900"
                                >
                                  <span>More Details</span>
                                  <ChevronDown 
                                    className={`w-4 h-4 transition-transform ${isAnimalDetailsExpanded ? 'rotate-180' : ''}`}
                                  />
                                </button>

                                {/* Expanded Individual Records */}
                                {isAnimalDetailsExpanded && (
                                  <div className="mt-3 pt-3 border-t border-gray-200 space-y-2">
                                    <h6 className="text-xs font-semibold text-gray-700 uppercase">Individual Records ({animalData.record_count})</h6>
                                    {animalData.records.map((record: ProductionRecord) => {
                                      const recordSafetyStatus = getSafetyStatusBadge(record.milk_safety_status)
                                      const RecordSafetyIcon = recordSafetyStatus.icon

                                      return (
                                        <div
                                          key={record.id}
                                          className="p-3 bg-white rounded border border-gray-200 space-y-2"
                                        >
                                          {/* Record Time and Safety Status */}
                                          <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-2">
                                              <Clock className="w-3 h-3 text-gray-400" />
                                              <span className="text-xs font-medium text-gray-700">
                                                {formatDateTime(record.created_at)}
                                              </span>
                                            </div>
                                            <Badge className={recordSafetyStatus.color}>
                                              <RecordSafetyIcon className="w-2.5 h-2.5 mr-0.5" />
                                              {recordSafetyStatus.label}
                                            </Badge>
                                          </div>

                                          {/* Record Metrics */}
                                          <div className="grid grid-cols-2 gap-1 text-xs">
                                            <div className="p-2 bg-blue-50 rounded">
                                              <p className="text-gray-600 font-semibold">Volume</p>
                                              <p className="text-gray-900 font-medium">{record.milk_volume}L</p>
                                            </div>
                                            {record.fat_content !== undefined && (
                                              <div className="p-2 bg-green-50 rounded">
                                                <p className="text-gray-600 font-semibold">Fat</p>
                                                <p className="text-gray-900 font-medium">{record.fat_content.toFixed(2)}%</p>
                                              </div>
                                            )}
                                            {record.protein_content !== undefined && (
                                              <div className="p-2 bg-yellow-50 rounded">
                                                <p className="text-gray-600 font-semibold">Protein</p>
                                                <p className="text-gray-900 font-medium">{record.protein_content.toFixed(2)}%</p>
                                              </div>
                                            )}
                                            {record.temperature !== undefined && (
                                              <div className="p-2 bg-red-50 rounded">
                                                <p className="text-gray-600 font-semibold">Temp</p>
                                                <p className="text-gray-900 font-medium">{record.temperature}°C</p>
                                              </div>
                                            )}
                                          </div>

                                          {/* Mastitis Info */}
                                          {record.mastitis_test_performed && (
                                            <div className="p-2 bg-purple-50 rounded text-xs">
                                              <p className="text-gray-600 font-semibold">Mastitis Test</p>
                                              <p className="text-gray-900 font-medium capitalize">
                                                {record.mastitis_result || 'Performed'}
                                                {record.affected_quarters && record.affected_quarters.length > 0 && 
                                                  ` - Quarters: ${record.affected_quarters.join(', ')}`
                                                }
                                              </p>
                                            </div>
                                          )}

                                          {/* Notes */}
                                          {record.notes && (
                                            <div className="p-2 bg-gray-100 rounded text-xs">
                                              <p className="text-gray-600 font-semibold">Notes</p>
                                              <p className="text-gray-700">{record.notes}</p>
                                            </div>
                                          )}

                                          {/* Session Badge */}
                                          {record.milking_session_id && (
                                            <div className="flex justify-end">
                                              <Badge className={getSessionBadgeColor(record.milking_session_id)}>
                                                <Clock className="w-2.5 h-2.5 mr-0.5" />
                                                {getSessionName(record.milking_session_id)}
                                              </Badge>
                                            </div>
                                          )}
                                        </div>
                                      )
                                    })}
                                  </div>
                                )}
                              </div>
                            )
                          })
                        )}
                      </div>
                    )
                  })()}
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}

      {/* Pagination Controls - Device Optimized */}
      {totalPages > 1 && (() => {
        // Calculate which page numbers to display (show current +/- 2 on desktop)
        const getPagesToShow = () => {
          if (totalPages <= 5) {
            return Array.from({ length: totalPages }, (_, i) => i + 1)
          }
          const pages: (number | string)[] = []
          const range = 2

          // Always show first page
          pages.push(1)

          // Add ellipsis or pages before current
          if (currentPage - range > 2) {
            pages.push('...')
          }

          // Pages around current - always include them, don't skip due to ellipsis
          for (let i = Math.max(2, currentPage - range); i <= Math.min(totalPages - 1, currentPage + range); i++) {
            pages.push(i)
          }

          // Add ellipsis or pages after current
          if (currentPage + range < totalPages - 1) {
            pages.push('...')
          }

          // Always show last page
          if (!pages.includes(totalPages)) {
            pages.push(totalPages)
          }

          return pages
        }

        return (
          <div className="flex flex-col gap-3 p-3 md:p-4 bg-white rounded-lg border border-gray-200 shadow-sm">
            {/* Desktop Info Row */}
            <div className="hidden md:flex items-center justify-between">
              <div className="text-sm text-gray-600">
                Showing <span className="font-semibold">{startIndex + 1}</span> to <span className="font-semibold">{Math.min(endIndex, filteredRecords.length)}</span> of <span className="font-semibold">{filteredRecords.length}</span> records
              </div>
              <div className="text-sm text-gray-600">
                Page <span className="font-semibold">{currentPage}</span> of <span className="font-semibold">{totalPages}</span>
              </div>
            </div>

            {/* Mobile Info Row */}
            <div className="md:hidden text-center">
              <div className="text-xs font-semibold text-gray-900">
                Page {currentPage} of {totalPages}
              </div>
              <div className="text-xs text-gray-600 mt-0.5">
                {startIndex + 1}–{Math.min(endIndex, filteredRecords.length)} of {filteredRecords.length}
              </div>
            </div>

            {/* Pagination Controls */}
            <div className="flex items-center justify-between gap-2">
              {/* Left: Previous Button */}
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                disabled={currentPage === 1}
                className="flex items-center gap-1 md:gap-2 px-2 md:px-3 py-2 md:py-2 h-9 md:h-10"
              >
                <ChevronLeft className="w-4 h-4 flex-shrink-0" />
                <span className="hidden sm:inline">Previous</span>
              </Button>

              {/* Center: Page Numbers - Hide on mobile, show smart range on desktop */}
              <div className="hidden lg:flex items-center gap-1">
                {getPagesToShow().map((page, idx) =>
                  page === '...' ? (
                    <span key={`ellipsis-${idx}`} className="px-2 text-gray-400 text-xs font-semibold">
                      …
                    </span>
                  ) : (
                    <Button
                      key={page}
                      variant={currentPage === page ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setCurrentPage(page as number)}
                      className={`w-9 h-9 p-0 text-sm font-medium transition-all ${currentPage === page
                          ? 'bg-farm-green text-white border-farm-green'
                          : 'hover:bg-gray-100'
                        }`}
                    >
                      {page}
                    </Button>
                  )
                )}
              </div>

              {/* Tablet: Compact page display */}
              <div className="lg:hidden flex items-center gap-1">
                {/* Show page buttons only around current page */}
                {currentPage > 1 && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(currentPage - 1)}
                    className="w-8 h-8 p-0 text-xs"
                  >
                    {currentPage - 1}
                  </Button>
                )}
                <div className="px-2 py-1 bg-farm-green/10 rounded text-farm-green font-bold text-sm min-w-fit">
                  {currentPage}
                </div>
                {currentPage < totalPages && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(currentPage + 1)}
                    className="w-8 h-8 p-0 text-xs"
                  >
                    {currentPage + 1}
                  </Button>
                )}
              </div>

              {/* Right: Next Button */}
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                disabled={currentPage === totalPages}
                className="flex items-center gap-1 md:gap-2 px-2 md:px-3 py-2 md:py-2 h-9 md:h-10"
              >
                <span className="hidden sm:inline">Next</span>
                <ChevronRight className="w-4 h-4 flex-shrink-0" />
              </Button>
            </div>

            {/* Desktop: Quick Jump Input */}
            <div className="hidden lg:flex items-center justify-end gap-2">
              <label htmlFor="page-jump" className="text-xs font-medium text-gray-600">
                Go to page:
              </label>
              <input
                id="page-jump"
                type="number"
                min="1"
                max={totalPages}
                value={currentPage}
                onChange={(e) => {
                  const page = parseInt(e.target.value, 10)
                  if (!isNaN(page) && page >= 1 && page <= totalPages) {
                    setCurrentPage(page)
                  }
                }}
                className="w-12 h-9 px-2 border border-gray-300 rounded text-sm text-center focus:outline-none focus:ring-2 focus:ring-farm-green focus:border-transparent"
              />
              <span className="text-xs text-gray-600">/ {totalPages}</span>
            </div>
          </div>
        )
      })()}

      {/* Edit Modal */}
      {isEditModalOpen && editingRecord && (
        <>
          <RecordProductionModal
            isOpen={isEditModalOpen}
            onClose={handleEditModalClose}
            farmId={farmId || ''}
            animals={animals}
            settings={settings}
            onSuccess={handleEditSuccess}
            recordingType={editingRecordType}
            milkingGroupName={editingGroupName}
            editingRecord={{
              id: editingRecord.id,
              animal_id: editingRecord.animal_id,
              record_date: editingRecord.record_date,
              milking_session_id: editingRecord.milking_session_id || '',
              milk_volume: editingRecord.milk_volume,
              milk_safety_status: editingRecord.milk_safety_status || 'safe',
              temperature: editingRecord.temperature,
              mastitis_test_performed: editingRecord.mastitis_test_performed,
              mastitis_result: editingRecord.mastitis_result,
              affected_quarters: editingRecord.affected_quarters,
              fat_content: editingRecord.fat_content,
              protein_content: editingRecord.protein_content,
              somatic_cell_count: editingRecord.somatic_cell_count,
              lactose_content: editingRecord.lactose_content,
              ph_level: editingRecord.ph_level,
              notes: editingRecord.notes,
              milking_time: editingRecord.created_at?.split('T')[1]?.slice(0, 5)
            }}
          />
        </>
      )}
    </div>
  )
}
