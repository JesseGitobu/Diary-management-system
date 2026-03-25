'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { ChevronLeft, ChevronRight, Calendar, Heart, Baby, Stethoscope, X } from 'lucide-react'
import { Modal } from '@/components/ui/Modal'

interface BreedingCalendarProps {
  farmId: string
  events: any[]
  canManage: boolean
}

interface DateEvent {
  date: Date
  events: any[]
}

export function BreedingCalendar({ farmId, events, canManage }: BreedingCalendarProps) {
  const [currentDate, setCurrentDate] = useState(new Date())
  const [calendarEvents, setCalendarEvents] = useState(events)
  const [selectedDate, setSelectedDate] = useState<DateEvent | null>(null)

  useEffect(() => {
    setCalendarEvents(events)
  }, [events])

  const getDaysInMonth = (date: Date) => {
    return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate()
  }

  const getFirstDayOfMonth = (date: Date) => {
    return new Date(date.getFullYear(), date.getMonth(), 1).getDay()
  }

  const getEventsForDate = (date: Date) => {
    const dateString = date.toISOString().split('T')[0]
    return calendarEvents.filter(event => {
      // Handle both event_date (timestamp) and scheduled_date (date) formats
      const eventDate = event.event_date 
        ? new Date(event.event_date).toISOString().split('T')[0]
        : event.scheduled_date
      return eventDate === dateString
    })
  }

  const navigateMonth = (direction: 'prev' | 'next') => {
    setCurrentDate(prev => {
      const newDate = new Date(prev)
      if (direction === 'prev') {
        newDate.setMonth(prev.getMonth() - 1)
      } else {
        newDate.setMonth(prev.getMonth() + 1)
      }
      return newDate
    })
  }

  const getEventIcon = (eventType: string) => {
    switch (eventType) {
      case 'heat_detection':
        return <Heart className="w-3 h-3" />
      case 'pregnancy_check':
        return <Stethoscope className="w-3 h-3" />
      case 'calving':
        return <Baby className="w-3 h-3" />
      default:
        return <Calendar className="w-3 h-3" />
    }
  }

  const getEventColor = (eventType: string, status: string) => {
    if (status === 'overdue') return 'bg-red-100 text-red-800'
    
    switch (eventType) {
      case 'heat_detection':
        return 'bg-pink-100 text-pink-800'
      case 'insemination':
        return 'bg-purple-100 text-purple-800'
      case 'pregnancy_check':
        return 'bg-green-100 text-green-800'
      case 'calving':
        return 'bg-yellow-100 text-yellow-800'
      default:
        return 'bg-blue-100 text-blue-800'
    }
  }

  const getEventTypeLabel = (eventType: string) => {
    switch (eventType) {
      case 'heat_detection':
        return 'Heat Detection'
      case 'insemination':
        return 'Insemination'
      case 'pregnancy_check':
        return 'Pregnancy Check'
      case 'calving':
        return 'Calving'
      default:
        return eventType
    }
  }

  const formatEventStatus = (event: any): string => {
    if (event.event_type === 'calving' && event.calving_records) {
      return `Calving - ${event.calving_records.calving_difficulty}`
    }
    if (event.event_type === 'pregnancy_check' && event.pregnancy_records) {
      return `Pregnancy - ${event.pregnancy_records.pregnancy_status}`
    }
    if (event.event_type === 'insemination' && event.service_records) {
      return `Service - ${event.service_records.outcome || 'Pending'}`
    }
    return ''
  }

  const daysInMonth = getDaysInMonth(currentDate)
  const firstDayOfMonth = getFirstDayOfMonth(currentDate)
  const today = new Date()

  // Generate calendar grid
  const calendarDays = []
  
  // Empty cells for days before the first day of the month
  for (let i = 0; i < firstDayOfMonth; i++) {
    calendarDays.push(null)
  }
  
  // Days of the month
  for (let day = 1; day <= daysInMonth; day++) {
    calendarDays.push(day)
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center space-x-2">
              <Calendar className="h-5 w-5" />
              <span>Breeding Calendar</span>
            </CardTitle>
            <CardDescription>
              Track breeding events and due dates
            </CardDescription>
          </div>
          <div className="flex items-center space-x-2">
            <Button variant="outline" size="sm" onClick={() => navigateMonth('prev')}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <h3 className="text-lg font-semibold min-w-[200px] text-center">
              {currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
            </h3>
            <Button variant="outline" size="sm" onClick={() => navigateMonth('next')}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {/* Calendar Grid */}
        <div className="grid grid-cols-7 gap-2">
          {/* Day headers */}
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
            <div key={day} className="p-2 text-center text-sm font-medium text-gray-500">
              {day}
            </div>
          ))}
          
          {/* Calendar days */}
          {calendarDays.map((day, index) => {
            if (day === null) {
              return <div key={`empty-${index}`} className="p-2 h-24"></div>
            }
            
            const date = new Date(currentDate.getFullYear(), currentDate.getMonth(), day)
            const eventsForDay = getEventsForDate(date)
            const isToday = 
              date.getDate() === today.getDate() &&
              date.getMonth() === today.getMonth() &&
              date.getFullYear() === today.getFullYear()
            
            return (
              <button
                key={date.toISOString()}
                onClick={() => eventsForDay.length > 0 && setSelectedDate({ date, events: eventsForDay })}
                disabled={eventsForDay.length === 0}
                className={`p-2 h-24 border rounded-lg text-left transition-all ${
                  isToday ? 'bg-farm-green/10 border-farm-green' : 'border-gray-200'
                } ${
                  eventsForDay.length > 0 ? 'cursor-pointer hover:shadow-md hover:border-farm-green' : 'cursor-default'
                } disabled:opacity-50`}
              >
                <div className={`text-sm font-medium mb-1 ${
                  isToday ? 'text-farm-green' : 'text-gray-900'
                }`}>
                  {day}
                </div>
                <div className="space-y-1">
                  {eventsForDay.slice(0, 2).map((event) => (
                    <div
                      key={event.id ?? `${event.event_type}-${event.event_date || event.scheduled_date}-${event.animals?.id ?? ''}`}
                      className={`px-1 py-0.5 rounded text-xs flex items-center space-x-1 ${
                        getEventColor(event.event_type, event.status)
                      }`}
                    >
                      {getEventIcon(event.event_type)}
                      <span className="truncate">
                        {event.animals?.tag_number}
                      </span>
                    </div>
                  ))}
                  {eventsForDay.length > 2 && (
                    <div className="text-xs text-gray-500">
                      +{eventsForDay.length - 2} more
                    </div>
                  )}
                </div>
              </button>
            )
          })}
        </div>
        
        {/* Legend */}
        <div className="mt-6 flex flex-wrap gap-4">
          <div className="flex items-center space-x-2">
            <div className="w-4 h-4 bg-pink-100 rounded"></div>
            <span className="text-sm text-gray-600">Heat Detection</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-4 h-4 bg-purple-100 rounded"></div>
            <span className="text-sm text-gray-600">Insemination</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-4 h-4 bg-green-100 rounded"></div>
            <span className="text-sm text-gray-600">Pregnancy Check</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-4 h-4 bg-yellow-100 rounded"></div>
            <span className="text-sm text-gray-600">Calving</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-4 h-4 bg-red-100 rounded"></div>
            <span className="text-sm text-gray-600">Overdue</span>
          </div>
        </div>
      </CardContent>

      {/* Event Details Modal */}
      {selectedDate && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <CardHeader className="flex flex-row items-center justify-between space-y-0">
              <div>
                <CardTitle>
                  Events for {selectedDate.date.toLocaleDateString('en-US', { 
                    weekday: 'long', 
                    month: 'long', 
                    day: 'numeric',
                    year: 'numeric'
                  })}
                </CardTitle>
                <CardDescription>
                  {selectedDate.events.length} event{selectedDate.events.length !== 1 ? 's' : ''} scheduled
                </CardDescription>
              </div>
              <button
                onClick={() => setSelectedDate(null)}
                className="p-1 hover:bg-gray-100 rounded"
              >
                <X className="w-5 h-5" />
              </button>
            </CardHeader>
            <CardContent className="space-y-4">
              {selectedDate.events.map((event, idx) => (
                <div key={event.id || idx} className="border rounded-lg p-4 space-y-3">
                  {/* Event Type and Animal */}
                  <div className="flex items-start justify-between">
                    <div className="flex items-center space-x-3">
                      {getEventIcon(event.event_type)}
                      <div>
                        <h3 className="font-semibold text-lg">
                          {getEventTypeLabel(event.event_type)}
                        </h3>
                        <p className="text-sm text-gray-600">
                          Animal: {event.animals?.name || event.animals?.tag_number || 'Unknown'}
                        </p>
                      </div>
                    </div>
                    <Badge variant={
                      event.event_type === 'calving' ? 'default' :
                      event.event_type === 'pregnancy_check' ? 'secondary' :
                      event.event_type === 'insemination' ? 'outline' :
                      'default'
                    }>
                      {getEventTypeLabel(event.event_type)}
                    </Badge>
                  </div>

                  {/* Event Details Based on Type */}
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    {/* General Info */}
                    {event.animals && (
                      <>
                        <div>
                          <label className="text-gray-600">Tag Number</label>
                          <p className="font-medium">{event.animals.tag_number}</p>
                        </div>
                        <div>
                          <label className="text-gray-600">Breed</label>
                          <p className="font-medium">{event.animals.breed || 'N/A'}</p>
                        </div>
                      </>
                    )}

                    {/* Heat Detection */}
                    {event.event_type === 'heat_detection' && (
                      <>
                        {event.heat_signs && (
                          <div className="col-span-2">
                            <label className="text-gray-600">Heat Signs</label>
                            <p className="font-medium">{Array.isArray(event.heat_signs) ? event.heat_signs.join(', ') : event.heat_signs}</p>
                          </div>
                        )}
                        {event.heat_action_taken && (
                          <div className="col-span-2">
                            <label className="text-gray-600">Action Taken</label>
                            <p className="font-medium">{event.heat_action_taken}</p>
                          </div>
                        )}
                      </>
                    )}

                    {/* Insemination */}
                    {event.event_type === 'insemination' && event.service_records && (
                      <>
                        <div>
                          <label className="text-gray-600">Service ID</label>
                          <p className="font-medium">{event.service_records.id?.substring(0, 8)}...</p>
                        </div>
                        <div>
                          <label className="text-gray-600">Outcome</label>
                          <p className="font-medium">{event.service_records.outcome || 'Pending'}</p>
                        </div>
                        {event.service_records.inseminator && (
                          <div>
                            <label className="text-gray-600">Inseminator</label>
                            <p className="font-medium">{event.service_records.inseminator}</p>
                          </div>
                        )}
                        {event.service_records.notes && (
                          <div className="col-span-2">
                            <label className="text-gray-600">Notes</label>
                            <p className="font-medium">{event.service_records.notes}</p>
                          </div>
                        )}
                      </>
                    )}

                    {/* Pregnancy Check */}
                    {event.event_type === 'pregnancy_check' && event.pregnancy_records && (
                      <>
                        <div>
                          <label className="text-gray-600">Status</label>
                          <p className="font-medium capitalize">{event.pregnancy_records.pregnancy_status}</p>
                        </div>
                        <div>
                          <label className="text-gray-600">Confirmed Date</label>
                          <p className="font-medium">
                            {event.pregnancy_records.confirmed_date 
                              ? new Date(event.pregnancy_records.confirmed_date).toLocaleDateString()
                              : 'N/A'
                            }
                          </p>
                        </div>
                        {event.pregnancy_records.expected_calving_date && (
                          <div>
                            <label className="text-gray-600">Expected Calving Date</label>
                            <p className="font-medium">
                              {new Date(event.pregnancy_records.expected_calving_date).toLocaleDateString()}
                            </p>
                          </div>
                        )}
                        {event.pregnancy_records.confirmation_method && (
                          <div>
                            <label className="text-gray-600">Confirmation Method</label>
                            <p className="font-medium capitalize">{event.pregnancy_records.confirmation_method}</p>
                          </div>
                        )}
                        {event.pregnancy_records.veterinarian && (
                          <div>
                            <label className="text-gray-600">Veterinarian</label>
                            <p className="font-medium">{event.pregnancy_records.veterinarian}</p>
                          </div>
                        )}
                        {event.pregnancy_records.pregnancy_notes && (
                          <div className="col-span-2">
                            <label className="text-gray-600">Notes</label>
                            <p className="font-medium">{event.pregnancy_records.pregnancy_notes}</p>
                          </div>
                        )}
                      </>
                    )}

                    {/* Calving */}
                    {event.event_type === 'calving' && event.calving_records && (
                      <>
                        <div>
                          <label className="text-gray-600">Calving Date</label>
                          <p className="font-medium">
                            {event.calving_records.calving_date 
                              ? new Date(event.calving_records.calving_date).toLocaleDateString()
                              : 'N/A'
                            }
                          </p>
                        </div>
                        {event.calving_records.calving_time && (
                          <div>
                            <label className="text-gray-600">Calving Time</label>
                            <p className="font-medium">{event.calving_records.calving_time}</p>
                          </div>
                        )}
                        <div>
                          <label className="text-gray-600">Difficulty</label>
                          <p className="font-medium capitalize">{event.calving_records.calving_difficulty}</p>
                        </div>
                        <div>
                          <label className="text-gray-600">Calf Status</label>
                          <p className="font-medium">{event.calving_records.calf_alive ? '✓ Alive' : '✗ Stillborn'}</p>
                        </div>
                        {event.calving_records.assistance_required && (
                          <div>
                            <label className="text-gray-600">Assistance</label>
                            <p className="font-medium">Required</p>
                          </div>
                        )}
                        {event.calving_records.veterinarian && (
                          <div>
                            <label className="text-gray-600">Veterinarian</label>
                            <p className="font-medium">{event.calving_records.veterinarian}</p>
                          </div>
                        )}
                        {event.calving_records.colostrum_quality && (
                          <div>
                            <label className="text-gray-600">Colostrum Quality</label>
                            <p className="font-medium capitalize">{event.calving_records.colostrum_quality}</p>
                          </div>
                        )}
                        {event.calving_records.colostrum_produced && (
                          <div>
                            <label className="text-gray-600">Colostrum Produced</label>
                            <p className="font-medium">{event.calving_records.colostrum_produced} L</p>
                          </div>
                        )}
                        {event.calving_records.complications && (
                          <div className="col-span-2">
                            <label className="text-gray-600">Complications</label>
                            <p className="font-medium">{event.calving_records.complications}</p>
                          </div>
                        )}
                      </>
                    )}

                    {/* General Notes */}
                    {event.notes && (
                      <div className="col-span-2">
                        <label className="text-gray-600">Notes</label>
                        <p className="font-medium">{event.notes}</p>
                      </div>
                    )}
                  </div>

                  {/* Footer with timestamp */}
                  <div className="text-xs text-gray-500 pt-2 border-t">
                    Created by {event.created_by || 'System'} • {
                      new Date(event.created_at).toLocaleDateString()
                    }
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      )}
    </Card>
  )
}
