'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Calendar, Plus, Heart, Baby, TrendingUp, Clock, AlertCircle, Syringe, Stethoscope } from 'lucide-react'
import Link from 'next/link'
import { BreedingCalendar } from '@/components/breeding/BreedingCalendar'
import { PregnantAnimalsList } from '@/components/breeding/PregnantAnimalsList'
import { BreedingStatsCards } from '@/components/breeding/BreedingStatsCards'
import { BreedingAlerts } from '@/components/breeding/BreedingAlerts'
// Import individual breeding event forms
import { HeatDetectionForm } from '@/components/breeding/HeatDetectionForm'
import { InseminationForm } from '@/components/breeding/InseminationForm'
import { PregnancyCheckForm } from '@/components/breeding/PregnancyCheckForm'
import { CalvingEventForm } from '@/components/breeding/CalvingEventForm'
import { Modal } from '@/components/ui/Modal'
import type { BreedingAlert } from '@/lib/database/breeding-stats'

interface BreedingDashboardProps {
  userRole: string
  farmId: string
  onActionComplete?: () => void
  breedingStats: {
    totalBreedings: number
    heatDetected: number
    currentPregnant: number
    expectedCalvingsThisMonth: number
    conceptionRate: number
  }
  calendarEvents: any[]
  breedingAlerts: BreedingAlert[]
}

type BreedingEventType = 'heat_detection' | 'insemination' | 'pregnancy_check' | 'calving' | null

export function BreedingDashboard({
  userRole,
  farmId,
  onActionComplete,
  breedingStats,
  calendarEvents,
  breedingAlerts
}: BreedingDashboardProps) {
  const [selectedView, setSelectedView] = useState<'overview' | 'calendar' | 'pregnant'>('overview')
  const [activeModal, setActiveModal] = useState<BreedingEventType>(null)

  const canManageBreeding = ['farm_owner', 'farm_manager'].includes(userRole)

  const handleEventCreated = () => {
    setActiveModal(null)
    onActionComplete?.()
  }

  const handleModalClose = () => {
    setActiveModal(null)
  }

  const renderBreedingModal = () => {
    if (!activeModal) return null

    const commonProps = {
      farmId,
      onEventCreated: handleEventCreated,
      onCancel: handleModalClose
    }

    const modalTitles = {
      heat_detection: 'Record Heat Detection',
      insemination: 'Record Insemination',
      pregnancy_check: 'Record Pregnancy Check',
      calving: 'Record Calving Event'
    }

    return (
      <Modal isOpen={true} onClose={handleModalClose} className="max-w-2xl">
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-gray-900">
              {modalTitles[activeModal]}
            </h2>
            <Button variant="ghost" onClick={handleModalClose} size="sm">
              ✕
            </Button>
          </div>
          
          {activeModal === 'heat_detection' && <HeatDetectionForm {...commonProps} />}
          {activeModal === 'insemination' && <InseminationForm {...commonProps} />}
          {activeModal === 'pregnancy_check' && <PregnancyCheckForm {...commonProps} />}
          {activeModal === 'calving' && <CalvingEventForm {...commonProps} />}
        </div>
      </Modal>
    )
  }

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
            <Button onClick={() => setActiveModal('heat_detection')}>
              <Plus className="mr-2 h-4 w-4" />
              Quick Record
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

          {/* Alerts Section */}
          {breedingAlerts.length > 0 && (
            <BreedingAlerts
              alerts={breedingAlerts}
              onActionClick={(alertType) => {
                if (alertType === 'calving_due') {
                  setSelectedView('pregnant')
                } else if (alertType === 'pregnancy_check_due') {
                  setActiveModal('pregnancy_check')
                }
              }}
            />
          )}

          {/* Upcoming Events & Quick Actions */}
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
                          <Badge variant={event.status === 'scheduled' ? 'default' : 'destructive'}>
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

            {/* Enhanced Quick Actions */}
            <Card>
              <CardHeader>
                <CardTitle>Record Breeding Events</CardTitle>
                <CardDescription>
                  Click to record specific breeding activities
                </CardDescription>
              </CardHeader>
              <CardContent>
                {canManageBreeding ? (
                  <div className="grid grid-cols-2 gap-4">
                    {/* Heat Detection Button */}
                    <Button 
                      onClick={() => setActiveModal('heat_detection')}
                      className="h-20 flex-col space-y-2" 
                      variant="outline"
                    >
                      <Heart className="h-6 w-6 text-pink-500" />
                      <span className="text-sm">Heat Detection</span>
                    </Button>

                    {/* Insemination Button */}
                    <Button 
                      onClick={() => setActiveModal('insemination')}
                      className="h-20 flex-col space-y-2" 
                      variant="outline"
                    >
                      <Syringe className="h-6 w-6 text-blue-500" />
                      <span className="text-sm">Insemination</span>
                    </Button>

                    {/* Pregnancy Check Button */}
                    <Button 
                      onClick={() => setActiveModal('pregnancy_check')}
                      className="h-20 flex-col space-y-2" 
                      variant="outline"
                    >
                      <Stethoscope className="h-6 w-6 text-green-500" />
                      <span className="text-sm">Pregnancy Check</span>
                    </Button>

                    {/* Calving Event Button */}
                    <Button 
                      onClick={() => setActiveModal('calving')}
                      className="h-20 flex-col space-y-2" 
                      variant="outline"
                    >
                      <Baby className="h-6 w-6 text-yellow-500" />
                      <span className="text-sm">Calving Event</span>
                    </Button>
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <AlertCircle className="mx-auto h-8 w-8 text-gray-400" />
                    <p className="mt-2 text-sm text-gray-500">
                      You don't have permission to record breeding events
                    </p>
                  </div>
                )}
                
                {/* Additional Action Buttons */}
                <div className="mt-4 grid grid-cols-2 gap-4">
                  <Button asChild variant="ghost" className="text-sm">
                    <Link href="/dashboard/animals">
                      View All Animals
                    </Link>
                  </Button>
                  
                  <Button asChild variant="ghost" className="text-sm">
                    <Link href="/dashboard/reports">
                      Breeding Reports
                    </Link>
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
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

      {/* Individual Breeding Event Modals */}
      {renderBreedingModal()}
    </div>
  )
}