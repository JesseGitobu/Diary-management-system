'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { ChevronLeft, ChevronRight, Calendar, Heart, Baby, Stethoscope } from 'lucide-react'

interface BreedingCalendarProps {
  farmId: string
  events: any[]
  canManage: boolean
}

export function BreedingCalendar({ farmId, events, canManage }: BreedingCalendarProps) {
  const [currentDate, setCurrentDate] = useState(new Date())
  const [calendarEvents, setCalendarEvents] = useState(events)

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
    return calendarEvents.filter(event => 
      event.scheduled_date === dateString
    )
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
      case 'pregnancy_check':
        return 'bg-green-100 text-green-800'
      case 'calving':
        return 'bg-yellow-100 text-yellow-800'
      default:
        return 'bg-blue-100 text-blue-800'
    }
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
              return <div key={index} className="p-2 h-24"></div>
            }
            
            const date = new Date(currentDate.getFullYear(), currentDate.getMonth(), day)
            const eventsForDay = getEventsForDate(date)
            const isToday = 
              date.getDate() === today.getDate() &&
              date.getMonth() === today.getMonth() &&
              date.getFullYear() === today.getFullYear()
            
            return (
              <div
                key={day}
                className={`p-2 h-24 border rounded-lg ${
                  isToday ? 'bg-farm-green/10 border-farm-green' : 'border-gray-200'
                }`}
              >
                <div className={`text-sm font-medium mb-1 ${
                  isToday ? 'text-farm-green' : 'text-gray-900'
                }`}>
                  {day}
                </div>
                <div className="space-y-1">
                  {eventsForDay.slice(0, 2).map((event, eventIndex) => (
                    <div
                      key={eventIndex}
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
              </div>
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
    </Card>
  )
}