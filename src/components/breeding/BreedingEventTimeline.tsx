// src/components/breeding/BreedingEventTimeline.tsx
'use client'

import { useState, useMemo, useEffect, useRef } from 'react'
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
  AlertTriangle,
  Filter,
  X,
  ChevronDown,
  ChevronUp,
  User,
  Tag,
  Clock,
  Edit2,
  Trash2,
  ListFilter,
  Droplets,
  CheckCircle2,
  XCircle,
  CalendarPlus,
} from 'lucide-react'
import { AddBreedingEventModal } from './AddBreedingEventModal'
import { FollowUpBreedingModal } from './FollowUpBreedingModal'

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

    }
    if (error) {
      // Error handled in early return below
    }
  }, [events.length, loading, error])

  // Filter state
  const [selectedEventTypes, setSelectedEventTypes] = useState<string[]>([])
  const [dateFilter, setDateFilter] = useState<'all' | '7days' | '30days' | '90days'>('all')
  const [expandedEvents, setExpandedEvents] = useState<Set<string>>(new Set())
  const [openDropdown, setOpenDropdown] = useState<string | null>(null)
  const filterDropdownRef = useRef<HTMLDivElement>(null)

  // Refetch when trigger changes
  useEffect(() => {
    if (refreshTrigger > 0 && typeof refetch === 'function') {
      refetch()
    }
  }, [refreshTrigger, refetch, animalId])

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (filterDropdownRef.current && !filterDropdownRef.current.contains(event.target as Node)) {
        setOpenDropdown(null)
      }
    }

    if (openDropdown) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [openDropdown])

  // Edit / delete / follow-up state
  const [editingEvent, setEditingEvent] = useState<any | null>(null)
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)
  const [followUpEvent, setFollowUpEvent] = useState<any | null>(null)

  // Collapsible subsections for calving details on mobile
  const [expandedCalvingSections, setExpandedCalvingSections] = useState<Record<string, Set<string>>>({})

  const handleDelete = async (eventId: string) => {
    setIsDeleting(true)
    try {
      const response = await fetch(`/api/breeding-events/${eventId}`, { method: 'DELETE' })
      const result = await response.json()
      if (response.ok && result.success) {
        setDeleteConfirmId(null)
        refetch?.()
      }
    } catch (err) {
      // Delete error handled silently
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

  const toggleDropdown = (dropdown: string) => {
    setOpenDropdown(openDropdown === dropdown ? null : dropdown)
  }

  const toggleEventExpansion = (id: string) =>
    setExpandedEvents(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })

  const toggleCalvingSubsection = (eventId: string, subsection: string) => {
    setExpandedCalvingSections(prev => {
      const current = prev[eventId] ?? new Set()
      const next = new Set(current)
      next.has(subsection) ? next.delete(subsection) : next.add(subsection)
      return { ...prev, [eventId]: next }
    })
  }

  const isCalvingSubsectionExpanded = (eventId: string, subsection: string): boolean => {
    return expandedCalvingSections[eventId]?.has(subsection) ?? (!isMobile)
  }

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
      <div className="rounded-xl border border-gray-200 bg-white overflow-visible relative z-20">

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

        <div ref={filterDropdownRef} className={cn("px-4 py-3 space-y-3", isMobile && "px-3 py-2 space-y-2")}>
          {/* Filter Dropdowns - Single Row */}
          <div className={cn("flex gap-3", isMobile ? "flex-col" : "flex-row")}>
            
            {/* Event Type Dropdown */}
            <div className="relative flex-1">
              <button
                onClick={() => toggleDropdown('event_type')}
                className={cn(
                  "w-full px-3 py-2.5 flex items-center justify-between border border-gray-200 rounded-lg bg-white hover:bg-gray-50 transition-colors",
                  isMobile ? "text-sm" : "text-base",
                  openDropdown === 'event_type' ? "border-farm-green bg-farm-green/5" : ""
                )}
              >
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-gray-700">Event Type</span>
                  {selectedEventTypes.length > 0 && (
                    <Badge className="bg-farm-green text-white text-xs px-2 py-0.5">
                      {selectedEventTypes.length}
                    </Badge>
                  )}
                </div>
                {openDropdown === 'event_type' 
                  ? <ChevronUp className="w-4 h-4 text-gray-500" />
                  : <ChevronDown className="w-4 h-4 text-gray-500" />
                }
              </button>
              {openDropdown === 'event_type' && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-50">
                  <div className="p-2 space-y-1 max-h-64 overflow-y-auto">
                    {Object.entries(eventConfig).map(([type, config]) => {
                      const Icon = config.icon
                      const isSelected = selectedEventTypes.includes(type)
                      return (
                        <button
                          key={type}
                          onClick={() => toggleEventType(type)}
                          className={cn(
                            "w-full flex items-center gap-2 px-3 py-2 rounded-lg border text-xs font-medium transition-all text-left",
                            isSelected
                              ? `${config.color} border-transparent`
                              : "bg-white border-gray-200 text-gray-600 hover:border-gray-300 hover:bg-gray-50"
                          )}
                        >
                          <Icon className="w-4 h-4 flex-shrink-0" />
                          <span className="flex-1">{config.title}</span>
                          {isSelected && <CheckCircle2 className="w-4 h-4 flex-shrink-0" />}
                        </button>
                      )
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* Date Range Dropdown */}
            <div className="relative flex-1">
              <button
                onClick={() => toggleDropdown('date_range')}
                className={cn(
                  "w-full px-3 py-2.5 flex items-center justify-between border border-gray-200 rounded-lg bg-white hover:bg-gray-50 transition-colors",
                  isMobile ? "text-sm" : "text-base",
                  openDropdown === 'date_range' ? "border-farm-green bg-farm-green/5" : ""
                )}
              >
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-gray-700">Time Period</span>
                  {dateFilter !== 'all' && (
                    <Badge className="bg-farm-green text-white text-xs px-2 py-0.5">
                      {DATE_RANGE_OPTIONS.find(o => o.value === dateFilter)?.label}
                    </Badge>
                  )}
                </div>
                {openDropdown === 'date_range' 
                  ? <ChevronUp className="w-4 h-4 text-gray-500" />
                  : <ChevronDown className="w-4 h-4 text-gray-500" />
                }
              </button>
              {openDropdown === 'date_range' && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-50">
                  <div className="p-2 space-y-1">
                    {DATE_RANGE_OPTIONS.map(opt => (
                      <button
                        key={opt.value}
                        onClick={() => {
                          setDateFilter(opt.value)
                          setOpenDropdown(null)
                        }}
                        className={cn(
                          "w-full flex items-center justify-between px-3 py-2 rounded-lg border text-xs font-medium transition-all",
                          dateFilter === opt.value
                            ? "bg-farm-green text-white border-farm-green"
                            : "bg-white border-gray-200 text-gray-600 hover:border-gray-300 hover:bg-gray-50"
                        )}
                      >
                        <span>{opt.label}</span>
                        {dateFilter === opt.value && <CheckCircle2 className="w-4 h-4 flex-shrink-0" />}
                      </button>
                    ))}
                  </div>
                </div>
              )}
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
                            <div className={cn("flex items-center gap-1 text-gray-600", isMobile ? "text-xs" : "text-sm")}>
                              <Clock className="w-3.5 h-3.5 text-gray-400" />
                              {(() => {
                                try {
                                  // Extract time from ISO string: "2026-04-28T03:30:00+00:00" -> "03:30"
                                  const timeStr = event.event_date?.substring(11, 16)
                                  if (!timeStr || timeStr.length !== 5) {
                                    return '12:00 AM' // Fallback for invalid/missing time
                                  }
                                  const [hours, minutes] = timeStr.split(':').map(Number)
                                  if (isNaN(hours) || isNaN(minutes)) {
                                    return '12:00 AM' // Fallback for invalid numbers
                                  }
                                  const ampm = hours >= 12 ? 'PM' : 'AM'
                                  const displayHours = hours % 12 || 12
                                  return `${String(displayHours).padStart(2, '0')}:${String(minutes).padStart(2, '0')} ${ampm}`
                                } catch {
                                  return '12:00 AM' // Fallback for any errors
                                }
                              })()}
                            </div>
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
                                  setDeleteConfirmId(event.id)
                                }}
                                className="text-gray-400 hover:text-red-600 h-8 w-8 p-0"
                                title="Delete event"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setFollowUpEvent(event)}
                                className="text-gray-400 hover:text-blue-600 h-8 w-8 p-0"
                                title="Add follow-up"
                              >
                                <CalendarPlus className="w-3.5 h-3.5" />
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
                          <>
                            <p>
                              <span className="font-medium">Method:</span>{' '}
                              {event.insemination_method?.replace('_', ' ')}
                              {/* {event.semen_bull_code && ` • Code: ${event.semen_bull_code}`} */}
                              {/* {event.semen_bull_name && ` • ${event.semen_bull_name}`} */}
                            </p>
                            {/* {event.semen_type && event.semen_type !== 'unknown' && (
                              <p>
                                <span className="font-medium">Semen Type:</span>{' '}
                                {event.semen_type
                                  .replace('_', ' - ')
                                  .split(' ')
                                  .map((word: string) => word.charAt(0).toUpperCase() + word.slice(1))
                                  .join(' ')}
                              </p>
                            )} */}
                          </>
                        )}
                        {event.event_type === 'pregnancy_check' && event.pregnancy_result && (
                          <>

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
                          </>
                        )}
                        {/* {event.event_type === 'calving' && (
                          <>
                            <p>
                              <span className="font-medium">Outcome:</span>{' '}
                              {event.calving_outcome?.replace('_', ' ')}
                              {event.calf_gender && ` • ${event.calf_gender} calf`}
                            </p>
                          </>
                        )} */}
                      </div>

                      {/* Expanded details */}

                      {isExpanded && hasDetails &&
                      (
                        <div className={cn(
                          "mt-4 pt-4 border-t border-gray-100 space-y-3",
                          isMobile ? "text-xs" : "text-sm"
                        )}>
                          {farmId && (
                            <div className="flex justify-end">
                              <Button
                                size="sm"
                                onClick={() => setFollowUpEvent(event)}
                                className="flex items-center gap-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 h-7 px-3 text-xs font-medium"
                              >
                                <CalendarPlus className="w-3.5 h-3.5" />
                                Follow Up
                              </Button>
                            </div>
                          )}
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
                            <>
                              <div className="space-y-4">
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
                                  {event.semen_bull_name && (
                                    <div className="flex items-start gap-2">
                                      <FileText className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
                                      <div>
                                        <p className="font-medium text-gray-700">Semen/Bull Name</p>
                                        <p className="text-gray-600">{event.semen_bull_name}</p>
                                      </div>
                                    </div>
                                  )}
                                  {event.semen_type && event.semen_type !== 'unknown' && (
                                    <div className="flex items-start gap-2">
                                      <Syringe className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
                                      <div>
                                        <p className="font-medium text-gray-700">Semen Type</p>
                                        <Badge className="bg-blue-50 text-blue-700 border border-blue-200 mt-1">
                                          {event.semen_type
                                            .replace('_', ' - ')
                                            .split(' ')
                                            .map((word: string) => word.charAt(0).toUpperCase() + word.slice(1))
                                            .join(' ')}
                                        </Badge>
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

                                {/* Service Details */}
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                  <div className="flex items-start gap-2">
                                    <Calendar className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
                                    <div>
                                      <p className="font-medium text-gray-700">Expected Calving Date</p>
                                      <p className="text-gray-600">
                                        {event.expected_calving_date 
                                          ? new Date(event.expected_calving_date).toLocaleDateString()
                                          : 'N/A'}
                                      </p>
                                    </div>
                                  </div>
                                  <div className="flex items-start gap-2">
                                    <FileText className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
                                    <div>
                                      <p className="font-medium text-gray-700">Service Cost</p>
                                      <p className="text-gray-600">
                                        {event.service_cost != null ? `$${event.service_cost.toFixed(2)}` : 'N/A'}
                                      </p>
                                    </div>
                                  </div>
                                  <div className="flex items-start gap-2">
                                    <CheckCircle2 className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
                                    <div>
                                      <p className="font-medium text-gray-700">Outcome</p>
                                      {event.outcome
                                        ? <Badge className="bg-blue-50 text-blue-700 border border-blue-200 mt-1 capitalize">{event.outcome}</Badge>
                                        : <p className="text-gray-400">N/A</p>}
                                    </div>
                                  </div>
                                </div>

                                {event.service_notes && (
                                  <div className="p-3 bg-gray-50 rounded-lg border border-gray-100">
                                    <div className="flex items-start gap-2">
                                      <FileText className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
                                      <div>
                                        <p className="font-medium text-gray-700 mb-1">Service Notes</p>
                                        <p className="text-gray-600 whitespace-pre-wrap">{event.service_notes}</p>
                                      </div>
                                    </div>
                                  </div>
                                )}

                                {/* <div className="flex items-center gap-1 text-xs text-gray-400 pt-2 border-t border-gray-100">
                                  <Clock className="w-3 h-3" />
                                  <span>Service recorded {new Date(event.service_created_at || event.event_date).toLocaleString()}</span>
                                </div> */}
                              </div>
                            </>
                          )}

                          {event.event_type === 'pregnancy_check' && (
                            <>
                              <div className="space-y-4">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                  {/* <div className="flex items-start gap-2">
                                    <CheckCircle2 className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
                                    <div>
                                      <p className="font-medium text-gray-700">Pregnancy Status</p>
                                      {event.pregnancy_result
                                        ? <Badge className={
                                          event.pregnancy_result === 'pregnant' ? 'bg-green-100 text-green-800' :
                                          event.pregnancy_result === 'not_pregnant' ? 'bg-red-100 text-red-800' :
                                          'bg-yellow-100 text-yellow-800'
                                        }>
                                          {event.pregnancy_result.replace('_', ' ')}
                                        </Badge>
                                        : <p className="text-gray-400">N/A</p>}
                                    </div>
                                  </div> */}
                                  {event.examination_method && (
                                    <div className="flex items-start gap-2">
                                      <Stethoscope className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
                                      <div>
                                        <p className="font-medium text-gray-700">Examination Method</p>
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
                                  <div className="flex items-start gap-2">
                                    <Calendar className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
                                    <div>
                                      <p className="font-medium text-gray-700">Confirmed Date</p>
                                      <p className="text-gray-600">
                                        {event.confirmed_date 
                                          ? new Date(event.confirmed_date).toLocaleDateString()
                                          : 'N/A'}
                                      </p>
                                    </div>
                                  </div>
                                  <div className="flex items-start gap-2">
                                    <Calendar className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
                                    <div>
                                      <p className="font-medium text-gray-700">Expected Due Date</p>
                                      <p className="text-gray-600">
                                        {event.estimated_due_date 
                                          ? new Date(event.estimated_due_date).toLocaleDateString()
                                          : 'N/A'}
                                      </p>
                                    </div>
                                  </div>
                                  <div className="flex items-start gap-2">
                                    <Calendar className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
                                    <div>
                                      <p className="font-medium text-gray-700">Steaming Date</p>
                                      <p className="text-gray-600">
                                        {event.steaming_date 
                                          ? new Date(event.steaming_date).toLocaleDateString()
                                          : 'N/A'}
                                      </p>
                                    </div>
                                  </div>
                                  <div className="flex items-start gap-2">
                                    <FileText className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
                                    <div>
                                      <p className="font-medium text-gray-700">Gestation Length</p>
                                      <p className="text-gray-600">
                                        {event.gestation_length_days != null ? `${event.gestation_length_days} days` : 'N/A'}
                                      </p>
                                    </div>
                                  </div>
                                </div>

                                {event.pregnancy_notes && (
                                  <div className="p-3 bg-gray-50 rounded-lg border border-gray-100">
                                    <div className="flex items-start gap-2">
                                      <FileText className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
                                      <div>
                                        <p className="font-medium text-gray-700 mb-1">Pregnancy Notes</p>
                                        <p className="text-gray-600 whitespace-pre-wrap">{event.pregnancy_notes}</p>
                                      </div>
                                    </div>
                                  </div>
                                )}

                                {/* <div className="flex items-center gap-1 text-xs text-gray-400 pt-2 border-t border-gray-100">
                                  <Clock className="w-3 h-3" />
                                  <span>Recorded {new Date(event.pregnancy_created_at || event.event_date).toLocaleString()}</span>
                                </div> */}
                              </div>
                            </>
                          )}

                          {event.event_type === 'calving' && (
                            <>
                              <div className="space-y-3">

                                {/* ── Calving Event Details ─────────────────────────── */}
                                <div className="border border-gray-200 rounded-lg overflow-hidden">
                                  <button
                                    onClick={() => toggleCalvingSubsection(event.id, 'event_details')}
                                    className={cn(
                                      "w-full px-3 py-2.5 flex items-center justify-between bg-gray-50 hover:bg-gray-100 transition-colors",
                                      isMobile ? "text-sm" : "text-base"
                                    )}
                                  >
                                    <span className="font-semibold text-gray-700">Calving Event Details</span>
                                    {isCalvingSubsectionExpanded(event.id, 'event_details') 
                                      ? <ChevronUp className="w-4 h-4 text-gray-500" />
                                      : <ChevronDown className="w-4 h-4 text-gray-500" />
                                    }
                                  </button>
                                  {isCalvingSubsectionExpanded(event.id, 'event_details') && (
                                    <div className="p-3 space-y-3 border-t border-gray-100">
                                      <div className="grid grid-cols-1 gap-3">
                                        <div className="flex items-start gap-2">
                                          <Baby className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
                                          <div>
                                            <p className="font-medium text-gray-700">Calving Difficulty</p>
                                            {event.calving_outcome
                                              ? <Badge className="bg-orange-50 text-orange-700 border border-orange-200 mt-1 capitalize">{event.calving_outcome}</Badge>
                                              : <p className="text-gray-400">N/A</p>}
                                          </div>
                                        </div>
                                        <div className="flex items-start gap-2">
                                          {event.calf_alive == null
                                            ? <Baby className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
                                            : event.calf_alive
                                              ? <CheckCircle2 className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                                              : <XCircle className="w-4 h-4 text-red-400 mt-0.5 flex-shrink-0" />}
                                          <div>
                                            <p className="font-medium text-gray-700">Calf Status</p>
                                            {event.calf_alive == null
                                              ? <p className="text-gray-400">N/A</p>
                                              : <Badge className={event.calf_alive
                                                  ? 'bg-green-50 text-green-700 border border-green-200 mt-1'
                                                  : 'bg-red-50 text-red-700 border border-red-200 mt-1'}>
                                                  {event.calf_alive ? 'Alive' : 'Deceased'}
                                                </Badge>}
                                          </div>
                                        </div>
                                        <div className="flex items-start gap-2">
                                          <AlertTriangle className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
                                          <div>
                                            <p className="font-medium text-gray-700">Assistance Required</p>
                                            {event.assistance_required == null
                                              ? <p className="text-gray-400">N/A</p>
                                              : <Badge className={event.assistance_required
                                                  ? 'bg-yellow-50 text-yellow-700 border border-yellow-200 mt-1'
                                                  : 'bg-gray-50 text-gray-600 border border-gray-200 mt-1'}>
                                                  {event.assistance_required ? 'Yes' : 'No'}
                                                </Badge>}
                                          </div>
                                        </div>
                                        <div className="flex items-start gap-2">
                                          <User className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
                                          <div>
                                            <p className="font-medium text-gray-700">Veterinarian</p>
                                            <p className="text-gray-600">{event.veterinarian_name ?? 'N/A'}</p>
                                          </div>
                                        </div>
                                      </div>
                                      <div className="flex items-start gap-2 p-3 bg-gray-50 rounded-lg border border-gray-100">
                                        <AlertCircle className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
                                        <div>
                                          <p className="font-medium text-gray-700">Complications</p>
                                          <p className={event.complications ? 'text-red-600 text-sm mt-0.5' : 'text-gray-400'}>
                                            {event.complications ?? 'N/A'}
                                          </p>
                                        </div>
                                      </div>
                                    </div>
                                  )}
                                </div>

                                {/* ── Colostrum Information ──────────────────────────── */}
                                <div className="border border-gray-200 rounded-lg overflow-hidden">
                                  <button
                                    onClick={() => toggleCalvingSubsection(event.id, 'colostrum')}
                                    className={cn(
                                      "w-full px-3 py-2.5 flex items-center justify-between bg-gray-50 hover:bg-gray-100 transition-colors",
                                      isMobile ? "text-sm" : "text-base"
                                    )}
                                  >
                                    <span className="font-semibold text-gray-700">Colostrum Information</span>
                                    {isCalvingSubsectionExpanded(event.id, 'colostrum') 
                                      ? <ChevronUp className="w-4 h-4 text-gray-500" />
                                      : <ChevronDown className="w-4 h-4 text-gray-500" />
                                    }
                                  </button>
                                  {isCalvingSubsectionExpanded(event.id, 'colostrum') && (
                                    <div className="p-3 space-y-3 border-t border-gray-100">
                                      <div className="grid grid-cols-1 gap-3">
                                        <div className="flex items-start gap-2">
                                          <Droplets className="w-4 h-4 text-blue-400 mt-0.5 flex-shrink-0" />
                                          <div>
                                            <p className="font-medium text-gray-700">Colostrum Quality</p>
                                            {event.colostrum_quality
                                              ? <Badge className="bg-blue-50 text-blue-700 border border-blue-200 mt-1 capitalize">{event.colostrum_quality}</Badge>
                                              : <p className="text-gray-400">N/A</p>}
                                          </div>
                                        </div>
                                        <div className="flex items-start gap-2">
                                          <Droplets className="w-4 h-4 text-blue-400 mt-0.5 flex-shrink-0" />
                                          <div>
                                            <p className="font-medium text-gray-700">Colostrum Produced</p>
                                            <p className="text-gray-600">
                                              {event.colostrum_produced != null ? `${event.colostrum_produced} L` : 'N/A'}
                                            </p>
                                          </div>
                                        </div>
                                      </div>
                                    </div>
                                  )}
                                </div>

                                {/* ── Calf Information ──────────────────────────────── */}
                                <div className="border border-gray-200 rounded-lg overflow-hidden">
                                  <button
                                    onClick={() => toggleCalvingSubsection(event.id, 'calf_info')}
                                    className={cn(
                                      "w-full px-3 py-2.5 flex items-center justify-between bg-gray-50 hover:bg-gray-100 transition-colors",
                                      isMobile ? "text-sm" : "text-base"
                                    )}
                                  >
                                    <span className="font-semibold text-gray-700">Calf Information</span>
                                    {isCalvingSubsectionExpanded(event.id, 'calf_info') 
                                      ? <ChevronUp className="w-4 h-4 text-gray-500" />
                                      : <ChevronDown className="w-4 h-4 text-gray-500" />
                                    }
                                  </button>
                                  {isCalvingSubsectionExpanded(event.id, 'calf_info') && (
                                    <div className="p-3 space-y-3 border-t border-gray-100">
                                      <div className="grid grid-cols-1 gap-3">
                                        <div className="flex items-start gap-2">
                                          <Tag className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
                                          <div>
                                            <p className="font-medium text-gray-700">Calf Tag</p>
                                            <p className="text-gray-600">{event.calf_tag_number ?? 'N/A'}</p>
                                          </div>
                                        </div>
                                        <div className="flex items-start gap-2">
                                          <User className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
                                          <div>
                                            <p className="font-medium text-gray-700">Calf Name</p>
                                            <p className="text-gray-600">{event.calf_name ?? 'N/A'}</p>
                                          </div>
                                        </div>
                                        <div className="flex items-start gap-2">
                                          <Baby className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
                                          <div>
                                            <p className="font-medium text-gray-700">Calf Gender</p>
                                            <p className="text-gray-600 capitalize">{event.calf_gender ?? 'N/A'}</p>
                                          </div>
                                        </div>
                                        <div className="flex items-start gap-2">
                                          <Baby className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
                                          <div>
                                            <p className="font-medium text-gray-700">Birth Weight</p>
                                            <p className="text-gray-600">
                                              {event.calf_weight != null ? `${event.calf_weight} kg` : 'N/A'}
                                            </p>
                                          </div>
                                        </div>
                                        <div className="flex items-start gap-2">
                                          <Stethoscope className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
                                          <div>
                                            <p className="font-medium text-gray-700">Calf Health</p>
                                            {event.calf_health_status
                                              ? <Badge className="bg-blue-50 text-blue-700 border border-blue-200 mt-1 capitalize">{event.calf_health_status}</Badge>
                                              : <p className="text-gray-400">N/A</p>}
                                          </div>
                                        </div>
                                      </div>
                                    </div>
                                  )}
                                </div>

                                {/* Calving Notes */}
                                {event.calving_notes && (
                                  <div className="p-3 bg-gray-50 rounded-lg border border-gray-100">
                                    <div className="flex items-start gap-2">
                                      <FileText className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
                                      <div>
                                        <p className="font-medium text-gray-700 mb-1">Calving Notes</p>
                                        <p className="text-gray-600 text-sm whitespace-pre-wrap">{event.calving_notes}</p>
                                      </div>
                                    </div>
                                  </div>
                                )}

                              </div>
                            </>
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

                          {/* Follow-up Section */}
                          {event.follow_up_recorded && (
                            <>
                              <div className="p-3 bg-blue-50 rounded-lg border border-blue-100">
                                <div className="flex items-start gap-2 mb-3">
                                  <CalendarPlus className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
                                  <div className="flex-1">
                                    <p className="font-medium text-blue-900 mb-2">Follow-up</p>
                                    
                                    {/* Heat Detection Follow-up */}
                                    {event.event_type === 'heat_detection' && (
                                    <>
                                    <div className="space-y-1.5 text-sm text-blue-800">
                                      {event.follow_up_insemination_scheduled_at && (
                                        <div className="flex justify-between">
                                          <span className="text-blue-700">Insemination Scheduled:</span>
                                          <span className="font-medium">{new Date(event.follow_up_insemination_scheduled_at).toLocaleString()}</span>
                                        </div>
                                      )}
                                      {event.follow_up_insemination_confirmed && (
                                        <div className="flex items-center gap-2 text-green-700">
                                          <CheckCircle2 className="w-3 h-3" />
                                          <span>Insemination Confirmed</span>
                                        </div>
                                      )}
                                      {event.follow_up_natural_breeding_start && (
                                        <div className="flex justify-between">
                                          <span className="text-blue-700">Breeding Window:</span>
                                          <span className="font-medium">{new Date(event.follow_up_natural_breeding_start).toLocaleDateString()} - {new Date(event.follow_up_natural_breeding_end || '').toLocaleDateString()}</span>
                                        </div>
                                      )}
                                      {event.follow_up_monitoring_plan && (
                                        <div className="flex justify-between">
                                          <span className="text-blue-700">Monitoring Plan:</span>
                                          <Badge className="text-xs bg-blue-100 text-blue-800 border-blue-200">{event.follow_up_monitoring_plan.replace('_', ' ')}</Badge>
                                        </div>
                                      )}
                                      {event.follow_up_ovulation_date && (
                                        <div className="flex justify-between">
                                          <span className="text-blue-700">Ovulation:</span>
                                          <span className="font-medium">{event.follow_up_ovulation_date} ({event.follow_up_ovulation_start_time || '-'} to {event.follow_up_ovulation_end_time || '-'})</span>
                                        </div>
                                      )}
                                      {event.follow_up_has_medical_issue && (
                                        <div className="flex items-start gap-2">
                                          <AlertTriangle className="w-3 h-3 text-orange-600 mt-0.5 flex-shrink-0" />
                                          <div className="flex-1">
                                            <span className="text-orange-700">Medical Issue:</span>
                                            <p className="text-orange-600 text-xs mt-0.5">{event.follow_up_medical_issue_description}</p>
                                          </div>
                                        </div>
                                      )}
                                      {event.follow_up_vet_name && (
                                        <div className="flex justify-between">
                                          <span className="text-blue-700">Veterinarian:</span>
                                          <span className="font-medium">{event.follow_up_vet_name}</span>
                                        </div>
                                      )}
                                      {event.follow_up_notes && (
                                        <div className="mt-2 pt-2 border-t border-blue-100">
                                          <p className="text-xs text-blue-600">{event.follow_up_notes}</p>
                                        </div>
                                      )}
                                    </div>
                                    </>
                                  )}

                                  {/* Insemination Follow-up */}
                                  {event.event_type === 'insemination' && (
                                    <div className="space-y-3 text-sm text-blue-800">
                                      {/* Ovulation Date & Time */}
                                      {(event.follow_up_ovulation_date || event.follow_up_ovulation_start_time) && (
                                        <div className="border-l-2 border-blue-300 pl-3 py-1">
                                          <p className="text-xs font-semibold text-blue-700 mb-1.5">Ovulation Observed</p>
                                          {event.follow_up_ovulation_date && (
                                            <div className="flex items-center gap-2 mb-1">
                                              <Calendar className="w-3 h-3 text-blue-500 flex-shrink-0" />
                                              <span className="font-medium">{event.follow_up_ovulation_date}</span>
                                            </div>
                                          )}
                                          {event.follow_up_ovulation_start_time && (
                                            <div className="flex items-center gap-2">
                                              <Clock className="w-3 h-3 text-blue-500 flex-shrink-0" />
                                              <span className="font-medium">{event.follow_up_ovulation_start_time} – {event.follow_up_ovulation_end_time || event.follow_up_ovulation_start_time}</span>
                                            </div>
                                          )}
                                        </div>
                                      )}
                                      
                                      {/* Ovulation Amount */}
                                      {event.follow_up_ovulation_amount_ml && (
                                        <div className="flex items-center gap-2 bg-blue-100/30 rounded px-2 py-1">
                                          <Droplets className="w-3 h-3 text-blue-600 flex-shrink-0" />
                                          <span className="text-blue-700">Amount:</span>
                                          <span className="font-medium text-blue-800">{event.follow_up_ovulation_amount_ml} ml</span>
                                        </div>
                                      )}
                                      
                                      {/* Medical Issues */}
                                      {event.follow_up_has_medical_issue && (
                                        <div className="flex items-start gap-2 p-2 bg-orange-50 rounded border border-orange-100">
                                          <AlertTriangle className="w-3 h-3 text-orange-600 mt-0.5 flex-shrink-0" />
                                          <div className="flex-1">
                                            <p className="text-xs font-semibold text-orange-700 mb-0.5">Medical Issue Noted</p>
                                            <p className="text-xs text-orange-600">{event.follow_up_medical_issue_description}</p>
                                          </div>
                                        </div>
                                      )}
                                      
                                      {/* Notes */}
                                      {event.follow_up_notes && (
                                        <div className="p-2 bg-gray-50 rounded border border-gray-100">
                                          <p className="text-xs font-semibold text-gray-600 mb-1">Observations</p>
                                          <p className="text-xs text-gray-600 leading-relaxed">{event.follow_up_notes}</p>
                                        </div>
                                      )}
                                    </div>
                                  )}

                                  {/* Pregnancy Check Follow-up */}
                                  {event.event_type === 'pregnancy_check' && (
                                    <div className="space-y-1.5 text-sm text-blue-800">
                                      {event.follow_up_steaming_date && (
                                        <div className="flex justify-between">
                                          <span className="text-blue-700">Steaming Date:</span>
                                          <span className="font-medium">{event.follow_up_steaming_date}</span>
                                        </div>
                                      )}
                                      {event.follow_up_next_check_date && (
                                        <div className="flex justify-between">
                                          <span className="text-blue-700">Next Check Date:</span>
                                          <span className="font-medium">{event.follow_up_next_check_date}</span>
                                        </div>
                                      )}
                                      {event.follow_up_expected_heat_date && (
                                        <div className="flex justify-between">
                                          <span className="text-blue-700">Expected Heat Date:</span>
                                          <span className="font-medium">{event.follow_up_expected_heat_date}</span>
                                        </div>
                                      )}
                                      {event.follow_up_notes && (
                                        <div className="mt-2 pt-2 border-t border-blue-100">
                                          <p className="text-xs text-blue-600">{event.follow_up_notes}</p>
                                        </div>
                                      )}
                                    </div>
                                  )}

                                  {/* Calving Follow-up */}
                                  {event.event_type === 'calving' && (
                                    <div className="space-y-1.5 text-sm text-blue-800">
                                      {event.follow_up_placenta_expelled !== null && (
                                        <div className="flex items-center gap-2">
                                          {event.follow_up_placenta_expelled ? (
                                            <>
                                              <CheckCircle2 className="w-3 h-3 text-green-600" />
                                              <span>Placenta Expelled</span>
                                              {event.follow_up_placenta_expelled_at && (
                                                <span className="text-xs font-medium">{new Date(event.follow_up_placenta_expelled_at).toLocaleString()}</span>
                                              )}
                                            </>
                                          ) : (
                                            <>
                                              <XCircle className="w-3 h-3 text-red-600" />
                                              <span>Placenta Not Expelled</span>
                                            </>
                                          )}
                                        </div>
                                      )}
                                      {event.follow_up_has_medical_issue && (
                                        <div className="flex items-start gap-2">
                                          <AlertTriangle className="w-3 h-3 text-orange-600 mt-0.5 flex-shrink-0" />
                                          <div className="flex-1">
                                            <span className="text-orange-700">Medical Issue:</span>
                                            <p className="text-orange-600 text-xs mt-0.5">{event.follow_up_medical_issue_description}</p>
                                          </div>
                                        </div>
                                      )}
                                      {event.follow_up_notes && (
                                        <div className="mt-2 pt-2 border-t border-blue-100">
                                          <p className="text-xs text-blue-600">{event.follow_up_notes}</p>
                                        </div>
                                      )}
                                    </div>
                                  )}

                                  <div className="mt-2 pt-2 border-t border-blue-100 text-xs text-blue-600">
                                    Follow-up recorded {new Date(event.follow_up_created_at).toLocaleString()}
                                  </div>
                                </div>
                              </div>
                            </div>
                            </>
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
            setEditingEvent(null)
          }}
          farmId={farmId}
          onEventCreated={() => {
            setEditingEvent(null)
            refetch?.()
          }}
          editingEvent={editingEvent}
        />
      )}

      {/* Follow-up modal */}
      <FollowUpBreedingModal
        isOpen={!!followUpEvent}
        onClose={() => setFollowUpEvent(null)}
        event={followUpEvent}
        farmId={farmId}
      />
    </div>
  )
}
