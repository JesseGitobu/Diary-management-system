// Enhanced HealthRecordCard with Desktop List View and Mobile Modal
// src/components/health/HealthRecordCard.tsx

'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { Modal } from '@/components/ui/Modal'
import { useDeviceInfo } from '@/lib/hooks/useDeviceInfo'
import {
  Calendar,
  DollarSign,
  Edit,
  Trash2,
  User,
  Clock,
  AlertTriangle,
  Activity,
  CheckCircle,
  ChevronDown,
  ChevronRight,
  MessageSquare,
  FileText,
  TrendingUp,
  TrendingDown,
  Thermometer,
  Stethoscope,
  Pill,
  Syringe,
  Heart,
  X,
  Maximize2
} from 'lucide-react'
import { format } from 'date-fns'

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

interface HealthRecordCardProps {
  record: {
    id: string
    record_date: string
    record_type: string
    description: string
    veterinarian?: string
    cost?: number
    notes?: string
    next_due_date?: string
    medication?: string
    severity?: string
    is_resolved?: boolean
    resolved_date?: string
    physical_exam_notes?: string
    treatment_route?: string
    withdrawal_period?: string
    deworming_dose?: string
    animals: {
      id: string
      tag_number: string
      name?: string
      breed?: string
    }
    created_at?: string
    updated_at?: string
    follow_ups?: FollowUpRecord[]
    symptoms?: string
    illness_diagnosis?: string
    illness_severity?: string
    lab_test_results?: string
    treatment_plan?: string
    recovery_outcome?: string
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
    sire_id?: string
    pregnancy_result?: 'pending' | 'yes' | 'no'
    calving_outcome?: string
    complications?: string
  }
  onEdit: (recordId: string) => void
  onDelete: (recordId: string) => void
  onFollowUp?: (record: any) => void
  canEdit: boolean
  isDeleting?: boolean
  showFollowUp?: boolean
}

export function HealthRecordCard({
  record,
  onEdit,
  onDelete,
  onFollowUp,
  canEdit,
  isDeleting = false,
  showFollowUp = false
}: HealthRecordCardProps) {
  const [expanded, setExpanded] = useState(false)
  const [showModal, setShowModal] = useState(false)
  const [followUps, setFollowUps] = useState<FollowUpRecord[]>(record.follow_ups || [])
  const [loadingFollowUps, setLoadingFollowUps] = useState(false)

  const { isMobile, isTablet } = useDeviceInfo()
  const useModalView = isMobile || isTablet

  useEffect(() => {
    // Load follow-ups when expanded/modal opens, OR when record.follow_ups changes
    if ((expanded || showModal)) {
      if (!record.follow_ups || record.follow_ups.length === 0) {
        loadFollowUps()
      } else {
        // Update local state with the latest follow-ups from props
        setFollowUps(record.follow_ups)
      }
    }
  }, [expanded, showModal, record.id, record.follow_ups]) // Add record.follow_ups to dependencies

  const loadFollowUps = async () => {
    setLoadingFollowUps(true)
    try {
      const response = await fetch(`/api/health/records/${record.id}/follow-ups`)
      if (response.ok) {
        const data = await response.json()
        setFollowUps(data.followUps || []) // This should now work correctly
      }
    } catch (error) {
      console.error('Error loading follow-ups:', error)
    } finally {
      setLoadingFollowUps(false)
    }
  }

  const handleExpandClick = () => {
    if (useModalView) {
      setShowModal(true)
    } else {
      setExpanded(!expanded)
    }
  }

  const handleCloseModal = () => {
    setShowModal(false)
  }

  const getRecordTypeIcon = (type: string) => {
    switch (type) {
      case 'vaccination': return '💉'
      case 'treatment': return '💊'
      case 'checkup': return '🩺'
      case 'injury': return '🩹'
      case 'illness': return '🤒'
      case 'reproductive': return '🤱'
      case 'deworming': return '🪱'
      default: return '📋'
    }
  }

  const getRecordTypeColor = (type: string) => {
    switch (type) {
      case 'vaccination': return 'bg-green-100 text-green-800 border-green-200'
      case 'treatment': return 'bg-blue-100 text-blue-800 border-blue-200'
      case 'checkup': return 'bg-purple-100 text-purple-800 border-purple-200'
      case 'injury': return 'bg-red-100 text-red-800 border-red-200'
      case 'illness': return 'bg-yellow-100 text-yellow-800 border-yellow-200'
      case 'reproductive': return 'bg-pink-100 text-pink-800 border-pink-200'
      case 'deworming': return 'bg-orange-100 text-orange-800 border-orange-200'
      default: return 'bg-gray-100 text-gray-800 border-gray-200'
    }
  }

  const getSeverityColor = (severity?: string) => {
    switch (severity) {
      case 'high': return 'text-red-600 bg-red-50 border-red-200'
      case 'medium': return 'text-yellow-600 bg-yellow-50 border-yellow-200'
      case 'low': return 'text-green-600 bg-green-50 border-green-200'
      case 'severe': return 'text-red-600 bg-red-50 border-red-200'
      case 'moderate': return 'text-yellow-600 bg-yellow-50 border-yellow-200'
      case 'mild': return 'text-green-600 bg-green-50 border-green-200'
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
    if (isMobile) {
      return format(new Date(dateString), 'MM/dd/yy')
    }
    return format(new Date(dateString), 'MM/dd/yyyy')
  }

  const isOverdue = record.next_due_date && new Date(record.next_due_date) < new Date()
  const isDueSoon = record.next_due_date &&
    new Date(record.next_due_date) <= new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) &&
    new Date(record.next_due_date) >= new Date()

  const shouldShowFollowUp = showFollowUp || [
    'illness',
    'injury',
    'treatment',
    'checkup',
    'vaccination',    // Add these
    'reproductive',   // Add these
    'deworming'       // Add these
  ].includes(record.record_type)
  const hasFollowUps = followUps.length > 0
  const isResolved = record.is_resolved || followUps.some(f => f.is_resolved)

  const cumulativeCost = (record.cost || 0) + followUps.reduce((sum, f) => sum + (f.cost || 0), 0)
  const isTimelineRecord = [
    'illness',
    'injury',
    'treatment',
    'checkup',
    'vaccination',
    'reproductive',
    'deworming'
  ].includes(record.record_type)
  const latestFollowUp = followUps[0]
  const currentStatus = latestFollowUp?.follow_up_status || (isResolved ? 'recovered' : 'stable')

  // Render timeline content for expanded view
  const renderTimelineContent = () => (
    <div className="space-y-4 max-h-[400px] overflow-y-auto pr-2">
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
              <div className="flex items-start justify-between mb-2">
                <div className="flex-1 min-w-0">
                  <h5 className="font-semibold text-gray-900 text-sm">
                    {getRecordTypeLabel(record.record_type)}
                  </h5>
                  <p className="text-xs text-gray-600">{formatDate(record.record_date)}</p>
                </div>
                {record.severity && (
                  <Badge className={`${getSeverityColor(record.severity)} text-xs`}>
                    {record.severity.toUpperCase()}
                  </Badge>
                )}
                {record.illness_severity && (
                  <Badge className={`${getSeverityColor(record.illness_severity)} text-xs`}>
                    {record.illness_severity.toUpperCase()}
                  </Badge>
                )}
              </div>

              {/* CHECKUP RENDERING */}
              {record.record_type === 'checkup' && (
                <div className="space-y-3">
                  {(record.temperature || record.pulse || record.respiration) && (
                    <div>
                      <p className="text-xs font-semibold text-gray-900 mb-1 flex items-center space-x-1">
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
                      <p className="text-xs font-semibold text-gray-900 mb-1">Body Condition:</p>
                      <p className="text-sm text-gray-800">
                        {[
                          record.body_condition_score && `BCS: ${record.body_condition_score}/5`,
                          record.weight && `Weight: ${record.weight}kg`
                        ].filter(Boolean).join(' • ')}
                      </p>
                    </div>
                  )}

                  {(record.physical_exam_notes || record.description) && (
                    <div>
                      <p className="text-xs font-semibold text-gray-900 mb-1">Examination:</p>
                      <p className="text-sm text-gray-800">
                        {record.physical_exam_notes || record.description}
                      </p>
                    </div>
                  )}
                </div>
              )}

              {/* VACCINATION RENDERING */}
              {record.record_type === 'vaccination' && (
                <div className="space-y-3">
                  {record.vaccine_name && (
                    <div>
                      <p className="text-xs font-semibold text-gray-900 mb-1 flex items-center space-x-1">
                        <Syringe className="w-3 h-3" />
                        <span>Vaccine:</span>
                      </p>
                      <p className="text-sm text-gray-800">{record.vaccine_name}</p>
                    </div>
                  )}

                  {(record.vaccine_dose || record.route_of_administration) && (
                    <div>
                      <p className="text-xs font-semibold text-gray-900 mb-1">Administration:</p>
                      <p className="text-sm text-gray-800">
                        {[
                          record.vaccine_dose && `Dose: ${record.vaccine_dose}`,
                          record.route_of_administration && `Route: ${record.route_of_administration}`
                        ].filter(Boolean).join(' • ')}
                      </p>
                    </div>
                  )}

                  {record.vaccine_batch_number && (
                    <div className="bg-white rounded p-2 border border-gray-200">
                      <p className="text-xs text-gray-600">Batch #: {record.vaccine_batch_number}</p>
                    </div>
                  )}

                  {record.description && (
                    <div>
                      <p className="text-xs font-semibold text-gray-900 mb-1">Notes:</p>
                      <p className="text-sm text-gray-800">{record.description}</p>
                    </div>
                  )}

                  {record.next_due_date && (
                    <div className="bg-green-50 rounded p-2 flex items-center space-x-2 border border-green-200">
                      <Calendar className="w-3 h-3 text-green-600" />
                      <span className="text-xs text-green-700">
                        Next dose: {formatDate(record.next_due_date)}
                      </span>
                    </div>
                  )}
                </div>
              )}

              {/* TREATMENT RENDERING */}
              {record.record_type === 'treatment' && (
                <div className="space-y-3">
                  {record.illness_diagnosis && (
                    <div>
                      <p className="text-xs font-semibold text-gray-900 mb-1 flex items-center space-x-1">
                        <Stethoscope className="w-3 h-3" />
                        <span>Diagnosis:</span>
                      </p>
                      <p className="text-sm font-medium text-gray-900">{record.illness_diagnosis}</p>
                    </div>
                  )}

                  {record.medication && (
                    <div>
                      <p className="text-xs font-semibold text-gray-900 mb-1 flex items-center space-x-1">
                        <Pill className="w-3 h-3" />
                        <span>Medication:</span>
                      </p>
                      <p className="text-sm text-gray-800">
                        {[
                          record.medication,
                          record.medication_dosage && `${record.medication_dosage}`,
                          record.medication_duration && `for ${record.medication_duration}`
                        ].filter(Boolean).join(' • ')}
                      </p>
                      {/* Show general medication field if it exists and is different */}
                      {record.medication && (
                        <p className="text-xs text-gray-600 mt-1">{record.medication}</p>
                      )}
                    </div>
                  )}

                  {record.treatment_route && (
                    <div className="bg-white rounded p-2 border border-gray-200">
                      <p className="text-xs text-gray-600">
                        <strong>Route:</strong> {record.treatment_route}
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

                  {record.veterinarian && (
                    <div>
                      <p className="text-xs text-gray-600">
                        <strong>Administered by:</strong> {record.veterinarian}
                      </p>
                    </div>
                  )}

                  {record.notes && (
                    <div>
                      <p className="text-xs font-semibold text-gray-900 mb-1">Response/Progress:</p>
                      <p className="text-sm text-gray-800">{record.notes}</p>
                    </div>
                  )}

                  {record.description && !record.notes && (
                    <div>
                      <p className="text-xs font-semibold text-gray-900 mb-1">Notes:</p>
                      <p className="text-sm text-gray-800">{record.description}</p>
                    </div>
                  )}
                </div>
              )}

              {/* INJURY RENDERING */}
              {record.record_type === 'injury' && (
                <div className="space-y-3">
                  {(record.injury_type || record.injury_cause) && (
                    <div>
                      <p className="text-xs font-semibold text-gray-900 mb-1">Injury Details:</p>
                      <p className="text-sm text-gray-800">
                        {[
                          record.injury_type && `Type: ${record.injury_type}`,
                          record.injury_cause && `Cause: ${record.injury_cause}`
                        ].filter(Boolean).join(' • ')}
                      </p>
                    </div>
                  )}

                  {record.description && (
                    <div>
                      <p className="text-xs font-semibold text-gray-900 mb-1">Description:</p>
                      <p className="text-sm text-gray-800">{record.description}</p>
                    </div>
                  )}

                  {record.treatment_given && (
                    <div>
                      <p className="text-xs font-semibold text-gray-900 mb-1 flex items-center space-x-1">
                        <Pill className="w-3 h-3" />
                        <span>Treatment Given:</span>
                      </p>
                      <p className="text-sm text-gray-800">{record.treatment_given}</p>
                    </div>
                  )}
                </div>
              )}

              {/* ILLNESS RENDERING */}
              {record.record_type === 'illness' && (
                <div className="space-y-3">
                  {record.symptoms && (
                    <div>
                      <p className="text-xs font-semibold text-gray-900 mb-1 flex items-center space-x-1">
                        <Thermometer className="w-3 h-3" />
                        <span>Symptoms:</span>
                      </p>
                      <p className="text-sm text-gray-800">{record.symptoms}</p>
                    </div>
                  )}

                  {record.illness_diagnosis && (
                    <div>
                      <p className="text-xs font-semibold text-gray-900 mb-1 flex items-center space-x-1">
                        <Stethoscope className="w-3 h-3" />
                        <span>Diagnosis:</span>
                      </p>
                      <p className="text-sm font-medium text-gray-900">{record.illness_diagnosis}</p>
                    </div>
                  )}

                  {record.lab_test_results && (
                    <div className="bg-white rounded p-2 border border-gray-200">
                      <p className="text-xs font-semibold text-gray-700 mb-1">Lab Results:</p>
                      <p className="text-sm text-gray-800">{record.lab_test_results}</p>
                    </div>
                  )}

                  {record.treatment_plan && (
                    <div>
                      <p className="text-xs font-semibold text-gray-900 mb-1 flex items-center space-x-1">
                        <Pill className="w-3 h-3" />
                        <span>Treatment Plan:</span>
                      </p>
                      <p className="text-sm text-gray-800">{record.treatment_plan}</p>
                    </div>
                  )}

                  {record.recovery_outcome && (
                    <div className="bg-blue-50 rounded p-2 border border-blue-200">
                      <p className="text-xs text-blue-800">
                        <strong>Outcome:</strong> {record.recovery_outcome}
                      </p>
                    </div>
                  )}

                  {record.description && !record.symptoms && (
                    <div>
                      <p className="text-xs font-semibold text-gray-900 mb-1">Notes:</p>
                      <p className="text-sm text-gray-800">{record.description}</p>
                    </div>
                  )}
                </div>
              )}

              {/* REPRODUCTIVE RENDERING */}
              {record.record_type === 'reproductive' && (
                <div className="space-y-3">
                  {record.reproductive_type && (
                    <div>
                      <p className="text-xs font-semibold text-gray-900 mb-1 flex items-center space-x-1">
                        <Heart className="w-3 h-3" />
                        <span>Type:</span>
                      </p>
                      <p className="text-sm text-gray-800">{record.reproductive_type}</p>
                    </div>
                  )}

                  {record.sire_id && (
                    <div>
                      <p className="text-xs text-gray-600">Sire ID: {record.sire_id}</p>
                    </div>
                  )}

                  {record.pregnancy_result && record.pregnancy_result !== 'pending' && (
                    <div className={`rounded p-2 border ${record.pregnancy_result === 'yes'
                        ? 'bg-green-50 border-green-200'
                        : 'bg-gray-50 border-gray-200'
                      }`}>
                      <p className={`text-xs font-medium ${record.pregnancy_result === 'yes' ? 'text-green-800' : 'text-gray-700'
                        }`}>
                        Pregnancy: {record.pregnancy_result === 'yes' ? 'Confirmed' : 'Not Confirmed'}
                      </p>
                    </div>
                  )}

                  {record.calving_outcome && (
                    <div>
                      <p className="text-xs font-semibold text-gray-900 mb-1">Calving Outcome:</p>
                      <p className="text-sm text-gray-800">{record.calving_outcome}</p>
                    </div>
                  )}

                  {record.complications && (
                    <div className="bg-orange-50 rounded p-2 border border-orange-200">
                      <p className="text-xs text-orange-800">
                        <strong>Complications:</strong> {record.complications}
                      </p>
                    </div>
                  )}

                  {record.description && (
                    <div>
                      <p className="text-xs font-semibold text-gray-900 mb-1">Details:</p>
                      <p className="text-sm text-gray-800">{record.description}</p>
                    </div>
                  )}
                </div>
              )}

              {/* DEWORMING RENDERING */}
              {record.record_type === 'deworming' && (
                <div className="space-y-3">
                  {record.product_used && (
                    <div>
                      <p className="text-xs font-semibold text-gray-900 mb-1 flex items-center space-x-1">
                        <Pill className="w-3 h-3" />
                        <span>Product:</span>
                      </p>
                      <p className="text-sm text-gray-800">{record.product_used}</p>
                    </div>
                  )}

                  {record.deworming_dose && (
                    <div>
                      <p className="text-xs text-gray-600">Dose: {record.deworming_dose}</p>
                    </div>
                  )}

                  {record.veterinarian && (
                    <div>
                      <p className="text-xs text-gray-600">
                        Administered by: {record.veterinarian}
                      </p>
                    </div>
                  )}

                  {record.description && (
                    <div>
                      <p className="text-xs font-semibold text-gray-900 mb-1">Notes:</p>
                      <p className="text-sm text-gray-800">{record.description}</p>
                    </div>
                  )}

                  {record.next_due_date && (
                    <div className="bg-orange-50 rounded p-2 flex items-center space-x-2 border border-orange-200">
                      <Calendar className="w-3 h-3 text-orange-600" />
                      <span className="text-xs text-orange-700">
                        Next treatment: {formatDate(record.next_due_date)}
                      </span>
                    </div>
                  )}
                </div>
              )}

              {/* Common footer for all record types */}
              <div className={`flex items-center justify-between text-xs text-gray-600 pt-2 mt-2 border-t ${getRecordTypeBorderColor(record.record_type)
                }`}>
                {record.veterinarian && (
                  <div className="flex items-center space-x-1 flex-1 min-w-0">
                    <User className="w-3 h-3" />
                    <span className="truncate">{record.veterinarian}</span>
                  </div>
                )}
                {record.cost && record.cost > 0 && (
                  <div className="flex items-center space-x-1 ml-2">
                    <span className="font-semibold text-gray-900">Ksh</span>
                    <span>{record.cost.toFixed(0)}</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {followUps.map((followUp, index) => {
        const isLast = index === followUps.length - 1

        return (
          <div key={followUp.id} className="relative">
            {!isLast && isTimelineRecord && (
              <div className="absolute left-4 top-12 bottom-0 w-0.5 bg-gray-200" />
            )}

            <div className="flex items-start space-x-3">
              <div className="flex-shrink-0 mt-1">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center z-10 relative ${followUp.is_resolved
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

              <div className={`flex-1 rounded-lg p-4 border-l-2 ${followUp.is_resolved
                ? 'border-l-green-400 bg-green-50'
                : 'border-l-blue-400 bg-blue-50'
                }`}>
                <div className="flex items-start justify-between mb-2">
                  <div className="flex-1 min-w-0">
                    <h5 className="font-semibold text-gray-900 text-sm">
                      Follow-up {followUps.length - index}
                    </h5>
                    <p className="text-xs text-gray-600">{formatDate(followUp.record_date)}</p>
                  </div>
                  <div className="flex flex-col items-end space-y-1 ml-2">
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
                      <p className="text-xs font-medium text-gray-700 mb-1 flex items-center space-x-1">
                        <Heart className="w-3 h-3" />
                        <span>Progress/Status:</span>
                      </p>
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
                      <p className="text-xs font-medium text-gray-700 mb-1 flex items-center space-x-1">
                        <Pill className="w-3 h-3" />
                        <span>Treatment Update:</span>
                      </p>
                      <p className="text-sm text-gray-800">{followUp.medication}</p>
                    </div>
                  )}

                  {followUp.next_followup_date && !followUp.is_resolved && (
                    <div className="bg-white rounded p-2 flex items-center space-x-2 border border-gray-200">
                      <Calendar className="w-3 h-3 text-gray-600" />
                      <span className="text-xs text-gray-700">
                        Next check: {formatDate(followUp.next_followup_date)}
                      </span>
                    </div>
                  )}

                  <div className="flex items-center justify-between text-xs text-gray-600 pt-2 border-t border-gray-200">
                    {followUp.veterinarian && (
                      <div className="flex items-center space-x-1 flex-1 min-w-0">
                        <User className="w-3 h-3" />
                        <span className="truncate">{followUp.veterinarian}</span>
                      </div>
                    )}
                    {followUp.cost && followUp.cost > 0 && (
                      <div className="flex items-center space-x-1 ml-2">
                        <span className="text-xs font-medium text-gray-600">Ksh</span>
                        <span>{followUp.cost.toFixed(2)}</span>
                      </div>
                    )}
                  </div>

                  {followUp.notes && (
                    <div className="pt-1 border-t border-gray-200">
                      <p className="text-xs text-gray-600 whitespace-pre-wrap">{followUp.notes}</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )
      })}

      {isTimelineRecord && followUps.length === 0 && !loadingFollowUps && (
        <div className="text-center py-4 text-gray-500 bg-gray-50 rounded-lg border border-gray-200">
          <p className="text-sm">No follow-ups recorded yet</p>
          {canEdit && shouldShowFollowUp && onFollowUp && !isResolved && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onFollowUp(record)}
              className="mt-2 text-green-600 hover:text-green-700"
            >
              <Activity className="w-3 h-3 mr-1" />
              Add First Follow-up
            </Button>
          )}
        </div>
      )}

      {isTimelineRecord && cumulativeCost > 0 && (
        <div className="bg-gray-100 rounded-lg p-3 flex items-center justify-between">
          <span className="text-sm font-medium text-gray-700">Total Treatment Cost:</span>
          <span className="text-lg font-bold text-gray-900">Ksh {cumulativeCost.toFixed(2)}</span>
        </div>
      )}
    </div>
  )
  const getRecordTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      'checkup': 'Initial Checkup',
      'vaccination': 'Vaccination Record',
      'treatment': 'Treatment Record',
      'injury': 'Injury Record',
      'illness': 'Illness Record',
      'reproductive': 'Reproductive Record',
      'deworming': 'Deworming Record'
    }
    return labels[type] || 'Initial Record'
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

  // Desktop List View (Horizontal Card)
  if (!useModalView) {
    return (
      <div className={`bg-white border-l-4 rounded-lg shadow-sm hover:shadow-md transition-all ${isResolved
        ? 'border-l-green-500'
        : isOverdue
          ? 'border-l-red-500 ring-2 ring-red-200'
          : 'border-l-farm-green'
        }`}>
        {/* Horizontal Card Layout */}
        <div className="p-4">
          <div className="flex items-start justify-between gap-4">
            {/* Left Section - Record Type & Animal */}
            <div className="flex items-start space-x-3 min-w-[200px]">
              <span className="text-2xl">{getRecordTypeIcon(record.record_type)}</span>
              <div className="flex-1 min-w-0">
                <Badge className={`${getRecordTypeColor(record.record_type)} text-xs mb-1`}>
                  {record.record_type.charAt(0).toUpperCase() + record.record_type.slice(1)}
                </Badge>
                <h4 className="font-semibold text-sm text-gray-900 truncate">
                  {record.animals.name || `Animal ${record.animals.tag_number}`}
                </h4>
                <p className="text-xs text-gray-600">#{record.animals.tag_number}</p>
              </div>
            </div>

            {/* Middle Section - Key Info */}
            <div className="flex-1 grid grid-cols-3 gap-4">
              {/* Date */}
              <div>
                <p className="text-xs text-gray-500 mb-1">Date</p>
                <div className="flex items-center space-x-1 text-sm text-gray-900">
                  <Calendar className="w-3 h-3" />
                  <span>{formatDate(record.record_date)}</span>
                </div>
              </div>

              {/* Description/Diagnosis */}
              <div className="col-span-2">
                <p className="text-xs text-gray-500 mb-1">
                  {record.illness_diagnosis ? 'Diagnosis' : 'Description'}
                </p>
                <p className="text-sm text-gray-900 line-clamp-2">
                  {record.illness_diagnosis || record.description}
                </p>
              </div>
            </div>

            {/* Right Section - Status & Actions */}
            <div className="flex items-start space-x-3 min-w-[280px]">
              {/* Status Badges */}
              <div className="flex-1 flex flex-wrap gap-1.5">
                {record.severity && (
                  <Badge variant="outline" className={`${getSeverityColor(record.severity)} text-xs`}>
                    {record.severity.toUpperCase()}
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
                    {followUps.length}
                  </Badge>
                )}

                {isOverdue && !isResolved && (
                  <Badge variant="destructive" className="text-xs">
                    <AlertTriangle className="w-3 h-3 mr-1" />
                    Overdue
                  </Badge>
                )}

                {record.cost && record.cost > 0 && (
                  <Badge variant="outline" className="text-xs">
                    <span className="text-xs font-medium text-gray-600">Ksh </span>
                    <span className="font-semibold text-gray-800">
                      {cumulativeCost.toFixed(2)}
                    </span>
                  </Badge>
                )}
              </div>

              {/* Action Buttons */}
              <div className="flex items-center space-x-1">
                {(shouldShowFollowUp || hasFollowUps) && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleExpandClick}
                    className="h-8 w-8 p-0 text-gray-400 hover:text-gray-600 hover:bg-gray-100"
                  >
                    {expanded ? (
                      <ChevronDown className="h-4 w-4" />
                    ) : (
                      <ChevronRight className="h-4 w-4" />
                    )}
                  </Button>
                )}

                {canEdit && (
                  <>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onEdit(record.id)}
                      className="h-8 w-8 p-0 text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onDelete(record.id)}
                      disabled={isDeleting}
                      className="h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
                    >
                      {isDeleting ? (
                        <LoadingSpinner size="sm" />
                      ) : (
                        <Trash2 className="h-4 w-4" />
                      )}
                    </Button>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Additional Info Row (when needed) */}
          {(record.veterinarian || record.medication || (record.next_due_date && !isResolved)) && (
            <div className="mt-3 pt-3 border-t border-gray-100 flex items-center justify-between text-xs text-gray-600">
              <div className="flex items-center space-x-4">
                {record.veterinarian && (
                  <div className="flex items-center space-x-1">
                    <User className="w-3 h-3" />
                    <span className="truncate max-w-[150px]">{record.veterinarian}</span>
                  </div>
                )}

                {record.medication && (
                  <div className="flex items-center space-x-1">
                    <Pill className="w-3 h-3" />
                    <span className="truncate max-w-[150px]">{record.medication}</span>
                  </div>
                )}
              </div>

              {record.next_due_date && !isResolved && (
                <div className={`flex items-center space-x-1 px-2 py-1 rounded ${isOverdue
                  ? 'bg-red-50 text-red-700'
                  : isDueSoon
                    ? 'bg-yellow-50 text-yellow-700'
                    : 'bg-green-50 text-green-700'
                  }`}>
                  {isOverdue ? <AlertTriangle className="w-3 h-3" /> : <Clock className="w-3 h-3" />}
                  <span>{isOverdue ? 'Overdue: ' : 'Due: '}{formatDate(record.next_due_date)}</span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Expanded Timeline Section */}
        {expanded && (
          <div className="border-t border-gray-200 bg-gray-50 p-4">
            <div className="flex items-center justify-between mb-4">
              <h4 className="font-semibold text-gray-900 flex items-center space-x-2">
                <Activity className="w-4 h-4 text-farm-green" />
                <span>{isTimelineRecord ? 'Medical Timeline' : 'Record Details'}</span>
                {loadingFollowUps && <LoadingSpinner size="sm" />}
              </h4>

              {canEdit && shouldShowFollowUp && !isResolved && onFollowUp && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onFollowUp(record)}
                  className="text-green-600 hover:text-green-700 hover:bg-green-50"
                >
                  <Activity className="w-4 h-4 mr-1" />
                  Add Follow-up
                </Button>
              )}
            </div>

            {loadingFollowUps ? (
              <div className="flex justify-center py-8">
                <LoadingSpinner size="lg" />
              </div>
            ) : followUps.length === 0 && !isTimelineRecord ? (
              <div className="text-center py-6 text-gray-500">
                <MessageSquare className="w-8 h-8 mx-auto mb-2 text-gray-300" />
                <p className="text-sm">No follow-ups recorded yet</p>
                {canEdit && shouldShowFollowUp && onFollowUp && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onFollowUp(record)}
                    className="mt-2 text-green-600 hover:text-green-700"
                  >
                    Add First Follow-up
                  </Button>
                )}
              </div>
            ) : (
              renderTimelineContent()
            )}

            {/* Additional Notes if present */}
            {record.notes && (
              <div className="mt-4 pt-4 border-t border-gray-200">
                <p className="text-sm font-medium text-gray-700 mb-1">Additional Notes:</p>
                <p className="text-sm text-gray-600 whitespace-pre-wrap">{record.notes}</p>
              </div>
            )}
          </div>
        )}
      </div>
    )
  }

  // Mobile/Tablet View
  return (
    <>
      <Card className={`hover:shadow-lg transition-all border-l-4 ${isResolved
        ? 'border-l-green-500'
        : isOverdue
          ? 'border-l-red-500 ring-2 ring-red-200'
          : 'border-l-farm-green'
        }`}>
        <CardHeader className="pb-2 px-3 pt-3">
          <div className="flex items-start justify-between">
            <div className="flex items-center space-x-2 flex-1 min-w-0">
              <span className="text-base">{getRecordTypeIcon(record.record_type)}</span>
              <div className="flex flex-wrap items-center gap-1.5 flex-1 min-w-0">
                <Badge className={`${getRecordTypeColor(record.record_type)} text-[10px]`}>
                  {record.record_type.charAt(0).toUpperCase() + record.record_type.slice(1, 4)}
                </Badge>

                {record.severity && (
                  <Badge variant="outline" className={`${getSeverityColor(record.severity)} text-[10px]`}>
                    {record.severity.charAt(0).toUpperCase()}
                  </Badge>
                )}

                {isResolved && (
                  <Badge className="bg-green-100 text-green-800 border-green-200 text-[10px]">
                    <CheckCircle className="w-3 h-3" />
                  </Badge>
                )}

                {hasFollowUps && (
                  <Badge variant="outline" className="text-[10px]">
                    <Activity className="w-3 h-3 mr-0.5" />
                    {followUps.length}
                  </Badge>
                )}

                {isOverdue && !isResolved && (
                  <Badge variant="destructive" className="text-[10px]">
                    <AlertTriangle className="w-3 h-3" />
                  </Badge>
                )}
              </div>
            </div>

            <div className="flex items-center space-x-0.5 ml-2">
              {(shouldShowFollowUp || hasFollowUps) && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleExpandClick}
                  className="h-8 w-8 p-0 text-gray-400 hover:text-gray-600 hover:bg-gray-100"
                  title="View full details"
                >
                  <Maximize2 className="w-3 h-3" />
                </Button>
              )}

              {canEdit && (
                <>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onEdit(record.id)}
                    className="h-8 w-8 p-0 text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                  >
                    <Edit className="w-3 h-3" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onDelete(record.id)}
                    disabled={isDeleting}
                    className="h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
                  >
                    {isDeleting ? (
                      <LoadingSpinner size="sm" />
                    ) : (
                      <Trash2 className="w-3 h-3" />
                    )}
                  </Button>
                </>
              )}
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-3 space-y-2">
          {/* Summary Card for Timeline Records */}
          {isTimelineRecord && hasFollowUps ? (
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-3 rounded-lg border border-blue-200">
              <div className="flex items-start justify-between mb-2">
                <div className="flex-1 min-w-0">
                  <h4 className="font-semibold text-gray-900 flex items-center space-x-1.5 text-xs">
                    <Stethoscope className="w-3 h-3 text-blue-600" />
                    <span className="truncate">
                      {record.animals.name || `Animal ${record.animals.tag_number}`}
                    </span>
                  </h4>
                  <p className="text-[10px] text-gray-600 mt-0.5">
                    #{record.animals.tag_number}
                  </p>
                </div>

                <Badge className={`${getStatusColor(currentStatus)} text-[10px] border ml-2 whitespace-nowrap`}>
                  {getStatusIcon(currentStatus)}
                </Badge>
              </div>

              <div className="grid grid-cols-1 gap-2 text-[10px]">
                {record.illness_diagnosis && (
                  <div>
                    <span className="text-gray-600">Diagnosis:</span>
                    <p className="font-medium text-gray-900 truncate">
                      {record.illness_diagnosis}
                    </p>
                  </div>
                )}

                {cumulativeCost > 0 && (
                  <div>
                    <span className="text-gray-600">Total Cost:</span>
                    <p className="font-medium text-gray-900">${cumulativeCost.toFixed(2)}</p>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="bg-gray-50 p-2.5 rounded-lg">
              <h4 className="font-medium text-gray-900 text-xs">
                {record.animals.name || `Animal ${record.animals.tag_number}`}
              </h4>
              <p className="text-[10px] text-gray-600">
                #{record.animals.tag_number}
              </p>
            </div>
          )}

          {/* Basic Info */}
          <div>
            <p className="text-xs text-gray-700 bg-gray-50 p-2 rounded line-clamp-2">
              {record.description}
            </p>
          </div>

          <div className="flex items-center justify-between text-xs flex-wrap gap-2">
            <div className="flex items-center space-x-1 text-gray-600">
              <Calendar className="w-3 h-3" />
              <span>{formatDate(record.record_date)}</span>
            </div>

            {record.cost && record.cost > 0 && (
              <div className="flex items-center space-x-1 text-gray-600">
                <span className="text-xs font-medium text-gray-600">Ksh</span>
                <span className="font-semibold text-gray-800">
                  {record.cost.toFixed(2)}
                </span>
              </div>
            )}
          </div>

          {hasFollowUps && (
            <div className="text-xs text-gray-500 text-center">
              Tap <Maximize2 className="w-3 h-3 inline" /> to view {followUps.length} follow-up{followUps.length !== 1 ? 's' : ''}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Full-Screen Modal for Mobile/Tablet */}
      <Modal
        isOpen={showModal}
        onClose={handleCloseModal}
        className="max-w-full h-full m-0 rounded-none"
        size="xl"
        closeOnOverlayClick={false}
      >
        <div className="h-screen flex flex-col">
          {/* Modal Header */}
          <div className="flex-shrink-0 bg-gradient-to-r from-blue-600 to-indigo-600 text-white p-4 sticky top-0 z-10">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-lg font-semibold flex items-center space-x-2">
                <span className="text-2xl">{getRecordTypeIcon(record.record_type)}</span>
                <span>Health Record</span>
              </h3>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleCloseModal}
                className="h-8 w-8 p-0 text-white hover:bg-white/20"
              >
                <X className="h-5 w-5" />
              </Button>
            </div>

            {/* Animal Info in Header */}
            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-semibold">
                  {record.animals.name || `Animal ${record.animals.tag_number}`}
                </h4>
                <p className="text-sm text-blue-100">
                  Tag: {record.animals.tag_number} • {record.animals.breed}
                </p>
              </div>

              {isTimelineRecord && hasFollowUps && (
                <Badge className={`${getStatusColor(currentStatus)} border-white`}>
                  {getStatusIcon(currentStatus)}
                </Badge>
              )}
            </div>

            {/* Status Badges */}
            <div className="flex flex-wrap gap-2 mt-3">
              <Badge className={`${getRecordTypeColor(record.record_type)} text-xs`}>
                {record.record_type.charAt(0).toUpperCase() + record.record_type.slice(1)}
              </Badge>

              {record.severity && (
                <Badge className={`${getSeverityColor(record.severity)} text-xs`}>
                  {record.severity.toUpperCase()}
                </Badge>
              )}

              {isResolved && (
                <Badge className="bg-green-100 text-green-800 border-green-200 text-xs">
                  <CheckCircle className="w-3 h-3 mr-1" />
                  Resolved
                </Badge>
              )}

              {hasFollowUps && (
                <Badge variant="outline" className="text-xs bg-white/90">
                  <Activity className="w-3 h-3 mr-1" />
                  {followUps.length} Follow-up{followUps.length !== 1 ? 's' : ''}
                </Badge>
              )}
            </div>
          </div>

          {/* Modal Content - Scrollable */}
          <div className="flex-1 overflow-y-auto bg-gray-50 p-4">
            {/* Quick Stats for Timeline Records */}
            {isTimelineRecord && hasFollowUps && (
              <div className="bg-white rounded-lg p-4 mb-4 shadow-sm">
                <h5 className="text-sm font-semibold text-gray-700 mb-3">Quick Overview</h5>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  {record.illness_diagnosis && (
                    <div>
                      <span className="text-gray-600">Diagnosis:</span>
                      <p className="font-medium text-gray-900">{record.illness_diagnosis}</p>
                    </div>
                  )}

                  {record.illness_severity && (
                    <div>
                      <span className="text-gray-600">Severity:</span>
                      <p className="font-medium">
                        <Badge className={`${getSeverityColor(record.illness_severity)} text-xs`}>
                          {record.illness_severity}
                        </Badge>
                      </p>
                    </div>
                  )}

                  {latestFollowUp?.next_followup_date && !isResolved && (
                    <div>
                      <span className="text-gray-600">Next Follow-up:</span>
                      <p className="font-medium text-gray-900">
                        {formatDate(latestFollowUp.next_followup_date)}
                      </p>
                    </div>
                  )}

                  {cumulativeCost > 0 && (
                    <div>
                      <span className="text-gray-600">Total Cost:</span>
                      <p className="font-medium text-gray-900">${cumulativeCost.toFixed(2)}</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Timeline Content */}
            <div className="bg-white rounded-lg p-4 shadow-sm">
              <h5 className="text-sm font-semibold text-gray-700 mb-4 flex items-center space-x-2">
                <Activity className="w-4 h-4 text-farm-green" />
                <span>{isTimelineRecord ? 'Medical Timeline' : 'Record Details'}</span>
                {loadingFollowUps && <LoadingSpinner size="sm" />}
              </h5>

              {loadingFollowUps ? (
                <div className="flex justify-center py-8">
                  <LoadingSpinner size="lg" />
                </div>
              ) : (
                <div className="space-y-4">
                  {renderTimelineContent()}
                </div>
              )}
            </div>

            {/* Additional Info */}
            {record.notes && (
              <div className="bg-white rounded-lg p-4 mt-4 shadow-sm">
                <h5 className="text-sm font-semibold text-gray-700 mb-2">Additional Notes</h5>
                <p className="text-sm text-gray-600 whitespace-pre-wrap">{record.notes}</p>
              </div>
            )}
          </div>

          {/* Modal Footer - Action Buttons */}
          <div className="flex-shrink-0 bg-white border-t border-gray-200 p-4 space-y-2">
            {canEdit && (
              <div className="grid grid-cols-2 gap-2">
                <Button
                  variant="outline"
                  onClick={() => {
                    handleCloseModal()
                    onEdit(record.id)
                  }}
                  className="flex items-center justify-center space-x-2"
                >
                  <Edit className="w-4 h-4" />
                  <span>Edit</span>
                </Button>

                {shouldShowFollowUp && !isResolved && onFollowUp && (
                  <Button
                    onClick={() => {
                      handleCloseModal()
                      onFollowUp(record)
                    }}
                    className="bg-green-600 hover:bg-green-700 flex items-center justify-center space-x-2"
                  >
                    <Activity className="w-4 h-4" />
                    <span>Add Follow-up</span>
                  </Button>
                )}
              </div>
            )}

            <Button
              variant="outline"
              onClick={handleCloseModal}
              className="w-full"
            >
              Close
            </Button>
          </div>
        </div>
      </Modal>
    </>
  )
}