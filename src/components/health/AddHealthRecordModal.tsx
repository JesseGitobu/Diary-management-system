// Enhanced AddHealthRecordModal with comprehensive field sets for all record types
// src/components/health/AddHealthRecordModal.tsx

'use client'

import { useState, useMemo, useCallback } from 'react'
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
import { Search, Filter, X, Calendar, DollarSign, Stethoscope, ChevronDown, ChevronUp } from 'lucide-react'

const healthRecordSchema = z.object({
  animal_id: z.string().min(1, 'Please select an animal'),
  record_date: z.string().min(1, 'Record date is required'),
  record_type: z.enum(['vaccination', 'treatment', 'checkup', 'injury', 'illness', 'reproductive', 'deworming']),
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
  severity: z.enum(['low', 'medium', 'high']).optional(),
  treatment_given: z.string().optional(),
  follow_up_required: z.boolean().optional(),

  // Illness fields
  symptoms: z.string().optional(),
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
}

export function AddHealthRecordModal({
  farmId,
  animals,
  isOpen,
  onClose,
  onRecordAdded,
  preSelectedAnimalId
}: AddHealthRecordModalProps) {

  console.log('🔍 AddHealthRecordModal component rendered:', { isOpen, farmId, animalsCount: animals?.length })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [animalSearch, setAnimalSearch] = useState('')
  const [showAllAnimals, setShowAllAnimals] = useState(false)
  const [collapsedSections, setCollapsedSections] = useState<Set<string>>(new Set())

  const form = useForm<HealthRecordFormData>({
    resolver: zodResolver(healthRecordSchema) as any,
    defaultValues: {
      animal_id: preSelectedAnimalId || '',
      record_date: new Date().toISOString().split('T')[0],
      record_type: 'checkup',
      severity: 'medium',
      illness_severity: 'moderate',
      follow_up_required: false,
      pregnancy_result: 'pending',
    },
  })

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
    console.log('🔍 HandleSubmit called!');
    console.log('🔍 Raw form data:', data);
    console.log('🔍 Form valid?', form.formState.isValid);
    console.log('🔍 Form errors:', form.formState.errors);

    // Add this validation check
    if (!data.animal_id) {
      console.error('❌ No animal selected');
      // Make sure this shows to the user
      form.setError('animal_id', { message: 'Please select an animal' });
      return;
    }
    if (!data.description || data.description.length < 5) {
      console.error('❌ Description too short:', data.description);
      form.setError('description', { message: 'Description must be at least 5 characters' });
      return;
    }

    console.log('✅ Validation passed, proceeding with API call');
    setLoading(true);
    setError(null);

    try {
      const processedData = {
        ...data,
        farm_id: farmId,
        cost: data.cost || 0,
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
      }

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

      console.log('🔍 Processed data being sent to API:', processedData);

      const response = await fetch('/api/health/records', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(processedData),
      });

      console.log('🔍 API Response status:', response.status);
      console.log('🔍 API Response ok:', response.ok);

      const result = await response.json();
      console.log('🔍 API Response data:', result);

      if (!response.ok) {
        throw new Error(result.error || 'Failed to add health record');
      }

      console.log('✅ Health record created successfully');
      onRecordAdded(result.record);
      form.reset({
        record_date: new Date().toISOString().split('T')[0],
        record_type: 'checkup',
        severity: 'medium',
        illness_severity: 'moderate',
        follow_up_required: false,
        pregnancy_result: 'pending',
      })
      setAnimalSearch('')
      onClose()

    } catch (err) {
      console.error('❌ Error in handleSubmit:', err);
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('An unexpected error occurred');
      }
    } finally {
      setLoading(false);
    }
  }, [farmId, onRecordAdded, onClose, form])

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
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-xl font-semibold text-gray-900 flex items-center space-x-2">
            <Stethoscope className="w-6 h-6 text-farm-green" />
            <span>Add Health Record</span>
          </h3>
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="w-5 h-5" />
          </Button>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm flex items-center space-x-2">
            <span className="text-red-500">⚠️</span>
            <span>{error}</span>
          </div>
        )}

        <form
          onSubmit={(e) => {
            console.log('🔍 Form onSubmit triggered!', e);
            console.log('🔍 Current form values:', form.getValues());
            console.log('🔍 Form errors before submit:', form.formState.errors);
            console.log('🔍 Form isValid:', form.formState.isValid);

            form.handleSubmit(
              (data) => {
                console.log('🔍 react-hook-form validation passed!');
                handleSubmit(data);
              },
              (errors) => {
                console.log('🔍 react-hook-form validation failed!', errors);
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
                type="text"
                placeholder="Search by tag number, name, or breed..."
                value={animalSearch}
                onChange={(e) => setAnimalSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-farm-green focus:border-transparent"
              />
            </div>

            {selectedAnimal && (
              <div className="mb-4 p-3 bg-farm-green/10 border border-farm-green/20 rounded-lg">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-medium text-farm-green">
                      {selectedAnimal.name || `Animal ${selectedAnimal.tag_number}`}
                    </h4>
                    <p className="text-sm text-gray-600">
                      Tag: {selectedAnimal.tag_number} • {selectedAnimal.breed} • {selectedAnimal.gender}
                      {selectedAnimal.birth_date && (
                        <span> • Born: {new Date(selectedAnimal.birth_date).toLocaleDateString()}</span>
                      )}
                    </p>
                  </div>
                  <Badge variant="secondary">Selected</Badge>
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
                    <option value="mild">Mild</option>
                    <option value="moderate">Moderate</option>
                    <option value="severe">Severe</option>
                  </select>
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
                    <option value="mild">Mild</option>
                    <option value="moderate">Moderate</option>
                    <option value="severe">Severe</option>
                  </select>
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
                <DollarSign className="w-4 h-4" />
                <span>Cost (Optional)</span>
              </Label>
              <Input
                id="cost"
                type="number"
                step="0.01"
                min="0"
                {...form.register('cost')}
                placeholder="0.00"
              />
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
              onClick={() => console.log('🔍 Submit button clicked!')}
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