// src/components/health/CompleteHealthRecordModal.tsx
import React, { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Label } from '@/components/ui/Label'
import { Textarea } from '@/components/ui/Textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/Select'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { AlertTriangle, Stethoscope, Calendar, User, FileText, CheckCircle, ChevronDown, ChevronUp } from 'lucide-react'
import { toast } from 'react-hot-toast'

const completeHealthRecordSchema = z.object({
  record_type: z.enum(['vaccination', 'treatment', 'checkup', 'injury', 'illness', 'reproductive', 'deworming']),

  // Basic fields
  symptoms: z.string().optional(),
  veterinarian: z.string().optional(),
  medication: z.string().optional(),
  cost: z.preprocess(
    (val) => {
      if (val === '' || val === null || val === undefined) return undefined;
      const num = Number(val);
      return isNaN(num) ? undefined : num;
    },
    z.number().min(0, 'Cost must be positive').optional()
  ),
  next_due_date: z.string().optional(),
  notes: z.string().optional(),
  severity: z.enum(['low', 'medium', 'high']).optional(),

  // General checkup fields
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
  physical_exam_notes: z.string().optional(),

  // Vaccination fields
  vaccine_name: z.string().optional(),
  vaccine_name_other: z.string().optional(),
  vaccine_batch_number: z.string().optional(),
  vaccine_dose: z.string().optional(),
  route_of_administration: z.string().optional(),
  route_of_administration_other: z.string().optional(),
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
  treatment_given: z.string().optional(),
  follow_up_required: z.boolean().optional(),

  // Illness fields
  illness_diagnosis: z.string().optional(),
  illness_severity: z.enum(['mild', 'moderate', 'severe']).optional(),
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
})

type CompleteHealthRecordFormData = z.infer<typeof completeHealthRecordSchema>

interface CompleteHealthRecordModalProps {
  isOpen: boolean
  onClose: () => void
  healthRecord: any
  animal: any
  onHealthRecordUpdated: (record: any) => void
}

interface RecordTypeOption {
  value: string;
  label: string;
}

export default function CompleteHealthRecordModal({
  isOpen,
  onClose,
  healthRecord,
  animal,
  onHealthRecordUpdated
}: CompleteHealthRecordModalProps) {
  const [loading, setLoading] = useState(false)
  const [collapsedSections, setCollapsedSections] = useState<Set<string>>(new Set())

  const form = useForm<CompleteHealthRecordFormData>({
    resolver: zodResolver(completeHealthRecordSchema) as any,
    defaultValues: {
      record_type: 'checkup',
      severity: 'medium',
      illness_severity: 'moderate',
      follow_up_required: false,
      pregnancy_result: 'pending',
      notes: healthRecord?.notes || '',
    }
  })

  const needsRecordTypeSelection = healthRecord?.requires_record_type_selection === true ||
    healthRecord?.record_type === 'pending_selection'
  const availableRecordTypes = healthRecord?.available_record_types || []

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

  useEffect(() => {
    console.log('🔍 [Modal] Health record data:', healthRecord)
    console.log('🔍 [Modal] Needs record type selection?', needsRecordTypeSelection)
    console.log('🔍 [Modal] Available record types:', availableRecordTypes)
    console.log('🔍 [Modal] Current record type:', healthRecord?.record_type)
  }, [healthRecord, needsRecordTypeSelection, availableRecordTypes])

  const getRecordTypeOptions = () => {
    interface RecordTypeLabels {
      checkup: string;
      illness: string;
      injury: string;
      treatment: string;
      vaccination: string;
      reproductive: string;
      deworming: string;
    }

    const optionLabels: RecordTypeLabels = {
      checkup: 'General Check-up',
      illness: 'Illness',
      injury: 'Injury',
      treatment: 'Treatment',
      vaccination: 'Vaccination',
      reproductive: 'Reproductive Health',
      deworming: 'Deworming & Parasite Control'
    }

    return availableRecordTypes.map((type: string): RecordTypeOption => ({
      value: type,
      label: ((optionLabels as unknown) as Record<string, string>)[type] || type.charAt(0).toUpperCase() + type.slice(1)
    }))
  }

  useEffect(() => {
    form.setValue('record_type', (healthRecord?.record_type === 'pending_selection') ? 'checkup' : (healthRecord?.record_type || 'checkup'))
    form.setValue('notes', healthRecord?.notes || '')
    form.setValue('severity', healthRecord?.severity || 'medium')
  }, [healthRecord, form])

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

  const handleSubmit = async (data: CompleteHealthRecordFormData) => {
    console.log('Submit clicked', data);
    if (needsRecordTypeSelection && !data.record_type) {
      toast.error('Please select a record type to continue')
      return
    }

    setLoading(true)

    try {
      // Process "other" fields
      const processedData = {
        ...data,
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
        cost: data.cost || null,
      } as { [key: string]: any }

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

      // Remove empty fields (except record_type which is always needed)
      Object.keys(processedData).forEach(key => {
        if (key !== 'record_type' && (processedData[key] === '' || processedData[key] === null)) {
          delete processedData[key]
        }
      })

      const response = await fetch(`/api/health/records/${healthRecord.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(processedData)
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Failed to update health record')
      }

      toast.success('Health record completed successfully!')
      onHealthRecordUpdated(result.record)
      onClose()
    } catch (error) {
      console.error('Error updating health record:', error)
      toast.error(error instanceof Error ? error.message : 'Failed to update health record')
    } finally {
      setLoading(false)
    }
  }

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'mild': return 'bg-green-100 text-green-800 border-green-200'
      case 'moderate': return 'bg-yellow-100 text-yellow-800 border-yellow-200'
      case 'severe': return 'bg-red-100 text-red-800 border-red-200'
      default: return 'bg-gray-100 text-gray-800 border-gray-200'
    }
  }

  const getRecordTypeIcon = (type: string) => {
    switch (type) {
      case 'illness': return '🤒'
      case 'checkup': return '🩺'
      case 'treatment': return '💊'
      case 'injury': return '🩹'
      case 'vaccination': return '💉'
      case 'reproductive': return '🤱'
      case 'deworming': return '🪱'
      default: return '📋'
    }
  }

  console.log('About to render form with handleSubmit:', typeof handleSubmit);

  return (
    <Modal isOpen={isOpen} onClose={onClose} className="max-w-5xl max-h-[95vh] overflow-y-auto">
      <div className="p-6">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center space-x-3 mb-2">
            <div className="flex-shrink-0 w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center">
              <Stethoscope className="w-5 h-5 text-orange-600" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-gray-900">
                Complete Health Record
              </h2>
              <p className="text-sm text-gray-600">
                {needsRecordTypeSelection
                  ? 'Select the record type and add detailed information'
                  : 'Add detailed information for the health record'
                }
              </p>
            </div>
          </div>

          {/* Alert Banner */}
          <div className="bg-orange-50 border border-orange-200 rounded-lg p-4 flex items-start space-x-3">
            <AlertTriangle className="w-5 h-5 text-orange-600 flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="text-sm font-medium text-orange-800">
                Health Record Created Automatically
              </h3>
              <p className="text-sm text-orange-700 mt-1">
                {needsRecordTypeSelection
                  ? `${animal?.name || `Animal ${animal?.tag_number}`} requires attention. Please specify what type of issue this is and complete the details below.`
                  : `A health record was created because ${animal?.name || `Animal ${animal?.tag_number}`} was registered with a concerning health status. Please complete the details below for proper tracking.`
                }
              </p>
            </div>
          </div>
        </div>

        <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
          {/* Record Type Selection */}
          {needsRecordTypeSelection && (
            <Card className="mb-6 border-blue-200">
              <CardHeader className="pb-3">
                <CardTitle className="text-base text-blue-800">
                  Step 1: Select Record Type
                </CardTitle>
                <CardDescription>
                  Choose the type of health issue or intervention needed
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Label htmlFor="record_type">Record Type *</Label>
                <select
                  {...form.register('record_type')}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-farm-green focus:border-transparent mt-1"
                >
                  <option value="">Select the type of health record</option>
                  {getRecordTypeOptions().map((option: RecordTypeOption) => (
                    <option key={option.value} value={option.value}>
                      {getRecordTypeIcon(option.value)} {option.label}
                    </option>
                  ))}
                </select>
              </CardContent>
            </Card>
          )}

          {/* Current Record Info */}
          <Card className="mb-6">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center space-x-2">
                <span className="text-lg">
                  {watchedRecordType ? getRecordTypeIcon(watchedRecordType) : '📋'}
                </span>
                <span>
                  {needsRecordTypeSelection ? 'Health Record Information' : 'Current Record Information'}
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-xs text-gray-500">Animal</Label>
                  <p className="font-medium">
                    {animal?.name || `Animal ${animal?.tag_number}`}
                  </p>
                  <p className="text-sm text-gray-600">#{animal?.tag_number}</p>
                </div>
                <div>
                  <Label className="text-xs text-gray-500">Record Type</Label>
                  {watchedRecordType ? (
                    <Badge className={getSeverityColor(watchedRecordType)}>
                      {getRecordTypeOptions().find((opt: RecordTypeOption) => opt.value === watchedRecordType)?.label ||
                        watchedRecordType.charAt(0).toUpperCase() + watchedRecordType.slice(1)}
                    </Badge>
                  ) : (
                    <Badge className="bg-gray-100 text-gray-600">
                      {needsRecordTypeSelection ? 'Please Select Above' : 'Not Selected'}
                    </Badge>
                  )}
                </div>
              </div>

              <div>
                <Label className="text-xs text-gray-500">Description</Label>
                <p className="text-sm bg-gray-50 p-2 rounded">
                  {healthRecord.description}
                </p>
              </div>

              <div className="flex items-center space-x-4 text-sm text-gray-600">
                <div className="flex items-center space-x-1">
                  <Calendar className="w-4 h-4" />
                  <span>Date: {new Date(healthRecord.record_date).toLocaleDateString()}</span>
                </div>
                <Badge className={getSeverityColor(healthRecord.severity)}>
                  {healthRecord.severity?.toUpperCase()} Priority
                </Badge>
              </div>
            </CardContent>
          </Card>

          {/* Details Section - Only show if record type is selected or not needed */}
          {(!needsRecordTypeSelection || watchedRecordType) && (
            <div className="space-y-6">
              <div className="border-t pt-4">
                <h3 className="text-base font-medium text-gray-900 mb-4">
                  {needsRecordTypeSelection ? 'Step 2: Add Details' : 'Add Details'}
                </h3>
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
                        {...form.register('body_condition_score', { valueAsNumber: true })}
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
                        {...form.register('weight', { valueAsNumber: true })}
                        placeholder="350.0"
                      />
                    </div>
                    <div>
                      <Label htmlFor="temperature">Temperature (°C)</Label>
                      <Input
                        id="temperature"
                        type="number"
                        step="0.1"
                        {...form.register('temperature', { valueAsNumber: true })}
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
                        {...form.register('pulse', { valueAsNumber: true })}
                        placeholder="60"
                      />
                    </div>
                    <div>
                      <Label htmlFor="respiration">Respiration (breaths/min)</Label>
                      <Input
                        id="respiration"
                        type="number"
                        min="0"
                        {...form.register('respiration', { valueAsNumber: true })}
                        placeholder="20"
                      />
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="physical_exam_notes">Physical Examination Notes</Label>
                    <Textarea
                      id="physical_exam_notes"
                      {...form.register('physical_exam_notes')}
                      rows={3}
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

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="treating_personnel">Treating Personnel</Label>
                      <Input
                        id="treating_personnel"
                        {...form.register('treating_personnel')}
                        placeholder="Veterinarian, farmer"
                      />
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="response_notes">Response/Progress Notes</Label>
                    <Textarea
                      id="response_notes"
                      {...form.register('response_notes')}
                      rows={2}
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



                  <div>
                    <Label htmlFor="treatment_given">Treatment/First Aid Given</Label>
                    <Textarea
                      id="treatment_given"
                      {...form.register('treatment_given')}
                      rows={3}
                      placeholder="Describe the immediate treatment provided"
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

              {watchedRecordType === 'illness' && (
                <CollapsibleSection
                  title="Illness Details"
                  isOpen={!collapsedSections.has('illness')}
                  onToggle={() => toggleSection('illness')}
                >
                  <div>
                    <Label htmlFor="symptoms">Symptoms Observed</Label>
                    <Textarea
                      id="symptoms"
                      {...form.register('symptoms')}
                      rows={3}
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
                        <option value="mild">Mild</option>
                        <option value="moderate">Moderate</option>
                        <option value="severe">Severe</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="lab_test_results">Lab Test Results</Label>
                    <Textarea
                      id="lab_test_results"
                      {...form.register('lab_test_results')}
                      rows={2}
                      placeholder="Any laboratory test results (if applicable)"
                    />
                  </div>

                  <div>
                    <Label htmlFor="treatment_plan">Treatment Plan</Label>
                    <Textarea
                      id="treatment_plan"
                      {...form.register('treatment_plan')}
                      rows={3}
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

              {/* Basic fields always visible */}


              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="veterinarian" className="flex items-center space-x-2">
                    <User className="w-4 h-4" />
                    <span>Veterinarian Consulted</span>
                  </Label>
                  <Input
                    id="veterinarian"
                    placeholder="Dr. Smith / Veterinary Clinic Name"
                    {...form.register('veterinarian')}
                    className="mt-1"
                  />
                </div>

                <div>
                  <Label htmlFor="cost">Treatment Cost ($)</Label>
                  <Input
                    id="cost"
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    {...form.register('cost')}
                    className="mt-1"
                  />
                </div>
              </div>



              <div>
                <Label htmlFor="notes">Additional Notes</Label>
                <Textarea
                  id="notes"
                  placeholder="Any additional observations, treatment plan, or important information..."
                  {...form.register('notes')}
                  rows={3}
                  className="mt-1"
                />
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex items-center justify-between pt-4 border-t mt-6">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={loading}
            >
              Complete Later
            </Button>

            <div className="flex space-x-3">
              <Button
                type="submit"
                disabled={loading || (needsRecordTypeSelection && !watchedRecordType)}
                className="flex items-center space-x-2"
              >
                {loading ? (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <CheckCircle className="w-4 h-4" />
                )}
                <span>{loading ? 'Saving...' : 'Complete Health Record'}</span>
              </Button>
            </div>
          </div>
        </form>
      </div>
    </Modal>
  )
}