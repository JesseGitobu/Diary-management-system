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
  Clock
} from 'lucide-react'

interface BreedingEventTimelineProps {
  animalId?: string | null
  animalGender: string
  className?: string
  farmId?: string
  refreshTrigger?: number // Added prop to force reload
}

const eventConfig = {
  heat_detection: {
    icon: Heart,
    color: 'bg-pink-100 text-pink-800',
    borderColor: 'border-pink-200',
    title: 'Heat Detection'
  },
  insemination: {
    icon: Syringe,
    color: 'bg-blue-100 text-blue-800',
    borderColor: 'border-blue-200',
    title: 'Insemination'
  },
  pregnancy_check: {
    icon: Stethoscope,
    color: 'bg-green-100 text-green-800',
    borderColor: 'border-green-200',
    title: 'Pregnancy Check'
  },
  calving: {
    icon: Baby,
    color: 'bg-yellow-100 text-yellow-800',
    borderColor: 'border-yellow-200',
    title: 'Calving Event'
  }
}

export function BreedingEventTimeline({ 
  animalId, 
  animalGender,
  className,
  farmId,
  refreshTrigger = 0
}: BreedingEventTimelineProps) {
  // ✅ FIX: Cast the hook return type to include optional refetch
  // This satisfies TypeScript even if the hook definition is missing 'refetch'
  const { events, loading, error, refetch } = useBreedingEvents(animalId ?? null) as {
    events: any[]
    loading: boolean
    error: string | null
    refetch?: () => void
  }
  
  const { isMobile } = useDeviceInfo()
  
  // Refetch when trigger changes
  useEffect(() => {
    // Only call refetch if it exists (Runtime safety)
    if (refreshTrigger > 0 && typeof refetch === 'function') {
      refetch()
    }
  }, [refreshTrigger, refetch])

  // Filtering state
  const [selectedEventTypes, setSelectedEventTypes] = useState<string[]>([])
  const [showFilters, setShowFilters] = useState(false)
  const [expandedEvents, setExpandedEvents] = useState<Set<string>>(new Set())
  const [dateFilter, setDateFilter] = useState<'all' | '7days' | '30days' | '90days'>('all')
  
  // Filter events
  interface BreedingEvent {
    id: string
    event_type: string
    event_date: string
    heat_signs?: string[]
    [key: string]: any
  }

  const filteredEvents = useMemo(() => {
    let filtered = [...events] as BreedingEvent[]
    
    // Sort by date descending (ensure latest is first)
    filtered.sort((a, b) => new Date(b.event_date).getTime() - new Date(a.event_date).getTime())

    // Filter by event type
    if (selectedEventTypes.length > 0) {
      filtered = filtered.filter(event => 
        selectedEventTypes.includes(event.event_type)
      )
    }
    
    // Filter by date range
    if (dateFilter !== 'all') {
      const now = new Date()
      const daysAgo = {
        '7days': 7,
        '30days': 30,
        '90days': 90
      }[dateFilter]
      
      const cutoffDate = new Date(now.getTime() - (daysAgo * 24 * 60 * 60 * 1000))
      filtered = filtered.filter(event => 
        new Date(event.event_date) >= cutoffDate
      )
    }
    
    return filtered
  }, [events, selectedEventTypes, dateFilter])
  
  const toggleEventType = (eventType: string) => {
    setSelectedEventTypes(prev => 
      prev.includes(eventType)
        ? prev.filter(t => t !== eventType)
        : [...prev, eventType]
    )
  }
  
  const toggleEventExpansion = (eventId: string) => {
    setExpandedEvents(prev => {
      const newSet = new Set(prev)
      if (newSet.has(eventId)) {
        newSet.delete(eventId)
      } else {
        newSet.add(eventId)
      }
      return newSet
    })
  }
  
  const clearFilters = () => {
    setSelectedEventTypes([])
    setDateFilter('all')
  }
  
  const hasActiveFilters = selectedEventTypes.length > 0 || dateFilter !== 'all'

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
      <div className="flex items-center justify-center py-8">
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
    <div className={cn("space-y-4", className)}>
      {/* Filter Section */}
      <div className={cn(
        "border border-gray-200 rounded-lg",
        isMobile ? "sticky top-0 z-10 bg-white" : ""
      )}>
        <div className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Filter className="w-4 h-4 text-gray-500" />
              <span className={cn(
                "font-medium text-gray-700",
                isMobile ? "text-sm" : ""
              )}>
                Filters
              </span>
              {hasActiveFilters && (
                <Badge className="bg-farm-green text-white">
                  {selectedEventTypes.length + (dateFilter !== 'all' ? 1 : 0)}
                </Badge>
              )}
            </div>
            
            <div className="flex items-center space-x-2">
              {hasActiveFilters && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={clearFilters}
                  className={cn(
                    "text-red-600 hover:text-red-700",
                    isMobile && "text-xs px-2"
                  )}
                >
                  <X className="w-3 h-3 mr-1" />
                  Clear
                </Button>
              )}
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowFilters(!showFilters)}
                className={isMobile ? "px-2" : ""}
              >
                {showFilters ? (
                  <ChevronUp className="w-4 h-4" />
                ) : (
                  <ChevronDown className="w-4 h-4" />
                )}
              </Button>
            </div>
          </div>
          
          {/* Filter Options */}
          {showFilters && (
            <div className={cn(
              "mt-4 pt-4 border-t border-gray-200 space-y-4",
              isMobile && "space-y-3"
            )}>
              {/* Event Type Filters */}
              <div>
                <label className="text-sm font-medium text-gray-700 mb-2 block">
                  Event Types
                </label>
                <div className={cn(
                  "grid gap-2",
                  isMobile ? "grid-cols-2" : "grid-cols-4"
                )}>
                  {Object.entries(eventConfig).map(([type, config]) => {
                    const Icon = config.icon
                    const isSelected = selectedEventTypes.includes(type)
                    
                    return (
                      <button
                        key={type}
                        onClick={() => toggleEventType(type)}
                        className={cn(
                          "flex items-center space-x-2 p-2 rounded-lg border transition-colors",
                          isMobile ? "text-xs" : "text-sm",
                          isSelected
                            ? `${config.color} border-transparent`
                            : "border-gray-200 hover:border-gray-300"
                        )}
                      >
                        <Icon className={cn(
                          isMobile ? "w-3 h-3" : "w-4 h-4",
                          isSelected && "text-current"
                        )} />
                        <span className={isMobile ? "hidden sm:inline" : ""}>
                          {config.title.split(' ')[0]}
                        </span>
                      </button>
                    )
                  })}
                </div>
              </div>
              
              {/* Date Range Filter */}
              <div>
                <label className="text-sm font-medium text-gray-700 mb-2 block">
                  Time Period
                </label>
                <div className={cn(
                  "grid gap-2",
                  isMobile ? "grid-cols-2" : "grid-cols-4"
                )}>
                  {[
                    { value: 'all', label: 'All Time' },
                    { value: '7days', label: 'Last 7 Days' },
                    { value: '30days', label: 'Last 30 Days' },
                    { value: '90days', label: 'Last 90 Days' }
                  ].map(option => (
                    <button
                      key={option.value}
                      onClick={() => setDateFilter(option.value as any)}
                      className={cn(
                        "px-3 py-2 rounded-lg border text-sm transition-colors",
                        dateFilter === option.value
                          ? "bg-farm-green text-white border-farm-green"
                          : "border-gray-200 hover:border-gray-300"
                      )}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
        
        {/* Results Count */}
        {hasActiveFilters && (
          <div className="px-4 pb-3">
            <p className="text-sm text-gray-600">
              Showing {filteredEvents.length} of {events.length} events
            </p>
          </div>
        )}
      </div>

      {/* Timeline Events */}
      <div className="space-y-4 animate-in fade-in duration-500">
        {filteredEvents.map((event, index) => {
          const config = eventConfig[event.event_type as keyof typeof eventConfig]
          const Icon = config.icon
          const isExpanded = expandedEvents.has(event.id)
          const hasDetails = event.notes || 
            (event.event_type === 'heat_detection' && event.heat_signs?.length) ||
            (event.event_type === 'insemination' && event.semen_bull_code) ||
            (event.event_type === 'pregnancy_check' && event.pregnancy_result) ||
            (event.event_type === 'calving' && event.calf_gender)
          
          return (
            <Card 
              key={event.id} 
              className={cn(
                "relative transition-shadow hover:shadow-md",
                config.borderColor,
                "border-l-4"
              )}
            >
              {index !== filteredEvents.length - 1 && !isMobile && (
                <div className="absolute left-6 top-16 bottom-0 w-0.5 bg-gray-200" />
              )}
              
              <CardContent className={cn(isMobile ? "p-3" : "p-4")}>
                <div className={cn(
                  "flex",
                  isMobile ? "flex-col space-y-3" : "items-start space-x-4"
                )}>
                  {/* Icon */}
                  <div className={cn(
                    "flex-shrink-0 rounded-full flex items-center justify-center",
                    config.color,
                    isMobile ? "w-10 h-10" : "w-12 h-12"
                  )}>
                    <Icon className={cn(isMobile ? "w-5 h-5" : "w-6 h-6")} />
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    {/* Header */}
                    <div className={cn(
                      "flex justify-between mb-2",
                      isMobile ? "flex-col space-y-2" : "items-start"
                    )}>
                      <div className="flex-1">
                        <div className="flex items-center space-x-2 mb-1">
                          <h4 className={cn(
                            "font-semibold text-gray-900",
                            isMobile ? "text-sm" : "text-base"
                          )}>
                            {config.title}
                          </h4>
                          <Badge className={cn(
                            config.color,
                            isMobile && "text-xs"
                          )}>
                            {new Date(event.event_date).toLocaleDateString('en-US', {
                              month: 'short',
                              day: 'numeric',
                              year: 'numeric'
                            })}
                          </Badge>
                        </div>
                        
                        {/* Animal Info */}
                        {event.animals && (
                          <div className={cn(
                            "flex items-center space-x-3 text-gray-600",
                            isMobile ? "text-xs" : "text-sm"
                          )}>
                            <div className="flex items-center space-x-1">
                              <Tag className="w-3 h-3" />
                              <span>{event.animals.tag_number}</span>
                            </div>
                            {event.animals.name && (
                              <div className="flex items-center space-x-1">
                                <User className="w-3 h-3" />
                                <span>{event.animals.name}</span>
                              </div>
                            )}
                            {event.animals.breed && (
                              <span className="text-gray-500">• {event.animals.breed}</span>
                            )}
                          </div>
                        )}
                      </div>
                      
                      {hasDetails && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => toggleEventExpansion(event.id)}
                          className={cn(
                            "flex-shrink-0",
                            isMobile && "w-full justify-between"
                          )}
                        >
                          <span className="text-xs">
                            {isExpanded ? 'Show Less' : 'Show Details'}
                          </span>
                          {isExpanded ? (
                            <ChevronUp className="w-4 h-4 ml-1" />
                          ) : (
                            <ChevronDown className="w-4 h-4 ml-1" />
                          )}
                        </Button>
                      )}
                    </div>
                    
                    {/* Quick Summary (Always Visible) */}
                    <div className={cn(
                      "space-y-1",
                      isMobile ? "text-xs" : "text-sm",
                      "text-gray-600"
                    )}>
                      {event.event_type === 'heat_detection' && event.heat_action_taken && (
                        <p>
                          <span className="font-medium">Action:</span> {event.heat_action_taken}
                        </p>
                      )}
                      
                      {event.event_type === 'insemination' && (
                        <p>
                          <span className="font-medium">Method:</span>{' '}
                          {event.insemination_method?.replace('_', ' ')}
                          {event.semen_bull_code && ` • Code: ${event.semen_bull_code}`}
                        </p>
                      )}
                      
                      {event.event_type === 'pregnancy_check' && event.pregnancy_result && (
                        <div className="flex items-center space-x-2">
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
                    
                    {/* Detailed Information (Expandable) */}
                    {isExpanded && hasDetails && (
                      <div className={cn(
                        "mt-4 pt-4 border-t border-gray-200 space-y-3",
                        isMobile ? "text-xs" : "text-sm"
                      )}>
                        {/* Event-specific details */}
                        {event.event_type === 'heat_detection' && (
                          <>
                            {event.heat_signs && event.heat_signs.length > 0 && (
                              <div>
                                <p className="font-medium text-gray-700 mb-2">
                                  Heat Signs Observed:
                                </p>
                                <div className="flex flex-wrap gap-1">
                                  {event.heat_signs.map((sign: string, idx: number) => (
                                    <Badge 
                                      key={idx} 
                                      className="bg-pink-50 text-pink-700 border border-pink-200"
                                    >
                                      {sign}
                                    </Badge>
                                  ))}
                                </div>
                              </div>
                            )}
                          </>
                        )}
                        
                        {event.event_type === 'insemination' && (
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            {event.semen_bull_code && (
                              <div className="flex items-start space-x-2">
                                <FileText className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
                                <div>
                                  <p className="font-medium text-gray-700">Semen/Bull Code</p>
                                  <p className="text-gray-600">{event.semen_bull_code}</p>
                                </div>
                              </div>
                            )}
                            {event.technician_name && (
                              <div className="flex items-start space-x-2">
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
                              <div className="flex items-start space-x-2">
                                <Stethoscope className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
                                <div>
                                  <p className="font-medium text-gray-700">Method</p>
                                  <p className="text-gray-600">{event.examination_method}</p>
                                </div>
                              </div>
                            )}
                            {event.veterinarian_name && (
                              <div className="flex items-start space-x-2">
                                <User className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
                                <div>
                                  <p className="font-medium text-gray-700">Veterinarian</p>
                                  <p className="text-gray-600">{event.veterinarian_name}</p>
                                </div>
                              </div>
                            )}
                            {event.estimated_due_date && (
                              <div className="flex items-start space-x-2">
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
                                <div className="flex items-start space-x-2">
                                  <Tag className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
                                  <div>
                                    <p className="font-medium text-gray-700">Calf Tag</p>
                                    <p className="text-gray-600">{event.calf_tag_number}</p>
                                  </div>
                                </div>
                              )}
                              {event.calf_weight && (
                                <div className="flex items-start space-x-2">
                                  <Baby className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
                                  <div>
                                    <p className="font-medium text-gray-700">Birth Weight</p>
                                    <p className="text-gray-600">{event.calf_weight} kg</p>
                                  </div>
                                </div>
                              )}
                            </div>
                            {event.calf_health_status && (
                              <div className="flex items-start space-x-2">
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
                          <div className={cn(
                            "p-3 bg-gray-50 rounded-lg border border-gray-200",
                            isMobile && "p-2"
                          )}>
                            <div className="flex items-start space-x-2">
                              <FileText className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
                              <div className="flex-1">
                                <p className="font-medium text-gray-700 mb-1">Notes</p>
                                <p className="text-gray-600 whitespace-pre-wrap">
                                  {event.notes}
                                </p>
                              </div>
                            </div>
                          </div>
                        )}
                        
                        {/* Timestamp */}
                        <div className="flex items-center space-x-1 text-xs text-gray-500 pt-2 border-t border-gray-100">
                          <Clock className="w-3 h-3" />
                          <span>
                            Recorded on {new Date(event.created_at || event.event_date).toLocaleString()}
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>
      
      {/* Empty State for Filtered Results */}
      {filteredEvents.length === 0 && events.length > 0 && (
        <Card className="border-dashed">
          <CardContent className="p-8 text-center">
            <Filter className="mx-auto h-12 w-12 text-gray-400 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              No events match your filters
            </h3>
            <p className="text-sm text-gray-600 mb-4">
              Try adjusting your filters to see more results
            </p>
            <Button
              variant="outline"
              onClick={clearFilters}
              className="text-sm"
            >
              Clear All Filters
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  )
}