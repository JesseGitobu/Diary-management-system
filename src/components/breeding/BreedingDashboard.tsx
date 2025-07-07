'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Calendar, Plus, Heart, Baby, TrendingUp, Clock, AlertCircle } from 'lucide-react'
import Link from 'next/link'
import { BreedingCalendar } from '@/components/breeding/BreedingCalendar'
import { PregnantAnimalsList } from '@/components/breeding/PregnantAnimalsList'
import { BreedingStatsCards } from '@/components/breeding/BreedingStatsCards'

interface BreedingDashboardProps {
  userRole: string
  farmId: string
  breedingStats: {
    totalBreedings: number
    currentPregnant: number
    expectedCalvingsThisMonth: number
    conceptionRate: number
  }
  calendarEvents: any[]
}

export function BreedingDashboard({
  userRole,
  farmId,
  breedingStats,
  calendarEvents
}: BreedingDashboardProps) {
  const [selectedView, setSelectedView] = useState<'overview' | 'calendar' | 'pregnant'>('overview')
  
  const canManageBreeding = ['farm_owner', 'farm_manager'].includes(userRole)
  
  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Breeding Management</h1>
          <p className="text-gray-600 mt-2">
            Track breeding cycles, pregnancies, and reproductive performance
          </p>
        </div>
        
        {canManageBreeding && (
          <div className="flex space-x-3">
            <Button asChild variant="outline">
              <Link href="/dashboard/breeding/calendar">
                <Calendar className="mr-2 h-4 w-4" />
                Breeding Calendar
              </Link>
            </Button>
            <Button asChild>
              <Link href="/dashboard/breeding/record">
                <Plus className="mr-2 h-4 w-4" />
                Record Breeding
              </Link>
            </Button>
          </div>
        )}
      </div>
      
      {/* Navigation Tabs */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => setSelectedView('overview')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              selectedView === 'overview'
                ? 'border-farm-green text-farm-green'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Overview
          </button>
          <button
            onClick={() => setSelectedView('calendar')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              selectedView === 'calendar'
                ? 'border-farm-green text-farm-green'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Calendar
          </button>
          <button
            onClick={() => setSelectedView('pregnant')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              selectedView === 'pregnant'
                ? 'border-farm-green text-farm-green'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Pregnant Animals ({breedingStats.currentPregnant})
          </button>
        </nav>
      </div>
      
      {/* Content based on selected view */}
      {selectedView === 'overview' && (
        <div className="space-y-8">
          {/* Stats Cards */}
          <BreedingStatsCards stats={breedingStats} />
          
          {/* Upcoming Events */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Clock className="h-5 w-5" />
                  <span>Upcoming Events</span>
                </CardTitle>
                <CardDescription>
                  Breeding events scheduled for the next 7 days
                </CardDescription>
              </CardHeader>
              <CardContent>
                {calendarEvents.slice(0, 5).length > 0 ? (
                  <div className="space-y-3">
                    {calendarEvents.slice(0, 5).map((event) => (
                      <div key={event.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <div>
                          <p className="font-medium text-gray-900">
                            {event.animals?.name || event.animals?.tag_number}
                          </p>
                          <p className="text-sm text-gray-600 capitalize">
                            {event.event_type.replace('_', ' ')}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-medium">
                            {new Date(event.scheduled_date).toLocaleDateString()}
                          </p>
                          <Badge variant={event.status === 'scheduled' ? 'default' : 'secondary'}>
                            {event.status}
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <Calendar className="mx-auto h-8 w-8 text-gray-400" />
                    <p className="mt-2 text-sm text-gray-500">No upcoming events</p>
                  </div>
                )}
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <AlertCircle className="h-5 w-5" />
                  <span>Breeding Alerts</span>
                </CardTitle>
                <CardDescription>
                  Animals requiring attention
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {breedingStats.expectedCalvingsThisMonth > 0 && (
                    <div className="flex items-center justify-between p-3 bg-yellow-50 rounded-lg border border-yellow-200">
                      <div className="flex items-center space-x-3">
                        <Baby className="h-5 w-5 text-yellow-600" />
                        <div>
                          <p className="font-medium text-yellow-800">
                            Calvings Expected This Month
                          </p>
                          <p className="text-sm text-yellow-700">
                            {breedingStats.expectedCalvingsThisMonth} animals due to calve
                          </p>
                        </div>
                      </div>
                      <Badge variant="outline" className="bg-yellow-100 text-yellow-800">
                        {breedingStats.expectedCalvingsThisMonth}
                      </Badge>
                    </div>
                  )}
                  
                  {breedingStats.conceptionRate < 50 && breedingStats.totalBreedings > 5 && (
                    <div className="flex items-center justify-between p-3 bg-red-50 rounded-lg border border-red-200">
                      <div className="flex items-center space-x-3">
                        <TrendingUp className="h-5 w-5 text-red-600" />
                        <div>
                          <p className="font-medium text-red-800">
                            Low Conception Rate
                          </p>
                          <p className="text-sm text-red-700">
                            Current rate: {breedingStats.conceptionRate}%
                          </p>
                        </div>
                      </div>
                      <Badge variant="outline" className="bg-red-100 text-red-800">
                        Action Needed
                      </Badge>
                    </div>
                  )}
                  
                  {breedingStats.currentPregnant === 0 && breedingStats.totalBreedings === 0 && (
                    <div className="text-center py-8">
                      <Heart className="mx-auto h-8 w-8 text-gray-400" />
                      <p className="mt-2 text-sm text-gray-500">
                        Start tracking breeding to see alerts here
                      </p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
          
          {/* Quick Actions */}
          <Card>
            <CardHeader>
              <CardTitle>Quick Actions</CardTitle>
              <CardDescription>
                Common breeding management tasks
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {canManageBreeding && (
                  <>
                    <Button asChild className="h-20 flex-col space-y-2" variant="outline">
                      <Link href="/dashboard/breeding/record">
                        <Heart className="h-6 w-6" />
                        <span>Record Breeding</span>
                      </Link>
                    </Button>
                    
                    <Button asChild className="h-20 flex-col space-y-2" variant="outline">
                      <Link href="/dashboard/breeding/pregnancy-check">
                        <Baby className="h-6 w-6" />
                        <span>Pregnancy Check</span>
                      </Link>
                    </Button>
                    
                    <Button asChild className="h-20 flex-col space-y-2" variant="outline">
                      <Link href="/dashboard/breeding/calving">
                        <Plus className="h-6 w-6" />
                        <span>Record Calving</span>
                      </Link>
                    </Button>
                  </>
                )}
                
                <Button asChild className="h-20 flex-col space-y-2" variant="outline">
                  <Link href="/dashboard/breeding/reports">
                    <TrendingUp className="h-6 w-6" />
                    <span>Breeding Reports</span>
                  </Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
      
      {selectedView === 'calendar' && (
        <BreedingCalendar 
          farmId={farmId} 
          events={calendarEvents}
          canManage={canManageBreeding}
        />
      )}
      
      {selectedView === 'pregnant' && (
        <PregnantAnimalsList 
          farmId={farmId}
          canManage={canManageBreeding}
        />
      )}
    </div>
  )
}