// Enhanced AddHealthRecordModal with comprehensive field sets for all record types
// src/components/health/AddHealthRecordModal.tsx

'use client'

import React, { useState, useMemo, useCallback, useEffect, useRef } from 'react'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Label } from '@/components/ui/Label'
import { Modal } from '@/components/ui/Modal'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { Select } from '@/components/ui/Select'
import { Badge } from '@/components/ui/Badge'
import { Search, Filter, X, Calendar, Clock, Stethoscope, ChevronDown, ChevronUp, AlertTriangle, Heart, TrendingUp, Image as ImageIcon, Trash2 } from 'lucide-react'

// Helper functions for status display
const getHealthStatusColor = (status: string | null | undefined): string => {
  switch (status) {
    case 'healthy':
      return 'bg-green-100 text-green-800 border border-green-300'
    case 'sick':
      return 'bg-red-100 text-red-800 border border-red-300'
    case 'requires_attention':
      return 'bg-yellow-100 text-yellow-800 border border-yellow-300'
    case 'quarantined':
      return 'bg-purple-100 text-purple-800 border border-purple-300'
    default:
      return 'bg-gray-100 text-gray-800 border border-gray-300'
  }
}

const getHealthStatusLabel = (status: string | null | undefined): string => {
  if (!status) return 'No Status'
  return status.replace(/_/g, ' ').split(' ').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')
}

const getProductionStatusColor = (status: string | null | undefined): string => {
  switch (status) {
    case 'calf':
      return 'bg-pink-100 text-pink-800 border border-pink-300'
    case 'heifer':
      return 'bg-amber-100 text-amber-800 border border-amber-300'
    case 'bull':
      return 'bg-blue-100 text-blue-800 border border-blue-300'
    case 'served':
      return 'bg-indigo-100 text-indigo-800 border border-indigo-300'
    case 'lactating':
      return 'bg-emerald-100 text-emerald-800 border border-emerald-300'
    case 'steaming_dry_cows':
      return 'bg-orange-100 text-orange-800 border border-orange-300'
    case 'open_culling_dry_cows':
      return 'bg-slate-100 text-slate-800 border border-slate-300'
    default:
      return 'bg-gray-100 text-gray-800 border border-gray-300'
  }
}

const getProductionStatusLabel = (status: string | null | undefined): string => {
  if (!status) return 'No Status'
  return status.replace(/_/g, ' ').split(' ').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')
}

const healthRecordSchema = z.object({
  animal_id: z.string().min(1, 'Please select an animal'),
  record_date: z.string().min(1, 'Record date is required'),
  record_time: z.string().optional(),
  record_type: z.enum(['vaccination', 'treatment', 'checkup', 'injury', 'illness', 'reproductive', 'deworming', 'dehorning', 'post_mortem']),
  description: z.string().min(5, 'Description must be at least 5 characters'),
  veterinarian: z.string().optional(),
  cost: z.preprocess(
    (val) => {
      if (val === '' || val === null || val === undefined) return undefined;
      const num = Number(val);
      return isNaN(num) ? undefined : num;
    },
    z.number().min(0, 'Cost must be positive').optional()
  ),
  notes: z.string().optional(),
  physical_exam_notes: z.string().optional(),

  // General checkup fields - Fixed with proper preprocessing
  body_condition_score: z.preprocess(
    (val) => {
      if (val === '' || val === null || val === undefined) return undefined;
      const num = Number(val);
      return isNaN(num) ? undefined : num;
    },
    z.number().min(1).max(5).optional()
  ),
  weight: z.preprocess(
    (val) => {
      if (val === '' || val === null || val === undefined) return undefined;
      const num = Number(val);
      return isNaN(num) ? undefined : num;
    },
    z.number().min(0).optional()
  ),
  temperature: z.preprocess(
    (val) => {
      if (val === '' || val === null || val === undefined) return undefined;
      const num = Number(val);
      return isNaN(num) ? undefined : num;
    },
    z.number().optional()
  ),
  pulse: z.preprocess(
    (val) => {
      if (val === '' || val === null || val === undefined) return undefined;
      const num = Number(val);
      return isNaN(num) ? undefined : num;
    },
    z.number().optional()
  ),
  respiration: z.preprocess(
    (val) => {
      if (val === '' || val === null || val === undefined) return undefined;
      const num = Number(val);
      return isNaN(num) ? undefined : num;
    },
    z.number().optional()
  ),

  // Vaccination fields
  vaccine_name: z.string().optional(),
  vaccine_name_other: z.string().optional(),
  vaccine_batch_number: z.string().optional(),
  vaccine_dose: z.string().optional(),
  route_of_administration: z.string().optional(),
  route_of_administration_other: z.string().optional(),
  next_due_date: z.string().optional(),
  administered_by: z.string().optional(),

  // Treatment fields
  diagnosis: z.string().optional(),
  medication_name: z.string().optional(),
  medication_dosage: z.string().optional(),
  medication_duration: z.string().optional(),
  treatment_route: z.string().optional(),
  treatment_route_other: z.string().optional(),
  withdrawal_period: z.string().optional(),
  response_notes: z.string().optional(),
  treating_personnel: z.string().optional(),

  // Injury fields
  injury_cause: z.string().optional(),
  injury_cause_other: z.string().optional(),
  injury_type: z.string().optional(),
  injury_type_other: z.string().optional(),
  severity: z.enum(['low', 'medium', 'high']).nullish(), // Allow null/undefined
  treatment_given: z.string().optional(),
  follow_up_required: z.boolean().optional(),

  // Illness fields
  symptoms: z.string().optional(),
  illness_diagnosis: z.string().optional(),
  illness_severity: z.enum(['mild', 'moderate', 'severe']).nullish(), // Allow null/undefined
  lab_test_results: z.string().optional(),
  treatment_plan: z.string().optional(),
  recovery_outcome: z.string().optional(),

  // Reproductive health fields
  reproductive_type: z.string().optional(),
  reproductive_type_other: z.string().optional(),
  sire_id: z.string().optional(),
  pregnancy_result: z.enum(['yes', 'no', 'pending']).optional(),
  calving_outcome: z.string().optional(),
  calving_outcome_other: z.string().optional(),
  complications: z.string().optional(),
  complications_other: z.string().optional(),
  vaginal_discharge: z.string().optional(),
  cervix_condition: z.string().optional(),
  uterus_tone: z.string().optional(),
  ovarian_status: z.string().optional(),
  estrus_signs: z.string().optional(),

  // Deworming fields
  product_used: z.string().optional(),
  product_used_other: z.string().optional(),
  deworming_dose: z.string().optional(),
  next_deworming_date: z.string().optional(),
  deworming_administered_by: z.string().optional(),

  // Dehorning fields
  dehorning_method: z.string().optional(),
  dehorning_method_other: z.string().optional(),
  dehorning_reason: z.string().optional(),
  dehorning_date: z.string().optional(),
  dehorning_age: z.preprocess((val) => {
    if (val === '' || val === null || val === undefined) return undefined;
    const num = Number(val);
    return isNaN(num) ? undefined : num;
  }, z.number().min(0).optional()),
  dehorning_veterinarian: z.string().optional(),
  anesthesia_used: z.boolean().optional(),
  anesthesia_type: z.string().optional(),
  post_dehorning_care: z.string().optional(),
  dehorning_complications: z.string().optional(),

  // Post Mortem fields
  cause_of_death: z.string().optional(),
  death_circumstances: z.string().optional(),
  necropsy_performed: z.boolean().optional(),
  necropsy_findings: z.string().optional(),
  suspected_disease: z.string().optional(),
  location_of_death: z.string().optional(),
  body_disposal_method: z.string().optional(),
  post_mortem_notes: z.string().optional(),

  // Linking fields
  root_checkup_id: z.string().optional(),
  linked_health_issue_id: z.string().optional(),
  outbreak_id: z.string().optional(),

  // Resolution & Follow-up fields
  completion_status: z.enum(['completed', 'pending', 'in_progress', 'cancelled']).optional(),
  is_resolved: z.boolean().optional(),
  resolved_date: z.string().optional(),
  follow_up_status: z.enum(['none', 'pending', 'scheduled', 'completed']).optional(),

  // Treatment tracking fields
  treatment_effectiveness: z.enum(['excellent', 'good', 'fair', 'poor', 'no_response']).optional(),
  medication_changes: z.string().optional(),

  // Image field (note: actual file handling is done separately with state)
  images: z.array(z.any()).optional(),
})

type HealthRecordFormData = z.infer<typeof healthRecordSchema>

interface Animal {
  id: string
  tag_number: string
  name?: string
  breed?: string
  gender: 'male' | 'female'
  birth_date?: string
  status: string
  health_status?: string | null
  production_status?: string | null
}

interface AddHealthRecordModalProps {
  farmId: string
  animals: Animal[]
  isOpen: boolean
  onClose: () => void
  onRecordAdded: (record: any) => void
  preSelectedAnimalId?: string
  preSelectedRecordType?: string
  originalRecordId?: string
  rootCheckupId?: string | null
  preSelectedHealthIssue?: any | null
  recordToEdit?: any // For editing existing health records
}

// Memoized Medications Section Component to prevent re-renders from parent form watchers
interface MedicationsSectionProps {
  medications: Array<{
    id: string
    name: string
    dosage: string
    duration: string
    route: string
    route_other?: string
  }>
  onAddMedication: () => void
  onRemoveMedication: (id: string) => void
  onUpdateMedication: (id: string, field: string, value: string) => void
}

const MedicationsSection = React.memo(function MedicationsSection({
  medications,
  onAddMedication,
  onRemoveMedication,
  onUpdateMedication,
}: MedicationsSectionProps) {
  return (
    <div className="border-t pt-6 border-red-200 bg-red-50">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Label className="text-base font-medium">Medications <span className="text-red-600 font-bold">*</span></Label>
          <span className="text-xs bg-red-100 text-red-700 px-2 py-1 rounded font-semibold">Required</span>
        </div>
        <button
          type="button"
          onClick={onAddMedication}
          className="inline-flex items-center gap-2 px-3 py-2 bg-green-50 text-green-700 border border-green-200 rounded-md hover:bg-green-100 transition-colors text-sm font-medium"
        >
          <span>+</span>
          Add Medication
        </button>
      </div>

      {medications.length === 0 ? (
        <div className="p-4 bg-red-100 border-2 border-red-300 rounded-lg text-red-800 text-sm">
          <p className="font-semibold mb-2">⚠️ At least one medication is required for treatment records</p>
          <p>Click "Add Medication" above to add medication details including name, dosage, duration, and route of administration.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {medications.map((medication, index) => (
            <div key={medication.id} className="border border-gray-200 rounded-lg p-4 bg-white hover:shadow-sm transition-shadow">
              <div className="flex items-center justify-between mb-3">
                <h4 className="font-medium text-gray-900">Medication {index + 1}</h4>
                <button
                  type="button"
                  onClick={() => onRemoveMedication(medication.id)}
                  className="text-red-600 hover:text-red-800 hover:bg-red-50 p-1 rounded transition-colors"
                  title="Remove medication"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <Label className="text-xs text-gray-700">Medication Name</Label>
                  <input
                    type="text"
                    value={medication.name}
                    onChange={(e) => onUpdateMedication(medication.id, 'name', e.target.value)}
                    placeholder="Penicillin, Oxytetracycline"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-farm-green focus:border-transparent mt-1"
                  />
                </div>
                <div>
                  <Label className="text-xs text-gray-700">Dosage</Label>
                  <input
                    type="text"
                    value={medication.dosage}
                    onChange={(e) => onUpdateMedication(medication.id, 'dosage', e.target.value)}
                    placeholder="10mg/kg"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-farm-green focus:border-transparent mt-1"
                  />
                </div>
                <div>
                  <Label className="text-xs text-gray-700">Duration</Label>
                  <input
                    type="text"
                    value={medication.duration}
                    onChange={(e) => onUpdateMedication(medication.id, 'duration', e.target.value)}
                    placeholder="5 days"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-farm-green focus:border-transparent mt-1"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                <div>
                  <Label className="text-xs text-gray-700">Route of Administration</Label>
                  <select
                    value={medication.route}
                    onChange={(e) => onUpdateMedication(medication.id, 'route', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-farm-green focus:border-transparent mt-1"
                  >
                    <option value="">Select route...</option>
                    <option value="intramuscular">Intramuscular</option>
                    <option value="subcutaneous">Subcutaneous</option>
                    <option value="intravenous">Intravenous</option>
                    <option value="oral">Oral</option>
                    <option value="topical">Topical</option>
                    <option value="other">Other (specify)</option>
                  </select>
                </div>

                {medication.route === 'other' && (
                  <div>
                    <Label className="text-xs text-gray-700">Specify Route</Label>
                    <input
                      type="text"
                      value={medication.route_other || ''}
                      onChange={(e) => onUpdateMedication(medication.id, 'route_other', e.target.value)}
                      placeholder="Enter route"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-farm-green focus:border-transparent mt-1"
                    />
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
})

// Memoized CollapsibleSection Component
interface CollapsibleSectionProps {
  title: string
  isOpen: boolean
  onToggle: () => void
  children: React.ReactNode
}

const CollapsibleSection = React.memo(function CollapsibleSection({
  title,
  isOpen,
  onToggle,
  children,
}: CollapsibleSectionProps) {
  return (
    <div className="border border-gray-200 rounded-lg">
      <button
        type="button"
        onClick={onToggle}
        className="w-full px-4 py-3 flex items-center justify-between bg-gray-50 hover:bg-gray-100 rounded-t-lg"
      >
        <span className="font-medium text-gray-900">{title}</span>
        {isOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
      </button>
      {isOpen && (
        <div className="p-4 space-y-4">
          {children}
        </div>
      )}
    </div>
  )
})

export function AddHealthRecordModal({
  farmId,
  animals,
  isOpen,
  onClose,
  onRecordAdded,
  preSelectedAnimalId,
  preSelectedRecordType,
  originalRecordId,
  rootCheckupId,
  preSelectedHealthIssue,
  recordToEdit
}: AddHealthRecordModalProps) {

  const isEditingMode = !!recordToEdit
  console.log('🔍 AddHealthRecordModal component rendered:', { isOpen, farmId, animalsCount: animals?.length, isEditingMode, recordId: recordToEdit?.id })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [animalSearch, setAnimalSearch] = useState('')
  const [showAllAnimals, setShowAllAnimals] = useState(false)
  const [collapsedSections, setCollapsedSections] = useState<Set<string>>(new Set())

  // Health issues state
  const [healthIssues, setHealthIssues] = useState<any[]>([])
  const [loadingHealthIssues, setLoadingHealthIssues] = useState(false)
  const [selectedHealthIssue, setSelectedHealthIssue] = useState<any | null>(null)

  // Image upload state
  const [imageFiles, setImageFiles] = useState<File[]>([])
  const [imagePreviews, setImagePreviews] = useState<string[]>([])

  // Medications state for treatment records
  const [medications, setMedications] = useState<Array<{
    id: string
    name: string
    dosage: string
    duration: string
    route: string
    route_other?: string
  }>>([])

  // Custom dropdown state
  const [showAnimalDropdown, setShowAnimalDropdown] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  // Search input ref for auto-focus
  const animalSearchInputRef = useRef<HTMLInputElement>(null)


  const form = useForm<HealthRecordFormData>({
    resolver: zodResolver(healthRecordSchema) as any,
    mode: 'onBlur', // Only validate on blur to reduce validation errors during typing
    defaultValues: {
      animal_id: preSelectedAnimalId || '',
      record_date: new Date().toISOString().split('T')[0],
      record_type: (preSelectedRecordType as any) || 'checkup',
      severity: null as any,
      illness_severity: null as any,
      follow_up_required: false,
      pregnancy_result: 'pending',
    },
  })

  useEffect(() => {
    if (isOpen) {
      if (isEditingMode && recordToEdit) {
        // Populate form from existing record data
        console.log('🔍 Populating form with existing record:', recordToEdit.id)

        // Build medications array from treatment_medications if it's a treatment record
        let medicationsArray: any[] = []
        if (recordToEdit.record_type === 'treatment' && recordToEdit.treatment_medications?.length > 0) {
          medicationsArray = recordToEdit.treatment_medications.map((med: any) => ({
            id: med.id || `temp-${Date.now()}-${Math.random()}`,
            name: med.medication_name || '',
            dosage: med.dosage || '',
            duration: med.duration || '',
            route: med.route || '',
            route_other: med.route_other || '',
          }))
        }
        setMedications(medicationsArray)

        // Populate all form fields from the existing record
        form.reset({
          animal_id: recordToEdit.animal_id || '',
          record_date: recordToEdit.record_date || new Date().toISOString().split('T')[0],
          record_time: recordToEdit.record_time || '',
          record_type: recordToEdit.record_type || 'checkup',
          description: recordToEdit.description || '',
          veterinarian: recordToEdit.veterinarian || '',
          cost: recordToEdit.cost || undefined,
          notes: recordToEdit.notes || '',
          physical_exam_notes: recordToEdit.physical_exam_notes || '',

          // General checkup fields
          body_condition_score: recordToEdit.body_condition_score || undefined,
          weight: recordToEdit.weight || undefined,
          temperature: recordToEdit.temperature || undefined,
          pulse: recordToEdit.pulse || undefined,
          respiration: recordToEdit.respiration || undefined,

          // Vaccination fields
          vaccine_name: recordToEdit.vaccine_name || '',
          vaccine_batch_number: recordToEdit.vaccine_batch_number || '',
          vaccine_dose: recordToEdit.vaccine_dose || '',
          route_of_administration: recordToEdit.route_of_administration || '',
          next_due_date: recordToEdit.next_due_date || '',
          administered_by: recordToEdit.administered_by || '',

          // Treatment fields
          diagnosis: recordToEdit.diagnosis || '',
          medication_name: recordToEdit.medication_name || '',
          medication_dosage: recordToEdit.medication_dosage || '',
          medication_duration: recordToEdit.medication_duration || '',
          treatment_route: recordToEdit.treatment_route || '',
          withdrawal_period: recordToEdit.withdrawal_period || '',
          response_notes: recordToEdit.response_notes || '',
          treating_personnel: recordToEdit.treating_personnel || '',

          // Injury fields
          injury_cause: recordToEdit.injury_cause || '',
          injury_type: recordToEdit.injury_type || '',
          severity: recordToEdit.severity || (null as any),
          treatment_given: recordToEdit.treatment_given || '',
          follow_up_required: recordToEdit.follow_up_required || false,

          // Illness fields
          symptoms: recordToEdit.symptoms || '',
          illness_diagnosis: recordToEdit.illness_diagnosis || '',
          illness_severity: recordToEdit.illness_severity || (null as any),
          lab_test_results: recordToEdit.lab_test_results || '',
          treatment_plan: recordToEdit.treatment_plan || '',
          recovery_outcome: recordToEdit.recovery_outcome || '',

          // Reproductive health fields
          reproductive_type: recordToEdit.reproductive_type || '',
          pregnancy_result: recordToEdit.pregnancy_result || 'pending',
          calving_outcome: recordToEdit.calving_outcome || '',
          complications: recordToEdit.complications || '',
          vaginal_discharge: recordToEdit.vaginal_discharge || '',
          cervix_condition: recordToEdit.cervix_condition || '',
          uterus_tone: recordToEdit.uterus_tone || '',
          ovarian_status: recordToEdit.ovarian_status || '',
          estrus_signs: recordToEdit.estrus_signs || '',

          // Deworming fields
          product_used: recordToEdit.product_used || '',
          deworming_dose: recordToEdit.deworming_dose || '',
          next_deworming_date: recordToEdit.next_deworming_date || '',
          deworming_administered_by: recordToEdit.deworming_administered_by || '',

          // Dehorning fields
          dehorning_method: recordToEdit.dehorning_method || '',
          dehorning_reason: recordToEdit.dehorning_reason || '',
          dehorning_date: recordToEdit.dehorning_date || '',
          dehorning_age: recordToEdit.dehorning_age || undefined,
          dehorning_veterinarian: recordToEdit.dehorning_veterinarian || '',
          anesthesia_used: recordToEdit.anesthesia_used || false,
          anesthesia_type: recordToEdit.anesthesia_type || '',
          post_dehorning_care: recordToEdit.post_dehorning_care || '',
          dehorning_complications: recordToEdit.dehorning_complications || '',

          // Post-mortem fields
          cause_of_death: recordToEdit.cause_of_death || '',
          death_circumstances: recordToEdit.death_circumstances || '',
          necropsy_performed: recordToEdit.necropsy_performed || false,
          necropsy_findings: recordToEdit.necropsy_findings || '',
          suspected_disease: recordToEdit.suspected_disease || '',
          location_of_death: recordToEdit.location_of_death || '',
          body_disposal_method: recordToEdit.body_disposal_method || '',
          post_mortem_notes: recordToEdit.post_mortem_notes || '',

          // Linking fields
          linked_health_issue_id: recordToEdit.linked_health_issue_id || '',
        })

        setHealthIssues([])
        setSelectedHealthIssue(null)
      } else {
        // Create mode - existing logic
        let descriptionText = ''
        let issueId = ''
        let recordType = (preSelectedRecordType as any) || 'checkup'

        // If a health issue is pre-selected, use its information
        if (preSelectedHealthIssue) {
          issueId = preSelectedHealthIssue.id
          recordType = mapIssueTypeToRecordType(preSelectedHealthIssue.issue_type)
          descriptionText = `Follow-up: ${preSelectedHealthIssue.description}${preSelectedHealthIssue.severity ? ` (${preSelectedHealthIssue.severity})` : ''}`
          setSelectedHealthIssue(preSelectedHealthIssue)
        }

        form.reset({
          animal_id: preSelectedAnimalId || '',
          record_date: new Date().toISOString().split('T')[0],
          record_time: '',
          record_type: recordType,
          description: descriptionText,
          linked_health_issue_id: issueId,
          severity: null as any,
          illness_severity: null as any,
          follow_up_required: false,
          pregnancy_result: 'pending',
        })

        // Clear medications when form resets
        setMedications([])

        // Don't clear health issues if we selected one
        if (!preSelectedHealthIssue) {
          setHealthIssues([])
          setSelectedHealthIssue(null)
        }

        // Auto-focus search input with a small delay to ensure DOM is ready
        setTimeout(() => {
          animalSearchInputRef.current?.focus()
          animalSearchInputRef.current?.select()
        }, 100)
      }
    }
  }, [isOpen, preSelectedAnimalId, preSelectedRecordType, preSelectedHealthIssue, recordToEdit, form])

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowAnimalDropdown(false)
      }
    }

    if (showAnimalDropdown) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [showAnimalDropdown])

  // Map health issue types to record types
  const mapIssueTypeToRecordType = (issueType: string): string => {
    const typeMap: Record<string, string> = {
      'injury': 'injury',
      'illness': 'illness',
      'behavior_change': 'illness',
      'poor_appetite': 'illness',
      'lameness': 'injury',
      'respiratory': 'illness',
      'reproductive': 'reproductive',
      'other': 'checkup' // Default to checkup for unknown types
    }
    return typeMap[issueType] || 'checkup'
  }

  // Map health issue severity to injury severity (low, medium, high)
  const mapIssueSeverityToInjurySeverity = (issueSeveity: string): 'low' | 'medium' | 'high' => {
    const severityMap: Record<string, 'low' | 'medium' | 'high'> = {
      'critical': 'high',
      'high': 'high',
      'medium': 'medium',
      'low': 'low'
    }
    return severityMap[issueSeveity] || 'medium'
  }

  // Map health issue severity to illness severity (mild, moderate, severe)
  const mapIssueSeverityToIllnessSeverity = (issueSeverity: string): 'mild' | 'moderate' | 'severe' => {
    const severityMap: Record<string, 'mild' | 'moderate' | 'severe'> = {
      'critical': 'severe',
      'high': 'severe',
      'medium': 'moderate',
      'low': 'mild'
    }
    return severityMap[issueSeverity] || 'moderate'
  }

  // Fetch health issues for selected animal
  const fetchHealthIssuesForAnimal = useCallback(async (animalId: string) => {
    if (!animalId) {
      console.log('🔍 No animal ID, skipping health issues fetch')
      setHealthIssues([])
      return
    }

    setLoadingHealthIssues(true)
    try {
      // Build query URL with proper parameter handling
      const url = new URL(`/api/health/issues`, window.location.origin)
      url.searchParams.append('farm_id', farmId)
      url.searchParams.append('animal_id', animalId)
      // Add status filters as individual query params instead of comma-separated
      url.searchParams.append('status', 'open')
      url.searchParams.append('status', 'in_progress')
      url.searchParams.append('status', 'under_observation')

      const fullUrl = url.toString()
      console.log('🔍 Fetching health issues from:', fullUrl)

      const response = await fetch(fullUrl, { method: 'GET' })

      console.log('🔍 Health issues API response status:', response.status)

      if (response.ok) {
        const result = await response.json()
        console.log('🔍 Health issues fetched successfully:', result)
        setHealthIssues(result.issues || [])

        if (!result.issues || result.issues.length === 0) {
          console.log('⚠️ No health issues found for animal:', animalId)
        }
      } else {
        const errorText = await response.text()
        console.error('❌ Health issues API error status:', response.status, 'details:', errorText)
        setHealthIssues([])
      }
    } catch (err) {
      console.error('❌ Error fetching health issues:', err)
      console.error('Error type:', err instanceof Error ? err.message : String(err))
      setHealthIssues([])
    } finally {
      setLoadingHealthIssues(false)
    }
  }, [farmId])

  // Fetch health issues when selected animal changes
  const selectedAnimalId = form.watch('animal_id')
  useEffect(() => {
    fetchHealthIssuesForAnimal(selectedAnimalId)
    setSelectedHealthIssue(null) // Clear selected issue when animal changes
    if (selectedAnimalId) {
      setAnimalSearch('') // Clear search when animal is selected
    }
  }, [selectedAnimalId, fetchHealthIssuesForAnimal])

  // Medication management functions
  const addMedication = useCallback(() => {
    const newMedication = {
      id: Date.now().toString(),
      name: '',
      dosage: '',
      duration: '',
      route: '',
      route_other: '',
    }
    setMedications((prev) => [...prev, newMedication])
  }, [])

  const removeMedication = useCallback((id: string) => {
    setMedications((prev) => prev.filter((med) => med.id !== id))
  }, [])

  const updateMedication = useCallback((id: string, field: string, value: string) => {
    setMedications((prev) =>
      prev.map((med) => (med.id === id ? { ...med, [field]: value } : med))
    )
  }, [])

  // Handle health issue selection
  const handleSelectHealthIssue = useCallback((issue: any) => {
    console.log('🔍 Health issue selected:', issue.id, issue.description)
    console.log('🔍 Current animal_id in form:', form.watch('animal_id'))

    setSelectedHealthIssue(issue)

    // Auto-set record_type based on issue type
    const recordType = mapIssueTypeToRecordType(issue.issue_type)
    form.setValue('record_type', recordType as any)

    // Pre-fill description with issue details
    const description = `Follow-up: ${issue.description}${issue.severity ? ` (${issue.severity})` : ''}`
    form.setValue('description', description)

    // Link this health record to the health issue
    form.setValue('linked_health_issue_id', issue.id)

    // Set the appropriate severity field based on record type
    if (recordType === 'injury' && issue.severity) {
      const mappedSeverity = mapIssueSeverityToInjurySeverity(issue.severity)
      form.setValue('severity', mappedSeverity)
    } else if (recordType === 'illness' && issue.severity) {
      const mappedSeverity = mapIssueSeverityToIllnessSeverity(issue.severity)
      form.setValue('illness_severity', mappedSeverity)
    }

    // Verify animal_id is still set after form updates
    setTimeout(() => {
      const currentAnimalId = form.watch('animal_id')
      console.log('🔍 Animal ID after health issue selection:', currentAnimalId)
      if (!currentAnimalId) {
        console.warn('⚠️ Animal ID was cleared! Restoring...')
        form.setValue('animal_id', selectedAnimalId)
      }
    }, 100)
  }, [form, selectedAnimalId])


  const watchedRecordType = form.watch('record_type')
  const watchedVaccineName = form.watch('vaccine_name')
  const watchedRoute = form.watch('route_of_administration')
  const watchedTreatmentRoute = form.watch('treatment_route')
  const watchedInjuryCause = form.watch('injury_cause')
  const watchedInjuryType = form.watch('injury_type')
  const watchedReproductiveType = form.watch('reproductive_type')
  const watchedCalvingOutcome = form.watch('calving_outcome')
  const watchedComplications = form.watch('complications')
  const watchedProductUsed = form.watch('product_used')
  const watchedNecropsy = form.watch('necropsy_performed')

  // Auto-expand treatment section when treatment type is selected
  useEffect(() => {
    if (watchedRecordType === 'treatment') {
      setCollapsedSections((prev) => {
        const newSet = new Set(prev)
        newSet.delete('treatment') // Remove 'treatment' from collapsed sections to expand it
        return newSet
      })
    }
  }, [watchedRecordType])

  // Filter and search animals
  const filteredAnimals = useMemo(() => {
    // For post_mortem records, show only deceased animals; for all others, show active animals
    const statusFilter = watchedRecordType === 'post_mortem' ? 'deceased' : 'active'
    let filtered = animals.filter(animal => animal.status === statusFilter)

    if (animalSearch) {
      const search = animalSearch.toLowerCase()
      filtered = filtered.filter(animal =>
        animal.tag_number.toLowerCase().includes(search) ||
        animal.name?.toLowerCase().includes(search) ||
        animal.breed?.toLowerCase().includes(search)
      )
    }

    if (!showAllAnimals && filtered.length > 20) {
      return filtered.slice(0, 20)
    }

    return filtered
  }, [animals, animalSearch, showAllAnimals, watchedRecordType])

  // Handle image selection and preview generation
  const handleImageChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    console.log('\n📸 ========== IMAGE SELECTION ==========')
    console.log(`📸 Files selected: ${files.length}`)
    files.forEach((f, i) => console.log(`  ${i + 1}. ${f.name} (${f.type}, ${f.size} bytes)`))

    // Filter to image files only
    const imageFilesOnly = files.filter(file => file.type.startsWith('image/'))
    console.log(`📸 Valid image files: ${imageFilesOnly.length}`)

    if (imageFilesOnly.length > 0) {
      console.log('📸 Adding files to state...')
      setImageFiles(prev => {
        const newFiles = [...prev, ...imageFilesOnly]
        console.log(`📸 imageFiles state updated:`, newFiles)
        console.log(`📸 Total files in state: ${newFiles.length}`)
        return newFiles
      })

      // Generate previews for new images
      imageFilesOnly.forEach((file, idx) => {
        console.log(`📸 Generating preview ${idx + 1}/${imageFilesOnly.length}: ${file.name}`)
        const reader = new FileReader()
        reader.onload = (event) => {
          setImagePreviews(prev => {
            const newPreviews = [...prev, event.target?.result as string]
            console.log(`📸 Preview added. Total previews: ${newPreviews.length}`)
            return newPreviews
          })
        }
        reader.readAsDataURL(file)
      })
    } else {
      console.warn('⚠️ No valid image files detected')
    }

    // Reset input
    if (e.target) {
      e.target.value = ''
      console.log('📸 File input reset')
    }
  }, [])

  // Remove image from selected images
  const handleRemoveImage = useCallback((index: number) => {
    setImageFiles(prev => prev.filter((_, i) => i !== index))
    setImagePreviews(prev => prev.filter((_, i) => i !== index))
  }, [])

  const handleSubmit = useCallback(async (data: HealthRecordFormData) => {
    console.log('\n🚀 ========== HANDLE SUBMIT CALLED ==========')
    console.log('🚀 Mode:', isEditingMode ? 'EDIT' : 'CREATE')
    console.log('🚀 Record ID:', recordToEdit?.id || 'N/A')
    console.log('🚀 Raw form data:', data);
    console.log(`🚀 Current imageFiles state: ${imageFiles.length} files`)
    imageFiles.forEach((f, i) => console.log(`  ${i + 1}. ${f.name} (${f.type}, ${f.size} bytes)`))
    console.log(`🚀 Current imagePreviews state: ${imagePreviews.length} previews`)

    // Log specific field errors
    if (form.formState.errors.severity) {
      console.error('❌ Severity error:', form.formState.errors.severity);
    }
    if (form.formState.errors.illness_severity) {
      console.error('❌ Illness severity error:', form.formState.errors.illness_severity);
    }

    // Add this validation check
    if (!data.animal_id) {
      console.error('❌ No animal selected');
      form.setError('animal_id', { message: 'Please select an animal' });
      return;
    }
    if (!data.description || data.description.length < 5) {
      console.error('❌ Description too short:', data.description);
      form.setError('description', { message: 'Description must be at least 5 characters' });
      return;
    }

    console.log('✅ All validations passed!');
    setLoading(true);
    setError(null);

    try {
      console.log('\n📦 ========== PROCESSING DATA ==========')
      const processedData = {
        ...data,
        farm_id: farmId,
        cost: data.cost || 0,
        is_follow_up: !!originalRecordId,
        original_record_id: originalRecordId || null,
        root_checkup_id: rootCheckupId || null,
        // Handle "other" options
        vaccine_name: data.vaccine_name === 'other' ? data.vaccine_name_other : data.vaccine_name,
        route_of_administration: data.route_of_administration === 'other' ? data.route_of_administration_other : data.route_of_administration,
        treatment_route: data.treatment_route === 'other' ? data.treatment_route_other : data.treatment_route,
        injury_cause: data.injury_cause === 'other' ? data.injury_cause_other : data.injury_cause,
        injury_type: data.injury_type === 'other' ? data.injury_type_other : data.injury_type,
        reproductive_type: data.reproductive_type === 'other' ? data.reproductive_type_other : data.reproductive_type,
        calving_outcome: data.calving_outcome === 'other' ? data.calving_outcome_other : data.calving_outcome,
        complications: data.complications === 'other' ? data.complications_other : data.complications,
        product_used: data.product_used === 'other' ? data.product_used_other : data.product_used,
        dehorning_method: data.dehorning_method === 'other' ? data.dehorning_method_other : data.dehorning_method,
        // Add medications if record type is treatment
        medications: ['treatment', 'reproductive'].includes(data.record_type) ? medications : undefined,
      } as any

      // Remove the "_other" fields from the final payload
      delete processedData.vaccine_name_other
      delete processedData.route_of_administration_other
      delete processedData.treatment_route_other
      delete processedData.injury_cause_other
      delete processedData.injury_type_other
      delete processedData.reproductive_type_other
      delete processedData.calving_outcome_other
      delete processedData.complications_other
      delete processedData.product_used_other
      delete processedData.dehorning_method_other

      // Only include severity if record type is injury AND severity is not null
      if (data.record_type !== 'injury' || !data.severity) {
        delete processedData.severity
      }

      // Only include illness_severity if record type is illness AND illness_severity is not null
      if (data.record_type !== 'illness' || !data.illness_severity) {
        delete processedData.illness_severity
      }

      // Clean up optional linking fields (convert empty strings to null)
      if (!processedData.root_checkup_id) {
        delete processedData.root_checkup_id
      }
      if (!processedData.linked_health_issue_id) {
        delete processedData.linked_health_issue_id
      }

      console.log('📦 Processed data:', processedData);
      console.log('📦 Farm ID:', farmId)
      console.log('📦 Record Type:', data.record_type)
      console.log('📦 Description:', data.description)

      const apiUrl = isEditingMode ? `/api/health/records/${recordToEdit.id}` : '/api/health/records'
      const apiMethod = isEditingMode ? 'PUT' : 'POST'

      console.log('\n🌐 ========== API REQUEST ==========')
      console.log('🌐 URL:', apiUrl)
      console.log('🌐 Method:', apiMethod)
      console.log('🌐 Payload:', JSON.stringify(processedData, null, 2))

      const response = await fetch(apiUrl, {
        method: apiMethod,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(processedData),
      });

      console.log('\n📡 ========== API RESPONSE ==========')
      console.log('📡 Status:', response.status);
      console.log('📡 Status Text:', response.statusText);
      console.log('📡 OK?:', response.ok);

      const result = await response.json();
      console.log('📡 Response body:', result);

      if (!response.ok) {
        console.error('❌ API error response:', result);
        throw new Error(result.error || `API returned ${response.status}: ${response.statusText}`);
      }

      console.log('\n✅ ========== SUCCESS ==========')
      console.log('✅ Health record created:', result.record);
      onRecordAdded(result.record);

      // Handle image uploads if any images were selected
      console.log('\n📸 ========== IMAGE UPLOAD CHECK ==========')
      console.log(`📸 imageFiles.length: ${imageFiles.length}`)
      console.log(`📸 imageFiles contents:`, imageFiles)

      if (imageFiles.length > 0 && result.record?.id) {
        console.log('\n📸 ========== IMAGE UPLOAD PHASE ==========')
        console.log('📸 Total images to upload:', imageFiles.length);
        console.log('📸 Record ID:', result.record.id);
        console.log('📸 Farm ID:', farmId);
        console.log('📸 Image files:', imageFiles.map((f, i) => ({ index: i, name: f.name, size: f.size, type: f.type })));

        const formData = new FormData();
        imageFiles.forEach((file, index) => {
          console.log(`📸 Adding image ${index} to FormData:`, file.name);
          formData.append(`image_${index}`, file);
        });
        formData.append('record_id', result.record.id);

        console.log('📸 FormData keys:', Array.from(formData.keys()));

        try {
          console.log('📸 Sending POST to /api/health/records/upload-images');
          const imageResponse = await fetch('/api/health/records/upload-images', {
            method: 'POST',
            body: formData,
          });

          console.log('📸 Upload response status:', imageResponse.status);
          console.log('📸 Upload response statusText:', imageResponse.statusText);
          console.log('📸 Upload response ok:', imageResponse.ok);

          const imageResult = await imageResponse.json();
          console.log('📸 Upload response body:', imageResult);

          if (imageResponse.ok) {
            console.log('✅ Images uploaded successfully');
            console.log('✅ Uploaded count:', imageResult.uploadedImages?.length || 0);
            console.log('✅ Errors:', imageResult.errors || []);
          } else {
            console.warn('⚠️ Image upload returned error status:', imageResponse.status);
            console.warn('⚠️ Error details:', imageResult);
          }
        } catch (imageErr) {
          console.error('❌ Image upload exception:', imageErr);
          console.error('❌ Error type:', typeof imageErr);
          if (imageErr instanceof Error) {
            console.error('❌ Error message:', imageErr.message);
            console.error('❌ Error stack:', imageErr.stack);
          }
        }
      } else {
        if (imageFiles.length === 0) {
          console.log('ℹ️ No images selected - skipping upload');
          console.log(`ℹ️ DEBUG: imageFiles.length = ${imageFiles.length}, imageFiles = `, imageFiles);
        } else if (!result.record?.id) {
          console.warn('⚠️ Record ID missing - cannot upload images:', result.record);
        }
      }

      form.reset({
        animal_id: '',
        record_date: new Date().toISOString().split('T')[0],
        record_time: '',
        record_type: 'checkup',
        severity: null as any,
        illness_severity: null as any,
        follow_up_required: false,
        pregnancy_result: 'pending',
      })
      setImageFiles([])
      setImagePreviews([])
      setMedications([])
      setAnimalSearch('')
      onClose()

    } catch (err) {
      console.error('\n❌ ========== ERROR ==========')
      console.error('❌ Error caught:', err);
      console.error('❌ Error type:', typeof err);
      console.error('❌ Error instanceof Error:', err instanceof Error)
      if (err instanceof Error) {
        console.error('❌ Error message:', err.message);
        console.error('❌ Error stack:', err.stack);
        setError(err.message);
      } else {
        console.error('❌ Unknown error type:', err)
        setError('An unexpected error occurred');
      }
    } finally {
      console.log('\n🏁 ========== SUBMISSION COMPLETE ==========')
      setLoading(false);
    }
  }, [farmId, onRecordAdded, onClose, form, originalRecordId, rootCheckupId, imageFiles, imagePreviews, medications, recordToEdit, isEditingMode])

  const getRecordTypeIcon = (type: string) => {
    switch (type) {
      case 'vaccination': return '💉'
      case 'treatment': return '💊'
      case 'checkup': return '🩺'
      case 'injury': return '🩹'
      case 'illness': return '🤒'
      case 'reproductive': return '🤱'
      case 'deworming': return '🪱'
      case 'dehorning': return '🐮'
      case 'post_mortem': return '⚰️'
      default: return '📋'
    }
  }

  const toggleSection = (section: string) => {
    const newCollapsed = new Set(collapsedSections)
    if (newCollapsed.has(section)) {
      newCollapsed.delete(section)
    } else {
      newCollapsed.add(section)
    }
    setCollapsedSections(newCollapsed)
  }

  const selectedAnimal = animals.find(a => a.id === form.watch('animal_id'))

  return (
    <Modal isOpen={isOpen} onClose={onClose} className="max-w-5xl max-h-[95vh] overflow-y-auto">

      <div className="p-6">
        <div className="mb-6">
          <h3 className="text-xl font-semibold text-gray-900 flex items-center space-x-2">
            <Stethoscope className="w-6 h-6 text-farm-green" />
            <span>{isEditingMode ? 'Edit Health Record' : 'Add Health Record'}</span>
          </h3>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm flex items-center space-x-2">
            <span className="text-red-500">⚠️</span>
            <span>{error}</span>
          </div>
        )}

        {/* Selected Health Issue Display */}
        {selectedHealthIssue && (
          <div className="mb-6 p-4 bg-blue-50 border-l-4 border-blue-500 rounded-lg">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <h4 className="font-semibold text-blue-900 mb-2 flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-blue-600" />
                  Following Up On Health Issue
                </h4>
                <div className="space-y-2 text-sm text-blue-800">
                  <p>
                    <span className="font-medium">Issue Type:</span> {selectedHealthIssue.issue_type?.replace(/_/g, ' ').charAt(0).toUpperCase() + selectedHealthIssue.issue_type?.slice(1).replace(/_/g, ' ')}
                  </p>
                  <p>
                    <span className="font-medium">Description:</span> {selectedHealthIssue.description}
                  </p>
                  {selectedHealthIssue.severity && (
                    <p>
                      <span className="font-medium">Severity:</span>
                      <Badge className="ml-2" variant="outline">
                        {selectedHealthIssue.severity}
                      </Badge>
                    </p>
                  )}
                  {selectedHealthIssue.notes && (
                    <p>
                      <span className="font-medium">Notes:</span> {selectedHealthIssue.notes}
                    </p>
                  )}
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setSelectedHealthIssue(null)
                  form.setValue('linked_health_issue_id', '')
                  form.setValue('description', '')
                  form.setValue('record_type', 'checkup')
                }}
                className="text-blue-600 hover:text-blue-800 hover:bg-blue-100 p-2 rounded transition-colors"
                title="Clear selected issue"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>
        )}

        <form
          onSubmit={(e) => {
            console.log('\n📋 ========== FORM SUBMISSION STARTED ==========')
            console.log('📋 Event type:', e.type)
            console.log('📋 Form submitting?', form.formState.isSubmitting)

            form.handleSubmit(
              (data) => {
                console.log('\n✅ ========== VALIDATION PASSED ==========')
                console.log('✅ Valid form data received:', data)
                console.log('✅ Animal ID:', data.animal_id)
                console.log('✅ Record Type:', data.record_type)
                console.log('✅ Description:', data.description)
                console.log('✅ Severity:', data.severity)
                console.log('✅ Illness Severity:', data.illness_severity)

                // Additional validation: Treatment records must have at least one medication
                if (data.record_type === 'treatment') {
                  console.log('💊 ========== TREATMENT MEDICATION VALIDATION ==========')
                  console.log(`💊 Medications count: ${medications.length}`)
                  console.log(`💊 Medications:`, medications)

                  if (!medications || medications.length === 0) {
                    console.error('❌ Treatment record requires at least one medication')
                    setError('Treatment records require at least one medication. Please click "Add Medication" to add medication details.')
                    return
                  }

                  // Validate that all medications have at least a name
                  const validMeds = medications.filter((med: any) => med.name && med.name.trim().length > 0)
                  if (validMeds.length === 0) {
                    console.error('❌ All medications have empty names')
                    setError('All added medications have empty names. Please fill in at least the medication name for each medication.')
                    return
                  }

                  console.log(`✅ Medication validation passed: ${validMeds.length} valid medications`)
                }

                handleSubmit(data);
              },
              (errors) => {
                console.log('\n❌ ========== VALIDATION FAILED ==========')
                console.log('❌ Validation errors:', errors)
                console.log('❌ Error keys:', Object.keys(errors))
                Object.entries(errors).forEach(([key, error]: [string, any]) => {
                  if (error) {
                    console.error(`❌ Field "${key}":`, error.message || error);
                  }
                })
              }
            )(e);
          }}
          className="space-y-6"
        >
          {/* Animal Selection Section */}
          <div className="bg-gray-50 p-4 rounded-lg">
            <Label className="text-base font-medium mb-3 block">Select Animal</Label>

            <div className="relative mb-4">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                ref={animalSearchInputRef}
                type="text"
                placeholder="Search by tag number, name, or breed..."
                value={animalSearch}
                onChange={(e) => {
                  setAnimalSearch(e.target.value)
                  // Auto-open dropdown when user types
                  if (e.target.value && !showAnimalDropdown) {
                    setShowAnimalDropdown(true)
                  }
                }}
                onFocus={() => {
                  // Open dropdown when input is focused
                  if (!showAnimalDropdown) {
                    setShowAnimalDropdown(true)
                  }
                }}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-farm-green focus:border-transparent"
                aria-label="Search animals"
              />
              {animalSearch && (
                <button
                  type="button"
                  onClick={() => {
                    setAnimalSearch('')
                    animalSearchInputRef.current?.focus()
                  }}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  title="Clear search"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            {selectedAnimal && (
              <div className="mb-4 p-4 bg-farm-green/10 border border-farm-green/20 rounded-lg sticky top-0 z-10 shadow-sm space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <h4 className="font-medium text-farm-green text-lg">
                      ✓ {selectedAnimal.name || `Animal ${selectedAnimal.tag_number}`}
                    </h4>
                    <p className="text-sm text-gray-600 mt-1">
                      Tag: {selectedAnimal.tag_number} • {selectedAnimal.breed} • {selectedAnimal.gender}
                      {selectedAnimal.birth_date && (
                        <span> • Born: {new Date(selectedAnimal.birth_date).toLocaleDateString()}</span>
                      )}
                    </p>
                  </div>
                  <Badge variant="secondary">✓ Selected</Badge>
                </div>

                {/* Health & Production Status Row */}
                <div className="flex flex-wrap gap-3 pt-2 border-t border-farm-green/20">
                  <div className="flex items-center gap-2">
                    <Heart className="w-4 h-4 text-red-600" />
                    <span className="text-xs font-medium text-gray-700">Health:</span>
                    <span className={`px-2.5 py-1 text-xs font-semibold rounded-full ${getHealthStatusColor(selectedAnimal.health_status)}`}>
                      {getHealthStatusLabel(selectedAnimal.health_status)}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <TrendingUp className="w-4 h-4 text-blue-600" />
                    <span className="text-xs font-medium text-gray-700">Production:</span>
                    <span className={`px-2.5 py-1 text-xs font-semibold rounded-full ${getProductionStatusColor(selectedAnimal.production_status)}`}>
                      {getProductionStatusLabel(selectedAnimal.production_status)}
                    </span>
                  </div>
                </div>
              </div>
            )}

            <div className="relative" ref={dropdownRef}>
              {/* Custom Dropdown Trigger */}
              <button
                type="button"
                onClick={() => setShowAnimalDropdown(!showAnimalDropdown)}
                className="w-full px-4 py-3 text-left border border-gray-300 rounded-lg bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-farm-green focus:border-transparent transition-all flex items-center justify-between"
              >
                {selectedAnimal ? (
                  <div className="flex-1">
                    <p className="font-medium text-gray-900">
                      {selectedAnimal.name || `Animal ${selectedAnimal.tag_number}`}
                    </p>
                    <p className="text-sm text-gray-500">
                      #{selectedAnimal.tag_number} • {selectedAnimal.breed}
                    </p>
                  </div>
                ) : animalSearch ? (
                  <div className="flex-1">
                    <p className="text-gray-700 font-medium">Searching...</p>
                    <p className="text-sm text-gray-500">
                      {filteredAnimals.length === 0 ? 'No matches found' : `${filteredAnimals.length} ${filteredAnimals.length === 1 ? 'animal' : 'animals'} found`}
                    </p>
                  </div>
                ) : (
                  <span className="text-gray-500">Choose an animal...</span>
                )}
                <ChevronDown className={`w-5 h-5 text-gray-400 transition-transform flex-shrink-0 ${showAnimalDropdown ? 'rotate-180' : ''}`} />
              </button>

              {/* Custom Dropdown Menu */}
              {showAnimalDropdown && (
                <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-gray-300 rounded-lg shadow-lg z-50 max-h-96 overflow-y-auto">
                  {/* Search Results Header */}
                  {animalSearch && filteredAnimals.length > 0 && (
                    <div className="sticky top-0 px-4 py-2 bg-farm-green/5 border-b border-gray-200">
                      <p className="text-xs font-medium text-gray-600">
                        Found <span className="font-bold text-farm-green">{filteredAnimals.length}</span> {filteredAnimals.length === 1 ? 'animal' : 'animals'} matching "{animalSearch}"
                      </p>
                    </div>
                  )}

                  {filteredAnimals.length === 0 ? (
                    <div className="p-8 text-center text-gray-500">
                      <p className="text-sm">
                        {animalSearch ? '🔍 No animals match your search' : watchedRecordType === 'post_mortem' ? '📋 No deceased animals found' : '📋 No active animals found'}
                      </p>
                    </div>
                  ) : (
                    <div className="divide-y divide-gray-200">
                      {filteredAnimals.map((animal) => (
                        <button
                          key={animal.id}
                          type="button"
                          onClick={() => {
                            form.setValue('animal_id', animal.id)
                            setShowAnimalDropdown(false)
                          }}
                          className={`w-full px-4 py-3 text-left hover:bg-farm-green/5 transition-colors ${selectedAnimal?.id === animal.id ? 'bg-farm-green/10 border-l-4 border-farm-green' : ''
                            }`}
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex-1 min-w-0">
                              {/* Animal Name and Basic Info */}
                              <p className="font-medium text-gray-900 truncate">
                                {animal.name || `Animal ${animal.tag_number}`}
                              </p>
                              <p className="text-xs text-gray-600 mt-1">
                                #{animal.tag_number} • {animal.breed} • {animal.gender}
                              </p>

                              {/* Status Badges Row */}
                              <div className="flex flex-wrap gap-2 mt-2">
                                {/* Health Status Badge */}
                                {animal.health_status && (
                                  <div className="flex items-center gap-1">
                                    <Heart className="w-3 h-3 text-red-600" />
                                    <span className={`px-2 py-0.5 text-xs font-semibold rounded-full ${getHealthStatusColor(animal.health_status)}`}>
                                      {getHealthStatusLabel(animal.health_status)}
                                    </span>
                                  </div>
                                )}

                                {/* Production Status Badge */}
                                {animal.production_status && (
                                  <div className="flex items-center gap-1">
                                    <TrendingUp className="w-3 h-3 text-blue-600" />
                                    <span className={`px-2 py-0.5 text-xs font-semibold rounded-full ${getProductionStatusColor(animal.production_status)}`}>
                                      {getProductionStatusLabel(animal.production_status)}
                                    </span>
                                  </div>
                                )}
                              </div>
                            </div>

                            {/* Selection Checkmark */}
                            {selectedAnimal?.id === animal.id && (
                              <div className="text-farm-green flex-shrink-0">
                                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                </svg>
                              </div>
                            )}
                          </div>
                        </button>
                      ))}
                    </div>
                  )}

                  {filteredAnimals.length === 20 && !showAllAnimals && (
                    <div className="p-3 border-t border-gray-200">
                      <button
                        type="button"
                        onClick={() => {
                          setShowAllAnimals(true)
                        }}
                        className="w-full px-3 py-2 text-sm text-farm-green hover:bg-farm-green/10 rounded transition-colors font-medium"
                      >
                        📋 Show all {animals.filter(a => a.status === 'active').length} animals
                      </button>
                    </div>
                  )}
                </div>
              )}

              {form.formState.errors.animal_id && (
                <p className="text-sm text-red-600 mt-1">
                  {form.formState.errors.animal_id.message}
                </p>
              )}
            </div>
          </div>

          {/* Reported Health Issues - Optional Selection */}
          {selectedAnimalId && healthIssues.length > 0 && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              {/* Selection Summary */}
              <div className="mb-4 p-3 bg-white border border-blue-300 rounded-lg">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-700">
                      <span className="text-blue-600">Animal:</span> {selectedAnimal?.name || `Animal ${selectedAnimal?.tag_number}`}
                    </p>
                    {selectedHealthIssue && (
                      <p className="text-sm font-medium text-gray-700 mt-1">
                        <span className="text-blue-600">Health Issue:</span> {selectedHealthIssue.description}
                        <Badge className={`inline-block ml-2 text-xs ${selectedHealthIssue.severity === 'critical' ? 'bg-red-100 text-red-800' :
                          selectedHealthIssue.severity === 'high' ? 'bg-orange-100 text-orange-800' :
                            selectedHealthIssue.severity === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                              'bg-blue-100 text-blue-800'
                          }`}>
                          {selectedHealthIssue.severity || 'medium'}
                        </Badge>
                      </p>
                    )}
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className="text-green-600 font-bold">✓</span>
                    <span className="text-xs font-medium text-green-700">Ready</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between mb-3">
                <h4 className="font-medium text-gray-900 flex items-center space-x-2">
                  <AlertTriangle className="w-4 h-4 text-orange-600" />
                  <span>Reported Health Issues for This Animal</span>
                </h4>
                {loadingHealthIssues && <LoadingSpinner className="w-4 h-4" />}
              </div>

              <p className="text-sm text-gray-600 mb-3">
                Click an issue below to auto-fill the record type and details. This is optional.
              </p>

              <div className="space-y-2 max-h-72 overflow-y-auto pr-2">
                {healthIssues.map((issue) => (
                  <button
                    key={issue.id}
                    type="button"
                    onClick={() => handleSelectHealthIssue(issue)}
                    className={`w-full text-left p-3 rounded-lg border-2 transition-all ${selectedHealthIssue?.id === issue.id
                      ? 'bg-blue-100 border-blue-500 ring-2 ring-blue-300'
                      : 'bg-white border-blue-200 hover:border-blue-400'
                      }`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-2 mb-1">
                          <span className="font-medium text-gray-900">{issue.description}</span>
                          <Badge className={`text-xs ${issue.severity === 'critical' ? 'bg-red-100 text-red-800' :
                            issue.severity === 'high' ? 'bg-orange-100 text-orange-800' :
                              issue.severity === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                                'bg-blue-100 text-blue-800'
                            }`}>
                            {issue.severity || 'medium'}
                          </Badge>
                        </div>
                        <p className="text-sm text-gray-600">
                          Type: <span className="font-medium">{issue.issue_type}</span>
                          {issue.reported_at && (
                            <span className="ml-2">• Reported: {new Date(issue.reported_at).toLocaleDateString()}</span>
                          )}
                        </p>
                        {issue.notes && (
                          <p className="text-sm text-gray-500 mt-1 italic">{issue.notes}</p>
                        )}
                      </div>
                      {selectedHealthIssue?.id === issue.id && (
                        <div className="ml-2 text-blue-600 font-bold text-lg">✓</div>
                      )}
                    </div>
                  </button>
                ))}
              </div>

              {selectedHealthIssue && (
                <button
                  type="button"
                  onClick={() => {
                    setSelectedHealthIssue(null)
                    form.setValue('record_type', 'checkup')
                  }}
                  className="mt-3 text-sm text-blue-600 hover:text-blue-800 flex items-center space-x-1"
                >
                  <X className="w-4 h-4" />
                  <span>Clear health issue selection</span>
                </button>
              )}
            </div>
          )}

          {/* Basic Record Details */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label htmlFor="record_date" className="flex items-center space-x-2">
                <Calendar className="w-4 h-4" />
                <span>Record Date</span>
              </Label>
              <Input
                id="record_date"
                type="date"
                {...form.register('record_date')}
                error={form.formState.errors.record_date?.message}
              />
            </div>

            <div>
              <Label htmlFor="record_time" className="flex items-center space-x-2">
                <Clock className="w-4 h-4" />
                <span>Record Time (Optional)</span>
              </Label>
              <Input
                id="record_time"
                type="time"
                {...form.register('record_time')}
                error={form.formState.errors.record_time?.message}
              />
            </div>

            <div>
              <Label htmlFor="record_type">Record Type</Label>
              <select
                id="record_type"
                {...form.register('record_type')}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-farm-green focus:border-transparent"
              >
                <option value="checkup">{getRecordTypeIcon('checkup')} General Checkup</option>
                <option value="vaccination">{getRecordTypeIcon('vaccination')} Vaccination</option>
                <option value="treatment">{getRecordTypeIcon('treatment')} Treatment</option>
                <option value="injury">{getRecordTypeIcon('injury')} Injury</option>
                <option value="illness">{getRecordTypeIcon('illness')} Illness</option>
                <option value="reproductive">{getRecordTypeIcon('reproductive')} Reproductive Health</option>
                <option value="deworming">{getRecordTypeIcon('deworming')} Deworming & Parasite Control</option>
                <option value="dehorning">{getRecordTypeIcon('dehorning')} Dehorning</option>
                <option value="post_mortem">{getRecordTypeIcon('post_mortem')} Post Mortem</option>
              </select>
            </div>
          </div>

          {/* General Description */}
          <div>
            <Label htmlFor="description">Description</Label>
            <textarea
              id="description"
              {...form.register('description')}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-farm-green focus:border-transparent"
              placeholder="Describe the health record details..."
            />
            {form.formState.errors.description && (
              <p className="text-sm text-red-600 mt-1">
                {form.formState.errors.description.message}
              </p>
            )}
          </div>

          {/* Record Type Specific Fields */}
          {watchedRecordType === 'checkup' && (
            <CollapsibleSection
              title="General Check-up Details"
              isOpen={!collapsedSections.has('checkup')}
              onToggle={() => toggleSection('checkup')}
            >
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="body_condition_score">Body Condition Score (1-5)</Label>
                  <Input
                    id="body_condition_score"
                    type="number"
                    min="1"
                    max="5"
                    step="0.5"
                    {...form.register('body_condition_score')}
                    placeholder="3.0"
                  />
                </div>
                <div>
                  <Label htmlFor="weight">Weight (kg)</Label>
                  <Input
                    id="weight"
                    type="number"
                    min="0"
                    step="0.1"
                    {...form.register('weight')}
                    placeholder="350.0"
                  />
                </div>
                <div>
                  <Label htmlFor="temperature">Temperature (°C)</Label>
                  <Input
                    id="temperature"
                    type="number"
                    step="0.1"
                    {...form.register('temperature')}
                    placeholder="38.5"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="pulse">Pulse (bpm)</Label>
                  <Input
                    id="pulse"
                    type="number"
                    min="0"
                    {...form.register('pulse')}
                    placeholder="60"
                  />
                </div>
                <div>
                  <Label htmlFor="respiration">Respiration (breaths/min)</Label>
                  <Input
                    id="respiration"
                    type="number"
                    min="0"
                    {...form.register('respiration')}
                    placeholder="20"
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="physical_exam_notes">Physical Examination Notes</Label>
                <textarea
                  id="physical_exam_notes"
                  {...form.register('physical_exam_notes')}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-farm-green focus:border-transparent"
                  placeholder="Notes on skin, eyes, udder, hooves, etc."
                />
              </div>
              <div className="flex items-center space-x-2 pt-6">
                <input
                  type="checkbox"
                  id="follow_up_required"
                  {...form.register('follow_up_required')}
                  className="rounded border-gray-300 text-farm-green focus:ring-farm-green"
                />
                <Label htmlFor="follow_up_required" className="text-sm">Follow-up Required</Label>
              </div>
            </CollapsibleSection>
          )}

          {watchedRecordType === 'vaccination' && (
            <CollapsibleSection
              title="Vaccination Details"
              isOpen={!collapsedSections.has('vaccination')}
              onToggle={() => toggleSection('vaccination')}
            >
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="vaccine_name">Vaccine Name</Label>
                  <select
                    id="vaccine_name"
                    {...form.register('vaccine_name')}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-farm-green focus:border-transparent"
                  >
                    <option value="">Select vaccine...</option>
                    <option value="FMD">FMD (Foot and Mouth Disease)</option>
                    <option value="LSD">LSD (Lumpy Skin Disease)</option>
                    <option value="Brucellosis">Brucellosis</option>
                    <option value="Rift Valley Fever">Rift Valley Fever</option>
                    <option value="Anthrax">Anthrax</option>
                    <option value="Blackleg">Blackleg</option>
                    <option value="other">Other (specify)</option>
                  </select>
                  {watchedVaccineName === 'other' && (
                    <Input
                      {...form.register('vaccine_name_other')}
                      placeholder="Enter vaccine name"
                      className="mt-2"
                    />
                  )}
                </div>

                <div>
                  <Label htmlFor="vaccine_batch_number">Batch/Lot Number</Label>
                  <Input
                    id="vaccine_batch_number"
                    {...form.register('vaccine_batch_number')}
                    placeholder="ABC123"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="vaccine_dose">Dose Administered</Label>
                  <Input
                    id="vaccine_dose"
                    {...form.register('vaccine_dose')}
                    placeholder="2ml"
                  />
                </div>

                <div>
                  <Label htmlFor="route_of_administration">Route of Administration</Label>
                  <select
                    id="route_of_administration"
                    {...form.register('route_of_administration')}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-farm-green focus:border-transparent"
                  >
                    <option value="">Select route...</option>
                    <option value="subcutaneous">Subcutaneous</option>
                    <option value="intramuscular">Intramuscular</option>
                    <option value="intranasal">Intranasal</option>
                    <option value="oral">Oral</option>
                    <option value="other">Other (specify)</option>
                  </select>
                  {watchedRoute === 'other' && (
                    <Input
                      {...form.register('route_of_administration_other')}
                      placeholder="Enter route"
                      className="mt-2"
                    />
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="next_due_date">Next Due Date</Label>
                  <Input
                    id="next_due_date"
                    type="date"
                    {...form.register('next_due_date')}
                    min={new Date().toISOString().split('T')[0]}
                  />
                </div>

                <div>
                  <Label htmlFor="administered_by">Administered By</Label>
                  <Input
                    id="administered_by"
                    {...form.register('administered_by')}
                    placeholder="Veterinarian, farmer, technician"
                  />
                </div>
              </div>
              <div className="flex items-center space-x-2 pt-6">
                <input
                  type="checkbox"
                  id="follow_up_required"
                  {...form.register('follow_up_required')}
                  className="rounded border-gray-300 text-farm-green focus:ring-farm-green"
                />
                <Label htmlFor="follow_up_required" className="text-sm">Follow-up Required</Label>
              </div>
            </CollapsibleSection>
          )}

          {watchedRecordType === 'treatment' && (
            <CollapsibleSection
              title="Treatment Details"
              isOpen={!collapsedSections.has('treatment')}
              onToggle={() => toggleSection('treatment')}
            >
              <div>
                <Label htmlFor="diagnosis">Diagnosis/Condition Being Treated</Label>
                <Input
                  id="diagnosis"
                  {...form.register('diagnosis')}
                  placeholder="Primary diagnosis or condition"
                />
              </div>

              {/* Medications Section - Memoized to prevent re-renders */}
              <MedicationsSection
                medications={medications}
                onAddMedication={addMedication}
                onRemoveMedication={removeMedication}
                onUpdateMedication={updateMedication}
              />

              <div>
                <Label htmlFor="withdrawal_period">Withdrawal Period</Label>
                <Input
                  id="withdrawal_period"
                  {...form.register('withdrawal_period')}
                  placeholder="Milk: 3 days, Meat: 14 days"
                />
              </div>

              <div>
                <Label htmlFor="response_notes">Response/Progress Notes</Label>
                <textarea
                  id="response_notes"
                  {...form.register('response_notes')}
                  rows={2}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-farm-green focus:border-transparent"
                  placeholder="Animal's response to treatment"
                />
              </div>
              <div className="flex items-center space-x-2 pt-6">
                <input
                  type="checkbox"
                  id="follow_up_required"
                  {...form.register('follow_up_required')}
                  className="rounded border-gray-300 text-farm-green focus:ring-farm-green"
                />
                <Label htmlFor="follow_up_required" className="text-sm">Follow-up Required</Label>
              </div>
            </CollapsibleSection>
          )}

          {watchedRecordType === 'injury' && (
            <CollapsibleSection
              title="Injury Details"
              isOpen={!collapsedSections.has('injury')}
              onToggle={() => toggleSection('injury')}
            >
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="injury_cause">Cause of Injury</Label>
                  <select
                    id="injury_cause"
                    {...form.register('injury_cause')}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-farm-green focus:border-transparent"
                  >
                    <option value="">Select cause...</option>
                    <option value="accident">Accident</option>
                    <option value="fight">Fight with another animal</option>
                    <option value="machinery">Machinery</option>
                    <option value="slip_fall">Slip/Fall</option>
                    <option value="predator">Predator attack</option>
                    <option value="other">Other (specify)</option>
                  </select>
                  {watchedInjuryCause === 'other' && (
                    <Input
                      {...form.register('injury_cause_other')}
                      placeholder="Enter cause"
                      className="mt-2"
                    />
                  )}
                </div>

                <div>
                  <Label htmlFor="injury_type">Type of Injury</Label>
                  <select
                    id="injury_type"
                    {...form.register('injury_type')}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-farm-green focus:border-transparent"
                  >
                    <option value="">Select type...</option>
                    <option value="cut">Cut/Laceration</option>
                    <option value="fracture">Fracture</option>
                    <option value="bruise">Bruise</option>
                    <option value="sprain">Sprain</option>
                    <option value="burn">Burn</option>
                    <option value="puncture">Puncture wound</option>
                    <option value="other">Other (specify)</option>
                  </select>
                  {watchedInjuryType === 'other' && (
                    <Input
                      {...form.register('injury_type_other')}
                      placeholder="Enter type"
                      className="mt-2"
                    />
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="severity">Severity</Label>
                  <select
                    id="severity"
                    {...form.register('severity')}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-farm-green focus:border-transparent"
                  >
                    <option value="">Select severity...</option>
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                  </select>
                  {form.formState.errors.severity && (
                    <p className="text-sm text-red-600 mt-1">{form.formState.errors.severity.message}</p>
                  )}
                </div>

                <div className="flex items-center space-x-2 pt-6">
                  <input
                    type="checkbox"
                    id="follow_up_required"
                    {...form.register('follow_up_required')}
                    className="rounded border-gray-300 text-farm-green focus:ring-farm-green"
                  />
                  <Label htmlFor="follow_up_required" className="text-sm">Follow-up Required</Label>
                </div>
              </div>

              <div>
                <Label htmlFor="treatment_given">Treatment/First Aid Given</Label>
                <textarea
                  id="treatment_given"
                  {...form.register('treatment_given')}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-farm-green focus:border-transparent"
                  placeholder="Describe the immediate treatment provided"
                />
              </div>
            </CollapsibleSection>
          )}

          {watchedRecordType === 'illness' && (
            <CollapsibleSection
              title="Illness Details"
              isOpen={!collapsedSections.has('illness')}
              onToggle={() => toggleSection('illness')}
            >
              <div>
                <Label htmlFor="symptoms">Symptoms Observed</Label>
                <textarea
                  id="symptoms"
                  {...form.register('symptoms')}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-farm-green focus:border-transparent"
                  placeholder="Describe observed symptoms (fever, lethargy, loss of appetite, etc.)"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="illness_diagnosis">Diagnosis</Label>
                  <Input
                    id="illness_diagnosis"
                    {...form.register('illness_diagnosis')}
                    placeholder="Provisional or confirmed diagnosis"
                  />
                </div>

                <div>
                  <Label htmlFor="illness_severity">Severity</Label>
                  <select
                    id="illness_severity"
                    {...form.register('illness_severity')}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-farm-green focus:border-transparent"
                  >
                    <option value="">Select severity...</option>
                    <option value="mild">Mild</option>
                    <option value="moderate">Moderate</option>
                    <option value="severe">Severe</option>
                  </select>
                  {form.formState.errors.illness_severity && (
                    <p className="text-sm text-red-600 mt-1">{form.formState.errors.illness_severity.message}</p>
                  )}
                </div>
              </div>

              <div>
                <Label htmlFor="lab_test_results">Lab Test Results</Label>
                <textarea
                  id="lab_test_results"
                  {...form.register('lab_test_results')}
                  rows={2}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-farm-green focus:border-transparent"
                  placeholder="Any laboratory test results (if applicable)"
                />
              </div>

              <div>
                <Label htmlFor="treatment_plan">Treatment Plan</Label>
                <textarea
                  id="treatment_plan"
                  {...form.register('treatment_plan')}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-farm-green focus:border-transparent"
                  placeholder="Planned treatment approach"
                />
              </div>

              <div>
                <Label htmlFor="recovery_outcome">Recovery/Outcome</Label>
                <Input
                  id="recovery_outcome"
                  {...form.register('recovery_outcome')}
                  placeholder="Current status or expected outcome"
                />
              </div>

              <div className="flex items-center space-x-2 pt-6">
                <input
                  type="checkbox"
                  id="follow_up_required"
                  {...form.register('follow_up_required')}
                  className="rounded border-gray-300 text-farm-green focus:ring-farm-green"
                />
                <Label htmlFor="follow_up_required" className="text-sm">Follow-up Required</Label>
              </div>
            </CollapsibleSection>
          )}

          {watchedRecordType === 'reproductive' && (
            <CollapsibleSection
              title="Reproductive Health Details"
              isOpen={!collapsedSections.has('reproductive')}
              onToggle={() => toggleSection('reproductive')}
            >
              {/* === EVENT TYPE === */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="reproductive_type">Reproductive Event Type</Label>
                  <select
                    id="reproductive_type"
                    {...form.register('reproductive_type')}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-farm-green focus:border-transparent"
                  >
                    <option value="">Select type...</option>
                    <option value="estrus_check">Estrus / Heat Detection</option>
                    <option value="AI">Artificial Insemination</option>
                    <option value="natural_service">Natural Service</option>
                    <option value="pregnancy_check">Pregnancy Check / Palpation</option>
                    <option value="calving">Calving / Parturition</option>
                    <option value="abortion">Abortion / Pregnancy Loss</option>
                    <option value="retained_placenta">Retained Placenta</option>
                    <option value="uterine_treatment">Uterine Treatment / Flushing</option>
                    <option value="reproductive_exam">General Reproductive Examination</option>
                    <option value="other">Other (specify)</option>
                  </select>
                  {watchedReproductiveType === 'other' && (
                    <Input
                      {...form.register('reproductive_type_other')}
                      placeholder="Describe the event"
                      className="mt-2"
                    />
                  )}
                </div>

                <div>
                  <Label htmlFor="pregnancy_result">Pregnancy Status</Label>
                  <select
                    id="pregnancy_result"
                    {...form.register('pregnancy_result')}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-farm-green focus:border-transparent"
                  >
                    <option value="pending">Not Yet Confirmed</option>
                    <option value="yes">Confirmed Pregnant</option>
                    <option value="no">Not Pregnant (Open)</option>
                  </select>
                </div>
              </div>

              {/* === REPRODUCTIVE TRACT EXAMINATION === */}
              <div className="border border-gray-200 rounded-lg p-4 bg-gray-50 space-y-4">
                <Label className="text-sm font-semibold text-gray-800">Reproductive Tract Examination</Label>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="vaginal_discharge">Vaginal Discharge</Label>
                    <select
                      id="vaginal_discharge"
                      {...form.register('vaginal_discharge' as any)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-farm-green focus:border-transparent"
                    >
                      <option value="">Select...</option>
                      <option value="none">None</option>
                      <option value="clear_normal">Clear / Normal (mucus)</option>
                      <option value="bloody_normal">Blood-tinged (post-calving normal)</option>
                      <option value="purulent">Purulent / Pus (abnormal)</option>
                      <option value="foul_smelling">Foul-smelling (metritis/pyometra)</option>
                      <option value="lochia_normal">Lochia — normal post-calving</option>
                      <option value="other">Other</option>
                    </select>
                  </div>

                  <div>
                    <Label htmlFor="cervix_condition">Cervix Condition</Label>
                    <select
                      id="cervix_condition"
                      {...form.register('cervix_condition' as any)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-farm-green focus:border-transparent"
                    >
                      <option value="">Select...</option>
                      <option value="closed_normal">Closed — normal</option>
                      <option value="open_estrus">Open — estrus/heat</option>
                      <option value="open_post_calving">Open — post-calving</option>
                      <option value="dilated_abnormal">Dilated — abnormal</option>
                      <option value="cervicitis">Cervicitis (inflamed)</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="uterus_tone">Uterine Tone / Involution</Label>
                    <select
                      id="uterus_tone"
                      {...form.register('uterus_tone' as any)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-farm-green focus:border-transparent"
                    >
                      <option value="">Select...</option>
                      <option value="normal">Normal tone</option>
                      <option value="involuting">Involuting normally (post-calving)</option>
                      <option value="poor_involution">Poor involution</option>
                      <option value="enlarged">Enlarged / Distended</option>
                      <option value="fluid_filled">Fluid-filled (pyometra suspected)</option>
                    </select>
                  </div>

                  <div>
                    <Label htmlFor="ovarian_status">Ovarian Status</Label>
                    <select
                      id="ovarian_status"
                      {...form.register('ovarian_status' as any)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-farm-green focus:border-transparent"
                    >
                      <option value="">Select...</option>
                      <option value="normal_cycling">Normal cycling</option>
                      <option value="corpus_luteum">Corpus luteum present</option>
                      <option value="follicle_dominant">Dominant follicle</option>
                      <option value="cystic_follicle">Cystic follicle</option>
                      <option value="cystic_luteal">Cystic luteal (luteal cyst)</option>
                      <option value="anestrus">Anestrus — no activity</option>
                    </select>
                  </div>
                </div>

                <div>
                  <Label htmlFor="physical_exam_notes">Examination Findings / Notes</Label>
                  <textarea
                    id="physical_exam_notes"
                    {...form.register('physical_exam_notes')}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-farm-green focus:border-transparent"
                    placeholder="Describe palpation or ultrasound findings, physical observations..."
                  />
                </div>
              </div>

              {/* === ESTRUS / HEAT SIGNS === */}
              <div>
                <Label htmlFor="estrus_signs">Estrus / Heat Signs Observed</Label>
                <textarea
                  id="estrus_signs"
                  {...form.register('estrus_signs' as any)}
                  rows={2}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-farm-green focus:border-transparent"
                  placeholder="Standing heat, mounting, restlessness, swelling, mucus — describe observed signs..."
                />
              </div>

              {/* === CALVING OUTCOME (only relevant when calving) === */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="calving_outcome">Calving Outcome</Label>
                  <select
                    id="calving_outcome"
                    {...form.register('calving_outcome')}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-farm-green focus:border-transparent"
                  >
                    <option value="">Not applicable / select...</option>
                    <option value="alive_single">Single calf — alive</option>
                    <option value="alive_twins">Twins — both alive</option>
                    <option value="one_alive_one_dead">Twins — one alive, one dead</option>
                    <option value="stillbirth">Stillbirth</option>
                    <option value="dystocia">Difficult birth (dystocia)</option>
                    <option value="assisted_delivery">Assisted delivery</option>
                    <option value="caesarean">Caesarean section</option>
                    <option value="other">Other (specify)</option>
                  </select>
                  {watchedCalvingOutcome === 'other' && (
                    <Input
                      {...form.register('calving_outcome_other')}
                      placeholder="Describe the outcome"
                      className="mt-2"
                    />
                  )}
                </div>

                <div>
                  <Label htmlFor="complications">Complications Observed</Label>
                  <select
                    id="complications"
                    {...form.register('complications')}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-farm-green focus:border-transparent"
                  >
                    <option value="">No complications</option>
                    <option value="milk_fever">Milk fever (hypocalcemia)</option>
                    <option value="ketosis">Ketosis / Acetonemia</option>
                    <option value="prolapse_uterus">Uterine prolapse</option>
                    <option value="prolapse_vaginal">Vaginal prolapse</option>
                    <option value="retained_placenta">Retained placenta</option>
                    <option value="metritis">Metritis (uterine infection)</option>
                    <option value="mastitis">Mastitis</option>
                    <option value="hemorrhage">Hemorrhage</option>
                    <option value="other">Other (specify)</option>
                  </select>
                  {watchedComplications === 'other' && (
                    <Input
                      {...form.register('complications_other')}
                      placeholder="Describe the complication"
                      className="mt-2"
                    />
                  )}
                </div>
              </div>

              {/* === BODY CONDITION === */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="body_condition_score">Body Condition Score (1–5)</Label>
                  <Input
                    id="body_condition_score"
                    type="number"
                    min="1"
                    max="5"
                    step="0.5"
                    {...form.register('body_condition_score')}
                    placeholder="3.0"
                  />
                </div>
                <div>
                  <Label htmlFor="temperature">Temperature (°C)</Label>
                  <Input
                    id="temperature"
                    type="number"
                    step="0.1"
                    {...form.register('temperature')}
                    placeholder="38.5"
                  />
                </div>
                <div>
                  <Label htmlFor="weight">Weight (kg)</Label>
                  <Input
                    id="weight"
                    type="number"
                    min="0"
                    step="0.1"
                    {...form.register('weight')}
                    placeholder="350.0"
                  />
                </div>
              </div>

              {/* === MEDICATIONS (same pattern as treatment) === */}
              <MedicationsSection
                medications={medications}
                onAddMedication={addMedication}
                onRemoveMedication={removeMedication}
                onUpdateMedication={updateMedication}
              />

              {/* === HORMONE / TREATMENT PROTOCOL === */}
              <div>
                <Label htmlFor="treatment_plan">Hormone / Treatment Protocol Used</Label>
                <textarea
                  id="treatment_plan"
                  {...form.register('treatment_plan')}
                  rows={2}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-farm-green focus:border-transparent"
                  placeholder="e.g., CIDR insert, GnRH, PGF2α, oxytocin, calcium IV — describe the protocol..."
                />
              </div>

              {/* === POST-EVENT MONITORING === */}
              <div>
                <Label htmlFor="response_notes">Post-Event Health Monitoring Notes</Label>
                <textarea
                  id="response_notes"
                  {...form.register('response_notes')}
                  rows={2}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-farm-green focus:border-transparent"
                  placeholder="Animal's condition after the procedure — appetite, mobility, discharge, temperature trends..."
                />
              </div>

              {/* === FOLLOW-UP === */}
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="follow_up_required"
                  {...form.register('follow_up_required')}
                  className="rounded border-gray-300 text-farm-green focus:ring-farm-green"
                />
                <Label htmlFor="follow_up_required" className="text-sm">Follow-up examination required</Label>
              </div>
            </CollapsibleSection>
          )}

          {watchedRecordType === 'deworming' && (
            <CollapsibleSection
              title="Deworming & Parasite Control Details"
              isOpen={!collapsedSections.has('deworming')}
              onToggle={() => toggleSection('deworming')}
            >
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="product_used">Product Used</Label>
                  <select
                    id="product_used"
                    {...form.register('product_used')}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-farm-green focus:border-transparent"
                  >
                    <option value="">Select product...</option>
                    <option value="albendazole">Albendazole</option>
                    <option value="ivermectin">Ivermectin</option>
                    <option value="levamisole">Levamisole</option>
                    <option value="fenbendazole">Fenbendazole</option>
                    <option value="acaricide_spray">Acaricide Spray</option>
                    <option value="dip">Dip Treatment</option>
                    <option value="other">Other (specify)</option>
                  </select>
                  {watchedProductUsed === 'other' && (
                    <Input
                      {...form.register('product_used_other')}
                      placeholder="Enter product name"
                      className="mt-2"
                    />
                  )}
                </div>

                <div>
                  <Label htmlFor="deworming_dose">Dose Given</Label>
                  <Input
                    id="deworming_dose"
                    {...form.register('deworming_dose')}
                    placeholder="10ml, 1 tablet, etc."
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="next_deworming_date">Next Due Date</Label>
                  <Input
                    id="next_deworming_date"
                    type="date"
                    {...form.register('next_deworming_date')}
                    min={new Date().toISOString().split('T')[0]}
                  />
                </div>

                <div>
                  <Label htmlFor="deworming_administered_by">Administered By</Label>
                  <Input
                    id="deworming_administered_by"
                    {...form.register('deworming_administered_by')}
                    placeholder="Veterinarian, farmer, technician"
                  />
                </div>
              </div>
            </CollapsibleSection>
          )}

          {watchedRecordType === 'dehorning' && (
            <CollapsibleSection
              title="🐄 Dehorning Details"
              isOpen={!collapsedSections.has('dehorning')}
              onToggle={() => toggleSection('dehorning')}
            >
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="dehorning_method">Dehorning Method</Label>
                  <select
                    id="dehorning_method"
                    {...form.register('dehorning_method')}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-farm-green focus:border-transparent"
                  >
                    <option value="">Select method...</option>
                    <option value="hot_iron">Hot Iron/Branding</option>
                    <option value="disbudding">Disbudding (Young Animals)</option>
                    <option value="surgical">Surgical Removal</option>
                    <option value="caustic_paste">Caustic Paste</option>
                    <option value="laser">Laser</option>
                    <option value="other">Other</option>
                  </select>
                  {form.watch('dehorning_method') === 'other' && (
                    <Input
                      {...form.register('dehorning_method_other')}
                      placeholder="Describe the method"
                      className="mt-2"
                    />
                  )}
                </div>

                <div>
                  <Label htmlFor="dehorning_date">Date of Dehorning</Label>
                  <Input
                    id="dehorning_date"
                    type="date"
                    {...form.register('dehorning_date')}
                  />
                </div>

                <div>
                  <Label htmlFor="dehorning_reason">Reason for Dehorning</Label>
                  <Input
                    id="dehorning_reason"
                    {...form.register('dehorning_reason')}
                    placeholder="e.g., Safety, Farm policy, Behavior management"
                  />
                </div>

                <div>
                  <Label htmlFor="dehorning_age">Animal Age at Dehorning (months)</Label>
                  <Input
                    id="dehorning_age"
                    type="number"
                    min="0"
                    {...form.register('dehorning_age', { valueAsNumber: true })}
                    placeholder="Age at dehorning"
                  />
                </div>

                <div>
                  <Label htmlFor="dehorning_veterinarian">Performed by</Label>
                  <Input
                    id="dehorning_veterinarian"
                    {...form.register('dehorning_veterinarian')}
                    placeholder="Veterinarian or technician name"
                  />
                </div>
              </div>

              <div className="space-y-4 pt-2 border-t mt-4">
                <div>
                  <Label className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      {...form.register('anesthesia_used')}
                      className="w-4 h-4 text-farm-green border-gray-300 rounded focus:ring-farm-green"
                    />
                    <span>Anesthesia Used</span>
                  </Label>
                </div>
                {form.watch('anesthesia_used') && (
                  <div>
                    <Label htmlFor="anesthesia_type">Anesthesia Type</Label>
                    <Input
                      id="anesthesia_type"
                      {...form.register('anesthesia_type')}
                      placeholder="Local, General, Regional"
                    />
                  </div>
                )}
              </div>

              <div>
                <Label htmlFor="post_dehorning_care">Post-Dehorning Care</Label>
                <textarea
                  id="post_dehorning_care"
                  {...form.register('post_dehorning_care')}
                  rows={2}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-farm-green focus:border-transparent"
                  placeholder="Wound care, pain management, infection prevention measures..."
                />
              </div>

              <div>
                <Label htmlFor="dehorning_complications">Complications (if any)</Label>
                <textarea
                  id="dehorning_complications"
                  {...form.register('dehorning_complications')}
                  rows={2}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-farm-green focus:border-transparent"
                  placeholder="Excessive bleeding, infection, behavioral changes, other complications..."
                />
              </div>
            </CollapsibleSection>
          )}

          {watchedRecordType === 'post_mortem' && (
            <CollapsibleSection
              title="Post Mortem Details"
              isOpen={!collapsedSections.has('post_mortem')}
              onToggle={() => toggleSection('post_mortem')}
            >
              <div>
                <Label htmlFor="cause_of_death">Cause of Death</Label>
                <Input
                  id="cause_of_death"
                  {...form.register('cause_of_death')}
                  placeholder="Primary cause of death (disease, injury, age, etc.)"
                />
              </div>

              <div>
                <Label htmlFor="death_circumstances">Circumstances of Death</Label>
                <textarea
                  id="death_circumstances"
                  {...form.register('death_circumstances')}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-farm-green focus:border-transparent"
                  placeholder="Describe the circumstances surrounding the death (found dead, unexpected, after illness, etc.)"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="location_of_death">Location of Death</Label>
                  <Input
                    id="location_of_death"
                    {...form.register('location_of_death')}
                    placeholder="Paddock, barn, house, pen, etc."
                  />
                </div>

                <div>
                  <Label htmlFor="suspected_disease">Suspected Disease/Condition</Label>
                  <Input
                    id="suspected_disease"
                    {...form.register('suspected_disease')}
                    placeholder="If applicable (e.g., pneumonia, bloat, mastitis)"
                  />
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="necropsy_performed"
                  {...form.register('necropsy_performed')}
                  className="rounded border-gray-300 text-farm-green focus:ring-farm-green"
                />
                <Label htmlFor="necropsy_performed" className="text-sm">Necropsy Performed</Label>
              </div>

              {watchedNecropsy && (
                <div>
                  <Label htmlFor="necropsy_findings">Necropsy Findings</Label>
                  <textarea
                    id="necropsy_findings"
                    {...form.register('necropsy_findings')}
                    rows={4}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-farm-green focus:border-transparent"
                    placeholder="Professional necropsy findings and observations (performed by veterinarian, if applicable)"
                  />
                </div>
              )}

              <div>
                <Label htmlFor="body_disposal_method">Body Disposal Method</Label>
                <select
                  id="body_disposal_method"
                  {...form.register('body_disposal_method')}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-farm-green focus:border-transparent"
                >
                  <option value="">Select disposal method...</option>
                  <option value="burial">Burial</option>
                  <option value="incineration">Incineration</option>
                  <option value="rendering">Rendering</option>
                  <option value="composting">Composting</option>
                  <option value="other">Other</option>
                </select>
              </div>

              <div>
                <Label htmlFor="post_mortem_notes">Post Mortem Notes</Label>
                <textarea
                  id="post_mortem_notes"
                  {...form.register('post_mortem_notes')}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-farm-green focus:border-transparent"
                  placeholder="Any additional observations, genetic concerns, or notes for future reference..."
                />
              </div>
            </CollapsibleSection>
          )}

          {/* General Fields */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="veterinarian">Veterinarian (Optional)</Label>
              <Input
                id="veterinarian"
                {...form.register('veterinarian')}
                placeholder="Dr. Smith, Veterinary Clinic Name"
              />
            </div>

            <div>
              <Label htmlFor="cost" className="flex items-center space-x-2">
                <span>Cost (KES)</span>
              </Label>
              <div className="flex items-center">
                <span className="px-3 py-2 bg-gray-100 border border-gray-300 border-r-0 rounded-l-md text-gray-700 font-medium">KES</span>
                <Input
                  id="cost"
                  type="number"
                  step="0.01"
                  min="0"
                  {...form.register('cost')}
                  placeholder="0.00"
                  className="rounded-l-none"
                />
              </div>
            </div>
          </div>

          <div>
            <Label htmlFor="notes">Additional Notes</Label>
            <textarea
              id="notes"
              {...form.register('notes')}
              rows={2}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-farm-green focus:border-transparent"
              placeholder="Any additional observations, follow-up instructions, or important notes..."
            />
          </div>

          {/* Image Upload Section */}
          <div>
            <Label htmlFor="record_images" className="flex items-center space-x-2">
              <ImageIcon className="w-4 h-4 text-farm-green" />
              <span>Attach Images (Optional)</span>
            </Label>
            <div className="mt-2 border-2 border-dashed border-gray-300 rounded-lg p-4 bg-gray-50 hover:bg-gray-100 transition">
              <input
                id="record_images"
                type="file"
                multiple
                accept="image/*"
                onChange={handleImageChange}
                className="hidden"
              />
              <label htmlFor="record_images" className="cursor-pointer">
                <div className="flex flex-col items-center justify-center space-y-2">
                  <ImageIcon className="w-8 h-8 text-gray-400" />
                  <span className="text-sm text-gray-600 font-medium">Click to browse or drag images here</span>
                  <span className="text-xs text-gray-500">JPG, PNG, GIF up to 5MB each</span>
                </div>
              </label>
            </div>

            {/* Image Preview Grid */}
            {imagePreviews.length > 0 && (
              <div className="mt-4">
                <p className="text-sm font-medium text-gray-700 mb-3">
                  Selected Images ({imagePreviews.length})
                </p>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                  {imagePreviews.map((preview, idx) => (
                    <div key={idx} className="relative group">
                      <img
                        src={preview}
                        alt={`Preview ${idx + 1}`}
                        className="w-full h-24 object-cover rounded-lg border border-gray-200 shadow-sm"
                      />
                      <button
                        type="button"
                        onClick={() => handleRemoveImage(idx)}
                        className="absolute top-1 right-1 bg-red-500 hover:bg-red-600 text-white p-1 rounded opacity-0 group-hover:opacity-100 transition-opacity"
                        title="Remove image"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>



          {/* Action Buttons */}
          <div className="flex justify-end space-x-3 pt-6 border-t">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={loading}
            >
              Cancel
            </Button>

            <button
              type="submit"
              disabled={loading || !form.watch('animal_id')}
              onClick={(e) => {
                console.log('🔘 ========== BUTTON CLICKED ==========')
                console.log('🔘 Event:', e)
                console.log('🔘 Button disabled?', loading || !form.watch('animal_id'))
                console.log('🔘 Loading state:', loading)
                console.log('🔘 Selected animal:', form.watch('animal_id'))
                console.log('🔘 Form state before submit:', {
                  isValid: form.formState.isValid,
                  isDirty: form.formState.isDirty,
                  isSubmitting: form.formState.isSubmitting,
                  touchedFields: form.formState.touchedFields,
                })
                console.log('🔘 All form values:', form.getValues())
                console.log('🔘 Form errors before submit:', form.formState.errors)
              }}
              className="inline-flex items-center justify-center gap-2 font-medium rounded-md border outline-none px-4 py-2 bg-blue-600 text-white hover:bg-blue-700 disabled:bg-gray-300"
            >
              {loading ? (
                <>
                  <LoadingSpinner size="sm" />
                  <span className="ml-2">Adding Record...</span>
                </>
              ) : (
                <>
                  <span>{getRecordTypeIcon(watchedRecordType)}</span>
                  <span className="ml-2">Add Health Record</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </Modal>
  )
}