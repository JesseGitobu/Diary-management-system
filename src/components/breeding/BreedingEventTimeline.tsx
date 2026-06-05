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
  const [searchQuery, setSearchQuery] = useState<string>('')
  const [expandedEvents, setExpandedEvents] = useState<Set<string>>(new Set())
  const [openDropdown, setOpenDropdown] = useState<string | null>(null)
  const filterDropdownRef = useRef<HTMLDivElement>(null)

  // Refetch when trigger changes
  useEffect(() => {
    if (refreshTrigger > 0 && typeof refetch === 'function') {
      refetch()
    }
  }, [refreshTrigger, refetch, animalId])

  // Global animal search - debounced
  useEffect(() => {
    const timer = setTimeout(async () => {
      if (searchQuery.trim() && farmId) {
        console.log('🔍 [Search] Starting global animal search:', {
          query: searchQuery,
          farmId,
          timestamp: new Date().toISOString()
        })
        setIsSearchingGlobal(true)
        try {
          const response = await fetch(
            `/api/animals/global-search?q=${encodeURIComponent(searchQuery)}&farm_id=${farmId}`
          )
          if (response.ok) {
            const data = await response.json()
            console.log('✅ [Search] Results received:', {
              totalResults: data.results?.length || 0,
              results: data.results?.map((a: any) => ({
                id: a.id,
                tag: a.tag_number,
                name: a.name,
                breed: a.breed
              }))
            })
            setGlobalSearchResults(data.results || [])
          } else {
            console.error('❌ [Search] API error:', response.status, response.statusText)
          }
        } catch (err) {
          console.error('❌ [Search] Fetch error:', err)
          setGlobalSearchResults([])
        } finally {
          setIsSearchingGlobal(false)
        }
      } else {
        console.log('⏭️ [Search] Skipping search - empty query or no farmId')
        setGlobalSearchResults([])
      }
    }, 300) // Debounce 300ms

    return () => clearTimeout(timer)
  }, [searchQuery, farmId])

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
  
  // Global animal search state
  const [globalSearchResults, setGlobalSearchResults] = useState<any[]>([])
  const [isSearchingGlobal, setIsSearchingGlobal] = useState(false)
  const [selectedAnimalForFiltering, setSelectedAnimalForFiltering] = useState<string | null>(null)
  const [selectedAnimalEvents, setSelectedAnimalEvents] = useState<any[]>([])
  const [loadingSelectedAnimalEvents, setLoadingSelectedAnimalEvents] = useState(false)

  // When an animal is selected via search, fetch events for that animal
  useEffect(() => {
    if (selectedAnimalForFiltering && farmId) {
      const fetchSelectedAnimalEvents = async () => {
        console.log('🐄 [Animal Selection] Fetching events for selected animal:', {
          animalId: selectedAnimalForFiltering,
          farmId
        })
        setLoadingSelectedAnimalEvents(true)
        try {
          const response = await fetch(
            `/api/breeding-events?animal_id=${selectedAnimalForFiltering}&farm_id=${farmId}`
          )
          if (response.ok) {
            const data = await response.json()
            console.log('✅ [Animal Selection] Events fetched for selected animal:', {
              animalId: selectedAnimalForFiltering,
              eventCount: data.events?.length || 0,
              events: data.events?.map((e: any) => ({
                id: e.id,
                type: e.event_type,
                date: e.event_date,
                animalTag: e.animals?.tag_number
              }))
            })
            setSelectedAnimalEvents(data.events || [])
          } else {
            console.error('❌ [Animal Selection] Failed to fetch animal events:', response.status)
            setSelectedAnimalEvents([])
          }
        } catch (err) {
          console.error('❌ [Animal Selection] Error fetching animal events:', err)
          setSelectedAnimalEvents([])
        } finally {
          setLoadingSelectedAnimalEvents(false)
        }
      }
      
      fetchSelectedAnimalEvents()
    } else {
      setSelectedAnimalEvents([])
    }
  }, [selectedAnimalForFiltering, farmId])

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
    console.log('🔄 [Filter] Computing filtered events:', {
      totalEvents: events.length,
      selectedEventTypes,
      dateFilter,
      searchQuery,
      selectedAnimalForFiltering,
      usingSelectedAnimalEvents: selectedAnimalForFiltering ? true : false
    })

    // If an animal is selected, use their specific events instead of filtering farm-wide events
    let sourceEvents = selectedAnimalForFiltering ? selectedAnimalEvents : events
    
    let filtered = [...sourceEvents] as BreedingEvent[]
    console.log('📋 [Filter] Starting with events:', {
      source: selectedAnimalForFiltering ? 'selected-animal' : 'farm-wide',
      count: filtered.length
    })
    
    // Debug: Show structure of first few events
    if (filtered.length > 0) {
      console.log('🔍 [Debug] First event structure:', {
        eventId: filtered[0].id,
        eventType: filtered[0].event_type,
        animals: filtered[0].animals,
        animalsId: filtered[0].animals?.id,
        animalsTag: filtered[0].animals?.tag_number,
        animalsName: filtered[0].animals?.name,
        fullEvent: filtered[0]
      })
      
      // Show all unique animal IDs in events
      const uniqueAnimalIds = new Set(filtered.map(e => e.animals?.id).filter(Boolean))
      const uniqueAnimalTags = new Set(filtered.map(e => e.animals?.tag_number).filter(Boolean))
      console.log('🔍 [Debug] Unique animals in loaded events:', {
        animalIds: Array.from(uniqueAnimalIds),
        tags: Array.from(uniqueAnimalTags),
        totalUnique: uniqueAnimalIds.size
      })
    }

    // Filter by event type
    if (selectedEventTypes.length > 0) {
      const beforeCount = filtered.length
      filtered = filtered.filter(e => selectedEventTypes.includes(e.event_type))
      console.log('📌 [Filter] Filtered by event types:', {
        types: selectedEventTypes,
        before: beforeCount,
        after: filtered.length
      })
    }

    // Filter by date range
    if (dateFilter !== 'all') {
      const beforeCount = filtered.length
      const daysMap = { '7days': 7, '30days': 30, '90days': 90 } as const
      const cutoff = new Date(Date.now() - daysMap[dateFilter] * 86400000)
      filtered = filtered.filter(e => new Date(e.event_date) >= cutoff)
      console.log('📅 [Filter] Filtered by date range:', {
        range: dateFilter,
        cutoffDate: cutoff.toISOString(),
        before: beforeCount,
        after: filtered.length
      })
    }

    // Filter by search query (only if not using selected animal events)
    if (searchQuery.trim() && !selectedAnimalForFiltering) {
      const beforeCount = filtered.length
      const query = searchQuery.toLowerCase().trim()
      filtered = filtered.filter(e => {
        const tagMatch = e.animals?.tag_number?.toLowerCase().includes(query)
        const nameMatch = e.animals?.name?.toLowerCase().includes(query)
        return tagMatch || nameMatch
      })
      console.log('🔎 [Filter] Filtered by search query:', {
        query: searchQuery,
        before: beforeCount,
        after: filtered.length
      })
    }

    // Sort by event date
    filtered.sort((a, b) => new Date(b.event_date).getTime() - new Date(a.event_date).getTime())
    console.log('📊 [Filter] After sorting:', filtered.length)
    
    // Deduplicate by event ID to prevent duplicate key warnings
    const seen = new Set<string>()
    filtered = filtered.filter(e => {
      if (seen.has(e.id)) return false
      seen.add(e.id)
      return true
    })
    
    console.log('✨ [Filter] Final result:', {
      totalFiltered: filtered.length,
      events: filtered.map(e => ({
        id: e.id,
        type: e.event_type,
        date: e.event_date,
        animal: e.animals?.tag_number
      }))
    })
    
    return filtered
  }, [events, selectedEventTypes, dateFilter, searchQuery, selectedAnimalForFiltering, selectedAnimalEvents])

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
    console.log('🧹 [Filter] Clearing all filters')
    setSelectedEventTypes([])
    setDateFilter('all')
    setSearchQuery('')
    setSelectedAnimalForFiltering(null)
  }

  const hasActiveFilters = selectedEventTypes.length > 0 || dateFilter !== 'all' || searchQuery.trim() !== '' || selectedAnimalForFiltering !== null
  const activeFilterCount = selectedEventTypes.length + (dateFilter !== 'all' ? 1 : 0) + (searchQuery.trim() ? 1 : 0) + (selectedAnimalForFiltering ? 1 : 0)

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

  if (loadingSelectedAnimalEvents) {
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
              {selectedAnimalForFiltering && selectedAnimalEvents.length > 0
                ? `${filteredEvents.length} event${filteredEvents.length !== 1 ? 's' : ''} for ${globalSearchResults.find(a => a.id === selectedAnimalForFiltering)?.tag_number || 'selected animal'}`
                : selectedAnimalForFiltering && selectedAnimalEvents.length === 0
                ? `No events found for ${globalSearchResults.find(a => a.id === selectedAnimalForFiltering)?.tag_number || 'selected animal'}`
                : searchQuery.trim() && globalSearchResults.length > 0 
                ? `${globalSearchResults.filter(a => events.some(e => e.animals?.id === a.id)).length} of ${globalSearchResults.length} animals have events`
                : hasActiveFilters
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
          {/* Search Input */}
          <div className="relative">
            <input
              type="text"
              placeholder="Search by animal name or tag..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className={cn(
                "w-full px-3 py-2.5 border border-gray-200 rounded-lg bg-white hover:bg-gray-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-farm-green/20 focus:border-farm-green transition-colors",
                isMobile ? "text-sm" : "text-base"
              )}
            />
            
            {/* Global search results dropdown */}
            {searchQuery.trim() && (
              <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-50 max-h-96 overflow-y-auto">
                {isSearchingGlobal ? (
                  <div className="p-4 flex items-center justify-center">
                    <LoadingSpinner size="sm" />
                  </div>
                ) : globalSearchResults.length > 0 ? (
                  <div className="p-2 space-y-1">
                    <div className="px-3 py-2 text-xs font-semibold text-gray-600 bg-gray-50">
                      {globalSearchResults.length} animal{globalSearchResults.length !== 1 ? 's' : ''} found in database
                    </div>
                    {globalSearchResults.map(animal => {
                      // Check if this animal has events
                      const hasEvents = events.some(e => e.animals?.id === animal.id)
                      const isSelected = selectedAnimalForFiltering === animal.id
                      return (
                        <button
                          key={animal.id}
                          onClick={() => {
                            console.log('🖱️ [Animal Selection] Clicked on animal:', {
                              animalId: animal.id,
                              tag: animal.tag_number,
                              name: animal.name,
                              currentSelection: selectedAnimalForFiltering,
                              willToggle: isSelected
                            })
                            
                            // Toggle selection
                            if (isSelected) {
                              console.log('➖ [Animal Selection] Deselecting animal')
                              setSelectedAnimalForFiltering(null)
                            } else {
                              console.log('➕ [Animal Selection] Selecting animal')
                              setSelectedAnimalForFiltering(animal.id)
                              // Close dropdown after selection
                              setOpenDropdown(null)
                            }
                          }}
                          className={cn(
                            "w-full px-3 py-2 rounded-lg border text-xs transition-colors text-left cursor-pointer",
                            isSelected
                              ? "bg-farm-green text-white border-farm-green font-semibold"
                              : hasEvents
                              ? "bg-farm-green/5 border-farm-green/30 text-gray-800 hover:bg-farm-green/10"
                              : "bg-gray-50 border-gray-200 text-gray-600 hover:border-gray-300 hover:bg-gray-100"
                          )}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex-1">
                              <p className="font-medium">{animal.tag_number}</p>
                              <p className={cn("text-gray-500", isSelected && "text-white/80")}>
                                {animal.name && `${animal.name} • `}
                                {animal.breed}
                              </p>
                            </div>
                            <div className="flex items-center gap-1 flex-shrink-0">
                              {hasEvents && (
                                <span className={cn(
                                  "text-xs px-2 py-0.5 rounded whitespace-nowrap",
                                  isSelected ? "bg-white text-farm-green" : "bg-farm-green text-white"
                                )}>
                                  {isSelected ? '✓ ' : ''}Events
                                </span>
                              )}
                              {isSelected && !hasEvents && (
                                <span className="text-xs text-yellow-200">⚠️ No events</span>
                              )}
                            </div>
                          </div>
                        </button>
                      )
                    })}
                  </div>
                ) : (
                  <div className="p-4 text-center text-sm text-gray-500">
                    No animals found matching "{searchQuery}"
                  </div>
                )}
              </div>
            )}
          </div>

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
          {(hasActiveFilters || selectedAnimalForFiltering) && (
            <div className="flex flex-wrap items-center gap-1.5 pt-1 border-t border-gray-100">
              <span className="text-xs text-gray-400">Active:</span>
              {selectedAnimalForFiltering && globalSearchResults.length > 0 && (
                <button
                  onClick={() => {
                    console.log('❌ [Filter] Clearing animal filter')
                    setSelectedAnimalForFiltering(null)
                  }}
                  className="flex items-center gap-1 px-2 py-0.5 rounded-full text-xs border bg-purple-50 text-purple-700 border-purple-200"
                >
                  {globalSearchResults.find(a => a.id === selectedAnimalForFiltering)?.tag_number || 'Animal'}
                  <X className="w-2.5 h-2.5 ml-0.5" />
                </button>
              )}
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
              {searchQuery.trim() && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="flex items-center gap-1 px-2 py-0.5 rounded-full text-xs border bg-blue-50 text-blue-700 border-blue-200"
                >
                  {searchQuery}
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
            <h3 className="text-sm font-medium text-gray-700 mb-1">
              {selectedAnimalForFiltering 
                ? 'No events for this animal' 
                : 'No events match your filters'}
            </h3>
            {selectedAnimalForFiltering && selectedAnimalEvents.length === 0 && (
              <p className="text-xs text-gray-500 mb-4">
                {globalSearchResults.find(a => a.id === selectedAnimalForFiltering)?.tag_number || 'This animal'} hasn't had any breeding records recorded yet.
              </p>
            )}
            {searchQuery.trim() && globalSearchResults.length > 0 && !selectedAnimalForFiltering && (
              <p className="text-xs text-gray-500 mb-4">
                Found {globalSearchResults.length} animal{globalSearchResults.length !== 1 ? 's' : ''} in the database, but they have no recorded events.
              </p>
            )}
            {!searchQuery.trim() && !selectedAnimalForFiltering && (
              <p className="text-xs text-gray-500 mb-4">Try adjusting or clearing the filters above</p>
            )}
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
          {selectedAnimalForFiltering
            ? `${filteredEvents.length} event${filteredEvents.length !== 1 ? 's' : ''} for selected animal`
            : hasActiveFilters
            ? `${filteredEvents.length} of ${events.length} events match filters`
            : `${filteredEvents.length} event${filteredEvents.length !== 1 ? 's' : ''} total`}
          {totalCount && totalCount > events.length
            ? ` — ${totalCount - events.length} more on server`
            : ''}
        </p>
        {(loading || loadingSelectedAnimalEvents) && events.length > 0 && (
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
