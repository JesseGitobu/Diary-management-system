// src/components/breeding/BreedingEventTimeline.tsx
'use client'

import { useState, useMemo, useEffect } from 'react'
import { Badge } from '@/components/ui/Badge'
import { Card, CardContent } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { useBreedingEvents } from '@/lib/hooks/useBreedingEvents'
import { useDeviceInfo } from '@/lib/hooks/useDeviceInfo'
import { cn } from '@/lib/utils/cn'

import {
  Heart,
  Syringe,
  Stethoscope,
  Baby,
  Calendar,
  FileText,
  AlertCircle,
  Filter,
  X,
  ChevronDown,
  ChevronUp,
  User,
  Tag,
  Clock,
  Edit2,
  Trash2,
  ListFilter
} from 'lucide-react'
import { AddBreedingEventModal } from './AddBreedingEventModal'

interface BreedingEventTimelineProps {
  animalId?: string | null
  animalGender: string
  className?: string
  farmId?: string
  refreshTrigger?: number
}

const eventConfig = {
  heat_detection: {
    icon: Heart,
    color: 'bg-pink-100 text-pink-800',
    borderColor: 'border-pink-200',
    dotColor: 'bg-pink-400',
    title: 'Heat Detection'
  },
  insemination: {
    icon: Syringe,
    color: 'bg-blue-100 text-blue-800',
    borderColor: 'border-blue-200',
    dotColor: 'bg-blue-400',
    title: 'Insemination'
  },
  pregnancy_check: {
    icon: Stethoscope,
    color: 'bg-green-100 text-green-800',
    borderColor: 'border-green-200',
    dotColor: 'bg-green-400',
    title: 'Pregnancy Check'
  },
  calving: {
    icon: Baby,
    color: 'bg-yellow-100 text-yellow-800',
    borderColor: 'border-yellow-200',
    dotColor: 'bg-yellow-400',
    title: 'Calving Event'
  }
}

const DATE_RANGE_OPTIONS = [
  { value: 'all',    label: 'All Time' },
  { value: '7days',  label: 'Last 7 Days' },
  { value: '30days', label: 'Last 30 Days' },
  { value: '90days', label: 'Last 90 Days' },
] as const

export function BreedingEventTimeline({
  animalId,
  animalGender,
  className,
  farmId,
  refreshTrigger = 0
}: BreedingEventTimelineProps) {
  const { events, loading, error, refetch, loadMore, hasMore, totalCount, loadedCount } = useBreedingEvents(animalId ?? null) as {
    events: any[]
    loading: boolean
    error: string | null
    refetch?: () => void
    loadMore?: () => void
    hasMore?: boolean
    totalCount?: number
    loadedCount?: number
  }

  const { isMobile } = useDeviceInfo()

  // Log when events load (once per batch, not per render)
  useEffect(() => {
    if (!loading && events.length > 0) {
      const typeCounts = events.reduce((acc: Record<string, number>, e: any) => {
        acc[e.event_type] = (acc[e.event_type] || 0) + 1
        return acc
      }, {})
      console.log('[BreedingEventTimeline] Events loaded', {
        loaded: events.length,
        total: totalCount,
        hasMore,
        byType: typeCounts,
      })
    }
    if (error) {
      console.error('[BreedingEventTimeline] Error:', error)
    }
  }, [events.length, loading, error])

  // Refetch when trigger changes
  useEffect(() => {
    if (refreshTrigger > 0 && typeof refetch === 'function') {
      refetch()
    }
  }, [refreshTrigger, refetch, animalId])

  // Filter state
  const [selectedEventTypes, setSelectedEventTypes] = useState<string[]>([])
  const [dateFilter, setDateFilter] = useState<'all' | '7days' | '30days' | '90days'>('all')
  const [expandedEvents, setExpandedEvents] = useState<Set<string>>(new Set())

  // Edit / delete state
  const [editingEvent, setEditingEvent] = useState<any | null>(null)
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  const handleDelete = async (eventId: string) => {
    setIsDeleting(true)
    try {
      const response = await fetch(`/api/breeding-events/${eventId}`, { method: 'DELETE' })
      const result = await response.json()
      if (response.ok && result.success) {
        setDeleteConfirmId(null)
        refetch?.()
      } else {
        console.error('[BreedingEventTimeline] Delete failed:', result.error)
      }
    } catch (err) {
      console.error('[BreedingEventTimeline] Delete error:', err)
    } finally {
      setIsDeleting(false)
    }
  }

  interface BreedingEvent {
    id: string
    event_type: string
    event_date: string
    heat_signs?: string[]
    [key: string]: any
  }

  const filteredEvents = useMemo(() => {
    let filtered = [...events] as BreedingEvent[]

    if (selectedEventTypes.length > 0) {
      filtered = filtered.filter(e => selectedEventTypes.includes(e.event_type))
    }

    if (dateFilter !== 'all') {
      const daysMap = { '7days': 7, '30days': 30, '90days': 90 } as const
      const cutoff = new Date(Date.now() - daysMap[dateFilter] * 86400000)
      filtered = filtered.filter(e => new Date(e.event_date) >= cutoff)
    }

    filtered.sort((a, b) => new Date(b.event_date).getTime() - new Date(a.event_date).getTime())
    return filtered
  }, [events, selectedEventTypes, dateFilter])

  const toggleEventType = (type: string) =>
    setSelectedEventTypes(prev =>
      prev.includes(type) ? prev.filter(t => t !== type) : [...prev, type]
    )

  const toggleEventExpansion = (id: string) =>
    setExpandedEvents(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })

  const clearFilters = () => {
    setSelectedEventTypes([])
    setDateFilter('all')
  }

  const hasActiveFilters = selectedEventTypes.length > 0 || dateFilter !== 'all'
  const activeFilterCount = selectedEventTypes.length + (dateFilter !== 'all' ? 1 : 0)

  // ── Early returns ──────────────────────────────────────────────────────────
  if (error) {
    return (
      <div className="text-center py-8 text-red-500">
        <AlertCircle className="mx-auto h-12 w-12 text-red-400 mb-4" />
        <p>Failed to load breeding events: {error}</p>
      </div>
    )
  }

  if (loading && events.length === 0) {
    return (
      <div className="flex items-center justify-center py-12">
        <LoadingSpinner />
      </div>
    )
  }

  if (animalGender !== 'female') {
    return (
      <div className="text-center py-8 text-gray-500">
        <Heart className="mx-auto h-12 w-12 text-gray-400 mb-4" />
        <p>Breeding events are only tracked for female animals</p>
      </div>
    )
  }

  if (events.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        <Calendar className="mx-auto h-12 w-12 text-gray-400 mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">No breeding events recorded</h3>
        <p>Start by recording heat detection or insemination events</p>
      </div>
    )
  }

  return (
    <div className={cn("flex flex-col gap-3", className)}>

      {/* ── Filter Panel ─────────────────────────────────────────────────── */}
      <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">

        {/* Panel header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 bg-gray-50">
          <div className="flex items-center gap-2">
            <ListFilter className="w-4 h-4 text-gray-500" />
            <span className="text-sm font-semibold text-gray-700">Filter Events</span>
            {hasActiveFilters && (
              <Badge className="bg-farm-green text-white text-xs px-2 py-0.5 rounded-full">
                {activeFilterCount}
              </Badge>
            )}
          </div>

          <div className="flex items-center gap-2">
            {/* Results summary */}
            <span className="text-xs text-gray-500">
              {hasActiveFilters
                ? `${filteredEvents.length} of ${events.length} shown`
                : `${events.length} event${events.length !== 1 ? 's' : ''}`}
              {totalCount && totalCount > events.length ? ` (${totalCount} total)` : ''}
            </span>
            {hasActiveFilters && (
              <button
                onClick={clearFilters}
                className="flex items-center gap-1 text-xs text-red-500 hover:text-red-700 font-medium transition-colors"
              >
                <X className="w-3 h-3" />
                Clear
              </button>
            )}
          </div>
        </div>

        <div className={cn("px-4 py-3 space-y-3", isMobile && "px-3 py-2 space-y-2")}>
          {/* Event type chips */}
          <div>
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">
              Event Type
            </p>
            <div className={cn("flex flex-wrap gap-2", isMobile && "gap-1.5")}>
              {Object.entries(eventConfig).map(([type, config]) => {
                const Icon = config.icon
                const isSelected = selectedEventTypes.includes(type)
                return (
                  <button
                    key={type}
                    onClick={() => toggleEventType(type)}
                    className={cn(
                      "flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs font-medium transition-all",
                      isMobile && "px-2.5 py-1",
                      isSelected
                        ? `${config.color} border-transparent shadow-sm`
                        : "bg-white border-gray-200 text-gray-600 hover:border-gray-300 hover:bg-gray-50"
                    )}
                  >
                    <Icon className="w-3 h-3" />
                    <span className={isMobile ? "hidden xs:inline" : ""}>
                      {config.title}
                    </span>
                  </button>
                )
              })}
            </div>
          </div>

          {/* Date range */}
          <div>
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">
              Time Period
            </p>
            <div className="flex items-center gap-1 flex-wrap">
              {DATE_RANGE_OPTIONS.map(opt => (
                <button
                  key={opt.value}
                  onClick={() => setDateFilter(opt.value)}
                  className={cn(
                    "px-3 py-1.5 rounded-full border text-xs font-medium transition-all",
                    isMobile && "px-2.5 py-1",
                    dateFilter === opt.value
                      ? "bg-farm-green text-white border-farm-green shadow-sm"
                      : "bg-white border-gray-200 text-gray-600 hover:border-gray-300 hover:bg-gray-50"
                  )}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Active filter tags (when filters set) */}
          {hasActiveFilters && (
            <div className="flex flex-wrap items-center gap-1.5 pt-1 border-t border-gray-100">
              <span className="text-xs text-gray-400">Active:</span>
              {selectedEventTypes.map(type => {
                const config = eventConfig[type as keyof typeof eventConfig]
                return (
                  <button
                    key={type}
                    onClick={() => toggleEventType(type)}
                    className={cn("flex items-center gap-1 px-2 py-0.5 rounded-full text-xs border", config.color, "border-transparent")}
                  >
                    {config.title}
                    <X className="w-2.5 h-2.5 ml-0.5" />
                  </button>
                )
              })}
              {dateFilter !== 'all' && (
                <button
                  onClick={() => setDateFilter('all')}
                  className="flex items-center gap-1 px-2 py-0.5 rounded-full text-xs border bg-farm-green/10 text-farm-green border-farm-green/20"
                >
                  {DATE_RANGE_OPTIONS.find(o => o.value === dateFilter)?.label}
                  <X className="w-2.5 h-2.5 ml-0.5" />
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ── Scrollable Events List ───────────────────────────────────────── */}
      <div className={cn(
        "overflow-y-auto space-y-3 pr-1 scroll-smooth",
        isMobile ? "max-h-[480px]" : "max-h-[580px]"
      )}
        style={{ scrollbarWidth: 'thin', scrollbarColor: '#d1d5db transparent' }}
      >
        {filteredEvents.length === 0 && events.length > 0 ? (
          <div className="rounded-xl border border-dashed border-gray-200 bg-gray-50 p-8 text-center">
            <Filter className="mx-auto h-10 w-10 text-gray-300 mb-3" />
            <h3 className="text-sm font-medium text-gray-700 mb-1">No events match your filters</h3>
            <p className="text-xs text-gray-500 mb-4">Try adjusting or clearing the filters above</p>
            <Button variant="outline" size="sm" onClick={clearFilters}>
              Clear All Filters
            </Button>
          </div>
        ) : (
          filteredEvents.map((event) => {
            const config = eventConfig[event.event_type as keyof typeof eventConfig]
            const Icon = config.icon
            const isExpanded = expandedEvents.has(event.id)
            const hasDetails =
              event.notes ||
              (event.event_type === 'heat_detection' && event.heat_signs?.length) ||
              (event.event_type === 'insemination' && event.semen_bull_code) ||
              (event.event_type === 'pregnancy_check' && event.pregnancy_result) ||
              (event.event_type === 'calving' && event.calf_gender)

            return (
              <Card
                key={event.id}
                className={cn(
                  "relative transition-shadow hover:shadow-md border-l-4",
                  config.borderColor
                )}
              >
                <CardContent className={cn(isMobile ? "p-3" : "p-4")}>
                  <div className={cn(
                    "flex",
                    isMobile ? "flex-col gap-3" : "items-start gap-4"
                  )}>
                    {/* Event icon */}
                    <div className={cn(
                      "flex-shrink-0 rounded-full flex items-center justify-center",
                      config.color,
                      isMobile ? "w-9 h-9" : "w-11 h-11"
                    )}>
                      <Icon className={cn(isMobile ? "w-4 h-4" : "w-5 h-5")} />
                    </div>

                    <div className="flex-1 min-w-0">
                      {/* Header row */}
                      <div className={cn(
                        "flex justify-between mb-2",
                        isMobile ? "flex-col gap-2" : "items-start"
                      )}>
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1 flex-wrap">
                            <h4 className={cn("font-semibold text-gray-900", isMobile ? "text-sm" : "text-base")}>
                              {config.title}
                            </h4>
                            <Badge className={cn(config.color, "text-xs font-medium")}>
                              {new Date(event.event_date).toLocaleDateString('en-US', {
                                month: 'short', day: 'numeric', year: 'numeric'
                              })}
                            </Badge>
                          </div>

                          {event.animals && (
                            <div className={cn(
                              "flex items-center flex-wrap gap-x-3 gap-y-1 text-gray-500",
                              isMobile ? "text-xs" : "text-sm"
                            )}>
                              <span className="flex items-center gap-1">
                                <Tag className="w-3 h-3" />
                                {event.animals.tag_number}
                              </span>
                              {event.animals.name && (
                                <span className="flex items-center gap-1">
                                  <User className="w-3 h-3" />
                                  {event.animals.name}
                                </span>
                              )}
                              {event.animals.breed && (
                                <span className="text-gray-400">• {event.animals.breed}</span>
                              )}
                            </div>
                          )}
                        </div>

                        {/* Action buttons */}
                        <div className="flex items-center gap-1 flex-shrink-0">
                          {farmId && (
                            <>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                  console.log('[BreedingEventTimeline] Edit button clicked', { eventId: event.id, eventType: event.event_type })
                                  setEditingEvent(event)
                                }}
                                className="text-gray-400 hover:text-farm-green h-8 w-8 p-0"
                                title="Edit event"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                  console.log('[BreedingEventTimeline] Delete button clicked', { eventId: event.id, eventType: event.event_type })
                                  setDeleteConfirmId(event.id)
                                }}
                                className="text-gray-400 hover:text-red-600 h-8 w-8 p-0"
                                title="Delete event"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </Button>
                            </>
                          )}
                          {hasDetails && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => toggleEventExpansion(event.id)}
                              className="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-700 px-2 h-8"
                            >
                              {isExpanded ? 'Less' : 'Details'}
                              {isExpanded
                                ? <ChevronUp className="w-3.5 h-3.5" />
                                : <ChevronDown className="w-3.5 h-3.5" />
                              }
                            </Button>
                          )}
                        </div>
                      </div>

                      {/* Quick summary */}
                      <div className={cn("text-gray-600 space-y-1", isMobile ? "text-xs" : "text-sm")}>
                        {event.event_type === 'heat_detection' && event.heat_action_taken && (
                          <p><span className="font-medium">Action:</span> {event.heat_action_taken}</p>
                        )}
                        {event.event_type === 'insemination' && (
                          <p>
                            <span className="font-medium">Method:</span>{' '}
                            {event.insemination_method?.replace('_', ' ')}
                            {event.semen_bull_code && ` • Code: ${event.semen_bull_code}`}
                          </p>
                        )}
                        {event.event_type === 'pregnancy_check' && event.pregnancy_result && (
                          <div className="flex items-center gap-2">
                            <span className="font-medium">Result:</span>
                            <Badge className={
                              event.pregnancy_result === 'pregnant' ? 'bg-green-100 text-green-800' :
                              event.pregnancy_result === 'not_pregnant' ? 'bg-red-100 text-red-800' :
                              'bg-yellow-100 text-yellow-800'
                            }>
                              {event.pregnancy_result.replace('_', ' ')}
                            </Badge>
                          </div>
                        )}
                        {event.event_type === 'calving' && (
                          <p>
                            <span className="font-medium">Outcome:</span>{' '}
                            {event.calving_outcome?.replace('_', ' ')}
                            {event.calf_gender && ` • ${event.calf_gender} calf`}
                          </p>
                        )}
                      </div>

                      {/* Expanded details */}
                      {isExpanded && hasDetails && (
                        <div className={cn(
                          "mt-4 pt-4 border-t border-gray-100 space-y-3",
                          isMobile ? "text-xs" : "text-sm"
                        )}>
                          {event.event_type === 'heat_detection' && (event.heat_signs?.length ?? 0) > 0 && (
                            <div>
                              <p className="font-medium text-gray-700 mb-2">Heat Signs Observed:</p>
                              <div className="flex flex-wrap gap-1">
                                {(event.heat_signs ?? []).map((sign: string, idx: number) => (
                                  <Badge key={idx} className="bg-pink-50 text-pink-700 border border-pink-200">
                                    {sign}
                                  </Badge>
                                ))}
                              </div>
                            </div>
                          )}

                          {event.event_type === 'insemination' && (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                              {event.semen_bull_code && (
                                <div className="flex items-start gap-2">
                                  <FileText className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
                                  <div>
                                    <p className="font-medium text-gray-700">Semen/Bull Code</p>
                                    <p className="text-gray-600">{event.semen_bull_code}</p>
                                  </div>
                                </div>
                              )}
                              {event.technician_name && (
                                <div className="flex items-start gap-2">
                                  <User className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
                                  <div>
                                    <p className="font-medium text-gray-700">Technician</p>
                                    <p className="text-gray-600">{event.technician_name}</p>
                                  </div>
                                </div>
                              )}
                            </div>
                          )}

                          {event.event_type === 'pregnancy_check' && (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                              {event.examination_method && (
                                <div className="flex items-start gap-2">
                                  <Stethoscope className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
                                  <div>
                                    <p className="font-medium text-gray-700">Method</p>
                                    <p className="text-gray-600">{event.examination_method}</p>
                                  </div>
                                </div>
                              )}
                              {event.veterinarian_name && (
                                <div className="flex items-start gap-2">
                                  <User className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
                                  <div>
                                    <p className="font-medium text-gray-700">Veterinarian</p>
                                    <p className="text-gray-600">{event.veterinarian_name}</p>
                                  </div>
                                </div>
                              )}
                              {event.estimated_due_date && (
                                <div className="flex items-start gap-2">
                                  <Clock className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
                                  <div>
                                    <p className="font-medium text-gray-700">Due Date</p>
                                    <p className="text-gray-600">
                                      {new Date(event.estimated_due_date).toLocaleDateString()}
                                    </p>
                                  </div>
                                </div>
                              )}
                            </div>
                          )}

                          {event.event_type === 'calving' && (
                            <div className="space-y-3">
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                {event.calf_tag_number && (
                                  <div className="flex items-start gap-2">
                                    <Tag className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
                                    <div>
                                      <p className="font-medium text-gray-700">Calf Tag</p>
                                      <p className="text-gray-600">{event.calf_tag_number}</p>
                                    </div>
                                  </div>
                                )}
                                {event.calf_weight && (
                                  <div className="flex items-start gap-2">
                                    <Baby className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
                                    <div>
                                      <p className="font-medium text-gray-700">Birth Weight</p>
                                      <p className="text-gray-600">{event.calf_weight} kg</p>
                                    </div>
                                  </div>
                                )}
                              </div>
                              {event.calf_health_status && (
                                <div className="flex items-start gap-2">
                                  <Stethoscope className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
                                  <div>
                                    <p className="font-medium text-gray-700">Calf Health</p>
                                    <Badge className="bg-blue-50 text-blue-700 border border-blue-200 mt-1">
                                      {event.calf_health_status}
                                    </Badge>
                                  </div>
                                </div>
                              )}
                            </div>
                          )}

                          {event.notes && (
                            <div className="p-3 bg-gray-50 rounded-lg border border-gray-100">
                              <div className="flex items-start gap-2">
                                <FileText className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
                                <div className="flex-1">
                                  <p className="font-medium text-gray-700 mb-1">Notes</p>
                                  <p className="text-gray-600 whitespace-pre-wrap">{event.notes}</p>
                                </div>
                              </div>
                            </div>
                          )}

                          <div className="flex items-center gap-1 text-xs text-gray-400 pt-2 border-t border-gray-100">
                            <Clock className="w-3 h-3" />
                            <span>Recorded {new Date(event.created_at || event.event_date).toLocaleString()}</span>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Delete confirmation inline */}
                  {deleteConfirmId === event.id && (
                    <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-lg flex items-center justify-between gap-3">
                      <p className={cn("text-red-700 font-medium", isMobile ? "text-xs" : "text-sm")}>
                        Delete this event? This cannot be undone.
                      </p>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setDeleteConfirmId(null)}
                          disabled={isDeleting}
                        >
                          Cancel
                        </Button>
                        <Button
                          size="sm"
                          onClick={() => handleDelete(event.id)}
                          disabled={isDeleting}
                          className="bg-red-600 hover:bg-red-700 text-white"
                        >
                          {isDeleting ? <LoadingSpinner size="sm" /> : 'Delete'}
                        </Button>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            )
          })
        )}

        {/* In-list Load More (within scroll area) */}
        {hasMore && filteredEvents.length > 0 && (
          <div className="flex flex-col items-center gap-2 py-4 border-t border-gray-100">
            <p className="text-xs text-gray-500">
              {loadedCount && totalCount
                ? `Loaded ${loadedCount} of ${totalCount} events`
                : 'More events available from server'}
            </p>
            <Button
              onClick={() => {
                console.log('[BreedingEventTimeline] Load more clicked', {
                  currentLoadedCount: loadedCount,
                  totalCount,
                  filteredCount: filteredEvents.length
                })
                loadMore?.()
              }}
              disabled={loading}
              variant="outline"
              size="sm"
              className="border-farm-green text-farm-green hover:bg-farm-green hover:text-white transition-colors"
            >
              {loading ? (
                <span className="flex items-center gap-2">
                  <LoadingSpinner size="sm" />
                  Loading…
                </span>
              ) : (
                'Load More Events'
              )}
            </Button>
          </div>
        )}
      </div>

      {/* ── Pagination Footer ────────────────────────────────────────────── */}
      <div className="flex items-center justify-between px-1 py-2 border-t border-gray-100">
        <p className="text-xs text-gray-400">
          {hasActiveFilters
            ? `${filteredEvents.length} of ${events.length} events match filters`
            : `${filteredEvents.length} event${filteredEvents.length !== 1 ? 's' : ''} total`}
          {totalCount && totalCount > events.length
            ? ` — ${totalCount - events.length} more on server`
            : ''}
        </p>
        {loading && events.length > 0 && (
          <span className="flex items-center gap-1.5 text-xs text-gray-400">
            <LoadingSpinner size="sm" />
            Refreshing…
          </span>
        )}
      </div>

      {/* Edit modal */}
      {editingEvent && farmId && (
        <AddBreedingEventModal
          isOpen={!!editingEvent}
          onClose={() => {
            console.log('[BreedingEventTimeline] Edit modal closed', { eventId: editingEvent.id })
            setEditingEvent(null)
          }}
          farmId={farmId}
          onEventCreated={() => {
            console.log('[BreedingEventTimeline] Event created/updated', { eventId: editingEvent.id })
            setEditingEvent(null)
            refetch?.()
          }}
          editingEvent={editingEvent}
        />
      )}
    </div>
  )
}
