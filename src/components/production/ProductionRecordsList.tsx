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
  ChevronUp,
  Users,
  Search,
  X,
  TrendingUp,
  Beaker,
} from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/DropdownMenu'
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
  AlertDialogAction,
} from '@/components/ui/AlertDialog'
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
  milking_group_name_snapshot?: string
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
  records: ProductionRecord[]
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

const formatDate = (dateString: string) =>
  new Date(dateString).toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })

const formatDateTime = (dateString: string) =>
  new Date(dateString).toLocaleString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })

// ── Pill / Badge helpers ────────────────────────────────────────────────────

function SafetyPill({ status }: { status?: string }) {
  const map: Record<string, { label: string; cls: string; Icon: React.ElementType }> = {
    safe:              { label: 'Safe',           cls: 'bg-emerald-50 text-emerald-700 border-emerald-200',  Icon: CheckCircle  },
    unsafe_health:     { label: 'Unsafe – Health',cls: 'bg-red-50 text-red-700 border-red-200',             Icon: AlertTriangle },
    unsafe_colostrum:  { label: 'Colostrum',      cls: 'bg-amber-50 text-amber-700 border-amber-200',       Icon: AlertTriangle },
  }
  const { label, cls, Icon } = map[status ?? ''] ?? { label: 'Unknown', cls: 'bg-gray-100 text-gray-500 border-gray-200', Icon: AlertTriangle }
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium border ${cls}`}>
      <Icon className="w-3 h-3" />
      {label}
    </span>
  )
}

function SessionPill({ name }: { name: string }) {
  const n = name.toLowerCase()
  const cls = n.includes('morning')
    ? 'bg-sky-50 text-sky-700 border-sky-200'
    : n.includes('afternoon')
    ? 'bg-amber-50 text-amber-700 border-amber-200'
    : n.includes('evening')
    ? 'bg-violet-50 text-violet-700 border-violet-200'
    : 'bg-gray-100 text-gray-600 border-gray-200'
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium border ${cls}`}>
      <Clock className="w-3 h-3" />
      {name}
    </span>
  )
}

// ── Stat tile inside a card ─────────────────────────────────────────────────

function StatTile({ value, label, color }: { value: string; label: string; color: string }) {
  return (
    <div className={`flex flex-col items-center justify-center rounded-xl py-2.5 px-2 ${color}`}>
      <span className="text-base font-semibold leading-tight">{value}</span>
      <span className="text-[10px] font-medium mt-0.5 opacity-80 tracking-wide uppercase">{label}</span>
    </div>
  )
}

// ── Divider row label ───────────────────────────────────────────────────────

function DayDivider({ date }: { date: string }) {
  return (
    <div className="flex items-center gap-3 py-1">
      <span className="text-xs font-semibold text-gray-400 tracking-widest uppercase whitespace-nowrap">
        {formatDate(date)}
      </span>
      <div className="flex-1 h-px bg-gray-100" />
    </div>
  )
}

// ── Main component ──────────────────────────────────────────────────────────

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
  onFetchDateRange,
}: ProductionRecordsListProps) {
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [recordToDelete, setRecordToDelete] = useState<string | null>(null)
  const [currentPage, setCurrentPage] = useState(1)
  const [filterSession, setFilterSession] = useState<string>('all')
  const [filterSafetyStatus, setFilterSafetyStatus] = useState<string>('all')
  const [filterDateFrom, setFilterDateFrom] = useState<string>('')
  const [filterDateTo, setFilterDateTo] = useState<string>('')
  const [filterDateToTouched, setFilterDateToTouched] = useState(false)
  const [filterAnimalSearch, setFilterAnimalSearch] = useState<string>('')
  const [filterCategory, setFilterCategory] = useState<string>('all')
  const [viewTab, setViewTab] = useState<ViewTab>('individual')
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set())
  const [expandedGroupAnimals, setExpandedGroupAnimals] = useState<Set<string>>(new Set())
  const [expandedSessions, setExpandedSessions] = useState<Set<string>>(new Set())
  const [selectedSession, setSelectedSession] = useState<string | null>(null)
  const [activeSessionBadge, setActiveSessionBadge] = useState<Record<string, string>>({})
  const [milkingGroups, setMilkingGroups] = useState<Map<string, string>>(new Map())
  const [groupToCategory, setGroupToCategory] = useState<Map<string, string>>(new Map())
  const [availableCategories, setAvailableCategories] = useState<Array<{ id: string; name: string }>>([])
  const [availableSessions, setAvailableSessions] = useState<Array<{ id: string; name: string }>>([])
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [editingRecord, setEditingRecord] = useState<ProductionRecord | null>(null)
  const [editingRecordType, setEditingRecordType] = useState<'individual' | 'group' | undefined>()
  const [editingGroupName, setEditingGroupName] = useState<string | undefined>()
  const [showFilters, setShowFilters] = useState(false)

  const RECORDS_PER_PAGE = 10

  // ── Data fetching effects ─────────────────────────────────────────────────

  React.useEffect(() => {
    if (!farmId) return
    fetch(`/api/farms/${farmId}/production/milking-sessions-list`)
      .then(r => r.ok ? r.json() : null)
      .then(result => {
        if (result) setAvailableSessions(result.data || [])
        else setAvailableSessions([
          { id: 'morning', name: 'Morning' },
          { id: 'afternoon', name: 'Afternoon' },
          { id: 'evening', name: 'Evening' },
        ])
      })
      .catch(() => setAvailableSessions([
        { id: 'morning', name: 'Morning' },
        { id: 'afternoon', name: 'Afternoon' },
        { id: 'evening', name: 'Evening' },
      ]))
  }, [farmId])

  React.useEffect(() => {
    if (!farmId) return
    fetch(`/api/farms/${farmId}/production/milking-groups`)
      .then(r => r.ok ? r.json() : null)
      .then(result => {
        if (!result) return
        const groups = result.data || result
        const gMap = new Map<string, string>()
        const gcMap = new Map<string, string>()
        const catMap = new Map<string, string>()
        groups.forEach((g: any) => {
          gMap.set(g.id, g.category_name)
          if (g.category_id) {
            gcMap.set(g.id, g.category_id)
            catMap.set(g.category_id, g.category_name)
          }
        })
        setMilkingGroups(gMap)
        setGroupToCategory(gcMap)
        setAvailableCategories(Array.from(catMap, ([id, name]) => ({ id, name })))
      })
      .catch(() => {})
  }, [farmId])

  React.useEffect(() => {
    if (!onFetchDateRange || !filterDateTo || !filterDateFrom || !filterDateToTouched) {
      console.log('[ProductionRecordsList] Date fetch skipped:', {
        hasCallback: !!onFetchDateRange,
        filterDateTo,
        filterDateFrom,
        filterDateToTouched,
      })
      return
    }
    console.log('[ProductionRecordsList] Fetching date range:', {
      startDate: filterDateFrom,
      endDate: filterDateTo,
    })
    onFetchDateRange(filterDateFrom, filterDateTo).catch((error) => {
      console.error('[ProductionRecordsList] Date range fetch failed:', {
        error,
        startDate: filterDateFrom,
        endDate: filterDateTo,
        errorMessage: error?.message,
      })
    })
  }, [filterDateFrom, filterDateTo, filterDateToTouched, onFetchDateRange])

  // ── Derived maps ──────────────────────────────────────────────────────────

  const sessionNameMap = useMemo(
    () => new Map(availableSessions.map(s => [s.id, s.name])),
    [availableSessions]
  )

  const dedupedSessions = useMemo(() => {
    const seen = new Set<string>()
    return availableSessions.filter(s => {
      if (seen.has(s.name)) return false
      seen.add(s.name)
      return true
    })
  }, [availableSessions])

  const getGroupName = (record: ProductionRecord): string | null => {
    if (record.milking_group_name_snapshot) return record.milking_group_name_snapshot
    if (record.milking_group_id) return milkingGroups.get(record.milking_group_id) || null
    return null
  }

  const getGroupNameFromFirst = (recs: ProductionRecord[]) =>
    recs.length ? getGroupName(recs[0]) : null

  const getSessionName = (id?: string) =>
    id ? (sessionNameMap.get(id) || id) : 'Unknown Session'

  const getSessionColor = (id?: string) => {
    const n = (id ? getSessionName(id) : '').toLowerCase()
    return n.includes('morning') ? 'bg-sky-50 text-sky-700 border-sky-200'
      : n.includes('afternoon') ? 'bg-amber-50 text-amber-700 border-amber-200'
      : n.includes('evening') ? 'bg-violet-50 text-violet-700 border-violet-200'
      : 'bg-gray-100 text-gray-600 border-gray-200'
  }

  // ── Filtering ─────────────────────────────────────────────────────────────

  const activeFilterCount = [
    filterSession !== 'all',
    filterSafetyStatus !== 'all',
    filterCategory !== 'all',
    !!filterDateFrom,
    !!filterDateTo,
    !!filterAnimalSearch,
  ].filter(Boolean).length

  const filteredRecords = useMemo(() => {
    const search = filterAnimalSearch.trim().toLowerCase()
    return records.filter(record => {
      if (filterDateFrom) {
        const rd = new Date(record.record_date).toISOString().split('T')[0]
        if (rd < filterDateFrom) return false
      }
      if (filterDateTo) {
        const rd = new Date(record.record_date).toISOString().split('T')[0]
        if (rd > filterDateTo) return false
      }
      if (filterSession !== 'all') {
        const name = sessionNameMap.get(record.milking_session_id || '') || null
        if (name !== filterSession) return false
      }
      if (filterSafetyStatus !== 'all' && record.milk_safety_status !== filterSafetyStatus) return false
      if (filterCategory !== 'all' && record.milking_group_id) {
        const cat = groupToCategory.get(record.milking_group_id)
        if (cat !== filterCategory) return false
      }
      if (search) {
        const tag = (record.animals?.tag_number || '').toLowerCase()
        const name = (record.animals?.name || '').toLowerCase()
        if (!tag.includes(search) && !name.includes(search)) return false
      }
      return true
    })
  }, [records, filterSession, filterSafetyStatus, filterCategory, filterDateFrom, filterDateTo, filterAnimalSearch, groupToCategory, sessionNameMap])

  const clearFilters = () => {
    setFilterSession('all')
    setFilterSafetyStatus('all')
    setFilterCategory('all')
    setFilterDateFrom('')
    setFilterDateTo('')
    setFilterDateToTouched(false)
    setFilterAnimalSearch('')
    setCurrentPage(1)
  }

  // ── Milking cycle helpers ─────────────────────────────────────────────────

  const getFirstSessionId = () => availableSessions[0]?.id

  const calculateCycleDate = (record: ProductionRecord) => {
    const firstId = getFirstSessionId()
    if (!firstId) return record.record_date
    const ri = availableSessions.findIndex(s => s.id === record.milking_session_id)
    const fi = availableSessions.findIndex(s => s.id === firstId)
    if (ri < fi) {
      const d = new Date(record.record_date)
      d.setDate(d.getDate() - 1)
      return d.toISOString().split('T')[0]
    }
    return record.record_date
  }

  // ── Daily summary (individual) ────────────────────────────────────────────

  const milkingCycleGrouped = useMemo(() => {
    if (filterSession !== 'all') return null
    const map = new Map<string, ProductionRecord[]>()
    filteredRecords.forEach(r => {
      const key = calculateCycleDate(r)
      if (!map.has(key)) map.set(key, [])
      map.get(key)!.push(r)
    })
    return map
  }, [filteredRecords, filterSession, availableSessions])

  const dailySummaryRecords = useMemo(() => {
    if (!milkingCycleGrouped) return null
    const summaries: any[] = []
    milkingCycleGrouped.forEach((cycleRecs, cycleDate) => {
      const byAnimal = new Map<string, ProductionRecord[]>()
      cycleRecs.forEach(r => {
        if (!byAnimal.has(r.animal_id)) byAnimal.set(r.animal_id, [])
        byAnimal.get(r.animal_id)!.push(r)
      })
      byAnimal.forEach((animalRecs, animalId) => {
        const vol = animalRecs.reduce((s, r) => s + (r.milk_volume || 0), 0)
        const fatVals = animalRecs.map(r => r.fat_content).filter((v): v is number => v != null)
        const protVals = animalRecs.map(r => r.protein_content).filter((v): v is number => v != null)
        const sessions = [...new Set(animalRecs.map(r => r.milking_session_id).filter(Boolean))] as string[]
        summaries.push({
          cycleDate,
          animal_id: animalId,
          animalName: animalRecs[0].animals?.name || `Animal ${animalRecs[0].animals?.tag_number}`,
          animalTag: animalRecs[0].animals?.tag_number || '',
          totalMilkVolume: vol,
          recordCount: animalRecs.length,
          avgFatContent: fatVals.length ? fatVals.reduce((a, b) => a + b, 0) / fatVals.length : null,
          avgProteinContent: protVals.length ? protVals.reduce((a, b) => a + b, 0) / protVals.length : null,
          sessions,
          records: animalRecs,
          milking_group_name: getGroupName(animalRecs[0]) || null,
        })
      })
    })
    return summaries.sort((a, b) => {
      const dc = new Date(b.cycleDate).getTime() - new Date(a.cycleDate).getTime()
      return dc !== 0 ? dc : a.animalName.localeCompare(b.animalName)
    })
  }, [milkingCycleGrouped])

  // ── Daily summary (groups) ────────────────────────────────────────────────

  const dailySummaryGroups = useMemo(() => {
    if (!milkingCycleGrouped) return null
    const summaries: any[] = []
    milkingCycleGrouped.forEach((cycleRecs, cycleDate) => {
      const byGroup = new Map<string, ProductionRecord[]>()
      cycleRecs.forEach(r => {
        const key = r.milking_group_id || '__default__'
        if (!byGroup.has(key)) byGroup.set(key, [])
        byGroup.get(key)!.push(r)
      })
      byGroup.forEach((groupRecs, groupKey) => {
        const vol = groupRecs.reduce((s, r) => s + (r.milk_volume || 0), 0)
        const fatVals = groupRecs.map(r => r.fat_content).filter((v): v is number => v != null)
        const protVals = groupRecs.map(r => r.protein_content).filter((v): v is number => v != null)
        const uniqueAnimals = new Set(groupRecs.map(r => r.animal_id)).size
        const actualGroupId = groupKey === '__default__' ? null : groupKey
        const groupName = actualGroupId ? getGroupNameFromFirst(groupRecs) : null
        summaries.push({
          cycleDate,
          milking_group_id: actualGroupId,
          groupName: groupName || (groupKey === '__default__' ? 'Default Group' : 'Milking Group'),
          totalMilkVolume: vol,
          totalRecords: groupRecs.length,
          animalCount: uniqueAnimals,
          avgFatContent: fatVals.length ? fatVals.reduce((a, b) => a + b, 0) / fatVals.length : null,
          avgProteinContent: protVals.length ? protVals.reduce((a, b) => a + b, 0) / protVals.length : null,
          records: groupRecs,
        })
      })
    })
    return summaries.sort((a, b) => {
      const dc = new Date(b.cycleDate).getTime() - new Date(a.cycleDate).getTime()
      return dc !== 0 ? dc : a.groupName.localeCompare(b.groupName)
    })
  }, [milkingCycleGrouped, milkingGroups])

  // ── Single session grouped records ────────────────────────────────────────

  const groupedRecords = useMemo(() => {
    const map = new Map<string, ProductionRecord[]>()
    filteredRecords.filter(r => r.recording_type === 'group').forEach(r => {
      const key = r.milking_group_id || '__default__'
      if (!map.has(key)) map.set(key, [])
      map.get(key)!.push(r)
    })
    return Array.from(map.entries()).map(([key, recs]) => {
      const sorted = [...recs].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      const actualId = key === '__default__' ? null : key
      const name = actualId ? getGroupNameFromFirst(recs) : null
      return {
        milking_group_id: actualId,
        groupName: name || (key === '__default__' ? 'Default Group' : 'Milking Group'),
        totalMilkVolume: recs.reduce((s, r) => s + (r.milk_volume || 0), 0),
        recordCount: new Set(recs.map(r => r.animal_id)).size,
        mostRecentSession: sorted[0] || null,
        records: recs,
      } as GroupData
    }).sort((a, b) => {
      const da = a.mostRecentSession?.created_at || ''
      const db = b.mostRecentSession?.created_at || ''
      return new Date(db).getTime() - new Date(da).getTime()
    })
  }, [filteredRecords, milkingGroups])

  // ── Display data / pagination ─────────────────────────────────────────────

  const displayData = useMemo(() => {
    if (filterSession === 'all') {
      return viewTab === 'individual'
        ? (dailySummaryRecords || [])
        : (dailySummaryGroups || [])
    }
    return viewTab === 'individual' ? filteredRecords : groupedRecords
  }, [filterSession, viewTab, dailySummaryRecords, dailySummaryGroups, filteredRecords, groupedRecords])

  const totalPages = Math.ceil(displayData.length / RECORDS_PER_PAGE)
  const startIndex = (currentPage - 1) * RECORDS_PER_PAGE
  const paginatedData = displayData.slice(startIndex, startIndex + RECORDS_PER_PAGE)

  const resetPagination = () => setCurrentPage(1)

  // ── Animal aggregates for group expand ────────────────────────────────────

  const calcAnimalAggregates = (recs: ProductionRecord[]) => {
    const map = new Map<string, any>()
    recs.forEach(r => {
      if (!map.has(r.animal_id)) {
        map.set(r.animal_id, {
          animal_id: r.animal_id,
          animal_name: r.animals?.name || `Animal #${r.animals?.tag_number}`,
          animal_tag: r.animals?.tag_number || '',
          total_volume: 0,
          record_count: 0,
          records: [] as ProductionRecord[],
        })
      }
      const a = map.get(r.animal_id)!
      a.total_volume += r.milk_volume || 0
      a.record_count += 1
      a.records.push(r)
    })
    return Array.from(map.values()).sort((a, b) => b.total_volume - a.total_volume)
  }

  // ── Quality badge ─────────────────────────────────────────────────────────

  const qualityLabel = (fat?: number | null, protein?: number | null) => {
    if (!fat || !protein) return null
    const fg = fat >= 3.5 && fat <= 4.5
    const pg = protein >= 3.0 && protein <= 3.5
    if (fg && pg) return { label: 'Excellent', cls: 'bg-emerald-50 text-emerald-700 border-emerald-200' }
    if (fg || pg) return { label: 'Good', cls: 'bg-amber-50 text-amber-700 border-amber-200' }
    return { label: 'Needs attention', cls: 'bg-red-50 text-red-700 border-red-200' }
  }

  // ── CRUD handlers ─────────────────────────────────────────────────────────

  const handleDelete = (id: string) => { setRecordToDelete(id); setDeleteDialogOpen(true) }

  const executeDelete = async () => {
    if (!recordToDelete) return
    setDeletingId(recordToDelete)
    setDeleteDialogOpen(false)
    try {
      const res = await fetch(`/api/production/${recordToDelete}`, { method: 'DELETE' })
      if (!res.ok) throw new Error()
      onDelete ? onDelete(recordToDelete) : window.location.reload()
    } catch {
      alert('Failed to delete record. Please try again.')
    } finally {
      setDeletingId(null)
      setRecordToDelete(null)
    }
  }

  const handleEdit = (record: ProductionRecord) => {
    setEditingRecord(record)
    setEditingRecordType(record.recording_type)
    setEditingGroupName(record.recording_type === 'group' && record.milking_group_id ? getGroupName(record) || undefined : undefined)
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
    onEdit ? onEdit(editingRecord!) : window.location.reload()
  }

  // ── Worst safety across records ───────────────────────────────────────────
  const worstSafety = (recs: ProductionRecord[]) => {
    const statuses = recs.map(r => r.milk_safety_status).filter(Boolean)
    return statuses.includes('unsafe_health') ? 'unsafe_health'
      : statuses.includes('unsafe_colostrum') ? 'unsafe_colostrum'
      : statuses.length ? 'safe' : undefined
  }

  // ── Empty state ───────────────────────────────────────────────────────────

  if (records.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <div className="w-16 h-16 rounded-2xl bg-gray-50 border border-gray-100 flex items-center justify-center mb-4">
          <Droplets className="w-8 h-8 text-gray-300" />
        </div>
        <h3 className="text-base font-semibold text-gray-700 mb-1">No production records yet</h3>
        <p className="text-sm text-gray-400">Start recording milk production to see data here.</p>
      </div>
    )
  }

  // ── Render ────────────────────────────────────────────────────────────────

  const isBasic = settings?.productionTrackingMode === 'basic'

  return (
    <div className="space-y-4">

      {/* ── Top bar: search + filter toggle ─────────────────────────────── */}
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
          <input
            type="text"
            placeholder="Search animal name or tag…"
            value={filterAnimalSearch}
            onChange={e => { setFilterAnimalSearch(e.target.value); resetPagination() }}
            className="w-full pl-9 pr-4 py-2 text-sm border border-gray-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-400 placeholder:text-gray-400"
          />
          {filterAnimalSearch && (
            <button onClick={() => { setFilterAnimalSearch(''); resetPagination() }} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
        <button
          onClick={() => setShowFilters(p => !p)}
          className={`flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-xl border transition-colors ${
            activeFilterCount > 0 || showFilters
              ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
              : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'
          }`}
        >
          <Filter className="w-4 h-4" />
          Filters
          {activeFilterCount > 0 && (
            <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-emerald-600 text-white text-[10px] font-bold">
              {activeFilterCount}
            </span>
          )}
        </button>
      </div>

      {/* ── Collapsible filter panel ─────────────────────────────────────── */}
      {showFilters && (
        <div className="bg-white border border-gray-200 rounded-2xl p-4 space-y-3">
          <div className={`grid gap-3 ${isMobile ? 'grid-cols-1' : 'grid-cols-2 lg:grid-cols-4'}`}>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Milking session</label>
              <select
                value={filterSession}
                onChange={e => { setFilterSession(e.target.value); resetPagination() }}
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
              >
                <option value="all">All sessions</option>
                {dedupedSessions.map(s => <option key={s.id} value={s.name}>{s.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Milk safety</label>
              <select
                value={filterSafetyStatus}
                onChange={e => { setFilterSafetyStatus(e.target.value); resetPagination() }}
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
              >
                <option value="all">All statuses</option>
                <option value="safe">Safe</option>
                <option value="unsafe_health">Unsafe – Health</option>
                <option value="unsafe_colostrum">Colostrum</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">From date</label>
              <input
                type="date"
                value={filterDateFrom}
                onChange={e => {
                  console.log('[ProductionRecordsList] From date changed:', {
                    newValue: e.target.value,
                    currentDateTo: filterDateTo,
                  })
                  setFilterDateFrom(e.target.value)
                  resetPagination()
                }}
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">To date</label>
              <input
                type="date"
                value={filterDateTo}
                onFocus={() => {
                  console.log('[ProductionRecordsList] To date focused')
                  setFilterDateToTouched(true)
                }}
                onChange={e => {
                  console.log('[ProductionRecordsList] To date changed:', {
                    newValue: e.target.value,
                    currentDateFrom: filterDateFrom,
                    isTouched: filterDateToTouched,
                  })
                  if (filterDateToTouched) {
                    setFilterDateTo(e.target.value)
                    resetPagination()
                  }
                }}
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
              />
            </div>
            {availableCategories.length > 0 && (
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Animal category</label>
                <select
                  value={filterCategory}
                  onChange={e => { setFilterCategory(e.target.value); resetPagination() }}
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
                >
                  <option value="all">All categories</option>
                  {availableCategories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
            )}
          </div>
          {activeFilterCount > 0 && (
            <div className="flex justify-end pt-1">
              <button onClick={clearFilters} className="text-xs text-gray-500 hover:text-red-600 flex items-center gap-1">
                <X className="w-3 h-3" /> Clear all filters
              </button>
            </div>
          )}
        </div>
      )}

      {/* ── View tab selector ────────────────────────────────────────────── */}
      <div className="flex rounded-xl border border-gray-200 bg-gray-50 p-1 gap-1">
        {(['individual', 'groups'] as ViewTab[]).map(tab => (
          <button
            key={tab}
            onClick={() => { setViewTab(tab); resetPagination(); setExpandedGroups(new Set()) }}
            className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-sm font-medium transition-all ${
              viewTab === tab
                ? 'bg-white shadow-sm border border-gray-200 text-gray-900'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            {tab === 'individual' ? <Droplets className="w-4 h-4" /> : <Users className="w-4 h-4" />}
            {tab === 'individual' ? 'Individual animals' : 'Milking groups'}
          </button>
        ))}
      </div>

      {/* ── Results summary ──────────────────────────────────────────────── */}
      <p className="text-xs text-gray-400 px-1">
        {displayData.length === 0 ? 'No results' : (
          <>Showing {Math.min(paginatedData.length, displayData.length)} of {displayData.length} {filterSession === 'all' ? (viewTab === 'individual' ? 'daily animal totals' : 'daily group totals') : (viewTab === 'individual' ? 'records' : 'groups')}</>
        )}
        {activeFilterCount > 0 && <span className="ml-2 text-emerald-600 font-medium">· {activeFilterCount} filter{activeFilterCount > 1 ? 's' : ''} active</span>}
      </p>

      {/* ── Empty filtered state ─────────────────────────────────────────── */}
      {paginatedData.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 bg-gray-50 rounded-2xl border border-dashed border-gray-200">
          <Search className="w-8 h-8 text-gray-300 mb-3" />
          <p className="text-sm font-medium text-gray-600">No records match your filters</p>
          <button onClick={clearFilters} className="mt-2 text-xs text-emerald-600 hover:underline">Clear filters</button>
        </div>

      ) : filterSession === 'all' && viewTab === 'individual' && dailySummaryRecords ? (
        /* ─────────────────────────────────────────────────────────────────
           ALL SESSIONS — INDIVIDUAL ANIMALS (daily totals)
        ──────────────────────────────────────────────────────────────── */
        <div className="space-y-1">
          {(() => {
            let lastDate = ''
            return (paginatedData as any[]).map((summary) => {
              const summaryKey = `${summary.cycleDate}-${summary.animal_id}`
              const isSessionViewActive = selectedSession?.startsWith(summaryKey)
              const selectedSessionId = isSessionViewActive ? selectedSession?.split('|')[1] : null
              const sessionRecords: ProductionRecord[] = isSessionViewActive
                ? summary.records.filter((r: ProductionRecord) => r.milking_session_id === selectedSessionId)
                : []
              const activeId = activeSessionBadge[summaryKey]
              const qual = qualityLabel(summary.avgFatContent, summary.avgProteinContent)
              const showDivider = summary.cycleDate !== lastDate
              lastDate = summary.cycleDate

              // Metrics (reactive to active session badge)
              const recs: ProductionRecord[] = activeId
                ? summary.records.filter((r: any) => r.milking_session_id === activeId)
                : summary.records
              const vol = recs.reduce((s: number, r: any) => s + (r.milk_volume || 0), 0)
              const fatVals = recs.map((r: any) => r.fat_content).filter((v: any) => v != null)
              const protVals = recs.map((r: any) => r.protein_content).filter((v: any) => v != null)
              const avgFat = fatVals.length ? fatVals.reduce((a: number, b: number) => a + b, 0) / fatVals.length : null
              const avgProt = protVals.length ? protVals.reduce((a: number, b: number) => a + b, 0) / protVals.length : null

              return (
                <React.Fragment key={summaryKey}>
                  {showDivider && <DayDivider date={summary.cycleDate} />}

                  <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden hover:border-gray-200 transition-colors">

                    {/* Session detail drill-down */}
                    {isSessionViewActive && sessionRecords.length > 0 ? (
                      <div className="p-4 space-y-3">
                        <div className="flex items-center justify-between pb-3 border-b border-gray-100">
                          <button
                            onClick={() => setSelectedSession(null)}
                            className="text-xs font-medium text-emerald-600 hover:text-emerald-800 flex items-center gap-1"
                          >
                            <ChevronLeft className="w-3 h-3" /> Back to daily view
                          </button>
                          <span className="text-xs font-semibold text-gray-700">
                            {summary.animalName} · {getSessionName(selectedSessionId || undefined)} · {formatDate(summary.cycleDate)}
                          </span>
                        </div>
                        {sessionRecords.map((record: ProductionRecord) => (
                          <div key={record.id} className="p-3 bg-gray-50 rounded-xl border border-gray-100 space-y-3">
                            <div className="flex items-center justify-between">
                              <span className="text-xs text-gray-500">{formatDateTime(record.created_at)}</span>
                              <SafetyPill status={record.milk_safety_status} />
                            </div>
                            <div className={`grid gap-2 ${isBasic ? 'grid-cols-2' : 'grid-cols-2 md:grid-cols-4'}`}>
                              <StatTile value={`${record.milk_volume?.toFixed(1) ?? '—'} L`} label="Volume" color="bg-sky-50 text-sky-700" />
                              <StatTile value={record.temperature != null ? `${record.temperature.toFixed(1)}°C` : '—'} label="Temp" color="bg-rose-50 text-rose-700" />
                              {!isBasic && <>
                                <StatTile value={record.fat_content != null ? `${record.fat_content.toFixed(2)}%` : '—'} label="Fat" color="bg-amber-50 text-amber-700" />
                                <StatTile value={record.protein_content != null ? `${record.protein_content.toFixed(2)}%` : '—'} label="Protein" color="bg-emerald-50 text-emerald-700" />
                              </>}
                            </div>
                            {!isBasic && (
                              <div className="grid grid-cols-3 gap-2 text-xs">
                                <div className="p-2 bg-white rounded-lg border border-gray-100">
                                  <p className="text-gray-400 mb-0.5 font-medium">SCC</p>
                                  <p className="text-gray-800 font-semibold">{record.somatic_cell_count != null ? record.somatic_cell_count.toLocaleString() : '—'}</p>
                                </div>
                                <div className="p-2 bg-white rounded-lg border border-gray-100">
                                  <p className="text-gray-400 mb-0.5 font-medium">Lactose</p>
                                  <p className="text-gray-800 font-semibold">{record.lactose_content != null ? `${record.lactose_content.toFixed(2)}%` : '—'}</p>
                                </div>
                                <div className="p-2 bg-white rounded-lg border border-gray-100">
                                  <p className="text-gray-400 mb-0.5 font-medium">pH</p>
                                  <p className="text-gray-800 font-semibold">{record.ph_level != null ? record.ph_level.toFixed(2) : '—'}</p>
                                </div>
                              </div>
                            )}
                            <div className="grid grid-cols-2 gap-2 text-xs">
                              <div className="p-2 bg-white rounded-lg border border-gray-100">
                                <p className="text-gray-400 mb-0.5 font-medium">Mastitis</p>
                                <p className="text-gray-800 font-semibold">
                                  {record.mastitis_test_performed
                                    ? record.mastitis_result
                                      ? record.mastitis_result.charAt(0).toUpperCase() + record.mastitis_result.slice(1)
                                      : 'Tested'
                                    : 'N/A'}
                                </p>
                              </div>
                              {record.notes && (
                                <div className="p-2 bg-white rounded-lg border border-gray-100 col-span-1">
                                  <p className="text-gray-400 mb-0.5 font-medium">Notes</p>
                                  <p className="text-gray-700 text-[11px] line-clamp-2">{record.notes}</p>
                                </div>
                              )}
                            </div>
                            {canEdit && (
                              <div className="flex gap-2 pt-1">
                                <button onClick={() => onView?.(record)} className="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-700 px-2 py-1 rounded-lg hover:bg-gray-100">
                                  <Eye className="w-3 h-3" /> View
                                </button>
                                <button onClick={() => handleEdit(record)} className="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-700 px-2 py-1 rounded-lg hover:bg-gray-100">
                                  <Edit className="w-3 h-3" /> Edit
                                </button>
                                <button onClick={() => handleDelete(record.id)} disabled={deletingId === record.id} className="flex items-center gap-1 text-xs text-red-500 hover:text-red-700 px-2 py-1 rounded-lg hover:bg-red-50">
                                  <Trash2 className="w-3 h-3" /> {deletingId === record.id ? 'Deleting…' : 'Delete'}
                                </button>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    ) : (
                      /* Daily total card */
                      <div className="p-4">
                        {/* Animal header */}
                        <div className="flex items-start justify-between gap-3 mb-3">
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-xl bg-emerald-50 flex items-center justify-center flex-shrink-0">
                              <Droplets className="w-4 h-4 text-emerald-600" />
                            </div>
                            <div>
                              <p className="text-sm font-semibold text-gray-900 leading-tight">{summary.animalName}</p>
                              <p className="text-xs text-gray-400">Tag #{summary.animalTag}</p>
                            </div>
                          </div>
                          <div className="flex flex-wrap justify-end gap-1.5">
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-gray-100 text-gray-600 border border-gray-200">
                              <Clock className="w-3 h-3" />
                              {summary.recordCount} session{summary.recordCount !== 1 ? 's' : ''}
                            </span>
                            {summary.milking_group_name && (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
                                <Users className="w-3 h-3" />
                                {summary.milking_group_name}
                              </span>
                            )}
                            {qual && !isBasic && (
                              <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium border ${qual.cls}`}>
                                {qual.label}
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Stats */}
                        <div className={`grid gap-2 mb-3 ${isBasic ? 'grid-cols-2' : 'grid-cols-2 md:grid-cols-4'}`}>
                          <StatTile value={`${vol.toFixed(1)} L`} label={activeId ? `${getSessionName(activeId)}` : 'Total'} color={activeId ? 'bg-indigo-50 text-indigo-700' : 'bg-sky-50 text-sky-700'} />
                          {!isBasic && <>
                            <StatTile value={avgFat != null ? `${avgFat.toFixed(2)}%` : '—'} label="Avg fat" color="bg-amber-50 text-amber-700" />
                            <StatTile value={avgProt != null ? `${avgProt.toFixed(2)}%` : '—'} label="Avg protein" color="bg-emerald-50 text-emerald-700" />
                          </>}
                          <StatTile value={String(recs.length)} label="Records" color="bg-violet-50 text-violet-700" />
                        </div>

                        {/* Health row */}
                        <div className="grid grid-cols-3 gap-2 text-xs mb-3">
                          {(() => {
                            const mastitis = recs.find((r: any) => r.mastitis_test_performed)
                            const mastitisTxt = mastitis
                              ? mastitis.mastitis_result
                                ? mastitis.mastitis_result.charAt(0).toUpperCase() + mastitis.mastitis_result.slice(1)
                                : 'Tested'
                              : 'N/A'
                            const tempVals = recs.map((r: any) => r.temperature).filter((v: any) => v != null)
                            const avgTemp = tempVals.length ? (tempVals.reduce((a: number, b: number) => a + b, 0) / tempVals.length).toFixed(1) : null
                            return (
                              <>
                                <div className="p-2 bg-gray-50 rounded-xl border border-gray-100">
                                  <p className="text-gray-400 font-medium mb-0.5">Mastitis</p>
                                  <p className="text-gray-800 font-semibold">{mastitisTxt}</p>
                                </div>
                                <div className="p-2 bg-gray-50 rounded-xl border border-gray-100">
                                  <p className="text-gray-400 font-medium mb-0.5">Avg temp</p>
                                  <p className="text-gray-800 font-semibold">{avgTemp ? `${avgTemp}°C` : '—'}</p>
                                </div>
                                <div className="p-2 bg-gray-50 rounded-xl border border-gray-100">
                                  <p className="text-gray-400 font-medium mb-0.5">Safety</p>
                                  <SafetyPill status={worstSafety(recs)} />
                                </div>
                              </>
                            )
                          })()}
                        </div>

                        {/* Sessions expand */}
                        <div className="border-t border-gray-100 pt-2">
                          <button
                            onClick={() => {
                              const k = summaryKey
                              const next = new Set(expandedSessions)
                              next.has(k) ? next.delete(k) : next.add(k)
                              setExpandedSessions(next)
                            }}
                            className="flex items-center gap-1.5 text-xs font-medium text-gray-500 hover:text-gray-800 transition-colors"
                          >
                            {expandedSessions.has(summaryKey) ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                            Sessions this cycle ({summary.sessions.length})
                          </button>
                          {expandedSessions.has(summaryKey) && (
                            <div className="flex flex-wrap gap-1.5 mt-2">
                              {summary.sessions.map((sid: string) => {
                                const isActive = activeSessionBadge[summaryKey] === sid
                                return (
                                  <button
                                    key={sid}
                                    onClick={() => {
                                      if (activeSessionBadge[summaryKey] === sid) {
                                        const next = { ...activeSessionBadge }
                                        delete next[summaryKey]
                                        setActiveSessionBadge(next)
                                        setSelectedSession(null)
                                      } else {
                                        setActiveSessionBadge(prev => ({ ...prev, [summaryKey]: sid }))
                                        setSelectedSession(`${summaryKey}|${sid}`)
                                      }
                                    }}
                                  >
                                    <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-medium border transition-all cursor-pointer ${
                                      isActive
                                        ? 'bg-indigo-100 text-indigo-800 border-indigo-300 ring-2 ring-indigo-300'
                                        : getSessionColor(sid)
                                    }`}>
                                      <Clock className="w-3 h-3" />
                                      {getSessionName(sid)}
                                    </span>
                                  </button>
                                )
                              })}
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </React.Fragment>
              )
            })
          })()}
        </div>

      ) : filterSession === 'all' && viewTab === 'groups' && dailySummaryGroups ? (
        /* ─────────────────────────────────────────────────────────────────
           ALL SESSIONS — MILKING GROUPS (daily totals with animal expand)
        ──────────────────────────────────────────────────────────────── */
        <div className="space-y-1">
          {(() => {
            let lastDate = ''
            return (paginatedData as any[]).map((summary) => {
              const groupKey = `${summary.cycleDate}-${summary.milking_group_id ?? 'default'}`
              const isExpanded = expandedGroupAnimals.has(groupKey)
              const qual = qualityLabel(summary.avgFatContent, summary.avgProteinContent)
              const showDivider = summary.cycleDate !== lastDate
              lastDate = summary.cycleDate

              const animalAggregates = isExpanded ? calcAnimalAggregates(summary.records) : []

              return (
                <React.Fragment key={groupKey}>
                  {showDivider && <DayDivider date={summary.cycleDate} />}

                  <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden hover:border-gray-200 transition-colors">
                    {/* Group header — clickable */}
                    <button
                      className="w-full text-left p-4"
                      onClick={() => {
                        const next = new Set(expandedGroupAnimals)
                        next.has(groupKey) ? next.delete(groupKey) : next.add(groupKey)
                        setExpandedGroupAnimals(next)
                      }}
                    >
                      <div className="flex items-start justify-between gap-3 mb-3">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-xl bg-violet-50 flex items-center justify-center flex-shrink-0">
                            <Users className="w-4 h-4 text-violet-600" />
                          </div>
                          <div>
                            <p className="text-sm font-semibold text-gray-900 leading-tight">{summary.groupName}</p>
                            <p className="text-xs text-gray-400">{summary.animalCount} animal{summary.animalCount !== 1 ? 's' : ''} · {summary.totalRecords} record{summary.totalRecords !== 1 ? 's' : ''}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {qual && !isBasic && (
                            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium border ${qual.cls}`}>{qual.label}</span>
                          )}
                          <div className="w-7 h-7 rounded-lg bg-gray-50 flex items-center justify-center border border-gray-100">
                            {isExpanded ? <ChevronUp className="w-3.5 h-3.5 text-gray-500" /> : <ChevronDown className="w-3.5 h-3.5 text-gray-500" />}
                          </div>
                        </div>
                      </div>

                      {/* Group stats */}
                      <div className={`grid gap-2 ${isBasic ? 'grid-cols-2' : 'grid-cols-2 md:grid-cols-4'}`}>
                        <StatTile value={`${summary.totalMilkVolume.toFixed(1)} L`} label="Total volume" color="bg-sky-50 text-sky-700" />
                        {!isBasic && <>
                          <StatTile value={summary.avgFatContent != null ? `${summary.avgFatContent.toFixed(2)}%` : '—'} label="Avg fat" color="bg-amber-50 text-amber-700" />
                          <StatTile value={summary.avgProteinContent != null ? `${summary.avgProteinContent.toFixed(2)}%` : '—'} label="Avg protein" color="bg-emerald-50 text-emerald-700" />
                        </>}
                        <StatTile value={String(summary.animalCount)} label="Animals" color="bg-violet-50 text-violet-700" />
                      </div>

                      {/* Group health summary */}
                      <div className="grid grid-cols-2 gap-2 mt-2 text-xs">
                        {(() => {
                          const recs: ProductionRecord[] = summary.records
                          const mastitis = recs.find(r => r.mastitis_test_performed)
                          const mastitisTxt = mastitis
                            ? mastitis.mastitis_result
                              ? mastitis.mastitis_result.charAt(0).toUpperCase() + mastitis.mastitis_result.slice(1)
                              : 'Tested'
                            : 'N/A'
                          return (
                            <>
                              <div className="p-2 bg-gray-50 rounded-xl border border-gray-100">
                                <p className="text-gray-400 font-medium mb-0.5">Mastitis</p>
                                <p className="text-gray-800 font-semibold">{mastitisTxt}</p>
                              </div>
                              <div className="p-2 bg-gray-50 rounded-xl border border-gray-100">
                                <p className="text-gray-400 font-medium mb-0.5">Safety</p>
                                <SafetyPill status={worstSafety(recs)} />
                              </div>
                            </>
                          )
                        })()}
                      </div>
                    </button>

                    {/* Expanded animal list */}
                    {isExpanded && (
                      <div className="border-t border-gray-100 bg-gray-50/60 p-4 space-y-3">
                        <p className="text-xs font-semibold text-gray-500 uppercase tracking-widest mb-2">
                          Animals in this group ({animalAggregates.length})
                        </p>
                        {animalAggregates.length === 0 ? (
                          <p className="text-sm text-gray-400 py-4 text-center">No animals found</p>
                        ) : animalAggregates.map(a => {
                          const fatVals = a.records.map((r: ProductionRecord) => r.fat_content).filter((v: any) => v != null)
                          const protVals = a.records.map((r: ProductionRecord) => r.protein_content).filter((v: any) => v != null)
                          const avgFat = fatVals.length ? fatVals.reduce((x: number, y: number) => x + y, 0) / fatVals.length : null
                          const avgProt = protVals.length ? protVals.reduce((x: number, y: number) => x + y, 0) / protVals.length : null
                          const aq = qualityLabel(avgFat, avgProt)

                          return (
                            <div key={a.animal_id} className="bg-white rounded-xl border border-gray-200 p-3">
                              <div className="flex items-start justify-between mb-2">
                                <div>
                                  <p className="text-sm font-semibold text-gray-900">{a.animal_name}</p>
                                  <p className="text-xs text-gray-400">Tag #{a.animal_tag}</p>
                                </div>
                                <div className="text-right">
                                  <p className="text-lg font-bold text-emerald-600">{a.total_volume.toFixed(1)} L</p>
                                  <p className="text-[10px] text-gray-400">{a.record_count} record{a.record_count !== 1 ? 's' : ''}</p>
                                </div>
                              </div>
                              <div className="grid grid-cols-4 gap-1.5 text-xs">
                                <div className="p-1.5 bg-sky-50 rounded-lg text-center">
                                  <p className="font-semibold text-sky-700">{(a.total_volume / a.record_count).toFixed(1)} L</p>
                                  <p className="text-sky-600 text-[10px] font-medium mt-0.5">Avg/record</p>
                                </div>
                                <div className="p-1.5 bg-violet-50 rounded-lg text-center">
                                  <p className="font-semibold text-violet-700">{a.record_count}</p>
                                  <p className="text-violet-600 text-[10px] font-medium mt-0.5">Records</p>
                                </div>
                                <div className="p-1.5 bg-amber-50 rounded-lg text-center">
                                  <p className="font-semibold text-amber-700">{avgFat != null ? `${avgFat.toFixed(2)}%` : '—'}</p>
                                  <p className="text-amber-600 text-[10px] font-medium mt-0.5">Fat</p>
                                </div>
                                <div className="p-1.5 bg-emerald-50 rounded-lg text-center">
                                  <p className="font-semibold text-emerald-700">{avgProt != null ? `${avgProt.toFixed(2)}%` : '—'}</p>
                                  <p className="text-emerald-600 text-[10px] font-medium mt-0.5">Protein</p>
                                </div>
                              </div>
                              {aq && !isBasic && (
                                <div className="mt-2">
                                  <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium border ${aq.cls}`}>{aq.label}</span>
                                </div>
                              )}
                            </div>
                          )
                        })}
                      </div>
                    )}
                  </div>
                </React.Fragment>
              )
            })
          })()}
        </div>

      ) : viewTab === 'individual' ? (
        /* ─────────────────────────────────────────────────────────────────
           SINGLE SESSION — INDIVIDUAL RECORDS
        ──────────────────────────────────────────────────────────────── */
        <div className="space-y-3">
          {(paginatedData as ProductionRecord[]).map(record => {
            const qual = qualityLabel(record.fat_content, record.protein_content)
            return (
              <div key={record.id} className="bg-white rounded-2xl border border-gray-100 p-4 hover:border-gray-200 transition-colors">
                {/* Header */}
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-emerald-50 flex items-center justify-center flex-shrink-0">
                      <Droplets className="w-4 h-4 text-emerald-600" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-gray-900 leading-tight">
                        {record.animals?.name || `Animal ${record.animals?.tag_number}`}
                      </p>
                      <p className="text-xs text-gray-400">Tag #{record.animals?.tag_number} · {formatDate(record.record_date)}</p>
                    </div>
                  </div>
                  <div className="flex flex-wrap items-start gap-1.5 justify-end">
                    <SessionPill name={getSessionName(record.milking_session_id)} />
                    <SafetyPill status={record.milk_safety_status} />
                    {qual && !isBasic && (
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium border ${qual.cls}`}>{qual.label}</span>
                    )}
                  </div>
                </div>

                {/* Metrics */}
                <div className={`grid gap-2 mb-3 ${isBasic ? 'grid-cols-2' : 'grid-cols-2 md:grid-cols-3 lg:grid-cols-6'}`}>
                  <StatTile value={`${record.milk_volume ?? '—'} L`} label="Volume" color="bg-sky-50 text-sky-700" />
                  <StatTile value={record.temperature != null ? `${record.temperature}°C` : '—'} label="Temp" color="bg-rose-50 text-rose-700" />
                  {!isBasic && <>
                    <StatTile value={record.fat_content != null ? `${record.fat_content}%` : '—'} label="Fat" color="bg-amber-50 text-amber-700" />
                    <StatTile value={record.protein_content != null ? `${record.protein_content}%` : '—'} label="Protein" color="bg-emerald-50 text-emerald-700" />
                    <StatTile value={record.somatic_cell_count != null ? `${(record.somatic_cell_count / 1000).toFixed(0)}k` : '—'} label="SCC" color="bg-violet-50 text-violet-700" />
                    <StatTile value={record.ph_level != null ? `${record.ph_level}` : '—'} label="pH" color="bg-indigo-50 text-indigo-700" />
                  </>}
                </div>

                {/* Health row */}
                <div className="grid grid-cols-3 gap-2 text-xs border-t border-gray-100 pt-3">
                  <div className="p-2 bg-gray-50 rounded-xl">
                    <p className="text-gray-400 font-medium mb-0.5">Mastitis</p>
                    <p className="text-gray-800 font-semibold">
                      {record.mastitis_test_performed
                        ? record.mastitis_result
                          ? record.mastitis_result.charAt(0).toUpperCase() + record.mastitis_result.slice(1)
                          : 'Tested'
                        : 'N/A'}
                    </p>
                  </div>
                  <div className="p-2 bg-gray-50 rounded-xl">
                    <p className="text-gray-400 font-medium mb-0.5">Temperature</p>
                    <p className="text-gray-800 font-semibold">{record.temperature != null ? `${record.temperature.toFixed(1)}°C` : '—'}</p>
                  </div>
                  <div className="p-2 bg-gray-50 rounded-xl">
                    <p className="text-gray-400 font-medium mb-0.5">Safety</p>
                    <SafetyPill status={record.milk_safety_status} />
                  </div>
                </div>

                {record.notes && (
                  <div className="mt-2 p-2 bg-gray-50 rounded-xl text-xs text-gray-600 border border-gray-100">
                    <span className="font-semibold text-gray-700">Notes: </span>{record.notes}
                  </div>
                )}

                {/* Actions */}
                {canEdit && (
                  <div className="flex justify-end mt-3 pt-2 border-t border-gray-100">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-gray-400 hover:text-gray-600">
                          <MoreHorizontal className="w-4 h-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => onView?.(record)} className="cursor-pointer flex items-center gap-2 text-sm">
                          <Eye className="w-4 h-4" /> View details
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleEdit(record)} className="cursor-pointer flex items-center gap-2 text-sm">
                          <Edit className="w-4 h-4" /> Edit record
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => handleDelete(record.id)}
                          disabled={deletingId === record.id}
                          className="cursor-pointer flex items-center gap-2 text-sm text-red-600 focus:text-red-600 focus:bg-red-50"
                        >
                          <Trash2 className="w-4 h-4" />
                          {deletingId === record.id ? 'Deleting…' : 'Delete'}
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                )}
              </div>
            )
          })}
        </div>

      ) : (
        /* ─────────────────────────────────────────────────────────────────
           SINGLE SESSION — MILKING GROUPS (with collapsible animal list)
        ──────────────────────────────────────────────────────────────── */
        <div className="space-y-3">
          {(paginatedData as GroupData[]).map((group, idx) => {
            const groupKey = group.milking_group_id || '__default__'
            const isExpanded = expandedGroups.has(groupKey)
            const mostRecent = group.mostRecentSession
            const animalAggregates = isExpanded ? calcAnimalAggregates(group.records) : []

            return (
              <div key={`sg-${idx}`} className="bg-white rounded-2xl border border-gray-100 overflow-hidden hover:border-gray-200 transition-colors">
                {/* Clickable group header */}
                <button
                  className="w-full text-left p-4"
                  onClick={() => {
                    const next = new Set(expandedGroups)
                    next.has(groupKey) ? next.delete(groupKey) : next.add(groupKey)
                    setExpandedGroups(next)
                  }}
                >
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-xl bg-violet-50 flex items-center justify-center flex-shrink-0">
                        <Users className="w-4 h-4 text-violet-600" />
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-gray-900 leading-tight">{group.groupName}</p>
                        <p className="text-xs text-gray-400">{group.recordCount} animal{group.recordCount !== 1 ? 's' : ''}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="text-right">
                        <p className="text-lg font-bold text-emerald-600">{group.totalMilkVolume.toFixed(1)} L</p>
                        <p className="text-[10px] text-gray-400">total</p>
                      </div>
                      <div className="w-7 h-7 rounded-lg bg-gray-50 border border-gray-100 flex items-center justify-center">
                        {isExpanded ? <ChevronUp className="w-3.5 h-3.5 text-gray-500" /> : <ChevronDown className="w-3.5 h-3.5 text-gray-500" />}
                      </div>
                    </div>
                  </div>

                  {mostRecent && (
                    <div className="flex flex-wrap gap-1.5">
                      <SessionPill name={getSessionName(mostRecent.milking_session_id)} />
                      <SafetyPill status={mostRecent.milk_safety_status} />
                      {mostRecent.created_at && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-gray-100 text-gray-500 border border-gray-200">
                          <Calendar className="w-3 h-3" />
                          {formatDate(mostRecent.record_date)}
                        </span>
                      )}
                    </div>
                  )}
                </button>

                {/* Expanded animal list */}
                {isExpanded && (
                  <div className="border-t border-gray-100 bg-gray-50/60 p-4 space-y-3">
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-widest mb-2">
                      Animals in this group ({animalAggregates.length})
                    </p>
                    {animalAggregates.map(a => {
                      const fatVals = a.records.map((r: ProductionRecord) => r.fat_content).filter((v: any) => v != null)
                      const protVals = a.records.map((r: ProductionRecord) => r.protein_content).filter((v: any) => v != null)
                      const avgFat = fatVals.length ? fatVals.reduce((x: number, y: number) => x + y, 0) / fatVals.length : null
                      const avgProt = protVals.length ? protVals.reduce((x: number, y: number) => x + y, 0) / protVals.length : null
                      const aq = qualityLabel(avgFat, avgProt)

                      return (
                        <div key={a.animal_id} className="bg-white rounded-xl border border-gray-200 p-3">
                          <div className="flex items-start justify-between mb-2">
                            <div>
                              <p className="text-sm font-semibold text-gray-900">{a.animal_name}</p>
                              <p className="text-xs text-gray-400">Tag #{a.animal_tag}</p>
                            </div>
                            <div className="text-right">
                              <p className="text-lg font-bold text-emerald-600">{a.total_volume.toFixed(1)} L</p>
                              <p className="text-[10px] text-gray-400">{a.record_count} record{a.record_count !== 1 ? 's' : ''}</p>
                            </div>
                          </div>
                          <div className="grid grid-cols-4 gap-1.5 text-xs">
                            <div className="p-1.5 bg-sky-50 rounded-lg text-center">
                              <p className="font-semibold text-sky-700">{(a.total_volume / a.record_count).toFixed(1)} L</p>
                              <p className="text-sky-600 text-[10px] font-medium mt-0.5">Avg/record</p>
                            </div>
                            <div className="p-1.5 bg-violet-50 rounded-lg text-center">
                              <p className="font-semibold text-violet-700">{a.record_count}</p>
                              <p className="text-violet-600 text-[10px] font-medium mt-0.5">Records</p>
                            </div>
                            <div className="p-1.5 bg-amber-50 rounded-lg text-center">
                              <p className="font-semibold text-amber-700">{avgFat != null ? `${avgFat.toFixed(2)}%` : '—'}</p>
                              <p className="text-amber-600 text-[10px] font-medium mt-0.5">Fat</p>
                            </div>
                            <div className="p-1.5 bg-emerald-50 rounded-lg text-center">
                              <p className="font-semibold text-emerald-700">{avgProt != null ? `${avgProt.toFixed(2)}%` : '—'}</p>
                              <p className="text-emerald-600 text-[10px] font-medium mt-0.5">Protein</p>
                            </div>
                          </div>
                          {aq && !isBasic && (
                            <div className="mt-2">
                              <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium border ${aq.cls}`}>{aq.label}</span>
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* ── Pagination ───────────────────────────────────────────────────── */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between gap-3 pt-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCurrentPage(p => Math.max(p - 1, 1))}
            disabled={currentPage === 1}
            className="flex items-center gap-1"
          >
            <ChevronLeft className="w-4 h-4" /> Previous
          </Button>
          <div className="flex items-center gap-1">
            {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => {
              let page: number
              if (totalPages <= 7) {
                page = i + 1
              } else if (currentPage <= 4) {
                page = i + 1 > 6 ? totalPages : i + 1
              } else if (currentPage >= totalPages - 3) {
                page = i < 1 ? 1 : totalPages - 6 + i
              } else {
                const pages = [1, currentPage - 1, currentPage, currentPage + 1, totalPages]
                page = pages[i] ?? -1
              }
              if (page < 1) return null
              return (
                <button
                  key={page}
                  onClick={() => setCurrentPage(page)}
                  className={`w-8 h-8 rounded-lg text-sm font-medium transition-colors ${
                    currentPage === page
                      ? 'bg-emerald-600 text-white'
                      : 'text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  {page}
                </button>
              )
            })}
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCurrentPage(p => Math.min(p + 1, totalPages))}
            disabled={currentPage === totalPages}
            className="flex items-center gap-1"
          >
            Next <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
      )}

      {/* ── Edit modal ───────────────────────────────────────────────────── */}
      {isEditModalOpen && editingRecord && (
        <RecordProductionModal
          isOpen={isEditModalOpen}
          onClose={handleEditModalClose}
          farmId={farmId || ''}
          animals={animals}
          settings={settings}
          onSuccess={handleEditSuccess}
          recordingType={editingRecordType}
          milkingGroupId={editingRecord.milking_group_id}
          milkingGroupName={editingGroupName}
          editingSessionName={editingRecord.milking_session_id ? getSessionName(editingRecord.milking_session_id) : undefined}
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
            milking_time: editingRecord.created_at?.split('T')[1]?.slice(0, 5),
          }}
        />
      )}

      {/* ── Delete dialog ────────────────────────────────────────────────── */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent className="bg-slate-900 border border-slate-700">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-white">Delete production record?</AlertDialogTitle>
            <AlertDialogDescription className="text-slate-300">
              This action cannot be undone and will affect daily production summaries.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="bg-slate-700 text-white hover:bg-slate-600 border border-slate-600">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={executeDelete}
              disabled={deletingId !== null}
              className="bg-red-600 text-white hover:bg-red-700 border border-red-700"
            >
              {deletingId ? 'Deleting…' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}