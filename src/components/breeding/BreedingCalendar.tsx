'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight, Plus } from 'lucide-react'
import { addMonths, subMonths, format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, isSameMonth } from 'date-fns'

interface BreedingCalendarProps {
  farmId: string
  events: any[]
  canManage: boolean
}

export function BreedingCalendar({ farmId, events, canManage }: BreedingCalendarProps) {
  const [currentMonth, setCurrentMonth] = useState(new Date())
  
  const monthStart = startOfMonth(currentMonth)
  const monthEnd = endOfMonth(currentMonth)
  const monthDays = eachDayOfInterval({ start: monthStart, end: monthEnd })
  
  const getEventsForDate = (date: Date) => {
    return events.filter(event => 
      isSameDay(new Date(event.scheduled_date), date)
    )
  }
  
  const getEventTypeColor = (eventType: string) => {
    switch (eventType) {
      case 'heat_expected': return 'bg-pink-100 text-pink-800'
      case 'breeding_planned': return 'bg-red-100 text-red-800'
      case 'pregnancy_check': return 'bg-blue-100 text-blue-800'
      case 'calving_expected': return 'bg-green-100 text-green-800'
      case 'dry_off': return 'bg-gray-100 text-gray-800'
      case 'rebreeding': return 'bg-purple-100 text-purple-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }
  
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center space-x-2">
              <CalendarIcon className="h-5 w-5" />
              <span>Breeding Calendar</span>
            </CardTitle>
            <CardDescription>
              {format(currentMonth, 'MMMM yyyy')} breeding schedule
            </CardDescription>
          </div>
          
          <div className="flex items-center space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentMonth(new Date())}
            >
              Today
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
            
            {canManage && (
              <Button size="sm">
                <Plus className="h-4 w-4 mr-1" />
                Add Event
              </Button>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {/* Calendar Grid */}
        <div className="grid grid-cols-7 gap-1 mb-4">
          {/* Day headers */}
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
            <div key={day} className="p-2 text-center text-sm font-medium text-gray-500">
              {day}
            </div>
          ))}
          
          {/* Calendar days */}
          {monthDays.map(day => {
            const dayEvents = getEventsForDate(day)
            const isToday = isSameDay(day, new Date())
            
            return (
              <div
                key={day.toString()}
                className={`min-h-[100px] p-2 border border-gray-100 ${
                  !isSameMonth(day, currentMonth) ? 'text-gray-300 bg-gray-50' : ''
                } ${isToday ? 'bg-blue-50 border-blue-200' : ''}`}
              >
                <div className={`text-sm font-medium mb-1 ${
                  isToday ? 'text-blue-600' : 'text-gray-900'
                }`}>
                  {format(day, 'd')}
                </div>
                
                <div className="space-y-1">
                  {dayEvents.slice(0, 3).map(event => (
                    <div
                      key={event.id}
                      className={`text-xs p-1 rounded truncate ${getEventTypeColor(event.event_type)}`}
                      title={`${event.animals?.name || event.animals?.tag_number} - ${event.event_type.replace('_', ' ')}`}
                    >
                      {event.animals?.tag_number}
                    </div>
                  ))}
                  
                  {dayEvents.length > 3 && (
                    <div className="text-xs text-gray-500">
                      +{dayEvents.length - 3} more
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
        
        {/* Event Legend */}
        <div className="flex flex-wrap gap-2 mt-4 pt-4 border-t">
          <Badge className="bg-pink-100 text-pink-800">Heat Expected</Badge>
          <Badge className="bg-red-100 text-red-800">Breeding Planned</Badge>
          <Badge className="bg-blue-100 text-blue-800">Pregnancy Check</Badge>
          <Badge className="bg-green-100 text-green-800">Calving Expected</Badge>
          <Badge className="bg-gray-100 text-gray-800">Dry Off</Badge>
          <Badge className="bg-purple-100 text-purple-800">Rebreeding</Badge>
        </div>
      </CardContent>
    </Card>
  )
}