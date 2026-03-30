// ReportHealthIssueModal.tsx
// Modal for reporting health issues that need attention

'use client'

import React, { useCallback, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'react-hot-toast'
import { Modal } from '@/components/ui/Modal'
import { Input } from '@/components/ui/Input'
import { Label } from '@/components/ui/Label'
import { Button } from '@/components/ui/Button'
import { AnimalSelectionPanel } from '@/components/common/AnimalSelectionPanel'
import { AlertTriangle, X, ChevronDown } from 'lucide-react'

const reportIssueSchema = z.object({
  selected_animal_ids: z.array(z.string()).min(1, 'Please select at least one animal'),
  issue_type: z.enum(['injury', 'illness', 'behavior_change', 'poor_appetite', 'reduced_milk', 'lameness', 'respiratory', 'reproductive', 'other']),
  issue_type_other: z.string().optional(),
  description: z.string().min(10, 'Please provide at least 10 characters describing the issue'),
  severity: z.enum(['low', 'medium', 'high', 'critical']),
  alert_veterinarian: z.boolean(),
  notes: z.string().optional(),
  // Injury fields
  injury_location: z.string().optional(),
  injury_wound_type: z.string().optional(),
  injury_bleeding: z.boolean().optional(),
  injury_swelling: z.boolean().optional(),
  // Illness fields
  illness_temperature: z.string().optional(),
  illness_onset_hours: z.string().optional(),
  illness_other_animals: z.boolean().optional(),
  illness_milk_change: z.boolean().optional(),
  illness_appetite: z.string().optional(),
  // Behavior change fields
  behavior_type: z.string().optional(),
  behavior_consistency: z.string().optional(),
  // Lameness fields
  lameness_affected_legs: z.string().optional(),
  lameness_severity: z.string().optional(),
  lameness_swelling: z.boolean().optional(),
  // Respiratory fields
  respiratory_cough_type: z.string().optional(),
  respiratory_nasal_discharge: z.string().optional(),
  respiratory_temperature: z.string().optional(),
  respiratory_difficulty: z.string().optional(),
  respiratory_duration: z.string().optional(),
  // Reproductive fields
  reproductive_cycle_stage: z.string().optional(),
  reproductive_discharge: z.string().optional(),
  reproductive_breeding_date: z.string().optional(),
  // Poor appetite fields
  appetite_level: z.string().optional(),
  appetite_food_refused: z.string().optional(),
  appetite_water_intake: z.string().optional(),
  appetite_duration_hours: z.string().optional(),
  appetite_other_symptoms: z.string().optional(),
  // Reduced milk fields
  reduced_milk_yield_change: z.string().optional(),
  reduced_milk_color: z.string().optional(),
  reduced_milk_consistency: z.string().optional(),
  reduced_milk_temperature: z.boolean().optional(),
  reduced_milk_body_temperature: z.string().optional(),
  reduced_milk_udder_temperature: z.string().optional(),
  reduced_milk_onset_hours: z.string().optional(),
  reduced_milk_previous_yield: z.string().optional(),
})

type ReportIssueFormData = z.infer<typeof reportIssueSchema>

interface Animal {
  id: string
  tag_number: string
  name?: string
  breed?: string
  status: string
  animal_groups?: string[]
}

interface ReportHealthIssueModalProps {
  farmId: string
  animals: Animal[]
  isOpen: boolean
  onClose: () => void
  onIssueReported: (issue: any) => void
}

export function ReportHealthIssueModal({
  farmId,
  animals,
  isOpen,
  onClose,
  onIssueReported
}: ReportHealthIssueModalProps) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [categories, setCategories] = useState<any[]>([])
  const [animalCategoryMap, setAnimalCategoryMap] = useState<Record<string, string[]>>({})
  const [loadingCategories, setLoadingCategories] = useState(false)
  const [isAnimalSectionExpanded, setIsAnimalSectionExpanded] = useState(true)
  const [expandedIssueSections, setExpandedIssueSections] = useState<Record<string, boolean>>({
    injury: true,
    illness: true,
    behavior_change: true,
    poor_appetite: true,
    reduced_milk: true,
    lameness: true,
    respiratory: true,
    reproductive: true,
    other: true,
  })

  const toggleIssueSection = (sectionName: string) => {
    setExpandedIssueSections(prev => ({
      ...prev,
      [sectionName]: !prev[sectionName]
    }))
  }

  const form = useForm<ReportIssueFormData>({
    resolver: zodResolver(reportIssueSchema),
    defaultValues: {
      selected_animal_ids: [],
      issue_type: 'illness',
      severity: 'medium',
      alert_veterinarian: false,
      description: '',
      notes: '',
    },
  })

  const watchedIssueType = form.watch('issue_type')
  const watchedSeverity = form.watch('severity')
  const watchedAlertVet = form.watch('alert_veterinarian')
  const selectedAnimalIds = form.watch('selected_animal_ids')

  // Auto-check veterinarian alert for high/critical severity
  React.useEffect(() => {
    if (watchedSeverity === 'high' || watchedSeverity === 'critical') {
      if (!watchedAlertVet) {
        form.setValue('alert_veterinarian', true)
      }
    }
  }, [watchedSeverity, form, watchedAlertVet])

  // Load animal categories and assignments when modal opens
  React.useEffect(() => {
    if (isOpen && farmId) {
      setLoadingCategories(true)
      fetch(`/api/animal-categories/${farmId}`)
        .then(r => r.json())
        .then(data => {
          console.log('Loaded categories:', data)
          setCategories(data.categories || [])
          setAnimalCategoryMap(data.animalCategoryMap || {})
        })
        .catch(err => {
          console.error('Error loading categories:', err)
          setCategories([])
          setAnimalCategoryMap({})
        })
        .finally(() => setLoadingCategories(false))
    }
  }, [isOpen, farmId])

  // Filter only active animals
  const activeAnimals = React.useMemo(() => {
    return animals.filter(animal => animal.status === 'active')
  }, [animals])

  // Handle animal selection from panel
  const handleAnimalSelect = (animalId: string, isSelected: boolean) => {
    const current = selectedAnimalIds || []
    const updated = isSelected
      ? [...current, animalId]
      : current.filter(id => id !== animalId)
    form.setValue('selected_animal_ids', updated)
  }

  const handleSubmit = useCallback(async (data: ReportIssueFormData) => {
    setLoading(true)
    setError(null)

    try {
      console.log('Form submitted with data:', data)
      console.log('Selected animals:', data.selected_animal_ids)
      
      if (!data.selected_animal_ids || data.selected_animal_ids.length === 0) {
        throw new Error('No animals selected')
      }

      // Create an issue for each selected animal
      const issues = data.selected_animal_ids.map(animalId => ({
        farm_id: farmId,
        animal_id: animalId,
        issue_type: data.issue_type === 'other' ? data.issue_type_other : data.issue_type,
        issue_type_custom: data.issue_type === 'other' ? data.issue_type_other : undefined,
        description: data.description,
        severity: data.severity,
        alert_veterinarian: data.alert_veterinarian,
        notes: data.notes || undefined,
        reported_at: new Date().toISOString(),
        status: 'open',
        // Injury fields
        injury_location: data.injury_location || undefined,
        injury_wound_type: data.injury_wound_type || undefined,
        injury_bleeding: data.injury_bleeding,
        injury_swelling: data.injury_swelling,
        // Illness fields
        illness_temperature: data.illness_temperature || undefined,
        illness_onset_hours: data.illness_onset_hours || undefined,
        illness_other_animals: data.illness_other_animals,
        illness_milk_change: data.illness_milk_change,
        illness_appetite: data.illness_appetite || undefined,
        // Behavior change fields
        behavior_type: data.behavior_type || undefined,
        behavior_consistency: data.behavior_consistency || undefined,
        // Lameness fields
        lameness_affected_legs: data.lameness_affected_legs || undefined,
        lameness_severity: data.lameness_severity || undefined,
        lameness_swelling: data.lameness_swelling,
        // Respiratory fields
        respiratory_cough_type: data.respiratory_cough_type || undefined,
        respiratory_nasal_discharge: data.respiratory_nasal_discharge || undefined,
        respiratory_temperature: data.respiratory_temperature || undefined,
        respiratory_difficulty: data.respiratory_difficulty || undefined,
        respiratory_duration: data.respiratory_duration || undefined,
        // Reproductive fields
        reproductive_cycle_stage: data.reproductive_cycle_stage || undefined,
        reproductive_discharge: data.reproductive_discharge || undefined,
        reproductive_breeding_date: data.reproductive_breeding_date || undefined,
        // Poor appetite fields
        appetite_level: data.appetite_level || undefined,
        appetite_food_refused: data.appetite_food_refused || undefined,
        appetite_water_intake: data.appetite_water_intake || undefined,
        appetite_duration_hours: data.appetite_duration_hours || undefined,
        appetite_other_symptoms: data.appetite_other_symptoms || undefined,
        // Reduced milk fields
        reduced_milk_yield_change: data.reduced_milk_yield_change || undefined,
        reduced_milk_color: data.reduced_milk_color || undefined,
        reduced_milk_consistency: data.reduced_milk_consistency || undefined,
        reduced_milk_temperature_check: data.reduced_milk_temperature || false,
        reduced_milk_body_temperature: data.reduced_milk_body_temperature || undefined,
        reduced_milk_udder_temperature: data.reduced_milk_udder_temperature || undefined,
        reduced_milk_onset_hours: data.reduced_milk_onset_hours || undefined,
        reduced_milk_previous_yield: data.reduced_milk_previous_yield || undefined,
      }))

      console.log('Sending issues to API:', issues)

      const response = await fetch('/api/health/issues', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ issues }),
      })

      console.log('API response status:', response.status)

      if (!response.ok) {
        const result = await response.json()
        console.error('API error response:', result)
        throw new Error(result.error || `Failed to report health issues (${response.status})`)
      }

      const result = await response.json()
      console.log('API success response:', result)
      
      toast.success(`Health ${data.selected_animal_ids.length === 1 ? 'issue' : 'issues'} reported successfully!`, {
        duration: 4000,
        position: 'top-right',
      })

      onIssueReported(result.issues)

      form.reset()
      onClose()
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to report health issues'
      console.error('Submit error:', err)
      setError(errorMessage)
      toast.error(errorMessage, {
        duration: 6000,
        position: 'top-right',
      })
    } finally {
      setLoading(false)
    }
  }, [farmId, onIssueReported, onClose, form])



  const severityColors = {
    low: 'bg-blue-50 border-blue-200 text-blue-900',
    medium: 'bg-yellow-50 border-yellow-200 text-yellow-900',
    high: 'bg-orange-50 border-orange-200 text-orange-900',
    critical: 'bg-red-50 border-red-200 text-red-900',
  }

  const issuTypeLabels: Record<string, string> = {
    injury: '🩹 Injury',
    illness: '🤒 Illness',
    behavior_change: '🐄 Behavior Change',
    poor_appetite: '🍽️ Poor Appetite',
    reduced_milk: '🥛 Reduced Milk Production',
    lameness: '🦵 Lameness',
    respiratory: '💨 Respiratory Issue',
    reproductive: '🤱 Reproductive Issue',
    other: '❓ Other',
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} className="max-w-2xl">
      <div className="p-6">
        <div className="mb-6 flex items-center justify-between">
          <h3 className="text-xl font-semibold text-gray-900 flex items-center space-x-2">
            <AlertTriangle className="w-6 h-6 text-orange-600" />
            <span>Report Health Issue</span>
          </h3>
          
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
            {error}
          </div>
        )}

        <form
          onSubmit={(e) => {
            console.log('Form submit event triggered')
            console.log('Form validation state:', form.formState)
            form.handleSubmit(handleSubmit)(e)
          }}
          className="space-y-4"
        >
          {/* Animal Selection Panel */}
          <div className="bg-gray-50 rounded-lg border border-gray-200">
            <button
              type="button"
              onClick={() => setIsAnimalSectionExpanded(!isAnimalSectionExpanded)}
              className="w-full flex items-center justify-between p-4 hover:bg-gray-100 transition-colors"
            >
              <Label className="text-base font-medium mb-0 cursor-pointer">Select Animals</Label>
              <ChevronDown
                className={`w-5 h-5 text-gray-600 transition-transform ${
                  isAnimalSectionExpanded ? 'rotate-180' : ''
                }`}
              />
            </button>

            {isAnimalSectionExpanded && (
              <div className="px-4 pb-4 border-t border-gray-200 space-y-3">
                <div className="text-xs text-gray-500">
                  💡 Tip: Use the <strong>Categories</strong> tab to select multiple animals by category
                </div>
                <AnimalSelectionPanel
                  animals={activeAnimals}
                  selectedAnimalIds={selectedAnimalIds || []}
                  onAnimalSelect={handleAnimalSelect}
                  categories={categories}
                  animalCategoryMap={animalCategoryMap}
                  maxHeight="max-h-80"
                />
                {form.formState.errors.selected_animal_ids && (
                  <p className="text-sm text-red-600">{form.formState.errors.selected_animal_ids.message}</p>
                )}
              </div>
            )}
          </div>

          {/* Issue Type */}
          <div>
            <Label htmlFor="issue_type">Issue Type</Label>
            <select
              id="issue_type"
              {...form.register('issue_type')}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-farm-green focus:border-transparent"
            >
              {Object.entries(issuTypeLabels).map(([value, label]) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>
          </div>

          {/* Custom Issue Type */}
          {watchedIssueType === 'other' && (
            <div>
              <Label htmlFor="issue_type_other">Specify Issue Type</Label>
              <Input
                id="issue_type_other"
                {...form.register('issue_type_other')}
                placeholder="Describe the type of issue"
              />
            </div>
          )}

          {/* Injury-Specific Fields */}
          {watchedIssueType === 'injury' && (
            <div className="bg-red-50 rounded-lg border border-red-200">
              <button
                type="button"
                onClick={() => toggleIssueSection('injury')}
                className="w-full flex items-center justify-between p-4 hover:bg-red-100 transition-colors"
              >
                <Label className="text-base font-medium mb-0 cursor-pointer">Injury Details</Label>
                <ChevronDown
                  className={`w-5 h-5 text-red-600 transition-transform ${
                    expandedIssueSections['injury'] ? 'rotate-180' : ''
                  }`}
                />
              </button>
              {expandedIssueSections['injury'] && (
                <div className="space-y-3 p-4 border-t border-red-200">
                  <div>
                    <Label htmlFor="injury_location">Injury Location</Label>
                    <Input
                      id="injury_location"
                      {...form.register('injury_location')}
                      placeholder="e.g., front-left leg, tail, udder"
                    />
                  </div>
                  <div>
                    <Label htmlFor="injury_wound_type">Wound Type</Label>
                    <select
                      id="injury_wound_type"
                      {...form.register('injury_wound_type')}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-farm-green"
                    >
                      <option value="">Select wound type</option>
                      <option value="cut">Cut/Laceration</option>
                      <option value="abrasion">Abrasion</option>
                      <option value="puncture">Puncture Wound</option>
                      <option value="blunt">Blunt Trauma</option>
                      <option value="fracture">Possible Fracture</option>
                    </select>
                  </div>
                  <label className="flex items-center space-x-2 cursor-pointer">
                    <input type="checkbox" {...form.register('injury_bleeding')} className="w-4 h-4" />
                    <span className="text-sm text-gray-700">Visible bleeding</span>
                  </label>
                  <label className="flex items-center space-x-2 cursor-pointer">
                    <input type="checkbox" {...form.register('injury_swelling')} className="w-4 h-4" />
                    <span className="text-sm text-gray-700">Swelling present</span>
                  </label>
                </div>
              )}
            </div>
          )}

          {/* Illness-Specific Fields */}
          {watchedIssueType === 'illness' && (
            <div className="bg-yellow-50 rounded-lg border border-yellow-200">
              <button
                type="button"
                onClick={() => toggleIssueSection('illness')}
                className="w-full flex items-center justify-between p-4 hover:bg-yellow-100 transition-colors"
              >
                <Label className="text-base font-medium mb-0 cursor-pointer">Illness Details</Label>
                <ChevronDown
                  className={`w-5 h-5 text-yellow-600 transition-transform ${
                    expandedIssueSections['illness'] ? 'rotate-180' : ''
                  }`}
                />
              </button>
              {expandedIssueSections['illness'] && (
                <div className="space-y-3 p-4 border-t border-yellow-200">
                  <div>
                    <Label htmlFor="illness_temperature">Temperature (°C or °F)</Label>
                    <Input
                      id="illness_temperature"
                      {...form.register('illness_temperature')}
                      placeholder="e.g., 39.5°C or 103°F"
                    />
                  </div>
                  <div>
                    <Label htmlFor="illness_onset_hours">Onset (hours ago)</Label>
                    <Input
                      id="illness_onset_hours"
                      type="text"
                      inputMode="numeric"
                      {...form.register('illness_onset_hours')}
                      placeholder="e.g., 6"
                    />
                  </div>
                  <label className="flex items-center space-x-2 cursor-pointer">
                    <input type="checkbox" {...form.register('illness_other_animals')} className="w-4 h-4" />
                    <span className="text-sm text-gray-700">Other animals affected?</span>
                  </label>
                  <label className="flex items-center space-x-2 cursor-pointer">
                    <input type="checkbox" {...form.register('illness_milk_change')} className="w-4 h-4" />
                    <span className="text-sm text-gray-700">Milk production change</span>
                  </label>
                  <div>
                    <Label htmlFor="illness_appetite">Appetite Status</Label>
                    <select
                      id="illness_appetite"
                      {...form.register('illness_appetite')}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-farm-green"
                    >
                      <option value="">Select appetite status</option>
                      <option value="normal">Normal</option>
                      <option value="reduced">Reduced</option>
                      <option value="none">No appetite</option>
                    </select>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Behavior Change-Specific Fields */}
          {watchedIssueType === 'behavior_change' && (
            <div className="bg-purple-50 rounded-lg border border-purple-200">
              <button
                type="button"
                onClick={() => toggleIssueSection('behavior_change')}
                className="w-full flex items-center justify-between p-4 hover:bg-purple-100 transition-colors"
              >
                <Label className="text-base font-medium mb-0 cursor-pointer">Behavior Change Details</Label>
                <ChevronDown
                  className={`w-5 h-5 text-purple-600 transition-transform ${
                    expandedIssueSections['behavior_change'] ? 'rotate-180' : ''
                  }`}
                />
              </button>
              {expandedIssueSections['behavior_change'] && (
                <div className="space-y-3 p-4 border-t border-purple-200">
                  <div>
                    <Label htmlFor="behavior_type">Type of Behavior Change</Label>
                    <Input
                      id="behavior_type"
                      {...form.register('behavior_type')}
                      placeholder="e.g., aggression, lethargy, isolation"
                    />
                  </div>
                  <div>
                    <Label htmlFor="behavior_consistency">Consistency</Label>
                    <select
                      id="behavior_consistency"
                      {...form.register('behavior_consistency')}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-farm-green"
                    >
                      <option value="">Select consistency</option>
                      <option value="occasional">Occasional</option>
                      <option value="frequent">Frequent</option>
                      <option value="constant">Constant</option>
                    </select>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Poor Appetite-Specific Fields */}
          {watchedIssueType === 'poor_appetite' && (
            <div className="bg-orange-50 rounded-lg border border-orange-200">
              <button
                type="button"
                onClick={() => toggleIssueSection('poor_appetite')}
                className="w-full flex items-center justify-between p-4 hover:bg-orange-100 transition-colors"
              >
                <Label className="text-base font-medium mb-0 cursor-pointer">Poor Appetite Details</Label>
                <ChevronDown
                  className={`w-5 h-5 text-orange-600 transition-transform ${
                    expandedIssueSections['poor_appetite'] ? 'rotate-180' : ''
                  }`}
                />
              </button>
              {expandedIssueSections['poor_appetite'] && (
                <div className="space-y-3 p-4 border-t border-orange-200">
                  <div>
                    <Label htmlFor="appetite_level">Appetite Level</Label>
                    <select
                      id="appetite_level"
                      {...form.register('appetite_level')}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-farm-green"
                    >
                      <option value="">Select appetite level</option>
                      <option value="normal">Normal - eating well</option>
                      <option value="reduced">Reduced - eating less than usual</option>
                      <option value="minimal">Minimal - barely eating</option>
                      <option value="none">None - refusing all feed</option>
                    </select>
                  </div>
                  <div>
                    <Label htmlFor="appetite_food_refused">Feed Type Refused</Label>
                    <Input
                      id="appetite_food_refused"
                      {...form.register('appetite_food_refused')}
                      placeholder="e.g., grain, hay, silage, or specify all feed"
                    />
                  </div>
                  <div>
                    <Label htmlFor="appetite_water_intake">Water Intake Status</Label>
                    <select
                      id="appetite_water_intake"
                      {...form.register('appetite_water_intake')}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-farm-green"
                    >
                      <option value="">Select water intake</option>
                      <option value="normal">Normal</option>
                      <option value="increased">Increased</option>
                      <option value="reduced">Reduced</option>
                      <option value="refusing">Not drinking</option>
                    </select>
                  </div>
                  <div>
                    <Label htmlFor="appetite_duration_hours">Duration (hours)</Label>
                    <Input
                      id="appetite_duration_hours"
                      type="text"
                      inputMode="numeric"
                      {...form.register('appetite_duration_hours')}
                      placeholder="e.g., 24"
                    />
                  </div>
                  <div>
                    <Label htmlFor="appetite_other_symptoms">Associated Symptoms</Label>
                    <Input
                      id="appetite_other_symptoms"
                      {...form.register('appetite_other_symptoms')}
                      placeholder="e.g., diarrhea, weight loss, fever"
                    />
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Reduced Milk Production-Specific Fields */}
          {watchedIssueType === 'reduced_milk' && (
            <div className="bg-amber-50 rounded-lg border-2 border-amber-300">
              <button
                type="button"
                onClick={() => toggleIssueSection('reduced_milk')}
                className="w-full flex items-center justify-between p-4 hover:bg-amber-100 transition-colors"
              >
                <Label className="text-base font-medium mb-0 cursor-pointer">🥛 Reduced Milk Production Details</Label>
                <ChevronDown
                  className={`w-5 h-5 text-amber-600 transition-transform ${
                    expandedIssueSections['reduced_milk'] ? 'rotate-180' : ''
                  }`}
                />
              </button>
              {expandedIssueSections['reduced_milk'] && (
                <div className="space-y-3 p-4 border-t-2 border-amber-300">
                  <div className="bg-white p-3 rounded border border-amber-200 text-sm text-amber-900">
                    <strong>⚠️ Milk Production Issue:</strong> Track production decline to identify nutritional or health concerns
                  </div>
                  <div>
                    <Label htmlFor="reduced_milk_previous_yield">Previous Daily Yield (liters)</Label>
                    <Input
                      id="reduced_milk_previous_yield"
                      {...form.register('reduced_milk_previous_yield')}
                      placeholder="e.g., 25 L"
                    />
                  </div>
                  <div>
                    <Label htmlFor="reduced_milk_yield_change">Current Yield Decrease</Label>
                    <Input
                      id="reduced_milk_yield_change"
                      {...form.register('reduced_milk_yield_change')}
                      placeholder="e.g., 8 liters or 32% decrease"
                    />
                  </div>
                  <div>
                    <Label htmlFor="reduced_milk_onset_hours">Onset (hours ago)</Label>
                    <Input
                      id="reduced_milk_onset_hours"
                      type="text"
                      inputMode="numeric"
                      {...form.register('reduced_milk_onset_hours')}
                      placeholder="e.g., 12"
                    />
                  </div>
                  <div>
                    <Label htmlFor="reduced_milk_color">Milk Appearance</Label>
                    <select
                      id="reduced_milk_color"
                      {...form.register('reduced_milk_color')}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-farm-green"
                    >
                      <option value="">Select appearance</option>
                      <option value="normal">Normal - white/cream</option>
                      <option value="pale">Pale/watery</option>
                      <option value="yellow">Yellow tinted</option>
                      <option value="blood">Blood-tinged</option>
                      <option value="clotty">Clotty/flaky</option>
                    </select>
                  </div>
                  <div>
                    <Label htmlFor="reduced_milk_consistency">Consistency</Label>
                    <select
                      id="reduced_milk_consistency"
                      {...form.register('reduced_milk_consistency')}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-farm-green"
                    >
                      <option value="">Select consistency</option>
                      <option value="normal">Normal</option>
                      <option value="watery">Watery</option>
                      <option value="thick">Thick/creamy</option>
                      <option value="clotty">Clotty</option>
                    </select>
                  </div>
                  <label className="flex items-center space-x-2 cursor-pointer">
                    <input type="checkbox" {...form.register('reduced_milk_temperature')} className="w-4 h-4" />
                    <span className="text-sm font-medium text-gray-700">Temperature monitoring required</span>
                  </label>
                  <div>
                    <Label htmlFor="reduced_milk_body_temperature">Body Temperature (°C or °F)</Label>
                    <Input
                      id="reduced_milk_body_temperature"
                      {...form.register('reduced_milk_body_temperature')}
                      placeholder="e.g., 38.8°C or 101.8°F (normal: 37.5-39°C)"
                    />
                  </div>
                  <div>
                    <Label htmlFor="reduced_milk_udder_temperature">Udder Temperature (°C or °F)</Label>
                    <Input
                      id="reduced_milk_udder_temperature"
                      {...form.register('reduced_milk_udder_temperature')}
                      placeholder="e.g., 39.2°C or 102.5°F"
                    />
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Lameness-Specific Fields */}
          {watchedIssueType === 'lameness' && (
            <div className="bg-blue-50 rounded-lg border border-blue-200">
              <button
                type="button"
                onClick={() => toggleIssueSection('lameness')}
                className="w-full flex items-center justify-between p-4 hover:bg-blue-100 transition-colors"
              >
                <Label className="text-base font-medium mb-0 cursor-pointer">Lameness Details</Label>
                <ChevronDown
                  className={`w-5 h-5 text-blue-600 transition-transform ${
                    expandedIssueSections['lameness'] ? 'rotate-180' : ''
                  }`}
                />
              </button>
              {expandedIssueSections['lameness'] && (
                <div className="space-y-3 p-4 border-t border-blue-200">
                  <div>
                    <Label htmlFor="lameness_affected_legs">Affected Legs</Label>
                    <Input
                      id="lameness_affected_legs"
                      {...form.register('lameness_affected_legs')}
                      placeholder="e.g., front-left, hind-right, or multiple"
                    />
                  </div>
                  <div>
                    <Label htmlFor="lameness_severity">Severity of Limp</Label>
                    <select
                      id="lameness_severity"
                      {...form.register('lameness_severity')}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-farm-green"
                    >
                      <option value="">Select severity</option>
                      <option value="mild">Mild</option>
                      <option value="moderate">Moderate</option>
                      <option value="severe">Severe</option>
                    </select>
                  </div>
                  <label className="flex items-center space-x-2 cursor-pointer">
                    <input type="checkbox" {...form.register('lameness_swelling')} className="w-4 h-4" />
                    <span className="text-sm text-gray-700">Visible swelling or heat</span>
                  </label>
                </div>
              )}
            </div>
          )}

          {/* Respiratory-Specific Fields */}
          {watchedIssueType === 'respiratory' && (
            <div className="bg-green-50 rounded-lg border border-green-200">
              <button
                type="button"
                onClick={() => toggleIssueSection('respiratory')}
                className="w-full flex items-center justify-between p-4 hover:bg-green-100 transition-colors"
              >
                <Label className="text-base font-medium mb-0 cursor-pointer">Respiratory Details</Label>
                <ChevronDown
                  className={`w-5 h-5 text-green-600 transition-transform ${
                    expandedIssueSections['respiratory'] ? 'rotate-180' : ''
                  }`}
                />
              </button>
              {expandedIssueSections['respiratory'] && (
                <div className="space-y-3 p-4 border-t border-green-200">
                  <div>
                    <Label htmlFor="respiratory_cough_type">Cough Type</Label>
                    <select
                      id="respiratory_cough_type"
                      {...form.register('respiratory_cough_type')}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-farm-green"
                    >
                      <option value="">Select cough type</option>
                      <option value="dry">Dry</option>
                      <option value="wet">Wet/Moist</option>
                      <option value="none">No cough</option>
                    </select>
                  </div>
                  <label className="flex items-center space-x-2 cursor-pointer">
                    <input type="checkbox" {...form.register('respiratory_nasal_discharge')} className="w-4 h-4" />
                    <span className="text-sm text-gray-700">Nasal discharge</span>
                  </label>
                  <div>
                    <Label htmlFor="respiratory_temperature">Temperature (°C or °F)</Label>
                    <Input
                      id="respiratory_temperature"
                      {...form.register('respiratory_temperature')}
                      placeholder="e.g., 39.5°C"
                    />
                  </div>
                  <label className="flex items-center space-x-2 cursor-pointer">
                    <input type="checkbox" {...form.register('respiratory_difficulty')} className="w-4 h-4" />
                    <span className="text-sm text-gray-700">Difficulty breathing</span>
                  </label>
                  <div>
                    <Label htmlFor="respiratory_duration">Duration (days)</Label>
                    <Input
                      id="respiratory_duration"
                      type="text"
                      inputMode="numeric"
                      {...form.register('respiratory_duration')}
                      placeholder="e.g., 3"
                    />
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Reproductive-Specific Fields */}
          {watchedIssueType === 'reproductive' && (
            <div className="bg-pink-50 rounded-lg border border-pink-200">
              <button
                type="button"
                onClick={() => toggleIssueSection('reproductive')}
                className="w-full flex items-center justify-between p-4 hover:bg-pink-100 transition-colors"
              >
                <Label className="text-base font-medium mb-0 cursor-pointer">Reproductive Details</Label>
                <ChevronDown
                  className={`w-5 h-5 text-pink-600 transition-transform ${
                    expandedIssueSections['reproductive'] ? 'rotate-180' : ''
                  }`}
                />
              </button>
              {expandedIssueSections['reproductive'] && (
                <div className="space-y-3 p-4 border-t border-pink-200">
                  <div>
                    <Label htmlFor="reproductive_cycle_stage">Cycle Stage</Label>
                    <select
                      id="reproductive_cycle_stage"
                      {...form.register('reproductive_cycle_stage')}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-farm-green"
                    >
                      <option value="">Select cycle stage</option>
                      <option value="estrus">Estrus/Heat</option>
                      <option value="metestrus">Metestrus</option>
                      <option value="diestrus">Diestrus</option>
                      <option value="proestrus">Proestrus</option>
                      <option value="unknown">Unknown</option>
                    </select>
                  </div>
                  <div>
                    <Label htmlFor="reproductive_discharge">Discharge Observation</Label>
                    <Input
                      id="reproductive_discharge"
                      {...form.register('reproductive_discharge')}
                      placeholder="e.g., color, consistency, volume"
                    />
                  </div>
                  <div>
                    <Label htmlFor="reproductive_breeding_date">Last Breeding Date</Label>
                    <Input
                      id="reproductive_breeding_date"
                      type="date"
                      {...form.register('reproductive_breeding_date')}
                    />
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Severity */}
          <div>
            <Label htmlFor="severity">Severity Level</Label>
            <div className="grid grid-cols-4 gap-2">
              {(['low', 'medium', 'high', 'critical'] as const).map((level) => (
                <label key={level} className="flex items-center cursor-pointer">
                  <input
                    type="radio"
                    value={level}
                    {...form.register('severity')}
                    className="sr-only"
                  />
                  <div
                    className={`w-full p-2 rounded border text-center text-sm font-medium transition-all ${
                      form.watch('severity') === level
                        ? `${severityColors[level]} border-current`
                        : 'bg-white border-gray-200 cursor-pointer'
                    }`}
                  >
                    {level.charAt(0).toUpperCase() + level.slice(1)}
                  </div>
                </label>
              ))}
            </div>
          </div>

          {/* Description */}
          <div>
            <Label htmlFor="description">Issue Description</Label>
            <textarea
              id="description"
              {...form.register('description')}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-farm-green focus:border-transparent"
              placeholder="Describe the health issue in detail (e.g., 'Noticed swelling on left leg, animal limping')"
            />
            {form.formState.errors.description && (
              <p className="text-sm text-red-600 mt-1">{form.formState.errors.description.message}</p>
            )}
          </div>

          {/* Alert Veterinarian */}
          <div className={`p-4 rounded-lg border-2 transition-all ${form.watch('alert_veterinarian') ? 'bg-orange-50 border-orange-300' : 'bg-gray-50 border-gray-200'}`}>
            <label className="flex items-start space-x-3 cursor-pointer">
              <input
                type="checkbox"
                {...form.register('alert_veterinarian')}
                className="mt-1 w-4 h-4 rounded border-gray-300 text-orange-600 focus:ring-orange-500 cursor-pointer"
              />
              <div className="flex-1">
                <span className="font-medium text-gray-900">Alert Veterinarian</span>
                <p className="text-sm text-gray-600 mt-1">
                  {form.watch('alert_veterinarian') ? '✓ Veterinarian will be notified immediately' : 'Check this box to notify the veterinarian about this issue'}
                </p>
                {(watchedSeverity === 'high' || watchedSeverity === 'critical') && (
                  <p className="text-xs text-orange-600 mt-2 font-medium">Auto-enabled for {watchedSeverity} severity</p>
                )}
              </div>
            </label>
          </div>

          {/* Notes */}
          <div>
            <Label htmlFor="notes">Additional Notes (Optional)</Label>
            <textarea
              id="notes"
              {...form.register('notes')}
              rows={2}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-farm-green focus:border-transparent"
              placeholder="Any other relevant information..."
            />
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end space-x-3 pt-4 border-t">
            {Object.keys(form.formState.errors).length > 0 && (
              <div className="w-full mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                <strong>Form Validation Errors:</strong>
                <ul className="mt-2 space-y-1">
                  {Object.entries(form.formState.errors).map(([field, error]: any) => (
                    <li key={field}>• {field}: {error?.message || 'Invalid'}</li>
                  ))}
                </ul>
              </div>
            )}
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
              disabled={loading}
              className="inline-flex items-center justify-center gap-2 font-medium rounded-md px-4 py-2 bg-orange-600 text-white hover:bg-orange-700 disabled:bg-gray-400"
            >
              {loading ? 'Reporting...' : 'Report Issue'}
            </button>
          </div>
        </form>
      </div>
    </Modal>
  )
}
