// src/components/health/HealthDashboard.tsx (Fully Functional Version)
'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { 
  AlertTriangle, 
  Calendar, 
  Syringe, 
  Heart, 
  TrendingUp,
  Clock,
  Shield,
  Plus
} from 'lucide-react'

// Import the modal components we created
import { ScheduleVisitModal } from '@/components/health/ScheduleVisitModal'
import { AddHealthRecordModal } from '@/components/health/AddHealthRecordModal'
import { VaccinationModal } from '@/components/health/VaccinationModal'

interface HealthDashboardProps {
  farmId: string
  userRole: string
}

export function HealthDashboard({ farmId, userRole }: HealthDashboardProps) {
  const router = useRouter()
  
  // State for health data
  const [healthData, setHealthData] = useState({
    reminders: [],
    withdrawalAlerts: [],
    vaccinationStats: {
      pending: 0,
      overdue: 0,
      completed_this_month: 0
    },
    healthStats: {
      healthy_animals: 0,
      under_treatment: 0,
      quarantined: 0
    }
  })
  
  // Modal state management
  const [modals, setModals] = useState({
    scheduleVisit: false,
    addRecord: false,
    vaccination: false,
  })
  
  // Data state
  const [loading, setLoading] = useState(true)
  const [veterinarians, setVeterinarians] = useState([])
  const [animals, setAnimals] = useState([])
  
  useEffect(() => {
    loadHealthData()
    loadVeterinarians()
    loadAnimals()
  }, [farmId])
  
  const loadHealthData = async () => {
    try {
      const response = await fetch(`/api/health/dashboard?farmId=${farmId}`)
      if (response.ok) {
        const data = await response.json()
        setHealthData(data)
      }
    } catch (error) {
      console.error('Error loading health data:', error)
    } finally {
      setLoading(false)
    }
  }
  
  const loadVeterinarians = async () => {
    try {
      const response = await fetch(`/api/veterinarians?farmId=${farmId}`)
      if (response.ok) {
        const data = await response.json()
        setVeterinarians(data.veterinarians || [])
      }
    } catch (error) {
      console.error('Error loading veterinarians:', error)
    }
  }
  
  const loadAnimals = async () => {
    try {
      const response = await fetch(`/api/animals?farmId=${farmId}`)
      if (response.ok) {
        const data = await response.json()
        setAnimals(data.animals || [])
      }
    } catch (error) {
      console.error('Error loading animals:', error)
    }
  }
  
  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'bg-red-100 text-red-800'
      case 'medium': return 'bg-yellow-100 text-yellow-800'
      case 'low': return 'bg-green-100 text-green-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  // Modal control functions
  const openModal = (modalName: keyof typeof modals) => {
    setModals(prev => ({ ...prev, [modalName]: true }))
  }

  const closeModal = (modalName: keyof typeof modals) => {
    setModals(prev => ({ ...prev, [modalName]: false }))
  }

  // Event handlers for header buttons
  const handleScheduleVisit = () => {
    openModal('scheduleVisit')
  }

  const handleAddRecord = () => {
    openModal('addRecord')
  }

  // Event handlers for task actions
  const handleTaskAction = (reminder: any) => {
    switch (reminder.type) {
      case 'vaccination':
        // Open vaccination modal with pre-filled animal
        openModal('vaccination')
        break
      case 'health_check':
        // Open health record modal with pre-filled animal
        openModal('addRecord')
        break
      case 'follow_up':
        // Navigate to veterinary schedule page
        router.push('/dashboard/health/veterinary')
        break
      default:
        console.log('Task action for:', reminder)
    }
  }

  // Event handlers for quick actions
  const handleQuickAction = (action: string) => {
    switch (action) {
      case 'vaccination':
        openModal('vaccination')
        break
      case 'health_check':
        openModal('addRecord')
        break
      case 'schedule_visit':
        openModal('scheduleVisit')
        break
      case 'report_issue':
        // Navigate to disease management
        router.push('/dashboard/health/diseases')
        break
      default:
        console.log('Quick action:', action)
    }
  }

  // Callback functions for when modals complete actions
  const handleVisitScheduled = (visit: any) => {
    console.log('Visit scheduled:', visit)
    loadHealthData() // Refresh data
    closeModal('scheduleVisit')
  }

  const handleRecordAdded = (record: any) => {
    console.log('Health record added:', record)
    loadHealthData() // Refresh data
    closeModal('addRecord')
  }

  const handleVaccinationCompleted = (vaccination: any) => {
    console.log('Vaccination completed:', vaccination)
    loadHealthData() // Refresh data
    closeModal('vaccination')
  }
  
  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-farm-green mx-auto mb-4"></div>
          <p className="text-gray-600">Loading health dashboard...</p>
        </div>
      </div>
    )
  }
  
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Health Management</h1>
          <p className="text-gray-600 mt-2">
            Monitor and manage your herd's health status
          </p>
        </div>
        {['farm_owner', 'farm_manager'].includes(userRole) && (
          <div className="flex space-x-2">
            <Button variant="outline" onClick={handleScheduleVisit}>
              <Calendar className="mr-2 h-4 w-4" />
              Schedule Visit
            </Button>
            <Button onClick={handleAddRecord}>
              <Plus className="mr-2 h-4 w-4" />
              Add Record
            </Button>
          </div>
        )}
      </div>
      
      {/* Health Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Healthy Animals</CardTitle>
            <Heart className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {healthData.healthStats.healthy_animals}
            </div>
            <p className="text-xs text-muted-foreground">
              No current health issues
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Under Treatment</CardTitle>
            <Syringe className="h-4 w-4 text-yellow-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">
              {healthData.healthStats.under_treatment}
            </div>
            <p className="text-xs text-muted-foreground">
              Receiving medical care
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Quarantined</CardTitle>
            <Shield className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {healthData.healthStats.quarantined}
            </div>
            <p className="text-xs text-muted-foreground">
              Isolated animals
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Vaccinations Due</CardTitle>
            <Calendar className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">
              {healthData.vaccinationStats.pending + healthData.vaccinationStats.overdue}
            </div>
            <p className="text-xs text-muted-foreground">
              {healthData.vaccinationStats.overdue} overdue
            </p>
          </CardContent>
        </Card>
      </div>
      
      {/* Urgent Alerts */}
      {(healthData.reminders.length > 0 || healthData.withdrawalAlerts.length > 0) && (
        <Card className="border-red-200 bg-red-50">
          <CardHeader>
            <CardTitle className="flex items-center text-red-800">
              <AlertTriangle className="mr-2 h-5 w-5" />
              Urgent Health Alerts
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {/* High priority reminders */}
              {healthData.reminders
                .filter((reminder: any) => reminder.priority === 'high')
                .slice(0, 3)
                .map((reminder: any, index: number) => (
                <div key={`reminder-${reminder.animal_id || 'general'}-${index}`} className="flex items-center justify-between p-3 bg-white rounded-lg border">
                  <div className="flex items-center space-x-3">
                    <AlertTriangle className="h-5 w-5 text-red-600" />
                    <div>
                      <h4 className="font-medium text-gray-900">{reminder.title}</h4>
                      <p className="text-sm text-gray-600">{reminder.description}</p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Badge className={getPriorityColor(reminder.priority)}>
                      {reminder.priority}
                    </Badge>
                    <Button size="sm" onClick={() => handleTaskAction(reminder)}>
                      Take Action
                    </Button>
                  </div>
                </div>
              ))}
              
              {/* Withdrawal period alerts */}
              {healthData.withdrawalAlerts.slice(0, 2).map((alert: any, index: number) => (
                <div key={`withdrawal-${alert.animal_id}-${index}`} className="flex items-center justify-between p-3 bg-white rounded-lg border">
                  <div className="flex items-center space-x-3">
                    <Clock className="h-5 w-5 text-yellow-600" />
                    <div>
                      <h4 className="font-medium text-gray-900">
                        Withdrawal Period: {alert.animal_name}
                      </h4>
                      <p className="text-sm text-gray-600">
                        {alert.medication} - {alert.days_remaining} days remaining
                      </p>
                    </div>
                  </div>
                  <Badge variant="outline">
                    {alert.days_remaining}d left
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
      
      {/* Action Items */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Upcoming Tasks</CardTitle>
            <CardDescription>
              Health-related tasks requiring attention
            </CardDescription>
          </CardHeader>
          <CardContent>
            {healthData.reminders.length === 0 ? (
              <div className="text-center py-6">
                <Heart className="mx-auto h-8 w-8 text-green-500 mb-2" />
                <p className="text-green-600 font-medium">All caught up!</p>
                <p className="text-sm text-gray-500">No urgent health tasks</p>
              </div>
            ) : (
              <div className="space-y-3">
                {healthData.reminders.slice(0, 5).map((reminder: any, index: number) => (
                  <div key={`task-${reminder.animal_id || 'general'}-${index}`} className="flex items-center justify-between p-2 hover:bg-gray-50 rounded">
                    <div className="flex-1">
                      <h4 className="font-medium text-sm">{reminder.title}</h4>
                      <p className="text-xs text-gray-600">{reminder.description}</p>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Badge className={getPriorityColor(reminder.priority)}>
                        {reminder.priority}
                      </Badge>
                      <Button size="sm" variant="outline" onClick={() => handleTaskAction(reminder)}>
                        Action
                      </Button>
                    </div>
                  </div>
                ))}
                {healthData.reminders.length > 5 && (
                  <p className="text-sm text-gray-500 text-center">
                    +{healthData.reminders.length - 5} more tasks
                  </p>
                )}
              </div>
            )}
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle>Health Trends</CardTitle>
            <CardDescription>
              Recent health metrics and progress
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <TrendingUp className="h-4 w-4 text-green-600" />
                  <span className="text-sm">Vaccinations This Month</span>
                </div>
                <span className="font-bold text-green-600">
                  {healthData.vaccinationStats.completed_this_month}
                </span>
              </div>
              
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Calendar className="h-4 w-4 text-blue-600" />
                  <span className="text-sm">Pending Vaccinations</span>
                </div>
                <span className="font-bold text-blue-600">
                  {healthData.vaccinationStats.pending}
                </span>
              </div>
              
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <AlertTriangle className="h-4 w-4 text-red-600" />
                  <span className="text-sm">Overdue Items</span>
                </div>
                <span className="font-bold text-red-600">
                  {healthData.vaccinationStats.overdue}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
      
      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
          <CardDescription>
            Common health management tasks
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Button 
              variant="outline" 
              className="h-20 flex-col"
              onClick={() => handleQuickAction('vaccination')}
            >
              <Syringe className="h-6 w-6 mb-2" />
              Record Vaccination
            </Button>
            <Button 
              variant="outline" 
              className="h-20 flex-col"
              onClick={() => handleQuickAction('health_check')}
            >
              <Heart className="h-6 w-6 mb-2" />
              Health Check
            </Button>
            <Button 
              variant="outline" 
              className="h-20 flex-col"
              onClick={() => handleQuickAction('schedule_visit')}
            >
              <Calendar className="h-6 w-6 mb-2" />
              Schedule Visit
            </Button>
            <Button 
              variant="outline" 
              className="h-20 flex-col"
              onClick={() => handleQuickAction('report_issue')}
            >
              <AlertTriangle className="h-6 w-6 mb-2" />
              Report Issue
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Modals */}
      {modals.scheduleVisit && (
        <ScheduleVisitModal
          farmId={farmId}
          veterinarians={veterinarians}
          isOpen={modals.scheduleVisit}
          onClose={() => closeModal('scheduleVisit')}
          onVisitScheduled={handleVisitScheduled}
        />
      )}

      {modals.addRecord && (
        <AddHealthRecordModal
          farmId={farmId}
          animals={animals}
          isOpen={modals.addRecord}
          onClose={() => closeModal('addRecord')}
          onRecordAdded={handleRecordAdded}
        />
      )}

      {modals.vaccination && (
        <VaccinationModal
          farmId={farmId}
          animals={animals}
          isOpen={modals.vaccination}
          onClose={() => closeModal('vaccination')}
          onVaccinationCompleted={handleVaccinationCompleted}
        />
      )}
    </div>
  )
}