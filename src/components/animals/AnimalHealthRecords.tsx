// src/components/animals/AnimalHealthRecords.tsx
'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { AddHealthRecordModal } from '@/components/health/AddHealthRecordModal'
import { FollowUpHealthRecordModal } from '@/components/health/FollowUpHealthRecordModal'
import { EditHealthRecordModal } from '@/components/health/EditHealthRecordModal'
import { useDeviceInfo } from '@/lib/hooks/useDeviceInfo'
import { cn } from '@/lib/utils/cn'
import { format } from 'date-fns'
import { 
  Plus, 
  Calendar, 
  User, 
  DollarSign,
  FileText,
  Heart,
  Shield,
  Stethoscope,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  Filter,
  Edit,
  Trash2,
  Activity,
  CheckCircle,
  Clock,
  Thermometer,
  Pill,
  Syringe,
  TrendingUp,
  TrendingDown
} from 'lucide-react'

interface FollowUpRecord {
  id: string
  record_date: string
  description: string
  veterinarian?: string
  cost?: number
  notes?: string
  medication?: string
  follow_up_status: 'improving' | 'stable' | 'worsening' | 'recovered' | 'requires_attention'
  treatment_effectiveness?: 'very_effective' | 'effective' | 'somewhat_effective' | 'not_effective'
  is_resolved: boolean
  created_at: string
  next_followup_date?: string
}

interface HealthRecord {
  id: string
  record_date: string
  record_type: "vaccination" | "treatment" | "checkup" | "injury" | "illness" | "reproductive" | "deworming"
  description: string
  veterinarian?: string
  cost?: number
  notes?: string
  next_due_date?: string
  medication?: string
  severity?: "severe" | "moderate" | "mild"
  is_resolved?: boolean
  resolved_date?: string
  created_at: string
  updated_at?: string
  animal_id: string
  follow_ups?: FollowUpRecord[]
  
  // Type-specific fields
  symptoms?: string
  illness_diagnosis?: string
  illness_severity?: "severe" | "moderate" | "mild"
  lab_test_results?: string
  treatment_plan?: string
  vaccine_name?: string
  vaccine_batch_number?: string
  body_condition_score?: number
  injury_cause?: string
  injury_type?: string
  treatment_given?: string
  reproductive_type?: string
  product_used?: string
  temperature?: number
  pulse?: number
  respiration?: number
  weight?: number
  vaccine_dose?: string
  route_of_administration?: string
  medication_dosage?: string
  medication_duration?: string
  physical_exam_notes?: string
  treatment_route?: string
  withdrawal_period?: string
  deworming_dose?: string
}

interface AnimalHealthRecordsProps {
  animalId: string
  farmId: string
  animals: any[]
  canAddRecords: boolean
}

export function AnimalHealthRecords({ animalId, farmId, animals, canAddRecords }: AnimalHealthRecordsProps) {
  const [healthRecords, setHealthRecords] = useState<HealthRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [showAddModal, setShowAddModal] = useState(false)
  const [showFollowUpModal, setShowFollowUpModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [selectedRecord, setSelectedRecord] = useState<HealthRecord | null>(null)
  const [deletingRecordId, setDeletingRecordId] = useState<string | null>(null)
  const [filterType, setFilterType] = useState<string>('all')
  const [showFilters, setShowFilters] = useState(false)
  const [expandedRecords, setExpandedRecords] = useState<Set<string>>(new Set())
  
  const { isMobile } = useDeviceInfo()
  
  useEffect(() => {
    loadHealthRecords()
  }, [animalId])
  
  const loadHealthRecords = async () => {
    try {
      const response = await fetch(`/api/animals/${animalId}/health-records?includeFollowUps=true`)
      if (response.ok) {
        const data = await response.json()
        setHealthRecords(data.records || [])
      }
    } catch (error) {
      console.error('Error loading health records:', error)
    } finally {
      setLoading(false)
    }
  }
  
  const handleRecordAdded = (newRecord: HealthRecord) => {
    setHealthRecords(prev => [newRecord, ...prev])
    setShowAddModal(false)
  }

  const handleFollowUpAdded = async (followUpData: any) => {
    if (followUpData) {
      // Update the parent record with the new follow-up
      setHealthRecords(prev =>
        prev.map(record => {
          if (record.id === followUpData.original_record_id) {
            return {
              ...record,
              follow_ups: [followUpData, ...(record.follow_ups || [])],
              is_resolved: followUpData.is_resolved || record.is_resolved,
              resolved_date: followUpData.is_resolved ? followUpData.record_date : record.resolved_date
            }
          }
          return record
        })
      )
    }
    
    setShowFollowUpModal(false)
    setSelectedRecord(null)
    await loadHealthRecords() // Refresh to get complete data
  }

  const handleRecordUpdated = (updatedRecord: HealthRecord) => {
    setHealthRecords(prev => 
      prev.map(record => 
        record.id === updatedRecord.id ? updatedRecord : record
      )
    )
    setShowEditModal(false)
    setSelectedRecord(null)
  }
  
  const handleEdit = (record: HealthRecord) => {
    setSelectedRecord(record)
    setShowEditModal(true)
  }

  const handleFollowUp = (record: HealthRecord) => {
    setSelectedRecord(record)
    setShowFollowUpModal(true)
  }
  
  const handleDelete = async (recordId: string) => {
    if (!window.confirm('Are you sure you want to delete this health record? This action cannot be undone.')) {
      return
    }

    setDeletingRecordId(recordId)
    try {
      const response = await fetch(`/api/health/records/${recordId}`, {
        method: 'DELETE',
      })
      
      if (response.ok) {
        setHealthRecords(prev => prev.filter(record => record.id !== recordId))
      } else {
        throw new Error('Failed to delete health record')
      }
    } catch (error) {
      console.error('Error deleting health record:', error)
    } finally {
      setDeletingRecordId(null)
    }
  }

  const toggleRecordExpansion = (recordId: string) => {
    setExpandedRecords(prev => {
      const newSet = new Set(prev)
      if (newSet.has(recordId)) {
        newSet.delete(recordId)
      } else {
        newSet.add(recordId)
      }
      return newSet
    })
  }
  
  const getRecordTypeIcon = (type: string, className?: string) => {
    const iconClass = cn("flex-shrink-0", className || "w-4 h-4")
    
    switch (type) {
      case 'vaccination': return <Shield className={cn(iconClass, "text-green-600")} />
      case 'treatment': return <Pill className={cn(iconClass, "text-blue-600")} />
      case 'checkup': return <Stethoscope className={cn(iconClass, "text-purple-600")} />
      case 'injury': return <AlertTriangle className={cn(iconClass, "text-red-600")} />
      case 'illness': return <Thermometer className={cn(iconClass, "text-yellow-600")} />
      case 'reproductive': return <Heart className={cn(iconClass, "text-pink-600")} />
      case 'deworming': return <Pill className={cn(iconClass, "text-orange-600")} />
      default: return <FileText className={cn(iconClass, "text-gray-600")} />
    }
  }
  
  const getRecordTypeBgColor = (type: string) => {
    const colors: Record<string, string> = {
      'checkup': 'bg-purple-500',
      'vaccination': 'bg-green-500',
      'treatment': 'bg-blue-500',
      'injury': 'bg-red-500',
      'illness': 'bg-yellow-500',
      'reproductive': 'bg-pink-500',
      'deworming': 'bg-orange-500'
    }
    return colors[type] || 'bg-blue-500'
  }

  const getRecordTypeCardBg = (type: string) => {
    const colors: Record<string, string> = {
      'checkup': 'bg-purple-50 border-purple-200',
      'vaccination': 'bg-green-50 border-green-200',
      'treatment': 'bg-blue-50 border-blue-200',
      'injury': 'bg-red-50 border-red-200',
      'illness': 'bg-yellow-50 border-yellow-200',
      'reproductive': 'bg-pink-50 border-pink-200',
      'deworming': 'bg-orange-50 border-orange-200'
    }
    return colors[type] || 'bg-blue-50 border-blue-200'
  }

  const getRecordTypeBorderColor = (type: string) => {
    const colors: Record<string, string> = {
      'checkup': 'border-purple-200',
      'vaccination': 'border-green-200',
      'treatment': 'border-blue-200',
      'injury': 'border-red-200',
      'illness': 'border-yellow-200',
      'reproductive': 'border-pink-200',
      'deworming': 'border-orange-200'
    }
    return colors[type] || 'border-blue-200'
  }
  
  const getRecordTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      vaccination: 'Vaccination',
      treatment: 'Treatment',
      checkup: 'Health Checkup',
      injury: 'Injury',
      illness: 'Illness',
      reproductive: 'Reproductive Event',
      deworming: 'Deworming'
    }
    return labels[type] || type
  }

  const getSeverityColor = (severity?: string) => {
    switch (severity) {
      case 'high': case 'severe': return 'text-red-600 bg-red-50 border-red-200'
      case 'medium': case 'moderate': return 'text-yellow-600 bg-yellow-50 border-yellow-200'
      case 'low': case 'mild': return 'text-green-600 bg-green-50 border-green-200'
      default: return 'text-gray-600 bg-gray-50 border-gray-200'
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'improving': return '📈'
      case 'stable': return '➡️'
      case 'worsening': return '📉'
      case 'recovered': return '✅'
      case 'requires_attention': return '⚠️'
      default: return '📋'
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'improving': return 'text-green-600 bg-green-50 border-green-200'
      case 'stable': return 'text-blue-600 bg-blue-50 border-blue-200'
      case 'worsening': return 'text-red-600 bg-red-50 border-red-200'
      case 'recovered': return 'text-green-800 bg-green-100 border-green-300'
      case 'requires_attention': return 'text-orange-600 bg-orange-50 border-orange-200'
      default: return 'text-gray-600 bg-gray-50 border-gray-200'
    }
  }

  const getEffectivenessIcon = (effectiveness?: string) => {
    switch (effectiveness) {
      case 'very_effective': return '🌟'
      case 'effective': return '✅'
      case 'somewhat_effective': return '⚡'
      case 'not_effective': return '❌'
      default: return ''
    }
  }

  const formatDate = (dateString?: string) => {
    if (!dateString) return ''
    return format(new Date(dateString), 'MMM dd, yyyy')
  }

  const formatDateTime = (dateString?: string) => {
    if (!dateString) return ''
    return format(new Date(dateString), 'MMM dd, yyyy • h:mm a')
  }
  
  const filteredRecords = healthRecords.filter(record => 
    filterType === 'all' || record.record_type === filterType
  )
  
  const recordTypes = ['all', 'vaccination', 'treatment', 'checkup', 'injury', 'illness', 'reproductive', 'deworming']
  
  const summaryStats = {
    vaccinations: healthRecords.filter(r => r.record_type === 'vaccination').length,
    treatments: healthRecords.filter(r => r.record_type === 'treatment').length,
    checkups: healthRecords.filter(r => r.record_type === 'checkup').length,
    totalCost: healthRecords.reduce((sum, r) => {
      const recordCost = r.cost || 0
      const followUpsCost = (r.follow_ups || []).reduce((fSum, f) => fSum + (f.cost || 0), 0)
      return sum + recordCost + followUpsCost
    }, 0)
  }

  // Render timeline content for a record
  const renderTimelineContent = (record: HealthRecord) => {
    const followUps = record.follow_ups || []
    const isTimelineRecord = ['illness', 'injury', 'treatment', 'checkup', 'vaccination', 'reproductive', 'deworming'].includes(record.record_type)
    const cumulativeCost = (record.cost || 0) + followUps.reduce((sum, f) => sum + (f.cost || 0), 0)

    return (
      <div className="space-y-4">
        {/* Initial Record */}
        {isTimelineRecord && (
          <div className="relative">
            {followUps.length > 0 && (
              <div className="absolute left-4 top-12 bottom-0 w-0.5 bg-gray-200" />
            )}

            <div className="flex items-start space-x-3">
              <div className="flex-shrink-0 mt-1">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center z-10 relative ${getRecordTypeBgColor(record.record_type)}`}>
                  <FileText className="w-4 h-4 text-white" />
                </div>
              </div>

              <div className={`flex-1 border rounded-lg p-4 ${getRecordTypeCardBg(record.record_type)}`}>
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <h5 className="font-semibold text-gray-900 text-sm mb-1">
                      {getRecordTypeLabel(record.record_type)}
                    </h5>
                    <p className="text-xs text-gray-600 flex items-center space-x-1">
                      <Calendar className="w-3 h-3" />
                      <span>{formatDateTime(record.record_date)}</span>
                    </p>
                  </div>
                  {(record.severity || record.illness_severity) && (
                    <Badge className={`${getSeverityColor(record.severity || record.illness_severity)} text-xs`}>
                      {(record.severity || record.illness_severity)?.toUpperCase()}
                    </Badge>
                  )}
                </div>

                {/* Type-specific rendering */}
                <div className="space-y-3">
                  {/* Common fields */}
                  {record.description && (
                    <div>
                      <p className="text-xs font-semibold text-gray-700 mb-1">Description:</p>
                      <p className="text-sm text-gray-800">{record.description}</p>
                    </div>
                  )}

                  {/* Checkup specifics */}
                  {record.record_type === 'checkup' && (
                    <>
                      {(record.temperature || record.pulse || record.respiration) && (
                        <div>
                          <p className="text-xs font-semibold text-gray-700 mb-1 flex items-center space-x-1">
                            <Thermometer className="w-3 h-3" />
                            <span>Vitals:</span>
                          </p>
                          <p className="text-sm text-gray-800">
                            {[
                              record.temperature && `Temp ${record.temperature}°C`,
                              record.pulse && `Pulse ${record.pulse} bpm`,
                              record.respiration && `Resp ${record.respiration}/min`
                            ].filter(Boolean).join(' • ')}
                          </p>
                        </div>
                      )}
                      {(record.body_condition_score || record.weight) && (
                        <div>
                          <p className="text-xs font-semibold text-gray-700 mb-1">Body Condition:</p>
                          <p className="text-sm text-gray-800">
                            {[
                              record.body_condition_score && `BCS: ${record.body_condition_score}/5`,
                              record.weight && `Weight: ${record.weight}kg`
                            ].filter(Boolean).join(' • ')}
                          </p>
                        </div>
                      )}
                    </>
                  )}

                  {/* Vaccination specifics */}
                  {record.record_type === 'vaccination' && (
                    <>
                      {record.vaccine_name && (
                        <div>
                          <p className="text-xs font-semibold text-gray-700 mb-1 flex items-center space-x-1">
                            <Syringe className="w-3 h-3" />
                            <span>Vaccine:</span>
                          </p>
                          <p className="text-sm text-gray-800">{record.vaccine_name}</p>
                        </div>
                      )}
                      {record.vaccine_batch_number && (
                        <div className="bg-white rounded p-2 border border-gray-200">
                          <p className="text-xs text-gray-600">Batch #: {record.vaccine_batch_number}</p>
                        </div>
                      )}
                    </>
                  )}

                  {/* Illness specifics */}
                  {record.record_type === 'illness' && (
                    <>
                      {record.symptoms && (
                        <div>
                          <p className="text-xs font-semibold text-gray-700 mb-1">Symptoms:</p>
                          <p className="text-sm text-gray-800">{record.symptoms}</p>
                        </div>
                      )}
                      {record.illness_diagnosis && (
                        <div>
                          <p className="text-xs font-semibold text-gray-700 mb-1">Diagnosis:</p>
                          <p className="text-sm font-medium text-gray-900">{record.illness_diagnosis}</p>
                        </div>
                      )}
                      {record.treatment_plan && (
                        <div>
                          <p className="text-xs font-semibold text-gray-700 mb-1">Treatment Plan:</p>
                          <p className="text-sm text-gray-800">{record.treatment_plan}</p>
                        </div>
                      )}
                    </>
                  )}

                  {/* Treatment specifics */}
                  {record.record_type === 'treatment' && (
                    <>
                      {record.medication && (
                        <div>
                          <p className="text-xs font-semibold text-gray-700 mb-1 flex items-center space-x-1">
                            <Pill className="w-3 h-3" />
                            <span>Medication:</span>
                          </p>
                          <p className="text-sm text-gray-800">
                            {[
                              record.medication,
                              record.medication_dosage,
                              record.medication_duration && `for ${record.medication_duration}`
                            ].filter(Boolean).join(' • ')}
                          </p>
                        </div>
                      )}
                      {record.withdrawal_period && (
                        <div className="bg-yellow-50 rounded p-2 border border-yellow-200">
                          <p className="text-xs text-yellow-800">
                            <strong>⚠️ Withdrawal Period:</strong> {record.withdrawal_period}
                          </p>
                        </div>
                      )}
                    </>
                  )}
                </div>

                {/* Footer */}
                <div className={`flex items-center justify-between text-xs text-gray-600 pt-3 mt-3 border-t ${getRecordTypeBorderColor(record.record_type)}`}>
                  {record.veterinarian && (
                    <div className="flex items-center space-x-1">
                      <User className="w-3 h-3" />
                      <span>{record.veterinarian}</span>
                    </div>
                  )}
                  {record.cost && record.cost > 0 && (
                    <div className="flex items-center space-x-1">
                      <DollarSign className="w-3 h-3" />
                      <span>Ksh {record.cost.toFixed(2)}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Follow-ups */}
        {followUps.map((followUp, index) => {
          const isLast = index === followUps.length - 1

          return (
            <div key={followUp.id} className="relative">
              {!isLast && isTimelineRecord && (
                <div className="absolute left-4 top-12 bottom-0 w-0.5 bg-gray-200" />
              )}

              <div className="flex items-start space-x-3">
                <div className="flex-shrink-0 mt-1">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center z-10 relative ${
                    followUp.is_resolved
                      ? 'bg-green-500'
                      : followUp.follow_up_status === 'improving'
                        ? 'bg-blue-500'
                        : followUp.follow_up_status === 'worsening'
                          ? 'bg-red-500'
                          : 'bg-gray-400'
                  }`}>
                    {followUp.is_resolved ? (
                      <CheckCircle className="w-4 h-4 text-white" />
                    ) : followUp.follow_up_status === 'improving' ? (
                      <TrendingUp className="w-4 h-4 text-white" />
                    ) : followUp.follow_up_status === 'worsening' ? (
                      <TrendingDown className="w-4 h-4 text-white" />
                    ) : (
                      <Activity className="w-4 h-4 text-white" />
                    )}
                  </div>
                </div>

                <div className={`flex-1 rounded-lg p-4 border-l-2 ${
                  followUp.is_resolved
                    ? 'border-l-green-400 bg-green-50'
                    : 'border-l-blue-400 bg-blue-50'
                }`}>
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1">
                      <h5 className="font-semibold text-gray-900 text-sm">
                        Follow-up {followUps.length - index}
                      </h5>
                      <p className="text-xs text-gray-600 flex items-center space-x-1 mt-1">
                        <Calendar className="w-3 h-3" />
                        <span>{formatDateTime(followUp.record_date)}</span>
                      </p>
                    </div>
                    <div className="flex flex-col items-end space-y-1">
                      <Badge className={`text-xs ${getStatusColor(followUp.follow_up_status)} border`}>
                        {getStatusIcon(followUp.follow_up_status)} {followUp.follow_up_status.replace('_', ' ')}
                      </Badge>
                      {followUp.is_resolved && (
                        <Badge className="text-xs bg-green-100 text-green-800">
                          <CheckCircle className="w-3 h-3 mr-1" />
                          Resolved
                        </Badge>
                      )}
                    </div>
                  </div>

                  <div className="space-y-2">
                    {followUp.description && (
                      <div>
                        <p className="text-xs font-semibold text-gray-700 mb-1">Progress Update:</p>
                        <p className="text-sm text-gray-800">{followUp.description}</p>
                      </div>
                    )}

                    {followUp.treatment_effectiveness && (
                      <div className="flex items-center space-x-2">
                        <span className="text-xs font-medium text-gray-600">Treatment Response:</span>
                        <Badge variant="outline" className="text-xs">
                          {getEffectivenessIcon(followUp.treatment_effectiveness)}
                          {followUp.treatment_effectiveness.replace('_', ' ')}
                        </Badge>
                      </div>
                    )}

                    {followUp.medication && (
                      <div>
                        <p className="text-xs font-semibold text-gray-700 mb-1">Treatment Update:</p>
                        <p className="text-sm text-gray-800">{followUp.medication}</p>
                      </div>
                    )}

                    {followUp.next_followup_date && !followUp.is_resolved && (
                      <div className="bg-white rounded p-2 flex items-center space-x-2 border border-gray-200">
                        <Clock className="w-3 h-3 text-gray-600" />
                        <span className="text-xs text-gray-700">
                          Next check: {formatDate(followUp.next_followup_date)}
                        </span>
                      </div>
                    )}

                    <div className="flex items-center justify-between text-xs text-gray-600 pt-2 border-t border-gray-200">
                      {followUp.veterinarian && (
                        <div className="flex items-center space-x-1">
                          <User className="w-3 h-3" />
                          <span>{followUp.veterinarian}</span>
                        </div>
                      )}
                      {followUp.cost && followUp.cost > 0 && (
                        <div className="flex items-center space-x-1">
                          <DollarSign className="w-3 h-3" />
                          <span>Ksh {followUp.cost.toFixed(2)}</span>
                        </div>
                      )}
                    </div>

                    {followUp.notes && (
                      <div className="pt-2 border-t border-gray-200">
                        <p className="text-xs text-gray-600">{followUp.notes}</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )
        })}

        {/* Total Cost Summary */}
        {isTimelineRecord && cumulativeCost > 0 && (
          <div className="bg-gray-100 rounded-lg p-3 flex items-center justify-between">
            <span className="text-sm font-medium text-gray-700">Total Treatment Cost:</span>
            <span className="text-lg font-bold text-gray-900">Ksh {cumulativeCost.toFixed(2)}</span>
          </div>
        )}
      </div>
    )
  }
  
  if (loading) {
    return (
      <Card>
        <CardContent className="flex justify-center items-center py-12">
          <LoadingSpinner size="lg" />
        </CardContent>
      </Card>
    )
  }
  
  return (
    <div className={cn("space-y-4", isMobile ? "space-y-4" : "space-y-6")}>
      {/* Header */}
      <div className={cn(
        "flex justify-between",
        isMobile ? "flex-col space-y-3" : "items-center"
      )}>
        <div>
          <h3 className={cn(
            "font-semibold text-gray-900",
            isMobile ? "text-lg" : "text-xl"
          )}>
            Health Timeline
          </h3>
          <p className={cn(
            "text-gray-600",
            isMobile ? "text-sm" : "text-sm"
          )}>
            Complete medical history with follow-ups
          </p>
        </div>
        
        {canAddRecords && (
          <Button 
            onClick={() => setShowAddModal(true)}
            size={isMobile ? "default" : "default"}
            className={cn(isMobile && "w-full")}
          >
            <Plus className="mr-2 h-4 w-4" />
            Add Health Record
          </Button>
        )}
      </div>
      
      {/* Summary Stats */}
      <div className={cn(
        "grid gap-3",
        isMobile ? "grid-cols-2" : "grid-cols-1 md:grid-cols-4 gap-4"
      )}>
        <Card>
          <CardContent className={cn(isMobile ? "p-3" : "p-4")}>
            <div className="flex items-center space-x-2">
              <Shield className={cn("text-green-600", isMobile ? "w-4 h-4" : "w-5 h-5")} />
              <div>
                <p className={cn("text-gray-600", isMobile ? "text-xs" : "text-sm")}>
                  Vaccinations
                </p>
                <p className={cn("font-semibold", isMobile ? "text-sm" : "text-lg")}>
                  {summaryStats.vaccinations}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className={cn(isMobile ? "p-3" : "p-4")}>
            <div className="flex items-center space-x-2">
              <Pill className={cn("text-blue-600", isMobile ? "w-4 h-4" : "w-5 h-5")} />
              <div>
                <p className={cn("text-gray-600", isMobile ? "text-xs" : "text-sm")}>
                  Treatments
                </p>
                <p className={cn("font-semibold", isMobile ? "text-sm" : "text-lg")}>
                  {summaryStats.treatments}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className={cn(isMobile ? "p-3" : "p-4")}>
            <div className="flex items-center space-x-2">
              <Stethoscope className={cn("text-purple-600", isMobile ? "w-4 h-4" : "w-5 h-5")} />
              <div>
                <p className={cn("text-gray-600", isMobile ? "text-xs" : "text-sm")}>
                  Checkups
                </p>
                <p className={cn("font-semibold", isMobile ? "text-sm" : "text-lg")}>
                  {summaryStats.checkups}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className={cn(isMobile ? "p-3" : "p-4")}>
            <div className="flex items-center space-x-2">
              <DollarSign className={cn("text-green-600", isMobile ? "w-4 h-4" : "w-5 h-5")} />
              <div>
                <p className={cn("text-gray-600", isMobile ? "text-xs" : "text-sm")}>
                  Total Cost
                </p>
                <p className={cn("font-semibold", isMobile ? "text-sm" : "text-lg")}>
                  Ksh {summaryStats.totalCost.toFixed(0)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
      
      {/* Filter Options */}
      {!isMobile && filteredRecords.length > 0 && (
        <div className="flex items-center space-x-2 overflow-x-auto pb-2">
          <Filter className="w-4 h-4 text-gray-500" />
          {recordTypes.map((type) => (
            <Button
              key={type}
              variant={filterType === type ? "default" : "outline"}
              size="sm"
              onClick={() => setFilterType(type)}
              className="whitespace-nowrap"
            >
              {type !== 'all' && getRecordTypeIcon(type, "w-3 h-3 mr-1")}
              {type === 'all' ? 'All Records' : getRecordTypeLabel(type)}
            </Button>
          ))}
        </div>
      )}

      {/* Mobile Filter */}
      {isMobile && filteredRecords.length > 0 && (
        <Card>
          <CardContent className="p-3">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowFilters(!showFilters)}
              className="w-full justify-between"
            >
              <div className="flex items-center">
                <Filter className="w-4 h-4 mr-2" />
                Filter ({filterType === 'all' ? 'All Records' : getRecordTypeLabel(filterType)})
              </div>
              {showFilters ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </Button>
            
            {showFilters && (
              <div className="grid grid-cols-2 gap-2 mt-3">
                {recordTypes.map((type) => (
                  <Button
                    key={type}
                    variant={filterType === type ? "default" : "outline"}
                    size="sm"
                    onClick={() => {
                      setFilterType(type)
                      setShowFilters(false)
                    }}
                    className="justify-start text-xs"
                  >
                    {type !== 'all' && getRecordTypeIcon(type, "w-3 h-3 mr-1")}
                    {type === 'all' ? 'All' : getRecordTypeLabel(type)}
                  </Button>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}
      
      {/* Timeline Records */}
      <div className="space-y-4">
        {filteredRecords.length === 0 ? (
          <Card>
            <CardContent className={cn("text-center", isMobile ? "py-8" : "py-12")}>
              <Heart className={cn("mx-auto text-gray-400", isMobile ? "h-10 w-10" : "h-12 w-12")} />
              <h3 className={cn("mt-2 font-medium text-gray-900", isMobile ? "text-sm" : "text-base")}>
                {filterType === 'all' ? 'No health records yet' : `No ${getRecordTypeLabel(filterType).toLowerCase()} records`}
              </h3>
              <p className={cn("mt-1 text-gray-500", isMobile ? "text-xs" : "text-sm")}>
                {filterType === 'all' 
                  ? "Start tracking this animal's health journey."
                  : `No ${getRecordTypeLabel(filterType).toLowerCase()} records found.`
                }
              </p>
              {canAddRecords && filterType === 'all' && (
                <Button 
                  onClick={() => setShowAddModal(true)}
                  className="mt-4"
                  size={isMobile ? "sm" : "default"}
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Add First Record
                </Button>
              )}
            </CardContent>
          </Card>
        ) : (
          filteredRecords.map((record) => {
            const isExpanded = expandedRecords.has(record.id)
            const hasFollowUps = (record.follow_ups || []).length > 0
            const isResolved = record.is_resolved || (record.follow_ups || []).some(f => f.is_resolved)
            const shouldShowFollowUp = ['illness', 'injury', 'treatment', 'checkup', 'vaccination', 'reproductive', 'deworming'].includes(record.record_type)
            const isOverdue = record.next_due_date && new Date(record.next_due_date) < new Date()
            const latestFollowUp = record.follow_ups?.[0]
            const currentStatus = latestFollowUp?.follow_up_status || (isResolved ? 'recovered' : 'stable')

            return (
              <Card 
                key={record.id}
                className={cn(
                  "border-l-4 transition-all",
                  isResolved
                    ? 'border-l-green-500'
                    : isOverdue
                      ? 'border-l-red-500 ring-2 ring-red-200'
                      : 'border-l-farm-green'
                )}
              >
                <CardHeader className={cn(isMobile ? "p-4 pb-3" : "pb-3")}>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-2">
                        {getRecordTypeIcon(record.record_type)}
                        <CardTitle className={cn(isMobile ? "text-base" : "text-lg")}>
                          {getRecordTypeLabel(record.record_type)}
                        </CardTitle>
                      </div>
                      
                      <div className="flex flex-wrap items-center gap-2">
                        {(record.severity || record.illness_severity) && (
                          <Badge className={`${getSeverityColor(record.severity || record.illness_severity)} text-xs`}>
                            {(record.severity || record.illness_severity)?.toUpperCase()}
                          </Badge>
                        )}
                        {isResolved && (
                          <Badge className="bg-green-100 text-green-800 border-green-200 text-xs">
                            <CheckCircle className="w-3 h-3 mr-1" />
                            Resolved
                          </Badge>
                        )}
                        {hasFollowUps && (
                          <Badge variant="outline" className="text-xs">
                            <Activity className="w-3 h-3 mr-1" />
                            {record.follow_ups?.length} Follow-up{(record.follow_ups?.length || 0) !== 1 ? 's' : ''}
                          </Badge>
                        )}
                        {hasFollowUps && (
                          <Badge className={`${getStatusColor(currentStatus)} text-xs border`}>
                            {getStatusIcon(currentStatus)}
                          </Badge>
                        )}
                        {isOverdue && !isResolved && (
                          <Badge variant="destructive" className="text-xs">
                            <AlertTriangle className="w-3 h-3 mr-1" />
                            Overdue
                          </Badge>
                        )}
                      </div>
                    </div>
                    
                    {canAddRecords && (
                      <div className="flex items-center space-x-1 ml-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEdit(record)}
                          className="h-8 w-8 p-0 text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDelete(record.id)}
                          disabled={deletingRecordId === record.id}
                          className="h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
                        >
                          {deletingRecordId === record.id ? (
                            <LoadingSpinner size="sm" />
                          ) : (
                            <Trash2 className="h-4 w-4" />
                          )}
                        </Button>
                      </div>
                    )}
                  </div>
                </CardHeader>
                
                <CardContent className={cn(isMobile ? "p-4 pt-0" : "pt-0")}>
                  {/* Collapsed View - Summary */}
                  {!isExpanded && (
                    <div className="space-y-3">
                      <div className="text-sm text-gray-700 bg-gray-50 p-3 rounded-lg">
                        <p className="line-clamp-2">{record.description}</p>
                      </div>
                      
                      <div className="flex items-center justify-between text-sm text-gray-600">
                        <div className="flex items-center space-x-1">
                          <Calendar className="w-4 h-4" />
                          <span>{formatDate(record.record_date)}</span>
                        </div>
                        
                        {record.cost && record.cost > 0 && (
                          <div className="flex items-center space-x-1">
                            <DollarSign className="w-4 h-4" />
                            <span>Ksh {record.cost.toFixed(2)}</span>
                          </div>
                        )}
                      </div>
                      
                      {hasFollowUps && (
                        <div className="text-xs text-gray-500 text-center pt-2 border-t">
                          Click "View Timeline" to see {record.follow_ups?.length} follow-up record{(record.follow_ups?.length || 0) !== 1 ? 's' : ''}
                        </div>
                      )}
                    </div>
                  )}
                  
                  {/* Expanded View - Full Timeline */}
                  {isExpanded && (
                    <div className="space-y-4">
                      {renderTimelineContent(record)}
                      
                      {record.notes && (
                        <div className="pt-4 border-t">
                          <p className="text-sm font-medium text-gray-700 mb-2">Additional Notes:</p>
                          <p className="text-sm text-gray-600 whitespace-pre-wrap">{record.notes}</p>
                        </div>
                      )}
                    </div>
                  )}
                  
                  {/* Action Buttons */}
                  <div className="flex items-center justify-between pt-4 border-t mt-4">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => toggleRecordExpansion(record.id)}
                      className="flex items-center space-x-1"
                    >
                      {isExpanded ? (
                        <>
                          <ChevronUp className="w-4 h-4" />
                          <span>Collapse</span>
                        </>
                      ) : (
                        <>
                          <ChevronDown className="w-4 h-4" />
                          <span>View Timeline</span>
                        </>
                      )}
                    </Button>
                    
                    {canAddRecords && shouldShowFollowUp && !isResolved && (
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={() => handleFollowUp(record)}
                        className="text-green-600 hover:text-green-700 hover:bg-green-50 flex items-center space-x-1"
                      >
                        <Activity className="w-4 h-4" />
                        <span>Add Follow-up</span>
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            )
          })
        )}
      </div>
      
      {/* Modals */}
      {showAddModal && (
        <AddHealthRecordModal
          farmId={farmId}
          animals={animals}
          isOpen={showAddModal}
          onClose={() => setShowAddModal(false)}
          onRecordAdded={handleRecordAdded}
          preSelectedAnimalId={animalId}
        />
      )}

      {showFollowUpModal && selectedRecord && (
        <FollowUpHealthRecordModal
          farmId={farmId}
          originalRecord={selectedRecord}
          isOpen={showFollowUpModal}
          onClose={() => {
            setShowFollowUpModal(false)
            setSelectedRecord(null)
          }}
          onFollowUpAdded={handleFollowUpAdded}
        />
      )}

      {showEditModal && selectedRecord && (
        <EditHealthRecordModal
          record={selectedRecord}
          farmId={farmId}
          animals={animals}
          isOpen={showEditModal}
          onClose={() => {
            setShowEditModal(false)
            setSelectedRecord(null)
          }}
          onRecordUpdated={handleRecordUpdated}
        />
      )}
    </div>
  )
}