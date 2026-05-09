// src/components/breeding/HeatDetectionForm.tsx
'use client'

import { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Button } from '@/components/ui/Button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card'
import { Input } from '@/components/ui/Input'
import { Label } from '@/components/ui/Label'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { getEligibleAnimals } from '@/lib/database/breeding'
import { CheckCircle, Circle, Search, X, Heart, TrendingUp } from 'lucide-react'
import { Badge } from '@/components/ui/Badge'
import { useRef } from 'react'

const heatDetectionSchema = z.object({
  animal_id: z.string().min(1, 'Please select an animal'),
  event_date: z.string().min(1, 'Event date is required'),
  event_time: z.string().min(1, 'Time observed is required'),
  heat_signs: z.array(z.string()).min(1, 'Please select at least one heat sign'),
  heat_action_taken: z.string().optional(),
  notes: z.string().optional(),
})

type HeatDetectionFormData = z.infer<typeof heatDetectionSchema>

interface HeatDetectionFormProps {
  farmId: string
  onEventCreated: () => void
  onCancel: () => void
  preSelectedAnimalId?: string
  initialData?: any | null
  eventId?: string | null
}

const heatSigns = [
  'Standing to be mounted',
  'Mounting other animals',
  'Restlessness',
  'Bellowing/vocalization',
  'Clear mucus discharge',
  'Swollen vulva',
  'Decreased appetite',
  'Increased activity',
  'Chin resting on others',
  'Decreased milk production'
]

const actionOptions = [
  'Insemination scheduled',
  'Natural breeding arranged',
  'Monitor further',
  'Vet consultation needed'
]

export function HeatDetectionForm({ farmId, onEventCreated, onCancel, preSelectedAnimalId, initialData, eventId }: HeatDetectionFormProps) {
  const [loading, setLoading] = useState(false)
  const [animals, setAnimals] = useState<Array<{ id: string; tag_number: string; name: string | null; breed: string | null; production_status: string | null }>>([])
  const [selectedSigns, setSelectedSigns] = useState<string[]>([])
  const [selectedAnimalDetails, setSelectedAnimalDetails] = useState<any>(null)
  const [detailsLoading, setDetailsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [animalSearch, setAnimalSearch] = useState('')
  const [showAnimalDropdown, setShowAnimalDropdown] = useState(false)
  const animalSearchInputRef = useRef<HTMLInputElement>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)
  
  const form = useForm<HeatDetectionFormData>({
    resolver: zodResolver(heatDetectionSchema),
    defaultValues: {
      animal_id: preSelectedAnimalId || '',
      event_date: new Date().toISOString().split('T')[0],
      event_time: new Date().toTimeString().slice(0, 5),
      heat_signs: [],
      heat_action_taken: '',
      notes: '',
    },
  })
  
  const selectedAnimalId = form.watch('animal_id')

  useEffect(() => {
    loadEligibleAnimals()
  }, [farmId])

  useEffect(() => {
    if (preSelectedAnimalId) {
      form.setValue('animal_id', preSelectedAnimalId)
    }
  }, [preSelectedAnimalId, form])

  useEffect(() => {
    if (!initialData) return
    const raw = initialData.event_date || ''
    const datePart = raw.includes('T') ? raw.split('T')[0] : raw
    const timePart = raw.includes('T') ? (raw.split('T')[1] || '').slice(0, 5) : ''
    const signs: string[] = initialData.heat_signs || []
    setSelectedSigns(signs)
    form.reset({
      animal_id: initialData.animal_id || '',
      event_date: datePart,
      event_time: timePart || new Date().toTimeString().slice(0, 5),
      heat_signs: signs,
      heat_action_taken: initialData.heat_action_taken || '',
      notes: initialData.notes || '',
    })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialData])

  useEffect(() => {
    if (!selectedAnimalId) {
      setSelectedAnimalDetails(null)
      return
    }

    const controller = new AbortController()
    loadSelectedAnimalDetails(selectedAnimalId, controller.signal)

    return () => controller.abort()
  }, [selectedAnimalId])

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

  const loadSelectedAnimalDetails = async (animalId: string, signal?: AbortSignal) => {
    if (!animalId) {
      setSelectedAnimalDetails(null)
      return
    }

    try {
      setDetailsLoading(true)
      const response = await fetch(`/api/animals/${animalId}`, { signal })
      const result = await response.json()

      if (response.ok && result.success) {
        const animal = result.animal
        setSelectedAnimalDetails(animal)
      } else {
        setSelectedAnimalDetails(null)
      }
    } catch (loadError) {
      if ((loadError as any)?.name !== 'AbortError') {
        // Error silently handled
      }
      setSelectedAnimalDetails(null)
    } finally {
      setDetailsLoading(false)
    }
  }

  const formatProductionStatus = (status?: string | null) => {
    if (!status) {
      return 'Unknown status'
    }
    const formatted = status
      .replace(/_/g, ' ')
      .replace(/\b\w/g, (char) => char.toUpperCase())
    return formatted
  }

  const getHealthStatusColor = (status?: string | null) => {
    switch (status) {
      case 'healthy':
        return 'bg-green-100 text-green-800'
      case 'ill':
        return 'bg-red-100 text-red-800'
      case 'recovering':
        return 'bg-yellow-100 text-yellow-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const getHealthStatusLabel = (status?: string | null) => {
    if (!status) return 'Unknown'
    return status.charAt(0).toUpperCase() + status.slice(1)
  }

  const getProductionStatusColor = (status?: string | null) => {
    switch (status) {
      case 'lactating':
        return 'bg-blue-100 text-blue-800'
      case 'dry':
        return 'bg-gray-100 text-gray-800'
      case 'pregnant':
        return 'bg-purple-100 text-purple-800'
      case 'culled':
        return 'bg-red-100 text-red-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const getProductionStatusLabel = (status?: string | null) => {
    if (!status) return 'Unknown'
    return status
      .replace(/_/g, ' ')
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ')
  }

  const getLatestBreedingEvent = (eventType: 'heat_detection' | 'insemination') => {
    const breedingEvents = selectedAnimalDetails?.breeding_events
    const found = breedingEvents?.find((event: any) => event.event_type === eventType)
    return found?.event_date ?? null
  }

  const loadEligibleAnimals = async () => {
    try {
      const eligibleAnimals = await getEligibleAnimals(farmId, 'heat_detection')
      
      // Inject animal if pre-selected but not in list (e.g. status issue)
      if (preSelectedAnimalId) {
        const found = eligibleAnimals.find((a: any) => a.id === preSelectedAnimalId)
        if (!found) {
          eligibleAnimals.unshift({
            id: preSelectedAnimalId,
            tag_number: 'Selected Animal',
            name: '(Current)',
            gender: 'female',
            breed: null,
            production_status: null
          })
        }
      }
      
      setAnimals(eligibleAnimals)
      
      // Re-assert value after loading
      if (preSelectedAnimalId) {
        form.setValue('animal_id', preSelectedAnimalId)
      }
    } catch (error) {
      setError('Failed to load animals')
    }
  }
  
  const toggleHeatSign = (sign: string) => {
    const newSigns = selectedSigns.includes(sign)
      ? selectedSigns.filter(s => s !== sign)
      : [...selectedSigns, sign]
    
    setSelectedSigns(newSigns)
    form.setValue('heat_signs', newSigns)
  }

  const getFilteredAnimals = () => {
    if (!animalSearch.trim()) {
      return animals
    }
    const searchLower = animalSearch.toLowerCase()
    return animals.filter(animal =>
      animal.tag_number.toLowerCase().includes(searchLower) ||
      animal.name?.toLowerCase().includes(searchLower) ||
      animal.breed?.toLowerCase().includes(searchLower)
    )
  }

  const filteredAnimals = getFilteredAnimals()
  const selectedAnimal = selectedAnimalId ? animals.find(a => a.id === selectedAnimalId) : null
  
  const handleSubmit = async (data: HeatDetectionFormData) => {
    setLoading(true)
    setError(null)

    try {
      const dateTime = `${data.event_date}T${data.event_time}:00`
      const { event_time, ...restData } = data

      const payload = {
        ...restData,
        event_date: dateTime,
        farm_id: farmId,
        event_type: 'heat_detection',
        heat_signs: selectedSigns,
      }

      const url = eventId ? `/api/breeding-events/${eventId}` : '/api/breeding-events'
      const method = eventId ? 'PATCH' : 'POST'
      const body = eventId
        ? JSON.stringify({ eventData: payload })
        : JSON.stringify({ eventData: payload })

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body,
      })

      const result = await response.json()

      if (response.ok && result.success) {
        onEventCreated()
      } else {
        setError(result.error || `Failed to ${eventId ? 'update' : 'create'} heat detection event`)
      }
    } catch (error) {
      setError('An unexpected error occurred')
    } finally {
      setLoading(false)
    }
  }
  
  return (
    <div className="space-y-6">
      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-md text-red-700 text-sm">
          {error}
        </div>
      )}
      
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
        {/* Animal Selection Section */}
        <div className="bg-gray-50 p-4 rounded-lg">
          <Label className="text-base font-medium mb-3 block">Select Animal *</Label>

          {/* Search Input */}
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
                if (e.target.value.trim().length > 0) {
                  setShowAnimalDropdown(true)
                }
              }}
              onFocus={() => {
                // Open dropdown when input is focused and has animals
                if (animals.length > 0) {
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
                  setShowAnimalDropdown(false)
                }}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                title="Clear search"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Selected Animal Details Card */}
          {selectedAnimal && (
            <div className="mb-4 p-4 bg-farm-green/10 border border-farm-green/20 rounded-lg sticky top-0 z-10 shadow-sm space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <h4 className="font-medium text-farm-green text-lg">
                    ✓ {selectedAnimal.name || `Animal ${selectedAnimal.tag_number}`}
                  </h4>
                  <p className="text-sm text-gray-600 mt-1">
                    Tag: {selectedAnimal.tag_number} • {selectedAnimal.breed || 'Unknown breed'}
                  </p>
                </div>
                <Badge variant="secondary">✓ Selected</Badge>
              </div>

              {/* Production Status Row */}
              {selectedAnimalDetails && (
                <div className="flex flex-wrap gap-3 pt-2 border-t border-farm-green/20">
                  {selectedAnimalDetails.production_status && (
                    <div className="flex items-center gap-2">
                      <TrendingUp className="w-4 h-4 text-blue-600" />
                      <span className="text-xs font-medium text-gray-700">Production:</span>
                      <span className={`px-2.5 py-1 text-xs font-semibold rounded-full ${getProductionStatusColor(selectedAnimalDetails.production_status)}`}>
                        {getProductionStatusLabel(selectedAnimalDetails.production_status)}
                      </span>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Custom Dropdown */}
          <div className="relative" ref={dropdownRef}>
            {/* Dropdown Trigger */}
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
                    #{selectedAnimal.tag_number} • {selectedAnimal.breed || 'Unknown breed'}
                  </p>
                </div>
              ) : (
                <span className="text-gray-500">Choose an animal...</span>
              )}
              <svg className={`w-5 h-5 text-gray-400 transition-transform ${showAnimalDropdown ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
              </svg>
            </button>

            {/* Dropdown Menu */}
            {showAnimalDropdown && (
              <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-gray-300 rounded-lg shadow-lg z-50 max-h-96 overflow-y-auto">
                {filteredAnimals.length === 0 ? (
                  <div className="p-8 text-center text-gray-500">
                    <p className="text-sm">
                      {animalSearch ? '🔍 No animals match your search' : '📋 No eligible animals found'}
                    </p>
                    {animalSearch && (
                      <p className="text-xs mt-2 text-gray-400">
                        Try searching with different keywords (tag, name, or breed)
                      </p>
                    )}
                  </div>
                ) : (
                  <>
                    {animalSearch && (
                      <div className="sticky top-0 px-4 py-2 bg-farm-green/5 border-b border-gray-200 text-xs text-gray-600">
                        Found {filteredAnimals.length} {filteredAnimals.length === 1 ? 'animal' : 'animals'} matching "{animalSearch}"
                      </div>
                    )}
                    <div className="divide-y divide-gray-200">
                      {filteredAnimals.map((animal) => (
                        <button
                          key={animal.id}
                          type="button"
                          onClick={() => {
                            form.setValue('animal_id', animal.id)
                            setShowAnimalDropdown(false)
                            setAnimalSearch('') // Clear search when animal is selected
                          }}
                          className={`w-full px-4 py-3 text-left hover:bg-farm-green/5 transition-colors ${
                            selectedAnimal?.id === animal.id ? 'bg-farm-green/10 border-l-4 border-farm-green' : ''
                          }`}
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex-1 min-w-0">
                              {/* Animal Name and Basic Info */}
                              <p className="font-medium text-gray-900 truncate">
                                {animal.name || `Animal ${animal.tag_number}`}
                              </p>
                              <p className="text-xs text-gray-600 mt-1">
                                #{animal.tag_number} • {animal.breed || 'Unknown breed'}
                              </p>

                              {/* Status Badge */}
                              {animal.production_status && (
                                <div className="flex items-center gap-1 mt-2">
                                  <TrendingUp className="w-3 h-3 text-blue-600" />
                                  <span className={`px-2 py-0.5 text-xs font-semibold rounded-full ${getProductionStatusColor(animal.production_status)}`}>
                                    {getProductionStatusLabel(animal.production_status)}
                                  </span>
                                </div>
                              )}
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
                  </>
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

        {selectedAnimalId && detailsLoading && (
          <div className="rounded-lg border border-gray-200 bg-gray-50 p-4 text-sm text-gray-600">
            Loading selected animal details...
          </div>
        )}

        {selectedAnimalDetails && !detailsLoading && (
          <Card className="border-gray-200 bg-white">
            <CardHeader>
              <CardTitle>Selected animal details</CardTitle>
              <CardDescription>Key production and breeding history for the chosen animal.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-gray-700">
                <div>
                  <p className="text-xs uppercase tracking-[0.2em] text-gray-500">Tag</p>
                  <p className="mt-1 font-medium">{selectedAnimalDetails.tag_number}</p>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-[0.2em] text-gray-500">Name</p>
                  <p className="mt-1 font-medium">{selectedAnimalDetails.name || 'Unnamed'}</p>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-[0.2em] text-gray-500">Breed</p>
                  <p className="mt-1 font-medium">{selectedAnimalDetails.breed || 'Unknown'}</p>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-[0.2em] text-gray-500">Production status</p>
                  <p className="mt-1 font-medium">{formatProductionStatus(selectedAnimalDetails.production_status)}</p>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-[0.2em] text-gray-500">Current production</p>
                  <p className="mt-1 font-medium">{selectedAnimalDetails.current_daily_production ? `${selectedAnimalDetails.current_daily_production} L/day` : 'Not recorded'}</p>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-[0.2em] text-gray-500">Last calving</p>
                  <p className="mt-1 font-medium">{selectedAnimalDetails.latest_calving?.calving_date ? new Date(selectedAnimalDetails.latest_calving.calving_date).toLocaleDateString() : 'No record'}</p>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-[0.2em] text-gray-500">Last heat detection</p>
                  <p className="mt-1 font-medium">{getLatestBreedingEvent('heat_detection') ? new Date(getLatestBreedingEvent('heat_detection')).toLocaleDateString() : 'No record'}</p>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-[0.2em] text-gray-500">Last insemination</p>
                  <p className="mt-1 font-medium">{getLatestBreedingEvent('insemination') ? new Date(getLatestBreedingEvent('insemination')).toLocaleDateString() : 'No record'}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Date and Time Observed */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="event_date">Date Observed *</Label>
            <Input id="event_date" type="date" {...form.register('event_date')} error={form.formState.errors.event_date?.message} />
          </div>
          <div>
            <Label htmlFor="event_time">Time Observed *</Label>
            <Input id="event_time" type="time" {...form.register('event_time')} error={form.formState.errors.event_time?.message} />
          </div>
        </div>
        
        <div>
          <Label>Observed Heat Signs *</Label>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mt-2">
            {heatSigns.map((sign) => (
              <button
                key={sign}
                type="button"
                onClick={() => toggleHeatSign(sign)}
                className={`flex items-center space-x-2 p-3 border rounded-lg text-left transition-colors ${
                  selectedSigns.includes(sign) ? 'border-farm-green bg-green-50 text-green-800' : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                {selectedSigns.includes(sign) ? <CheckCircle className="w-4 h-4 text-green-600" /> : <Circle className="w-4 h-4 text-gray-400" />}
                <span className="text-sm">{sign}</span>
              </button>
            ))}
          </div>
          {form.formState.errors.heat_signs && <p className="text-sm text-red-600 mt-1">{form.formState.errors.heat_signs.message}</p>}
        </div>
        
        <div>
          <Label htmlFor="heat_action_taken">Action Taken</Label>
          <select id="heat_action_taken" {...form.register('heat_action_taken')} className="w-full px-3 py-2 border border-gray-300 rounded-md">
            <option value="">Select action...</option>
            {actionOptions.map(action => <option key={action} value={action}>{action}</option>)}
          </select>
        </div>
        
        <div>
          <Label htmlFor="notes">Additional Notes</Label>
          <textarea id="notes" {...form.register('notes')} rows={3} className="w-full px-3 py-2 border border-gray-300 rounded-md" placeholder="Observations..." />
        </div>
        
        <div className="flex justify-end space-x-3 pt-4">
          <Button type="button" variant="outline" onClick={onCancel}>Cancel</Button>
          <Button type="submit" disabled={loading}>{loading ? <LoadingSpinner size="sm" /> : eventId ? 'Save Changes' : 'Record Heat Detection'}</Button>
        </div>
      </form>
    </div>
  )
}