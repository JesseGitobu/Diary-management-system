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
import { AddBreedingEventModal } from '@/components/breeding/AddBreedingEventModal'
import { BreedingAlert } from '@/lib/database/breeding-stats'
import { BreedingAlerts } from '@/components/breeding/BreedingAlerts'

interface BreedingDashboardProps {
  userRole: string
  farmId: string
  onActionComplete?: () => void
  breedingStats: {
    totalBreedings: number
    currentPregnant: number
    expectedCalvingsThisMonth: number
    conceptionRate: number
  }
  calendarEvents: any[]
  breedingAlerts: BreedingAlert[]
}

export function BreedingDashboard({
  userRole,
  farmId,
  onActionComplete,
  breedingStats,
  calendarEvents,
  breedingAlerts
}: BreedingDashboardProps) {
  const [selectedView, setSelectedView] = useState<'overview' | 'calendar' | 'pregnant'>('overview')
  // Add state for modal
  const [showBreedingModal, setShowBreedingModal] = useState(false)

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
            <Button asChild variant="primary" onClick={() => setShowBreedingModal(true)}>
              <div>
                <Plus className="mr-2 h-4 w-4" />
                Record Breeding
              </div>
            </Button>
          </div>
        )}
      </div>

      {/* Navigation Tabs */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => setSelectedView('overview')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${selectedView === 'overview'
              ? 'border-dairy-primary text-dairy-primary'
              : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
          >
            Overview
          </button>
          <button
            onClick={() => setSelectedView('calendar')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${selectedView === 'calendar'
              ? 'border-dairy-primary text-dairy-primary'
              : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
          >
            Calendar
          </button>
          <button
            onClick={() => setSelectedView('pregnant')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${selectedView === 'pregnant'
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

            <BreedingAlerts
              alerts={breedingAlerts}
              onActionClick={(alertType) => {
                // Handle alert actions
                if (alertType === 'calving_due') {
                  setSelectedView('pregnant')
                } else if (alertType === 'pregnancy_check_due') {
                  setShowBreedingModal(true)
                }
              }}
            />
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
      <AddBreedingEventModal
        isOpen={showBreedingModal}
        onClose={() => setShowBreedingModal(false)}
        farmId={farmId}
        onEventCreated={() => {
          setShowBreedingModal(false)
          onActionComplete?.()
        }}
      />
    </div>
  )
}