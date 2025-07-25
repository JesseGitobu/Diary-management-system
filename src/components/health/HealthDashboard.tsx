// Enhanced HealthRecordsContent.tsx with Multiple Tabs
// src/components/health/HealthRecordsContent.tsx

'use client'

import { useState, useMemo, useEffect } from 'react'
import { toast } from 'react-hot-toast'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Input } from '@/components/ui/Input'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/Tabs'

// Existing modals
import { AddHealthRecordModal } from '@/components/health/AddHealthRecordModal'
import { HealthRecordCard } from '@/components/health/HealthRecordCard'
import { UpcomingTasksCard } from '@/components/health/UpcomingTasksCard'

// All health management modals
import { AddProtocolModal } from '@/components/health/AddProtocolModal'
import { CreateOutbreakModal } from '@/components/health/CreateOutbreakModal'
import { VaccinationModal } from '@/components/health/VaccinationModal'
import { ScheduleVisitModal } from '@/components/health/ScheduleVisitModal'
import { AddVeterinarianModal } from '@/components/health/AddVeterinarianModal'

// New tab-specific components
import { VeterinarianCard } from '@/components/health/VeterinarianCard'
import { ProtocolCard } from '@/components/health/ProtocolCard'
import { OutbreakCard } from '@/components/health/OutbreakCard'
import { VaccinationCard } from '@/components/health/VaccinationCard'
import { VetVisitCard } from '@/components/health/VetVisitCard'

import {
  Plus,
  Search,
  Filter,
  Calendar,
  Activity,
  AlertTriangle,
  TrendingUp,
  Stethoscope,
  Clock,
  Shield,
  Syringe,
  FileText,
  Users,
  Bell,
  ChevronDown,
  UserPlus,
  // Tab icons
  ClipboardList,
  UserCheck,
  BookOpen,
  Zap,
  CalendarCheck
} from 'lucide-react'

interface HealthRecordsContentProps {
  user: any
  userRole: any
  animals: any[]
  healthRecords: any[]
  healthStats: any
  upcomingTasks: any[]
  veterinarians?: any[]
  protocols?: any[]
  outbreaks?: any[]
  vaccinations?: any[]
  vetVisits?: any[]
}

export function HealthRecordsContent({
  user,
  userRole,
  animals = [],
  healthRecords: initialHealthRecords = [],
  healthStats = {},
  upcomingTasks = [],
  veterinarians: initialVeterinarians = [],
  protocols: initialProtocols = [],
  outbreaks: initialOutbreaks = [],
  vaccinations: initialVaccinations = [],
  vetVisits: initialVetVisits = []
}: HealthRecordsContentProps) {
  // State management for all data types
  const [healthRecords, setHealthRecords] = useState(
    Array.isArray(initialHealthRecords) ? initialHealthRecords : []
  )
  const [veterinarians, setVeterinarians] = useState(
    Array.isArray(initialVeterinarians) ? initialVeterinarians : []
  )
  const [protocols, setProtocols] = useState(
    Array.isArray(initialProtocols) ? initialProtocols : []
  )
  const [outbreaks, setOutbreaks] = useState(
    Array.isArray(initialOutbreaks) ? initialOutbreaks : []
  )
  const [vaccinations, setVaccinations] = useState(
    Array.isArray(initialVaccinations) ? initialVaccinations : []
  )
  const [vetVisits, setVetVisits] = useState(
    Array.isArray(initialVetVisits) ? initialVetVisits : []
  )
  
  const [loading, setLoading] = useState(false)

  // Modal states
  const [showAddModal, setShowAddModal] = useState(false)
  const [showProtocolModal, setShowProtocolModal] = useState(false)
  const [showOutbreakModal, setShowOutbreakModal] = useState(false)
  const [showVaccinationModal, setShowVaccinationModal] = useState(false)
  const [showScheduleVisitModal, setShowScheduleVisitModal] = useState(false)
  const [showVeterinarianModal, setShowVeterinarianModal] = useState(false)

  // Form states
  const [selectedAnimalId, setSelectedAnimalId] = useState('')
  const [activeTab, setActiveTab] = useState('health-records')

  // Search states for each tab
  const [searchTerms, setSearchTerms] = useState({
    'health-records': '',
    'veterinarians': '',
    'protocols': '',
    'outbreaks': '',
    'vaccinations': '',
    'vet-visits': ''
  })

  // Filter states
  const [selectedRecordType, setSelectedRecordType] = useState('')
  const [selectedAnimalFilter, setSelectedAnimalFilter] = useState('')

  // Permission checks
  const canAddRecords = userRole?.role_type && 
    ['farm_owner', 'farm_manager', 'worker'].includes(userRole.role_type)
  const canManageProtocols = userRole?.role_type && 
    ['farm_owner', 'farm_manager'].includes(userRole.role_type)

  // Safe health stats with defaults
  const safeHealthStats = {
    totalRecords: healthStats?.totalRecords || 0,
    upcomingTasks: healthStats?.upcomingTasks || 0,
    overdueCount: healthStats?.overdueCount || 0,
    totalVeterinarians: veterinarians.length,
    totalProtocols: protocols.length,
    activeOutbreaks: outbreaks.filter(o => o.status === 'active').length,
    totalVaccinations: vaccinations.length,
    upcomingVisits: vetVisits.filter(v => new Date(v.scheduled_datetime) > new Date()).length,
    ...healthStats
  }

  // Filtered data for each tab
  const filteredHealthRecords = useMemo(() => {
    if (!Array.isArray(healthRecords)) return []
    
    let filtered = [...healthRecords]
    const searchTerm = searchTerms['health-records'].toLowerCase()

    if (searchTerm) {
      filtered = filtered.filter(record => {
        if (!record) return false
        return (
          (record.description && record.description.toLowerCase().includes(searchTerm)) ||
          (record.veterinarian && record.veterinarian.toLowerCase().includes(searchTerm)) ||
          (record.animals?.name && record.animals.name.toLowerCase().includes(searchTerm)) ||
          (record.animals?.tag_number && record.animals.tag_number.toLowerCase().includes(searchTerm))
        )
      })
    }

    if (selectedRecordType) {
      filtered = filtered.filter(record => record && record.record_type === selectedRecordType)
    }

    if (selectedAnimalFilter) {
      filtered = filtered.filter(record => record && record.animal_id === selectedAnimalFilter)
    }

    return filtered
  }, [healthRecords, searchTerms, selectedRecordType, selectedAnimalFilter])

  const filteredVeterinarians = useMemo(() => {
    if (!Array.isArray(veterinarians)) return []
    
    const searchTerm = searchTerms['veterinarians'].toLowerCase()
    if (!searchTerm) return veterinarians

    return veterinarians.filter(vet => {
      if (!vet) return false
      return (
        (vet.name && vet.name.toLowerCase().includes(searchTerm)) ||
        (vet.clinic_name && vet.clinic_name.toLowerCase().includes(searchTerm)) ||
        (vet.specialization && vet.specialization.toLowerCase().includes(searchTerm))
      )
    })
  }, [veterinarians, searchTerms])

  const filteredProtocols = useMemo(() => {
    if (!Array.isArray(protocols)) return []
    
    const searchTerm = searchTerms['protocols'].toLowerCase()
    if (!searchTerm) return protocols

    return protocols.filter(protocol => {
      if (!protocol) return false
      return (
        (protocol.name && protocol.name.toLowerCase().includes(searchTerm)) ||
        (protocol.description && protocol.description.toLowerCase().includes(searchTerm)) ||
        (protocol.category && protocol.category.toLowerCase().includes(searchTerm))
      )
    })
  }, [protocols, searchTerms])

  const filteredOutbreaks = useMemo(() => {
    if (!Array.isArray(outbreaks)) return []
    
    const searchTerm = searchTerms['outbreaks'].toLowerCase()
    if (!searchTerm) return outbreaks

    return outbreaks.filter(outbreak => {
      if (!outbreak) return false
      return (
        (outbreak.outbreak_name && outbreak.outbreak_name.toLowerCase().includes(searchTerm)) ||
        (outbreak.disease_type && outbreak.disease_type.toLowerCase().includes(searchTerm)) ||
        (outbreak.veterinarian && outbreak.veterinarian.toLowerCase().includes(searchTerm))
      )
    })
  }, [outbreaks, searchTerms])

  const filteredVaccinations = useMemo(() => {
    if (!Array.isArray(vaccinations)) return []
    
    const searchTerm = searchTerms['vaccinations'].toLowerCase()
    if (!searchTerm) return vaccinations

    return vaccinations.filter(vaccination => {
      if (!vaccination) return false
      return (
        (vaccination.vaccine_name && vaccination.vaccine_name.toLowerCase().includes(searchTerm)) ||
        (vaccination.batch_number && vaccination.batch_number.toLowerCase().includes(searchTerm)) ||
        (vaccination.veterinarian && vaccination.veterinarian.toLowerCase().includes(searchTerm))
      )
    })
  }, [vaccinations, searchTerms])

  const filteredVetVisits = useMemo(() => {
    if (!Array.isArray(vetVisits)) return []
    
    const searchTerm = searchTerms['vet-visits'].toLowerCase()
    if (!searchTerm) return vetVisits

    return vetVisits.filter(visit => {
      if (!visit) return false
      return (
        (visit.veterinarian_name && visit.veterinarian_name.toLowerCase().includes(searchTerm)) ||
        (visit.purpose && visit.purpose.toLowerCase().includes(searchTerm)) ||
        (visit.notes && visit.notes.toLowerCase().includes(searchTerm))
      )
    })
  }, [vetVisits, searchTerms])

  // Tab configuration
  const tabs = [
    {
      id: 'health-records',
      label: 'Health Records',
      icon: ClipboardList,
      count: filteredHealthRecords.length,
      color: 'text-blue-600'
    },
    {
      id: 'veterinarians',
      label: 'Veterinarians',
      icon: UserCheck,
      count: filteredVeterinarians.length,
      color: 'text-indigo-600'
    },
    {
      id: 'protocols',
      label: 'Protocols',
      icon: BookOpen,
      count: filteredProtocols.length,
      color: 'text-purple-600'
    },
    {
      id: 'outbreaks',
      label: 'Outbreaks',
      icon: Zap,
      count: filteredOutbreaks.length,
      color: 'text-red-600'
    },
    {
      id: 'vaccinations',
      label: 'Vaccinations',
      icon: Syringe,
      count: filteredVaccinations.length,
      color: 'text-green-600'
    },
    {
      id: 'vet-visits',
      label: 'Vet Visits',
      icon: CalendarCheck,
      count: filteredVetVisits.length,
      color: 'text-orange-600'
    }
  ]

  // Enhanced modal callbacks
  const handleRecordAdded = async (newRecord: any) => {
    if (newRecord) {
      setHealthRecords(prev => [newRecord, ...prev])
    }
    setShowAddModal(false)
    toast.success('Health record added successfully!')
    await refreshHealthData()
  }

  const handleProtocolAdded = async (newProtocol: any) => {
    if (newProtocol) {
      setProtocols(prev => [newProtocol, ...prev])
    }
    setShowProtocolModal(false)
    toast.success('Health protocol created successfully!')
    await refreshHealthData()
  }

  const handleOutbreakCreated = async (newOutbreak: any) => {
    if (newOutbreak) {
      setOutbreaks(prev => [newOutbreak, ...prev])
    }
    setShowOutbreakModal(false)
    toast.success('Disease outbreak reported successfully!')

    if (newOutbreak) {
      await createOutbreakHealthRecords(newOutbreak)
    }
    await refreshHealthData()
  }

  const handleVaccinationScheduled = async (vaccination: any) => {
    if (vaccination) {
      setVaccinations(prev => [vaccination, ...prev])
    }
    setShowVaccinationModal(false)
    toast.success('Vaccination recorded successfully!')

    if (vaccination) {
      await createVaccinationHealthRecords(vaccination)
    }
    await refreshHealthData()
  }

  const handleVisitScheduled = async (visit: any) => {
    if (visit) {
      setVetVisits(prev => [visit, ...prev])
    }
    setShowScheduleVisitModal(false)
    toast.success('Veterinary visit scheduled successfully!')

    if (visit?.send_reminder) {
      await createVisitReminder(visit)
    }
    await refreshHealthData()
  }

  const handleVeterinarianAdded = async (newVeterinarian: any) => {
    if (newVeterinarian) {
      setVeterinarians(prev => [newVeterinarian, ...prev])
    }
    setShowVeterinarianModal(false)
    toast.success('Veterinarian added successfully!')
    await refreshVeterinariansData()
  }

  // Data refresh functions
  const refreshHealthData = async () => {
    setLoading(true)
    try {
      const response = await fetch('/api/health/records')
      if (response.ok) {
        const data = await response.json()
        setHealthRecords(Array.isArray(data.healthRecords) ? data.healthRecords : [])
      }
    } catch (error) {
      console.error('Error refreshing health data:', error)
      toast.error('Failed to refresh data')
    } finally {
      setLoading(false)
    }
  }

  const refreshVeterinariansData = async () => {
    try {
      const response = await fetch('/api/health/veterinarians')
      if (response.ok) {
        const data = await response.json()
        setVeterinarians(Array.isArray(data.veterinarians) ? data.veterinarians : [])
      }
    } catch (error) {
      console.error('Error refreshing veterinarians data:', error)
    }
  }

  // Helper functions
  const createVisitReminder = async (visit: any) => {
    try {
      console.log(`Creating reminder for visit: ${visit?.id}`)
      if (visit?.send_reminder && visit?.reminder_days_before) {
        const reminderDate = new Date(visit.scheduled_datetime)
        reminderDate.setDate(reminderDate.getDate() - visit.reminder_days_before)
        console.log(`Reminder set for: ${reminderDate.toLocaleDateString()}`)
      }
    } catch (error) {
      console.error('Error creating visit reminder:', error)
    }
  }

  const createOutbreakHealthRecords = async (outbreak: any) => {
    if (!outbreak?.affected_animals || !Array.isArray(outbreak.affected_animals)) {
      return
    }

    const records = outbreak.affected_animals.map((animalId: string) => ({
      animal_id: animalId,
      record_type: 'illness',
      record_date: outbreak.first_detected_date,
      description: `Disease outbreak: ${outbreak.disease_type}`,
      symptoms: outbreak.symptoms,
      treatment: outbreak.treatment_protocol,
      veterinarian: outbreak.veterinarian,
      notes: `Part of outbreak: ${outbreak.outbreak_name}`,
    }))

    for (const record of records) {
      try {
        await fetch('/api/health/records', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(record)
        })
      } catch (error) {
        console.error('Error creating outbreak health record:', error)
      }
    }
  }

  const createVaccinationHealthRecords = async (vaccination: any) => {
    if (!vaccination?.selected_animals || !Array.isArray(vaccination.selected_animals)) {
      return
    }

    const records = vaccination.selected_animals.map((animalId: string) => ({
      animal_id: animalId,
      record_type: 'vaccination',
      record_date: vaccination.vaccination_date,
      description: `Vaccination: ${vaccination.vaccine_name}`,
      treatment: `${vaccination.dosage} via ${vaccination.route_of_administration}`,
      veterinarian: vaccination.veterinarian,
      cost: vaccination.cost_per_dose,
      notes: vaccination.notes,
    }))

    for (const record of records) {
      try {
        await fetch('/api/health/records', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(record)
        })
      } catch (error) {
        console.error('Error creating vaccination health record:', error)
      }
    }
  }

  const handleQuickAddForAnimal = (animalId: string) => {
    setSelectedAnimalId(animalId)
    setShowAddModal(true)
  }

  const updateSearchTerm = (tab: string, term: string) => {
    setSearchTerms(prev => ({
      ...prev,
      [tab]: term
    }))
  }

  const recordTypes = [
    { value: '', label: 'All Types' },
    { value: 'vaccination', label: '💉 Vaccination' },
    { value: 'treatment', label: '💊 Treatment' },
    { value: 'checkup', label: '🩺 Checkup' },
    { value: 'injury', label: '🩹 Injury' },
    { value: 'illness', label: '🤒 Illness' }
  ]

  return (
    <div className="space-y-6">
      {/* Header with Enhanced Actions */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 flex items-center space-x-3">
            <Stethoscope className="w-8 h-8 text-farm-green" />
            <span>Health Management</span>
          </h1>
          <p className="text-gray-600 mt-2">
            Comprehensive health tracking, protocols, and veterinary care management
          </p>
        </div>

        {/* Enhanced Action Buttons */}
        <div className="flex items-center space-x-3">
          {/* Quick Actions Dropdown */}
          <div className="relative group">
            <Button variant="outline" className="flex items-center space-x-2">
              <Plus className="w-4 h-4" />
              <span>Quick Actions</span>
              <ChevronDown className="w-4 h-4" />
            </Button>

            <div className="absolute right-0 mt-2 w-56 bg-white border border-gray-200 rounded-lg shadow-lg z-50 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200">
              <div className="py-2">
                {canAddRecords && (
                  <>
                    <button
                      onClick={() => setShowVaccinationModal(true)}
                      className="w-full px-4 py-2 text-left hover:bg-gray-50 flex items-center space-x-3"
                    >
                      <Syringe className="w-4 h-4 text-green-600" />
                      <span>Schedule Vaccination</span>
                    </button>

                    <button
                      onClick={() => setShowScheduleVisitModal(true)}
                      className="w-full px-4 py-2 text-left hover:bg-gray-50 flex items-center space-x-3"
                    >
                      <Calendar className="w-4 h-4 text-blue-600" />
                      <span>Schedule Vet Visit</span>
                    </button>

                    <button
                      onClick={() => setShowVeterinarianModal(true)}
                      className="w-full px-4 py-2 text-left hover:bg-gray-50 flex items-center space-x-3"
                    >
                      <UserPlus className="w-4 h-4 text-indigo-600" />
                      <span>Add Veterinarian</span>
                    </button>
                  </>
                )}

                {canManageProtocols && (
                  <>
                    <button
                      onClick={() => setShowProtocolModal(true)}
                      className="w-full px-4 py-2 text-left hover:bg-gray-50 flex items-center space-x-3"
                    >
                      <FileText className="w-4 h-4 text-purple-600" />
                      <span>Create Protocol</span>
                    </button>

                    <button
                      onClick={() => setShowOutbreakModal(true)}
                      className="w-full px-4 py-2 text-left hover:bg-gray-50 flex items-center space-x-3"
                    >
                      <AlertTriangle className="w-4 h-4 text-red-600" />
                      <span>Report Outbreak</span>
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Primary Add Button */}
          {canAddRecords && (
            <Button onClick={() => setShowAddModal(true)} size="lg">
              <Plus className="mr-2 h-5 w-5" />
              Add Health Record
            </Button>
          )}
        </div>
      </div>

      {/* Enhanced Health Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Records</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-xl font-bold">{safeHealthStats.totalRecords}</div>
            <p className="text-xs text-muted-foreground">Health events</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Veterinarians</CardTitle>
            <Stethoscope className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-xl font-bold text-indigo-600">{safeHealthStats.totalVeterinarians}</div>
            <p className="text-xs text-muted-foreground">Registered</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Protocols</CardTitle>
            <BookOpen className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-xl font-bold text-purple-600">{safeHealthStats.totalProtocols}</div>
            <p className="text-xs text-muted-foreground">Active</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Outbreaks</CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-xl font-bold text-red-600">{safeHealthStats.activeOutbreaks}</div>
            <p className="text-xs text-muted-foreground">Active</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Vaccinations</CardTitle>
            <Syringe className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-xl font-bold text-green-600">{safeHealthStats.totalVaccinations}</div>
            <p className="text-xs text-muted-foreground">Recorded</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Upcoming</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-xl font-bold text-blue-600">{safeHealthStats.upcomingTasks}</div>
            <p className="text-xs text-muted-foreground">Tasks</p>
          </CardContent>
        </Card>
      </div>

      {/* Upcoming Tasks Section */}
      {Array.isArray(upcomingTasks) && upcomingTasks.length > 0 && (
        <UpcomingTasksCard
          tasks={upcomingTasks}
          onQuickAdd={handleQuickAddForAnimal}
        />
      )}

      {/* Enhanced Tabbed Content Section */}
      <Card>
        <CardHeader>
          <CardTitle>Health Management Records</CardTitle>
          <CardDescription>
            Comprehensive view of all health-related records and data
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-6 mb-6">
              {tabs.map((tab) => {
                const Icon = tab.icon
                return (
                  <TabsTrigger 
                    key={tab.id} 
                    value={tab.id}
                    className="flex items-center space-x-2"
                  >
                    <Icon className={`w-4 h-4 ${tab.color}`} />
                    <span className="hidden sm:inline">{tab.label}</span>
                    <Badge variant="secondary" className="ml-1">
                      {tab.count}
                    </Badge>
                  </TabsTrigger>
                )
              })}
            </TabsList>

            {/* Health Records Tab */}
            <TabsContent value="health-records" className="space-y-4">
              {/* Search and Filters for Health Records */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <Input
                    placeholder="Search health records..."
                    value={searchTerms['health-records']}
                    onChange={(e) => updateSearchTerm('health-records', e.target.value)}
                    className="pl-10"
                  />
                </div>

                <select
                  value={selectedRecordType}
                  onChange={(e) => setSelectedRecordType(e.target.value)}
                  className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-farm-green focus:border-transparent"
                >
                  {recordTypes.map(type => (
                    <option key={type.value} value={type.value}>
                      {type.label}
                    </option>
                  ))}
                </select>

                <select
                  value={selectedAnimalFilter}
                  onChange={(e) => setSelectedAnimalFilter(e.target.value)}
                  className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-farm-green focus:border-transparent"
                >
                  <option value="">All Animals</option>
                  {Array.isArray(animals) && animals.map(animal => (
                    <option key={animal.id} value={animal.id}>
                      {animal.name || `Animal ${animal.tag_number}`} (#{animal.tag_number})
                    </option>
                  ))}
                </select>

                <Button
                  variant="outline"
                  onClick={() => {
                    updateSearchTerm('health-records', '')
                    setSelectedRecordType('')
                    setSelectedAnimalFilter('')
                  }}
                >
                  Clear Filters
                </Button>
              </div>

              {/* Health Records Display */}
              {filteredHealthRecords.length === 0 ? (
                <div className="text-center py-12">
                  <ClipboardList className="mx-auto h-12 w-12 text-gray-400" />
                  <h3 className="mt-2 text-sm font-medium text-gray-900">
                    {healthRecords.length === 0 ? 'No health records yet' : 'No records match your filters'}
                  </h3>
                  <p className="mt-1 text-sm text-gray-500">
                    {healthRecords.length === 0
                      ? 'Start by adding your first health record.'
                      : 'Try adjusting your search and filter criteria.'
                    }
                  </p>
                  {canAddRecords && healthRecords.length === 0 && (
                    <Button onClick={() => setShowAddModal(true)} className="mt-4">
                      <Plus className="mr-2 h-4 w-4" />
                      Add First Health Record
                    </Button>
                  )}
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {filteredHealthRecords.map((record) => (
                    <HealthRecordCard
                      key={record.id}
                      record={record}
                      onEdit={() => {/* Handle edit */ }}
                      onDelete={() => {/* Handle delete */ }}
                      canEdit={canAddRecords}
                    />
                  ))}
                </div>
              )}
            </TabsContent>

            {/* Veterinarians Tab */}
            <TabsContent value="veterinarians" className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="relative flex-1 max-w-sm">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <Input
                    placeholder="Search veterinarians..."
                    value={searchTerms['veterinarians']}
                    onChange={(e) => updateSearchTerm('veterinarians', e.target.value)}
                    className="pl-10"
                  />
                </div>
                {canManageProtocols && (
                  <Button onClick={() => setShowVeterinarianModal(true)}>
                    <UserPlus className="mr-2 h-4 w-4" />
                    Add Veterinarian
                  </Button>
                )}
              </div>

              {filteredVeterinarians.length === 0 ? (
                <div className="text-center py-12">
                  <UserCheck className="mx-auto h-12 w-12 text-gray-400" />
                  <h3 className="mt-2 text-sm font-medium text-gray-900">
                    {veterinarians.length === 0 ? 'No veterinarians registered' : 'No veterinarians match your search'}
                  </h3>
                  <p className="mt-1 text-sm text-gray-500">
                    {veterinarians.length === 0
                      ? 'Add your first veterinarian to get started with professional health management.'
                      : 'Try adjusting your search criteria.'
                    }
                  </p>
                  {canManageProtocols && veterinarians.length === 0 && (
                    <Button onClick={() => setShowVeterinarianModal(true)} className="mt-4">
                      <UserPlus className="mr-2 h-4 w-4" />
                      Add First Veterinarian
                    </Button>
                  )}
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {filteredVeterinarians.map((veterinarian) => (
                    <VeterinarianCard
                      key={veterinarian.id}
                      veterinarian={veterinarian}
                      onEdit={() => {/* Handle edit */ }}
                      onDelete={() => {/* Handle delete */ }}
                      canEdit={canManageProtocols}
                    />
                  ))}
                </div>
              )}
            </TabsContent>

            {/* Protocols Tab */}
            <TabsContent value="protocols" className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="relative flex-1 max-w-sm">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <Input
                    placeholder="Search protocols..."
                    value={searchTerms['protocols']}
                    onChange={(e) => updateSearchTerm('protocols', e.target.value)}
                    className="pl-10"
                  />
                </div>
                {canManageProtocols && (
                  <Button onClick={() => setShowProtocolModal(true)}>
                    <FileText className="mr-2 h-4 w-4" />
                    Create Protocol
                  </Button>
                )}
              </div>

              {filteredProtocols.length === 0 ? (
                <div className="text-center py-12">
                  <BookOpen className="mx-auto h-12 w-12 text-gray-400" />
                  <h3 className="mt-2 text-sm font-medium text-gray-900">
                    {protocols.length === 0 ? 'No health protocols created' : 'No protocols match your search'}
                  </h3>
                  <p className="mt-1 text-sm text-gray-500">
                    {protocols.length === 0
                      ? 'Create standardized health protocols to streamline your farm operations.'
                      : 'Try adjusting your search criteria.'
                    }
                  </p>
                  {canManageProtocols && protocols.length === 0 && (
                    <Button onClick={() => setShowProtocolModal(true)} className="mt-4">
                      <FileText className="mr-2 h-4 w-4" />
                      Create First Protocol
                    </Button>
                  )}
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {filteredProtocols.map((protocol) => (
                    <ProtocolCard
                      key={protocol.id}
                      protocol={protocol}
                      onEdit={() => {/* Handle edit */ }}
                      onDelete={() => {/* Handle delete */ }}
                      canEdit={canManageProtocols}
                    />
                  ))}
                </div>
              )}
            </TabsContent>

            {/* Outbreaks Tab */}
            <TabsContent value="outbreaks" className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="relative flex-1 max-w-sm">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <Input
                    placeholder="Search outbreaks..."
                    value={searchTerms['outbreaks']}
                    onChange={(e) => updateSearchTerm('outbreaks', e.target.value)}
                    className="pl-10"
                  />
                </div>
                {canManageProtocols && (
                  <Button onClick={() => setShowOutbreakModal(true)} variant="outline" className="border-red-300 text-red-600 hover:bg-red-50">
                    <AlertTriangle className="mr-2 h-4 w-4" />
                    Report Outbreak
                  </Button>
                )}
              </div>

              {filteredOutbreaks.length === 0 ? (
                <div className="text-center py-12">
                  <Zap className="mx-auto h-12 w-12 text-gray-400" />
                  <h3 className="mt-2 text-sm font-medium text-gray-900">
                    {outbreaks.length === 0 ? 'No disease outbreaks reported' : 'No outbreaks match your search'}
                  </h3>
                  <p className="mt-1 text-sm text-gray-500">
                    {outbreaks.length === 0
                      ? 'Fortunately, no disease outbreaks have been reported. Use this section to track any future health emergencies.'
                      : 'Try adjusting your search criteria.'
                    }
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {filteredOutbreaks.map((outbreak) => (
                    <OutbreakCard
                      key={outbreak.id}
                      outbreak={outbreak}
                      onEdit={() => {/* Handle edit */ }}
                      onDelete={() => {/* Handle delete */ }}
                      canEdit={canManageProtocols}
                    />
                  ))}
                </div>
              )}
            </TabsContent>

            {/* Vaccinations Tab */}
            <TabsContent value="vaccinations" className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="relative flex-1 max-w-sm">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <Input
                    placeholder="Search vaccinations..."
                    value={searchTerms['vaccinations']}
                    onChange={(e) => updateSearchTerm('vaccinations', e.target.value)}
                    className="pl-10"
                  />
                </div>
                {canAddRecords && (
                  <Button onClick={() => setShowVaccinationModal(true)} className="bg-green-600 hover:bg-green-700">
                    <Syringe className="mr-2 h-4 w-4" />
                    Record Vaccination
                  </Button>
                )}
              </div>

              {filteredVaccinations.length === 0 ? (
                <div className="text-center py-12">
                  <Syringe className="mx-auto h-12 w-12 text-gray-400" />
                  <h3 className="mt-2 text-sm font-medium text-gray-900">
                    {vaccinations.length === 0 ? 'No vaccinations recorded' : 'No vaccinations match your search'}
                  </h3>
                  <p className="mt-1 text-sm text-gray-500">
                    {vaccinations.length === 0
                      ? 'Start recording vaccinations to maintain proper herd health and compliance.'
                      : 'Try adjusting your search criteria.'
                    }
                  </p>
                  {canAddRecords && vaccinations.length === 0 && (
                    <Button onClick={() => setShowVaccinationModal(true)} className="mt-4 bg-green-600 hover:bg-green-700">
                      <Syringe className="mr-2 h-4 w-4" />
                      Record First Vaccination
                    </Button>
                  )}
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {filteredVaccinations.map((vaccination) => (
                    <VaccinationCard
                      key={vaccination.id}
                      vaccination={vaccination}
                      onEdit={() => {/* Handle edit */ }}
                      onDelete={() => {/* Handle delete */ }}
                      canEdit={canAddRecords}
                    />
                  ))}
                </div>
              )}
            </TabsContent>

            {/* Vet Visits Tab */}
            <TabsContent value="vet-visits" className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="relative flex-1 max-w-sm">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <Input
                    placeholder="Search vet visits..."
                    value={searchTerms['vet-visits']}
                    onChange={(e) => updateSearchTerm('vet-visits', e.target.value)}
                    className="pl-10"
                  />
                </div>
                {canAddRecords && (
                  <Button onClick={() => setShowScheduleVisitModal(true)} className="bg-orange-600 hover:bg-orange-700">
                    <CalendarCheck className="mr-2 h-4 w-4" />
                    Schedule Visit
                  </Button>
                )}
              </div>

              {filteredVetVisits.length === 0 ? (
                <div className="text-center py-12">
                  <CalendarCheck className="mx-auto h-12 w-12 text-gray-400" />
                  <h3 className="mt-2 text-sm font-medium text-gray-900">
                    {vetVisits.length === 0 ? 'No veterinary visits scheduled' : 'No visits match your search'}
                  </h3>
                  <p className="mt-1 text-sm text-gray-500">
                    {vetVisits.length === 0
                      ? 'Schedule regular veterinary visits to maintain optimal herd health.'
                      : 'Try adjusting your search criteria.'
                    }
                  </p>
                  {canAddRecords && vetVisits.length === 0 && (
                    <Button onClick={() => setShowScheduleVisitModal(true)} className="mt-4 bg-orange-600 hover:bg-orange-700">
                      <CalendarCheck className="mr-2 h-4 w-4" />
                      Schedule First Visit
                    </Button>
                  )}
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {filteredVetVisits.map((visit) => (
                    <VetVisitCard
                      key={visit.id}
                      visit={visit}
                      onEdit={() => {/* Handle edit */ }}
                      onDelete={() => {/* Handle delete */ }}
                      canEdit={canAddRecords}
                    />
                  ))}
                </div>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* All Modals */}
      {showAddModal && (
        <AddHealthRecordModal
          farmId={userRole?.farm_id}
          animals={animals}
          isOpen={showAddModal}
          onClose={() => {
            setShowAddModal(false)
            setSelectedAnimalId('')
          }}
          onRecordAdded={handleRecordAdded}
          preSelectedAnimalId={selectedAnimalId}
        />
      )}

      {showProtocolModal && (
        <AddProtocolModal
          farmId={userRole?.farm_id}
          animals={animals}
          isOpen={showProtocolModal}
          onClose={() => setShowProtocolModal(false)}
          onProtocolCreated={handleProtocolAdded}
        />
      )}

      {showOutbreakModal && (
        <CreateOutbreakModal
          farmId={userRole?.farm_id}
          animals={animals}
          isOpen={showOutbreakModal}
          onClose={() => setShowOutbreakModal(false)}
          onOutbreakCreated={handleOutbreakCreated}
        />
      )}

      {showVaccinationModal && (
        <VaccinationModal
          farmId={userRole?.farm_id}
          animals={animals}
          isOpen={showVaccinationModal}
          onClose={() => setShowVaccinationModal(false)}
          onVaccinationRecorded={handleVaccinationScheduled}
        />
      )}
 
      {showScheduleVisitModal && (
        <ScheduleVisitModal
          farmId={userRole?.farm_id}
          animals={animals}
          isOpen={showScheduleVisitModal}
          onClose={() => setShowScheduleVisitModal(false)}
          onVisitScheduled={handleVisitScheduled}
        />
      )}

      {showVeterinarianModal && (
        <AddVeterinarianModal
          farmId={userRole?.farm_id}
          isOpen={showVeterinarianModal}
          onClose={() => setShowVeterinarianModal(false)}
          onVeterinarianAdded={handleVeterinarianAdded}
          existingVeterinarians={veterinarians}
        />
      )}
    </div>
  )
}