// Mobile-Optimized HealthDashboard.tsx
// src/components/health/HealthDashboard.tsx

'use client'

import { useState, useMemo, useEffect } from 'react'
import { toast } from 'react-hot-toast'
import { useDeviceInfo } from '@/lib/hooks/useDeviceInfo'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Input } from '@/components/ui/Input'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/Tabs'

import { HealthStatsCards } from '@/components/health/HealthStatsCards'

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

// Mobile-specific components
import { MobileActionSheet } from '@/components/mobile/MobileActionSheet'
import { MobileTabBar } from '@/components/mobile/MobileTabBar'
import { MobileSearchFilter } from '@/components/mobile/MobileSearchFilter'

import { EditHealthRecordModal } from '@/components/health/EditHealthRecordModal'
import { FollowUpHealthRecordModal } from '@/components/health/FollowUpHealthRecordModal'
import { EditVeterinarianModal } from '@/components/health/EditVeterinarianModal'
import { EditProtocolModal } from '@/components/health/EditProtocolModal'
import { EditOutbreakModal } from '@/components/health/EditOutbreakModal'
import { EditVaccinationModal } from '@/components/health/EditVaccinationModal'
import { EditVetVisitModal } from '@/components/health/EditVetVisitModal'

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
  MoreHorizontal,
  // Tab icons
  ClipboardList,
  UserCheck,
  BookOpen,
  Zap,
  CalendarCheck
} from 'lucide-react'
import { LoadingSpinner } from '../ui/LoadingSpinner'

interface HealthRecordsContentProps {
  user: any
  userRole: any
  animals: any[]
  healthRecords: any[]
  healthStats: {
    totalHealthRecords: number
    veterinariansRegistered: number
    protocolsRecorded: number
    outbreaksReported: number
    vaccinationsAdministered: number
    upcomingTasks: number
  }
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
  healthStats,
  upcomingTasks = [],
  veterinarians: initialVeterinarians = [],
  protocols: initialProtocols = [],
  outbreaks: initialOutbreaks = [],
  vaccinations: initialVaccinations = [],
  vetVisits: initialVetVisits = []
}: HealthRecordsContentProps) {
  // Get device info for responsive behavior
  const { isMobile, isTablet, } = useDeviceInfo()

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

  // Mobile-specific states
  const [showActionSheet, setShowActionSheet] = useState(false)
  const [showMobileFilters, setShowMobileFilters] = useState(false)

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

  const [editingRecord, setEditingRecord] = useState<any>(null)
  const [showEditModal, setShowEditModal] = useState(false)
  const [showFollowUpModal, setShowFollowUpModal] = useState(false)
  const [followUpRecord, setFollowUpRecord] = useState<any>(null)
  const [deletingRecordId, setDeletingRecordId] = useState<string | null>(null)

  const [editingVeterinarian, setEditingVeterinarian] = useState<any>(null)
  const [showEditVeterinarianModal, setShowEditVeterinarianModal] = useState(false)
  const [deletingVeterinarianId, setDeletingVeterinarianId] = useState<string | null>(null)

  const [editingProtocol, setEditingProtocol] = useState<any>(null)
  const [showEditProtocolModal, setShowEditProtocolModal] = useState(false)
  const [deletingProtocolId, setDeletingProtocolId] = useState<string | null>(null)

  const [editingOutbreak, setEditingOutbreak] = useState<any>(null)
  const [showEditOutbreakModal, setShowEditOutbreakModal] = useState(false)
  const [deletingOutbreakId, setDeletingOutbreakId] = useState<string | null>(null)

  const [editingVaccination, setEditingVaccination] = useState<any>(null)
  const [showEditVaccinationModal, setShowEditVaccinationModal] = useState(false)
  const [deletingVaccinationId, setDeletingVaccinationId] = useState<string | null>(null)

  const [editingVetVisit, setEditingVetVisit] = useState<any>(null)
  const [showEditVetVisitModal, setShowEditVetVisitModal] = useState(false)
  const [deletingVetVisitId, setDeletingVetVisitId] = useState<string | null>(null)


  // Permission checks
  const canAddRecords = userRole?.role_type &&
    ['farm_owner', 'farm_manager', 'worker'].includes(userRole.role_type)
  const canManageProtocols = userRole?.role_type &&
    ['farm_owner', 'farm_manager'].includes(userRole.role_type)

  useEffect(() => {
    refreshHealthData()
  }, []) // Run once when component mounts

  // Filtered data for each tab (same as original)
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

  // Tab configuration with mobile-optimized layout
  const tabs = [
    {
      id: 'health-records',
      label: isMobile ? 'Records' : 'Health Records',
      shortLabel: 'Records',
      icon: ClipboardList,
      count: filteredHealthRecords.length,
      color: 'text-blue-600'
    },
    {
      id: 'veterinarians',
      label: isMobile ? 'Vets' : 'Veterinarians',
      shortLabel: 'Vets',
      icon: UserCheck,
      count: filteredVeterinarians.length,
      color: 'text-indigo-600'
    },
    {
      id: 'protocols',
      label: 'Protocols',
      shortLabel: 'Protocols',
      icon: BookOpen,
      count: filteredProtocols.length,
      color: 'text-purple-600'
    },
    {
      id: 'outbreaks',
      label: 'Outbreaks',
      shortLabel: 'Outbreaks',
      icon: Zap,
      count: filteredOutbreaks.length,
      color: 'text-red-600'
    },
    {
      id: 'vaccinations',
      label: isMobile ? 'Vaccines' : 'Vaccinations',
      shortLabel: 'Vaccines',
      icon: Syringe,
      count: filteredVaccinations.length,
      color: 'text-green-600'
    },
    {
      id: 'vet-visits',
      label: 'Visits',
      shortLabel: 'Visits',
      icon: CalendarCheck,
      count: filteredVetVisits.length,
      color: 'text-orange-600'
    }
  ]



  // Mobile action sheet configuration
  const actionSheetItems = [
    ...(canAddRecords ? [
      {
        id: 'add-health-record',
        label: 'Add Health Record',
        icon: ClipboardList,
        color: 'text-blue-600',
        onClick: () => setShowAddModal(true)
      },
      {
        id: 'schedule-vaccination',
        label: 'Schedule Vaccination',
        icon: Syringe,
        color: 'text-green-600',
        onClick: () => setShowVaccinationModal(true)
      },
      {
        id: 'schedule-visit',
        label: 'Schedule Vet Visit',
        icon: Calendar,
        color: 'text-blue-600',
        onClick: () => setShowScheduleVisitModal(true)
      },
      {
        id: 'add-veterinarian',
        label: 'Add Veterinarian',
        icon: UserPlus,
        color: 'text-indigo-600',
        onClick: () => setShowVeterinarianModal(true)
      }
    ] : []),
    ...(canManageProtocols ? [
      {
        id: 'create-protocol',
        label: 'Create Protocol',
        icon: FileText,
        color: 'text-purple-600',
        onClick: () => setShowProtocolModal(true)
      },
      {
        id: 'report-outbreak',
        label: 'Report Outbreak',
        icon: AlertTriangle,
        color: 'text-red-600',
        onClick: () => setShowOutbreakModal(true)
      }
    ] : [])
  ]

  // All the existing handler functions remain the same
  const handleRecordAdded = async (newRecord: any) => {
    if (newRecord) {
      setHealthRecords(prev => [newRecord, ...prev])
    }
    setShowAddModal(false)
    toast.success('Health record added successfully!')
    await refreshHealthData()
  }


  const handleEditRecord = (record: any) => {
    setEditingRecord(record)
    setShowEditModal(true)
  }

  const handleRecordUpdated = async (updatedRecord: any) => {
    if (updatedRecord) {
      setHealthRecords(prev =>
        prev.map(record =>
          record.id === updatedRecord.id ? updatedRecord : record
        )
      )
    }
    setShowEditModal(false)
    setEditingRecord(null)
    toast.success('Health record updated successfully!')
    await refreshHealthData()
  }

  const handleDeleteRecord = async (recordId: string) => {
    if (!confirm('Are you sure you want to delete this health record? This action cannot be undone.')) {
      return
    }

    setDeletingRecordId(recordId)

    try {
      const response = await fetch(`/api/health/records/${recordId}`, {
        method: 'DELETE',
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Failed to delete health record')
      }

      setHealthRecords(prev => prev.filter(record => record.id !== recordId))
      toast.success('Health record deleted successfully!')
      await refreshHealthData()
    } catch (error) {
      console.error('Error deleting health record:', error)
      toast.error(error instanceof Error ? error.message : 'Failed to delete health record')
    } finally {
      setDeletingRecordId(null)
    }
  }

  const handleFollowUpRecord = (record: any) => {
    setFollowUpRecord(record)
    setShowFollowUpModal(true)
  }

  const handleFollowUpAdded = async (followUp: any) => {
    if (followUp) {
      // Add the follow-up as a new health record
      setHealthRecords(prev => [followUp, ...prev])
    }
    setShowFollowUpModal(false)
    setFollowUpRecord(null)
    toast.success('Follow-up record added successfully!')
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

  const handleEditProtocol = (protocol: any) => {
    setEditingProtocol(protocol)
    setShowEditProtocolModal(true)
  }

  const handleProtocolUpdated = async (updatedProtocol: any) => {
    if (updatedProtocol) {
      setProtocols(prev =>
        prev.map(protocol =>
          protocol.id === updatedProtocol.id ? updatedProtocol : protocol
        )
      )
    }
    setShowEditProtocolModal(false)
    setEditingProtocol(null)
    toast.success('Protocol updated successfully!')
    await refreshHealthData()
  }

  const handleDeleteProtocol = async (protocolId: string) => {
    if (!confirm('Are you sure you want to delete this protocol? This action cannot be undone.')) {
      return
    }

    setDeletingProtocolId(protocolId)

    try {
      const response = await fetch(`/api/health/protocols/${protocolId}`, {
        method: 'DELETE',
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Failed to delete protocol')
      }

      setProtocols(prev => prev.filter(protocol => protocol.id !== protocolId))
      toast.success('Protocol deleted successfully!')
      await refreshHealthData()
    } catch (error) {
      console.error('Error deleting protocol:', error)
      toast.error(error instanceof Error ? error.message : 'Failed to delete protocol')
    } finally {
      setDeletingProtocolId(null)
    }
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

  const handleEditOutbreak = (outbreak: any) => {
    setEditingOutbreak(outbreak)
    setShowEditOutbreakModal(true)
  }

  const handleOutbreakUpdated = async (updatedOutbreak: any) => {
    if (updatedOutbreak) {
      setOutbreaks(prev =>
        prev.map(outbreak =>
          outbreak.id === updatedOutbreak.id ? updatedOutbreak : outbreak
        )
      )
    }
    setShowEditOutbreakModal(false)
    setEditingOutbreak(null)
    toast.success('Outbreak updated successfully!')
    await refreshHealthData()
  }

  const handleDeleteOutbreak = async (outbreakId: string) => {
    if (!confirm('Are you sure you want to delete this outbreak record? This action cannot be undone and will also remove related health records.')) {
      return
    }

    setDeletingOutbreakId(outbreakId)

    try {
      const response = await fetch(`/api/health/outbreaks/${outbreakId}`, {
        method: 'DELETE',
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Failed to delete outbreak')
      }

      setOutbreaks(prev => prev.filter(outbreak => outbreak.id !== outbreakId))
      toast.success('Outbreak deleted successfully!')
      await refreshHealthData()
    } catch (error) {
      console.error('Error deleting outbreak:', error)
      toast.error(error instanceof Error ? error.message : 'Failed to delete outbreak')
    } finally {
      setDeletingOutbreakId(null)
    }
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

  const handleEditVaccination = (vaccination: any) => {
    setEditingVaccination(vaccination)
    setShowEditVaccinationModal(true)
  }

  const handleVaccinationUpdated = async (updatedVaccination: any) => {
    if (updatedVaccination) {
      setVaccinations(prev =>
        prev.map(vaccination =>
          vaccination.id === updatedVaccination.id ? updatedVaccination : vaccination
        )
      )
    }
    setShowEditVaccinationModal(false)
    setEditingVaccination(null)
    toast.success('Vaccination updated successfully!')
    await refreshHealthData()
  }

  const handleDeleteVaccination = async (vaccinationId: string) => {
    if (!confirm('Are you sure you want to delete this vaccination record? This action cannot be undone and will also remove related health records.')) {
      return
    }

    setDeletingVaccinationId(vaccinationId)

    try {
      const response = await fetch(`/api/health/vaccinations/${vaccinationId}`, {
        method: 'DELETE',
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Failed to delete vaccination')
      }

      setVaccinations(prev => prev.filter(vaccination => vaccination.id !== vaccinationId))
      toast.success('Vaccination deleted successfully!')
      await refreshHealthData()
    } catch (error) {
      console.error('Error deleting vaccination:', error)
      toast.error(error instanceof Error ? error.message : 'Failed to delete vaccination')
    } finally {
      setDeletingVaccinationId(null)
    }
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

  const handleEditVetVisit = (visit: any) => {
    setEditingVetVisit(visit)
    setShowEditVetVisitModal(true)
  }

  const handleVetVisitUpdated = async (updatedVisit: any) => {
    if (updatedVisit) {
      setVetVisits(prev =>
        prev.map(visit =>
          visit.id === updatedVisit.id ? updatedVisit : visit
        )
      )
    }
    setShowEditVetVisitModal(false)
    setEditingVetVisit(null)
    toast.success('Veterinary visit updated successfully!')
    await refreshHealthData()
  }

  const handleDeleteVetVisit = async (visitId: string) => {
    if (!confirm('Are you sure you want to delete this veterinary visit? This action cannot be undone.')) {
      return
    }

    setDeletingVetVisitId(visitId)

    try {
      const response = await fetch(`/api/health/visits/${visitId}`, {
        method: 'DELETE',
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Failed to delete veterinary visit')
      }

      setVetVisits(prev => prev.filter(visit => visit.id !== visitId))
      toast.success('Veterinary visit deleted successfully!')
      await refreshHealthData()
    } catch (error) {
      console.error('Error deleting veterinary visit:', error)
      toast.error(error instanceof Error ? error.message : 'Failed to delete veterinary visit')
    } finally {
      setDeletingVetVisitId(null)
    }
  }


  const handleVeterinarianAdded = async (newVeterinarian: any) => {
    if (newVeterinarian) {
      setVeterinarians(prev => [newVeterinarian, ...prev])
    }
    setShowVeterinarianModal(false)
    toast.success('Veterinarian added successfully!')
    await refreshHealthData()
  }

  const handleEditVeterinarian = (veterinarian: any) => {
    setEditingVeterinarian(veterinarian)
    setShowEditVeterinarianModal(true)
  }

  const handleVeterinarianUpdated = async (updatedVeterinarian: any) => {
    if (updatedVeterinarian) {
      setVeterinarians(prev =>
        prev.map(vet =>
          vet.id === updatedVeterinarian.id ? updatedVeterinarian : vet
        )
      )
    }
    setShowEditVeterinarianModal(false)
    setEditingVeterinarian(null)
    toast.success('Veterinarian updated successfully!')
    await refreshHealthData()
  }

  const handleDeleteVeterinarian = async (veterinarianId: string) => {
    if (!confirm('Are you sure you want to remove this veterinarian? This action cannot be undone.')) {
      return
    }

    setDeletingVeterinarianId(veterinarianId)

    try {
      const response = await fetch(`/api/health/veterinarians?id=${veterinarianId}`, {
        method: 'DELETE',
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Failed to delete veterinarian')
      }

      setVeterinarians(prev => prev.filter(vet => vet.id !== veterinarianId))
      toast.success('Veterinarian removed successfully!')
      await refreshHealthData()
    } catch (error) {
      console.error('Error deleting veterinarian:', error)
      toast.error(error instanceof Error ? error.message : 'Failed to delete veterinarian')
    } finally {
      setDeletingVeterinarianId(null)
    }
  }

  // Data refresh functions (same as original)
  const refreshHealthData = async () => {
    setLoading(true)
    try {
      // Fetch all data in parallel using Promise.all
      const [
        healthRecordsRes,
        veterinariansRes,
        protocolsRes,
        outbreaksRes,
        vaccinationsRes,
        vetVisitsRes
      ] = await Promise.all([
        fetch('/api/health/records'),
        fetch('/api/health/veterinarians'),
        fetch('/api/health/protocols'),
        fetch('/api/health/outbreaks'),
        fetch('/api/health/vaccinations'),
        fetch('/api/health/visits')
      ])

      // Process all responses in parallel
      const [
        healthData,
        veterinariansData,
        protocolsData,
        outbreaksData,
        vaccinationsData,
        vetVisitsData
      ] = await Promise.all([
        healthRecordsRes.ok ? healthRecordsRes.json() : { HealthRecords: [] },
        veterinariansRes.ok ? veterinariansRes.json() : { Veterinarians: [] },
        protocolsRes.ok ? protocolsRes.json() : { Protocols: [] },
        outbreaksRes.ok ? outbreaksRes.json() : { Outbreaks: [] },
        vaccinationsRes.ok ? vaccinationsRes.json() : { Vaccinations: [] },
        vetVisitsRes.ok ? vetVisitsRes.json() : { VetVisits: [] }
      ])

      // Update all state variables
      setHealthRecords(healthData.healthRecords || [])
      setVeterinarians(veterinariansData.veterinarians || [])
      setProtocols(protocolsData.protocols || [])
      setOutbreaks(outbreaksData.outbreaks || [])
      setVaccinations(vaccinationsData.vaccinations || [])
      setVetVisits(vetVisitsData.visits || [])
    } catch (error) {
      console.error('Error refreshing health data:', error)
      toast.error('Failed to refresh data')
    } finally {
      setLoading(false)
    }
  }



  // Helper functions (same as original - truncated for brevity)
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

  // Mobile-optimized grid function
  const getMobileGridCols = (dataLength: number) => {
    if (isMobile) {
      return 'grid-cols-1'
    } else if (isTablet) {
      return 'grid-cols-2'
    } else {
      return dataLength > 6 ? 'grid-cols-3' : 'grid-cols-2'
    }
  }

  return (
    <div className="space-y-4 pb-safe">
      {/* Mobile-Optimized Header */}
      <div className={`${isMobile ? 'px-4' : ''}`}>
        <div className="flex items-center justify-between">
          <div>
            <h1 className={`${isMobile ? 'text-2xl' : 'text-3xl'} font-bold text-gray-900 flex items-center space-x-2`}>
              <Stethoscope className={`${isMobile ? 'w-6 h-6' : 'w-8 h-8'} text-farm-green`} />
              <span>{isMobile ? 'Health' : 'Health Management'}</span>
            </h1>
            {!isMobile && (
              <p className="text-gray-600 mt-2">
                Comprehensive health tracking, protocols, and veterinary care management
              </p>
            )}
          </div>

          {/* Mobile Action Button */}
          <div className="flex items-center space-x-2">
            {isMobile ? (
              <Button
                onClick={() => setShowActionSheet(true)}
                size="lg"
                className="h-12 w-12 rounded-full p-0"
              >
                <Plus className="h-6 w-6" />
              </Button>
            ) : (
              <div className="flex items-center space-x-3">
                {/* Desktop Quick Actions Dropdown - same as original */}
                <div className="relative group">
                  <Button variant="outline" className="flex items-center space-x-2">
                    <Plus className="w-4 h-4" />
                    <span>Quick Actions</span>
                    <ChevronDown className="w-4 h-4" />
                  </Button>

                  <div className="absolute right-0 mt-2 w-56 bg-white border border-gray-200 rounded-lg shadow-lg z-50 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200">
                    <div className="py-2">
                      {!loading && canAddRecords && (
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

                      {!loading && canManageProtocols && (
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

                {!loading && canAddRecords && (
                  <Button onClick={() => setShowAddModal(true)} size="lg">
                    <Plus className="mr-2 h-5 w-5" />
                    Add Health Record
                  </Button>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Mobile-Optimized Scrollable Stats */}
      <div className={`${isMobile ? 'px-4' : ''}`}>
        {/* Stats Cards */}
        <HealthStatsCards stats={healthStats} />

      </div>

      {/* Upcoming Tasks Section */}
      {Array.isArray(upcomingTasks) && upcomingTasks.length > 0 && (
        <div className={`${isMobile ? 'px-4' : ''}`}>
          <UpcomingTasksCard
            tasks={upcomingTasks}
            onQuickAdd={handleQuickAddForAnimal}
          />
        </div>
      )}

      {/* Mobile-Optimized Tabbed Content */}
      <Card className={`${isMobile ? 'mx-4 mb-20' : ''}`}>
        <CardHeader className={`${isMobile ? 'pb-2' : ''}`}>
          <CardTitle className={`${isMobile ? 'text-lg' : ''}`}>Health Management Records</CardTitle>
          {!isMobile && (
            <CardDescription>
              Comprehensive view of all health-related records and data
            </CardDescription>
          )}
        </CardHeader>
        <CardContent className={`${isMobile ? 'px-2' : ''}`}>
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            {/* Mobile Tab Bar */}
            {isMobile ? (
              <MobileTabBar
                tabs={tabs}
                activeTab={activeTab}
                onTabChange={setActiveTab}
              />
            ) : (
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
            )}

            {/* Health Records Tab */}
            <TabsContent value="health-records" className="space-y-4">
              {/* Mobile-Optimized Search and Filters */}
              {isMobile ? (
                <MobileSearchFilter
                  searchValue={searchTerms['health-records']}
                  onSearchChange={(value) => updateSearchTerm('health-records', value)}
                  showFilters={showMobileFilters}
                  onToggleFilters={() => setShowMobileFilters(!showMobileFilters)}
                  filters={showMobileFilters && (
                    <div className="space-y-3 mt-3 p-3 bg-gray-50 rounded-lg">
                      <select
                        value={selectedRecordType}
                        onChange={(e) => setSelectedRecordType(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-farm-green focus:border-transparent"
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
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-farm-green focus:border-transparent"
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
                        className="w-full"
                      >
                        Clear Filters
                      </Button>
                    </div>
                  )}
                />
              ) : (
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
              )}

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
                <div className={`grid ${getMobileGridCols(filteredHealthRecords.length)} gap-4`}>
                  {filteredHealthRecords.map((record) => (
                    <HealthRecordCard
                      key={record.id}
                      record={record}
                      onEdit={() => handleEditRecord(record)}
                      onDelete={() => handleDeleteRecord(record.id)}
                      onFollowUp={() => handleFollowUpRecord(record)}
                      canEdit={canAddRecords}
                      isDeleting={deletingRecordId === record.id}
                      showFollowUp={['illness', 'injury', 'treatment'].includes(record.record_type)}
                    />
                  ))}
                </div>
              )}
            </TabsContent>

            {/* Veterinarians Tab */}
            <TabsContent value="veterinarians" className="space-y-4">
              <div className="flex items-center justify-between">
                <div className={`relative ${isMobile ? 'flex-1 mr-2' : 'flex-1 max-w-sm'}`}>
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <Input
                    placeholder="Search veterinarians..."
                    value={searchTerms['veterinarians']}
                    onChange={(e) => updateSearchTerm('veterinarians', e.target.value)}
                    className="pl-10"
                  />
                </div>
                {canManageProtocols && (
                  <Button
                    onClick={() => setShowVeterinarianModal(true)}
                    size={isMobile ? "sm" : "default"}
                  >
                    {isMobile ? (
                      <UserPlus className="h-4 w-4" />
                    ) : (
                      <>
                        <UserPlus className="mr-2 h-4 w-4" />
                        Add Veterinarian
                      </>
                    )}
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
                <div className={`grid ${getMobileGridCols(filteredVeterinarians.length)} gap-4`}>
                  {filteredVeterinarians.map((veterinarian) => (
                    <VeterinarianCard
                      key={veterinarian.id}
                      veterinarian={veterinarian}
                      onEdit={() => handleEditVeterinarian(veterinarian)}
                      onDelete={() => handleDeleteVeterinarian(veterinarian.id)}
                      canEdit={canManageProtocols}
                      isDeleting={deletingVeterinarianId === veterinarian.id}
                    />
                  ))}
                </div>
              )}
            </TabsContent>

            {/* Protocols Tab */}
            <TabsContent value="protocols" className="space-y-4">
              <div className="flex items-center justify-between">
                <div className={`relative ${isMobile ? 'flex-1 mr-2' : 'flex-1 max-w-sm'}`}>
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <Input
                    placeholder="Search protocols..."
                    value={searchTerms['protocols']}
                    onChange={(e) => updateSearchTerm('protocols', e.target.value)}
                    className="pl-10"
                  />
                </div>
                {canManageProtocols && (
                  <Button
                    onClick={() => setShowProtocolModal(true)}
                    size={isMobile ? "sm" : "default"}
                  >
                    {isMobile ? (
                      <FileText className="h-4 w-4" />
                    ) : (
                      <>
                        <FileText className="mr-2 h-4 w-4" />
                        Create Protocol
                      </>
                    )}
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
                <div className={`grid ${getMobileGridCols(filteredProtocols.length)} gap-4`}>
                  {filteredProtocols.map((protocol) => (
                    <ProtocolCard
                      key={protocol.id}
                      protocol={protocol}
                      onEdit={() => handleEditProtocol(protocol)}
                      onDelete={() => handleDeleteProtocol(protocol.id)}
                      canEdit={canManageProtocols}
                      isDeleting={deletingProtocolId === protocol.id}
                    />
                  ))}
                </div>
              )}
            </TabsContent>

            {/* Outbreaks Tab */}
            <TabsContent value="outbreaks" className="space-y-4">
              <div className="flex items-center justify-between">
                <div className={`relative ${isMobile ? 'flex-1 mr-2' : 'flex-1 max-w-sm'}`}>
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <Input
                    placeholder="Search outbreaks..."
                    value={searchTerms['outbreaks']}
                    onChange={(e) => updateSearchTerm('outbreaks', e.target.value)}
                    className="pl-10"
                  />
                </div>
                {canManageProtocols && (
                  <Button
                    onClick={() => setShowOutbreakModal(true)}
                    variant="outline"
                    className="border-red-300 text-red-600 hover:bg-red-50"
                    size={isMobile ? "sm" : "default"}
                  >
                    {isMobile ? (
                      <AlertTriangle className="h-4 w-4" />
                    ) : (
                      <>
                        <AlertTriangle className="mr-2 h-4 w-4" />
                        Report Outbreak
                      </>
                    )}
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
                <div className={`grid ${getMobileGridCols(filteredOutbreaks.length)} gap-4`}>
                  {filteredOutbreaks.map((outbreak) => (
                    <OutbreakCard
                      key={outbreak.id}
                      outbreak={outbreak}
                      onEdit={() => handleEditOutbreak(outbreak)}
                      onDelete={() => handleDeleteOutbreak(outbreak.id)}
                      canEdit={canManageProtocols}
                      isDeleting={deletingOutbreakId === outbreak.id}
                    />
                  ))}
                </div>
              )}
            </TabsContent>

            {/* Vaccinations Tab */}
            <TabsContent value="vaccinations" className="space-y-4">
              <div className="flex items-center justify-between">
                <div className={`relative ${isMobile ? 'flex-1 mr-2' : 'flex-1 max-w-sm'}`}>
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <Input
                    placeholder="Search vaccinations..."
                    value={searchTerms['vaccinations']}
                    onChange={(e) => updateSearchTerm('vaccinations', e.target.value)}
                    className="pl-10"
                  />
                </div>
                {canAddRecords && (
                  <Button
                    onClick={() => setShowVaccinationModal(true)}
                    className="bg-green-600 hover:bg-green-700"
                    size={isMobile ? "sm" : "default"}
                  >
                    {isMobile ? (
                      <Syringe className="h-4 w-4" />
                    ) : (
                      <>
                        <Syringe className="mr-2 h-4 w-4" />
                        Record Vaccination
                      </>
                    )}
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
                <div className={`grid ${getMobileGridCols(filteredVaccinations.length)} gap-4`}>
                  {filteredVaccinations.map((vaccination) => (
                    <VaccinationCard
                      key={vaccination.id}
                      vaccination={vaccination}
                      onEdit={() => handleEditVaccination(vaccination)}
                      onDelete={() => handleDeleteVaccination(vaccination.id)}
                      canEdit={canAddRecords}
                      isDeleting={deletingVaccinationId === vaccination.id}
                    />
                  ))}
                </div>
              )}
            </TabsContent>

            {/* Vet Visits Tab */}
            <TabsContent value="vet-visits" className="space-y-4">
              <div className="flex items-center justify-between">
                <div className={`relative ${isMobile ? 'flex-1 mr-2' : 'flex-1 max-w-sm'}`}>
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <Input
                    placeholder="Search vet visits..."
                    value={searchTerms['vet-visits']}
                    onChange={(e) => updateSearchTerm('vet-visits', e.target.value)}
                    className="pl-10"
                  />
                </div>
                {canAddRecords && (
                  <Button
                    onClick={() => setShowScheduleVisitModal(true)}
                    className="bg-orange-600 hover:bg-orange-700"
                    size={isMobile ? "sm" : "default"}
                  >
                    {isMobile ? (
                      <CalendarCheck className="h-4 w-4" />
                    ) : (
                      <>
                        <CalendarCheck className="mr-2 h-4 w-4" />
                        Schedule Visit
                      </>
                    )}
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
                <div className={`grid ${getMobileGridCols(filteredVetVisits.length)} gap-4`}>
                  {filteredVetVisits.map((visit) => (
                    <VetVisitCard
                      key={visit.id}
                      visit={visit}
                      onEdit={() => handleEditVetVisit(visit)}
                      onDelete={() => handleDeleteVetVisit(visit.id)}
                      canEdit={canAddRecords}
                      isDeleting={deletingVetVisitId === visit.id}
                    />
                  ))}
                </div>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Mobile Action Sheet */}
      {isMobile && (
        <MobileActionSheet
          isOpen={showActionSheet}
          onClose={() => setShowActionSheet(false)}
          title="Health Actions"
          items={actionSheetItems}
        />
      )}

      {/* All Modals - Same as original */}
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

      {/* New Edit Modal */}
      {showEditModal && editingRecord && (
        <EditHealthRecordModal
          farmId={userRole?.farm_id}
          animals={animals}
          record={editingRecord}
          isOpen={showEditModal}
          onClose={() => {
            setShowEditModal(false)
            setEditingRecord(null)
          }}
          onRecordUpdated={handleRecordUpdated}
        />
      )}

      {/* New Follow-up Modal */}
      {showFollowUpModal && followUpRecord && (
        <FollowUpHealthRecordModal
          farmId={userRole?.farm_id}
          originalRecord={followUpRecord}
          isOpen={showFollowUpModal}
          onClose={() => {
            setShowFollowUpModal(false)
            setFollowUpRecord(null)
          }}
          onFollowUpAdded={handleFollowUpAdded}
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

      {showEditProtocolModal && editingProtocol && (
        <EditProtocolModal
          farmId={userRole?.farm_id}
          protocol={editingProtocol}
          animals={animals}
          isOpen={showEditProtocolModal}
          onClose={() => {
            setShowEditProtocolModal(false)
            setEditingProtocol(null)
          }}
          onProtocolUpdated={handleProtocolUpdated}
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

      {showEditOutbreakModal && editingOutbreak && (
        <EditOutbreakModal
          farmId={userRole?.farm_id}
          animals={animals}
          outbreak={editingOutbreak}
          isOpen={showEditOutbreakModal}
          onClose={() => {
            setShowEditOutbreakModal(false)
            setEditingOutbreak(null)
          }}
          onOutbreakUpdated={handleOutbreakUpdated}
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

      {showEditVaccinationModal && editingVaccination && (
        <EditVaccinationModal
          farmId={userRole?.farm_id}
          animals={animals}
          vaccination={editingVaccination}
          isOpen={showEditVaccinationModal}
          onClose={() => {
            setShowEditVaccinationModal(false)
            setEditingVaccination(null)
          }}
          onVaccinationUpdated={handleVaccinationUpdated}
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

      {showEditVetVisitModal && editingVetVisit && (
        <EditVetVisitModal
          farmId={userRole?.farm_id}
          visit={editingVetVisit}
          animals={animals}
          isOpen={showEditVetVisitModal}
          onClose={() => {
            setShowEditVetVisitModal(false)
            setEditingVetVisit(null)
          }}
          onVisitUpdated={handleVetVisitUpdated}
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

      {showEditVeterinarianModal && editingVeterinarian && (
        <EditVeterinarianModal
          farmId={userRole?.farm_id}
          veterinarian={editingVeterinarian}
          isOpen={showEditVeterinarianModal}
          onClose={() => {
            setShowEditVeterinarianModal(false)
            setEditingVeterinarian(null)
          }}
          onVeterinarianUpdated={handleVeterinarianUpdated}
          existingVeterinarians={veterinarians}
        />
      )}


      {loading && (
        <div className="fixed top-4 right-4 z-50 bg-white rounded-lg shadow-lg p-4 flex items-center space-x-2">
          <LoadingSpinner size="sm" />
          <span className="text-sm text-gray-600">Updating stats...</span>
        </div>
      )}

    </div>
  )
}