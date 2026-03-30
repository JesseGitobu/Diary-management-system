// Enhanced AddHealthRecordModal with comprehensive field sets for all record types
// src/components/health/AddHealthRecordModal.tsx

'use client'

import { useState, useMemo, useCallback, useEffect, useRef } from 'react'
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
import { Search, Filter, X, Calendar, Stethoscope, ChevronDown, ChevronUp, AlertTriangle } from 'lucide-react'

const healthRecordSchema = z.object({
  animal_id: z.string().min(1, 'Please select an animal'),
  record_date: z.string().min(1, 'Record date is required'),
  record_type: z.enum(['vaccination', 'treatment', 'checkup', 'injury', 'illness', 'reproductive', 'deworming', 'post_mortem']),
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

  // Deworming fields
  product_used: z.string().optional(),
  product_used_other: z.string().optional(),
  deworming_dose: z.string().optional(),
  next_deworming_date: z.string().optional(),
  deworming_administered_by: z.string().optional(),

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
}

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
  preSelectedHealthIssue
}: AddHealthRecordModalProps) {

  console.log('🔍 AddHealthRecordModal component rendered:', { isOpen, farmId, animalsCount: animals?.length })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [animalSearch, setAnimalSearch] = useState('')
  const [showAllAnimals, setShowAllAnimals] = useState(false)
  const [collapsedSections, setCollapsedSections] = useState<Set<string>>(new Set())
  
  // Health issues state
  const [healthIssues, setHealthIssues] = useState<any[]>([])
  const [loadingHealthIssues, setLoadingHealthIssues] = useState(false)
  const [selectedHealthIssue, setSelectedHealthIssue] = useState<any | null>(null)
  
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
      record_type: recordType,
      description: descriptionText,
      linked_health_issue_id: issueId,
      severity: null as any,
      illness_severity: null as any,
      follow_up_required: false,
      pregnancy_result: 'pending',
    })
    
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
}, [isOpen, preSelectedAnimalId, preSelectedRecordType, preSelectedHealthIssue, form])

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

  // Filter and search animals
  const filteredAnimals = useMemo(() => {
    let filtered = animals.filter(animal => animal.status === 'active')

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
  }, [animals, animalSearch, showAllAnimals])

  const handleSubmit = useCallback(async (data: HealthRecordFormData) => {
    console.log('\n🚀 ========== HANDLE SUBMIT CALLED ==========')
    console.log('🚀 Raw form data:', data);

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

      console.log('\n🌐 ========== API REQUEST ==========')
      console.log('🌐 URL: /api/health/records')
      console.log('🌐 Method: POST')
      console.log('🌐 Payload:', JSON.stringify(processedData, null, 2))

      const response = await fetch('/api/health/records', {
        method: 'POST',
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
      form.reset({
        animal_id: '',
        record_date: new Date().toISOString().split('T')[0],
        record_type: 'checkup',
        severity: null as any,
        illness_severity: null as any,
        follow_up_required: false,
        pregnancy_result: 'pending',
      })
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
  }, [farmId, onRecordAdded, onClose, form, originalRecordId, rootCheckupId])

  const getRecordTypeIcon = (type: string) => {
    switch (type) {
      case 'vaccination': return '💉'
      case 'treatment': return '💊'
      case 'checkup': return '🩺'
      case 'injury': return '🩹'
      case 'illness': return '🤒'
      case 'reproductive': return '🤱'
      case 'deworming': return '🪱'
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

  const CollapsibleSection = ({ title, isOpen, onToggle, children }: {
    title: string
    isOpen: boolean
    onToggle: () => void
    children: React.ReactNode
  }) => (
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

  const selectedAnimal = animals.find(a => a.id === form.watch('animal_id'))

  return (
    <Modal isOpen={isOpen} onClose={onClose} className="max-w-5xl max-h-[95vh] overflow-y-auto">

      <div className="p-6">
        <div className="mb-6">
          <h3 className="text-xl font-semibold text-gray-900 flex items-center space-x-2">
            <Stethoscope className="w-6 h-6 text-farm-green" />
            <span>Add Health Record</span>
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
                onChange={(e) => setAnimalSearch(e.target.value)}
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
              <div className="mb-4 p-3 bg-farm-green/10 border border-farm-green/20 rounded-lg sticky top-0 z-10 shadow-sm">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-medium text-farm-green">
                      ✓ {selectedAnimal.name || `Animal ${selectedAnimal.tag_number}`}
                    </h4>
                    <p className="text-sm text-gray-600">
                      Tag: {selectedAnimal.tag_number} • {selectedAnimal.breed} • {selectedAnimal.gender}
                      {selectedAnimal.birth_date && (
                        <span> • Born: {new Date(selectedAnimal.birth_date).toLocaleDateString()}</span>
                      )}
                    </p>
                  </div>
                  <Badge variant="secondary">✓ Selected</Badge>
                </div>
              </div>
            )}

            <div>
              <select
                {...form.register('animal_id')}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-farm-green focus:border-transparent"
              >
                <option value="">Choose an animal...</option>
                {filteredAnimals.map((animal) => (
                  <option key={animal.id} value={animal.id}>
                    {animal.name || `Animal ${animal.tag_number}`} (#{animal.tag_number}) - {animal.breed}
                  </option>
                ))}
              </select>

              {filteredAnimals.length === 20 && !showAllAnimals && (
                <button
                  type="button"
                  onClick={() => setShowAllAnimals(true)}
                  className="mt-2 text-sm text-farm-green hover:text-farm-green/80"
                >
                  Show all {animals.length} animals...
                </button>
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
                        <Badge className={`inline-block ml-2 text-xs ${
                          selectedHealthIssue.severity === 'critical' ? 'bg-red-100 text-red-800' :
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
                    className={`w-full text-left p-3 rounded-lg border-2 transition-all ${
                      selectedHealthIssue?.id === issue.id
                        ? 'bg-blue-100 border-blue-500 ring-2 ring-blue-300'
                        : 'bg-white border-blue-200 hover:border-blue-400'
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-2 mb-1">
                          <span className="font-medium text-gray-900">{issue.description}</span>
                          <Badge className={`text-xs ${
                            issue.severity === 'critical' ? 'bg-red-100 text-red-800' :
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
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="medication_name">Medication Name</Label>
                  <Input
                    id="medication_name"
                    {...form.register('medication_name')}
                    placeholder="Penicillin, Oxytetracycline"
                  />
                </div>
                <div>
                  <Label htmlFor="medication_dosage">Dosage</Label>
                  <Input
                    id="medication_dosage"
                    {...form.register('medication_dosage')}
                    placeholder="10mg/kg"
                  />
                </div>
                <div>
                  <Label htmlFor="medication_duration">Duration</Label>
                  <Input
                    id="medication_duration"
                    {...form.register('medication_duration')}
                    placeholder="5 days"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="treatment_route">Route of Administration</Label>
                  <select
                    id="treatment_route"
                    {...form.register('treatment_route')}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-farm-green focus:border-transparent"
                  >
                    <option value="">Select route...</option>
                    <option value="intramuscular">Intramuscular</option>
                    <option value="subcutaneous">Subcutaneous</option>
                    <option value="intravenous">Intravenous</option>
                    <option value="oral">Oral</option>
                    <option value="topical">Topical</option>
                    <option value="other">Other (specify)</option>
                  </select>
                  {watchedTreatmentRoute === 'other' && (
                    <Input
                      {...form.register('treatment_route_other')}
                      placeholder="Enter route"
                      className="mt-2"
                    />
                  )}
                </div>

                <div>
                  <Label htmlFor="withdrawal_period">Withdrawal Period</Label>
                  <Input
                    id="withdrawal_period"
                    {...form.register('withdrawal_period')}
                    placeholder="Milk: 3 days, Meat: 14 days"
                  />
                </div>
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
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="reproductive_type">Type</Label>
                  <select
                    id="reproductive_type"
                    {...form.register('reproductive_type')}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-farm-green focus:border-transparent"
                  >
                    <option value="">Select type...</option>
                    <option value="AI">Artificial Insemination</option>
                    <option value="natural_service">Natural Service</option>
                    <option value="pregnancy_check">Pregnancy Check</option>
                    <option value="calving">Calving</option>
                    <option value="abortion">Abortion</option>
                    <option value="retained_placenta">Retained Placenta</option>
                    <option value="other">Other (specify)</option>
                  </select>
                  {watchedReproductiveType === 'other' && (
                    <Input
                      {...form.register('reproductive_type_other')}
                      placeholder="Enter type"
                      className="mt-2"
                    />
                  )}
                </div>

                <div>
                  <Label htmlFor="sire_id">Sire ID (if applicable)</Label>
                  <Input
                    id="sire_id"
                    {...form.register('sire_id')}
                    placeholder="Bull identification"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="pregnancy_result">Pregnancy Result</Label>
                  <select
                    id="pregnancy_result"
                    {...form.register('pregnancy_result')}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-farm-green focus:border-transparent"
                  >
                    <option value="pending">Pending</option>
                    <option value="yes">Pregnant</option>
                    <option value="no">Not Pregnant</option>
                  </select>
                </div>

                <div>
                  <Label htmlFor="calving_outcome">Calving Outcome</Label>
                  <select
                    id="calving_outcome"
                    {...form.register('calving_outcome')}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-farm-green focus:border-transparent"
                  >
                    <option value="">Select outcome...</option>
                    <option value="alive_single">Single Calf - Alive</option>
                    <option value="alive_twins">Twins - Alive</option>
                    <option value="stillbirth">Stillbirth</option>
                    <option value="dystocia">Difficult Birth (Dystocia)</option>
                    <option value="other">Other (specify)</option>
                  </select>
                  {watchedCalvingOutcome === 'other' && (
                    <Input
                      {...form.register('calving_outcome_other')}
                      placeholder="Enter outcome"
                      className="mt-2"
                    />
                  )}
                </div>
              </div>

              <div>
                <Label htmlFor="complications">Complications</Label>
                <select
                  id="complications"
                  {...form.register('complications')}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-farm-green focus:border-transparent"
                >
                  <option value="">No complications</option>
                  <option value="milk_fever">Milk Fever</option>
                  <option value="prolapse">Prolapse</option>
                  <option value="mastitis">Mastitis</option>
                  <option value="retained_placenta">Retained Placenta</option>
                  <option value="other">Other (specify)</option>
                </select>
                {watchedComplications === 'other' && (
                  <Input
                    {...form.register('complications_other')}
                    placeholder="Enter complication"
                    className="mt-2"
                  />
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

          {/* Debug Panel - Remove in production */}
          <div className="mt-6 p-3 bg-gray-900 text-gray-100 rounded-lg font-mono text-xs space-y-1">
            <div className="text-yellow-400 font-bold">🔍 DEBUG PANEL</div>
            <div><span className="text-blue-400">Animal Selected:</span> {form.watch('animal_id') ? '✓ ' + selectedAnimal?.tag_number : '✗ None'}</div>
            <div><span className="text-blue-400">Record Type:</span> {form.watch('record_type')}</div>
            <div><span className="text-blue-400">Description:</span> {form.watch('description')?.substring(0, 30)}...</div>
            <div><span className="text-blue-400">Severity:</span> {form.watch('severity') ? form.watch('severity') : 'null'}</div>
            <div><span className="text-blue-400">Illness Severity:</span> {form.watch('illness_severity') ? form.watch('illness_severity') : 'null'}</div>
            <div><span className="text-blue-400">Form Valid:</span> {form.formState.isValid ? '✓' : '✗'}</div>
            <div><span className="text-blue-400">Button Disabled:</span> {loading || !form.watch('animal_id') ? '✓ Yes' : '✗ No'}</div>
            <div><span className="text-blue-400">Loading:</span> {loading ? '✓ Yes' : '✗ No'}</div>
            <div><span className="text-red-400">Form Errors:</span> {Object.keys(form.formState.errors).length > 0 ? '⚠️ ' + Object.keys(form.formState.errors).join(', ') : 'None'}</div>
            <div className="text-gray-500 mt-2">→ Open DevTools (F12 → Console) to see detailed logs</div>
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