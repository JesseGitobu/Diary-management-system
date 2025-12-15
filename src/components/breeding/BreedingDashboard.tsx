// src/components/breeding/BreedingDashboard.tsx
'use client'

import { useState, useEffect, useMemo } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { useDeviceInfo } from '@/lib/hooks/useDeviceInfo'
import { cn } from '@/lib/utils/cn'
import {
  Calendar,
  Plus,
  Heart,
  Baby,
  TrendingUp,
  Clock,
  AlertCircle,
  Syringe,
  Stethoscope,
  ChevronDown,
  ChevronUp,
} from 'lucide-react'
import Link from 'next/link'
import { format } from 'date-fns' 
import { BreedingCalendar } from '@/components/breeding/BreedingCalendar'
import { PregnantAnimalsList } from '@/components/breeding/PregnantAnimalsList'
import { BreedingStatsCards } from '@/components/breeding/BreedingStatsCards'
import { BreedingAlerts } from '@/components/breeding/BreedingAlerts'
import { HeatDetectionForm } from '@/components/breeding/HeatDetectionForm'
import { InseminationForm } from '@/components/breeding/InseminationForm'
import { PregnancyCheckForm } from '@/components/breeding/PregnancyCheckForm'
import { CalvingEventForm } from '@/components/breeding/CalvingEventForm'
import { Modal } from '@/components/ui/Modal'
import type { BreedingAlert } from '@/lib/database/breeding-stats'
import { BreedingEventTimeline } from '@/components/breeding/BreedingEventTimeline'

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

// Helper to map alert types to event types
const mapAlertToEvent = (alertType: string): BreedingEventType => {
  switch (alertType) {
    case 'pregnancy_check_due': return 'pregnancy_check'
    case 'calving_due': return 'calving'
    case 'overdue_breeding': return 'insemination'
    default: return null
  }
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
  const [activeModal, setActiveModal] = useState<BreedingEventType>(null)
  const [showQuickActions, setShowQuickActions] = useState(false)
  const [upcomingEventsExpanded, setUpcomingEventsExpanded] = useState(false)
  
  // State to track which animal is currently being acted upon (from Alerts or Lists)
  const [selectedAnimal, setSelectedAnimal] = useState<{ id?: string, gender?: 'male' | 'female' } | null>(null)
  
  // State to optimistically hide events/alerts that have been completed in this session
  const [completedActions, setCompletedActions] = useState<Array<{animalId: string, type: string}>>([])
  
  // Trigger for the timeline to refetch data
  const [timelineUpdateTrigger, setTimelineUpdateTrigger] = useState(0)

  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
    
    const handleMobileNavAction = (event: Event) => {
      const customEvent = event as CustomEvent
      const { action } = customEvent.detail
      const breedingModalMap: Record<string, BreedingEventType> = {
        'showHeatDetectionModal': 'heat_detection',
        'showInseminationModal': 'insemination',
        'showPregnancyCheckModal': 'pregnancy_check',
        'showCalvingEventModal': 'calving'
      }
      if (action in breedingModalMap) {
        // Reset selected animal for global quick actions
        setSelectedAnimal(null)
        setActiveModal(breedingModalMap[action])
      }
    }

    window.addEventListener('mobileNavModalAction', handleMobileNavAction)
    return () => window.removeEventListener('mobileNavModalAction', handleMobileNavAction)
  }, [])

  const { isMobile } = useDeviceInfo()
  const canManageBreeding = ['farm_owner', 'farm_manager'].includes(userRole)

  // Filter out alerts that have been actioned in this session
  const visibleAlerts = useMemo(() => {
    return breedingAlerts.filter(alert => {
      // Check if this specific alert/animal combo has been completed
      const isCompleted = completedActions.some(action => 
        action.animalId === alert.animal_id && 
        (
          (alert.type === 'pregnancy_check_due' && action.type === 'pregnancy_check') ||
          (alert.type === 'calving_due' && action.type === 'calving') ||
          (alert.type === 'overdue_breeding' && action.type === 'insemination')
        )
      )
      return !isCompleted
    })
  }, [breedingAlerts, completedActions])

  // Filter out upcoming events that have been completed
  const visibleCalendarEvents = useMemo(() => {
    return calendarEvents.filter(event => {
      if (event.status === 'completed') return false // Already completed from DB

      const isCompletedNow = completedActions.some(action => 
        action.animalId === event.animal_id && 
        (
          (event.event_type === 'pregnancy_check' && action.type === 'pregnancy_check') ||
          (event.event_type === 'calving' && action.type === 'calving') ||
          (event.event_type === 'insemination' && action.type === 'insemination')
        )
      )
      return !isCompletedNow
    })
  }, [calendarEvents, completedActions])

  // Calculate dynamic stats based on recent actions
  const currentStats = useMemo(() => {
    const calvingsRecorded = completedActions.filter(a => a.type === 'calving').length;
    const heatRecorded = completedActions.filter(a => a.type === 'heat_detection').length;
    const inseminationsRecorded = completedActions.filter(a => a.type === 'insemination').length;
    
    // We assume if a calving is recorded, it was likely "expected this month" if it appeared on the dashboard
    // Use Math.max to prevent negative numbers
    return {
      ...breedingStats,
      totalBreedings: breedingStats.totalBreedings + inseminationsRecorded,
      heatDetected: breedingStats.heatDetected + heatRecorded,
      currentPregnant: Math.max(0, breedingStats.currentPregnant - calvingsRecorded),
      expectedCalvingsThisMonth: Math.max(0, breedingStats.expectedCalvingsThisMonth - calvingsRecorded)
    };
  }, [breedingStats, completedActions]);

  // Identify animals that have just calved so we can hide them from the list
  const completedCalvingIds = useMemo(() => {
    return completedActions
      .filter(a => a.type === 'calving')
      .map(a => a.animalId);
  }, [completedActions]);

  const handleEventCreated = () => {
    // Optimistically update UI
    if (selectedAnimal?.id && activeModal) {
      setCompletedActions(prev => [...prev, { 
        animalId: selectedAnimal.id!, 
        type: activeModal! 
      }])
    }

    // Refresh Timeline
    setTimelineUpdateTrigger(prev => prev + 1)
    
    // Close modal
    setActiveModal(null)
    setSelectedAnimal(null)
    
    // Notify parent to refresh server data
    onActionComplete?.()
  }

  const handleModalClose = () => {
    setActiveModal(null)
    setSelectedAnimal(null)
  }

  const handleAlertAction = (alertType: string, animalId: string) => {
    setSelectedAnimal({ id: animalId, gender: 'female' })
    const modalType = mapAlertToEvent(alertType)
    if (modalType) {
      setActiveModal(modalType)
    } else if (alertType === 'calving_due') {
      setActiveModal('calving') 
    }
  }

  const renderBreedingModal = () => {
    if (!activeModal) return null

    const commonProps = {
      farmId,
      onEventCreated: handleEventCreated,
      onCancel: handleModalClose,
      // Pass the selected animal ID to the form to pre-fill the dropdown
      preSelectedAnimalId: selectedAnimal?.id 
    }

    const modalTitles = {
      heat_detection: 'Record Heat Detection',
      insemination: 'Record Insemination',
      pregnancy_check: 'Record Pregnancy Check',
      calving: 'Record Calving Event'
    }

    return (
      <Modal
        isOpen={true}
        onClose={handleModalClose}
        className={cn(
          isMobile ? "max-w-full h-full m-0 rounded-none" : "max-w-2xl"
        )}
      >
        <div className={cn("p-6", isMobile && "pb-safe")}>
          <div className="flex items-center justify-between mb-6">
            <h2 className={cn(
              "font-bold text-gray-900",
              isMobile ? "text-xl" : "text-2xl"
            )}>
              {modalTitles[activeModal]}
            </h2>
            <Button
              variant="ghost"
              onClick={handleModalClose}
              size={isMobile ? "default" : "sm"}
              className={cn(isMobile && "h-10 w-10")}
            >
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

  const quickActionButtons = [
    {
      key: 'heat_detection',
      icon: Heart,
      label: 'Heat Detection',
      color: 'text-pink-500',
      description: 'Record heat signs'
    },
    {
      key: 'insemination',
      icon: Syringe,
      label: 'Insemination',
      color: 'text-blue-500',
      description: 'Record AI/Natural service'
    },
    {
      key: 'pregnancy_check',
      icon: Stethoscope,
      label: 'Pregnancy Check',
      color: 'text-green-500',
      description: 'Confirm pregnancy'
    },
    {
      key: 'calving',
      icon: Baby,
      label: 'Calving Event',
      color: 'text-yellow-500',
      description: 'Record birth'
    }
  ]

  if (!mounted) return null; 

  return (
    <div className={cn("space-y-6", isMobile ? "pb-20" : "space-y-8")}>
      {/* Header Section */}
      <div className={cn(
        "flex justify-between",
        isMobile ? "flex-col space-y-4" : "items-center"
      )}>
        <div>
          <h1 className={cn(
            "font-bold text-gray-900",
            isMobile ? "text-2xl" : "text-3xl"
          )}>
            Breeding Management
          </h1>
          <p className={cn(
            "text-gray-600 mt-2",
            isMobile ? "text-sm" : ""
          )}>
            Track breeding cycles, pregnancies, and reproductive performance
          </p>
        </div>

        {canManageBreeding && (
          <div className={cn(
            "flex",
            isMobile ? "flex-col space-y-2" : "space-x-3"
          )}>
            {isMobile ? (
              <Button
                onClick={() => setShowQuickActions(!showQuickActions)}
                className="w-full justify-between"
              >
                <span className="flex items-center">
                  <Plus className="mr-2 h-4 w-4" />
                  Quick Record
                </span>
                {showQuickActions ?
                  <ChevronUp className="h-4 w-4" /> :
                  <ChevronDown className="h-4 w-4" />
                }
              </Button>
            ) : (
              <Button onClick={() => {
                setSelectedAnimal(null)
                setActiveModal('heat_detection')
              }}>
                <Plus className="mr-2 h-4 w-4" />
                Quick Record
              </Button>
            )}
          </div>
        )}
      </div>

      {/* Mobile Quick Actions Dropdown */}
      {isMobile && canManageBreeding && showQuickActions && (
        <Card className="border-farm-green/20 bg-farm-green/5 animate-in slide-in-from-top-2">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Quick Record Options</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-3">
              {quickActionButtons.map((action) => {
                const IconComponent = action.icon
                return (
                  <Button
                    key={action.key}
                    onClick={() => {
                      setSelectedAnimal(null)
                      setActiveModal(action.key as BreedingEventType)
                      setShowQuickActions(false)
                    }}
                    variant="outline"
                    className="h-16 flex-col space-y-1 text-xs"
                  >
                    <IconComponent className={cn("h-5 w-5", action.color)} />
                    <span className="font-medium">{action.label}</span>
                  </Button>
                )
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Navigation Tabs */}
      <div className="border-b border-gray-200">
        <nav className={cn(
          "-mb-px flex",
          isMobile ? "overflow-x-auto scrollbar-hide" : "space-x-8"
        )}>
          {[
            { key: 'overview', label: 'Overview' },
            { key: 'calendar', label: 'Calendar' },
            {
              key: 'pregnant',
              label: isMobile
                ? `In-calf (${currentStats.currentPregnant})`
                : `In-calf Animals (${currentStats.currentPregnant})`
            }
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() => setSelectedView(tab.key as any)}
              className={cn(
                "py-3 px-4 border-b-2 font-medium text-sm whitespace-nowrap",
                isMobile ? "flex-shrink-0" : "px-1",
                selectedView === tab.key
                  ? 'border-farm-green text-farm-green'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              )}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Content based on selected view */}
      {selectedView === 'overview' && (
        <div className={cn("space-y-6", !isMobile && "space-y-8")}>
          {/* Stats Cards - Updated to use dynamic stats */}
          <BreedingStatsCards stats={currentStats} />

          {/* Alerts Section (Dynamic) */}
          {visibleAlerts.length > 0 && (
            <BreedingAlerts
              alerts={visibleAlerts}
              onActionClick={handleAlertAction}
            />
          )}

          <div className={cn(
            "grid gap-6",
            isMobile ? "grid-cols-1" : "grid-cols-1 lg:grid-cols-2"
          )}>
            {/* Upcoming Events (Dynamic) */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center space-x-2">
                    <Clock className="h-5 w-5" />
                    <span>Upcoming Events</span>
                  </CardTitle>
                  {isMobile && visibleCalendarEvents.length > 3 && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setUpcomingEventsExpanded(!upcomingEventsExpanded)}
                    >
                      {upcomingEventsExpanded ?
                        <ChevronUp className="h-4 w-4" /> :
                        <ChevronDown className="h-4 w-4" />
                      }
                    </Button>
                  )}
                </div>
                <CardDescription>
                  {isMobile ? 'Next 7 days' : 'Breeding events scheduled for the next 7 days'}
                </CardDescription>
              </CardHeader>
              <CardContent>
                {visibleCalendarEvents.length > 0 ? (
                  <div className="space-y-3">
                    {visibleCalendarEvents
                      .slice(0, isMobile && !upcomingEventsExpanded ? 3 : 5)
                      .map((event) => (
                        <div
                          key={event.id}
                          className={cn(
                            "flex justify-between p-3 bg-gray-50 rounded-lg animate-in fade-in",
                            isMobile ? "flex-col space-y-2" : "items-center"
                          )}
                        >
                          <div className={isMobile ? "" : ""}>
                            <p className="font-medium text-gray-900">
                              {event.animals?.name || event.animals?.tag_number}
                            </p>
                            <p className={cn(
                              "text-gray-600 capitalize",
                              isMobile ? "text-xs" : "text-sm"
                            )}>
                              {event.event_type.replace('_', ' ')}
                            </p>
                          </div>
                          <div className={cn(
                            isMobile ? "flex justify-between items-center" : "text-right"
                          )}>
                            <p className={cn(
                              "font-medium",
                              isMobile ? "text-sm" : "text-sm"
                            )}>
                              {format(new Date(event.scheduled_date), 'MMM dd, yyyy')}
                            </p>
                            <div className="flex gap-2 items-center">
                               <Badge
                                 variant={event.status === 'scheduled' ? 'default' : 'destructive'}
                                 className={isMobile ? "text-xs" : ""}
                               >
                                 {event.status}
                               </Badge>
                               {canManageBreeding && (
                                 <Button 
                                    size="sm" 
                                    variant="ghost" 
                                    className="h-6 w-6 p-0 rounded-full hover:bg-green-100 text-green-700"
                                    onClick={() => {
                                      // Quick action from list
                                      setSelectedAnimal({ id: event.animal_id, gender: 'female' })
                                      setActiveModal(event.event_type as BreedingEventType)
                                    }}
                                 >
                                    <TrendingUp className="w-4 h-4" />
                                 </Button>
                               )}
                            </div>
                          </div>
                        </div>
                      ))}

                    {isMobile && !upcomingEventsExpanded && visibleCalendarEvents.length > 3 && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setUpcomingEventsExpanded(true)}
                        className="w-full text-sm text-gray-600"
                      >
                        Show {visibleCalendarEvents.length - 3} more events
                      </Button>
                    )}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <Calendar className="mx-auto h-8 w-8 text-gray-400" />
                    <p className="mt-2 text-sm text-gray-500">No upcoming events due soon</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Quick Actions - Desktop Only */}
            {!isMobile && (
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
                      {quickActionButtons.map((action) => {
                        const IconComponent = action.icon
                        return (
                          <Button
                            key={action.key}
                            onClick={() => {
                              setSelectedAnimal(null)
                              setActiveModal(action.key as BreedingEventType)
                            }}
                            className="h-20 flex-col space-y-2"
                            variant="outline"
                          >
                            <IconComponent className={cn("h-6 w-6", action.color)} />
                            <span className="text-sm">{action.label}</span>
                          </Button>
                        )
                      })}
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <AlertCircle className="mx-auto h-8 w-8 text-gray-400" />
                      <p className="mt-2 text-sm text-gray-500">
                        You don't have permission to record breeding events
                      </p>
                    </div>
                  )}

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
            )}
          </div>
          <div>
            {/* Breeding Timeline with Refresh Trigger */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Calendar className="h-5 w-5" />
                  <span>Breeding History</span>
                </CardTitle>
                <CardDescription>
                  Timeline of all breeding-related events
                </CardDescription>
              </CardHeader>
              <CardContent>
                <BreedingEventTimeline
                  animalId={selectedAnimal?.id} 
                  animalGender={selectedAnimal?.gender || 'female'}
                  className="mt-4"
                  refreshTrigger={timelineUpdateTrigger}
                />
              </CardContent>
            </Card>
          </div>

        </div>
      )}

      {selectedView === 'calendar' && (
        <div className={cn(isMobile && "pb-4")}>
          <BreedingCalendar
            farmId={farmId}
            events={visibleCalendarEvents} // Use filtered events
            canManage={canManageBreeding}
          />
        </div>
      )}

      {selectedView === 'pregnant' && (
        <div className={cn(isMobile && "pb-4")}>
          <PregnantAnimalsList
            farmId={farmId}
            canManage={canManageBreeding}
            hiddenAnimalIds={completedCalvingIds}
            onRecordCalving={(animalId) => {
              setSelectedAnimal({ id: animalId, gender: 'female' })
              setActiveModal('calving')
            }}
          />
        </div>
      )}

      {/* Individual Breeding Event Modals */}
      {renderBreedingModal()}
    </div>
  )
}