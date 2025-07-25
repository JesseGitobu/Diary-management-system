// src/components/health/VaccinationModal.tsx

'use client'

import React, { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Label } from '@/components/ui/Label'
import { Modal } from '@/components/ui/Modal'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { Badge } from '@/components/ui/Badge'
import { Syringe, X, Calendar, Shield, Clock } from 'lucide-react'

// Updated schema with proper date handling
const vaccinationSchema = z.object({
  vaccine_name: z.string().min(2, 'Vaccine name is required'),
  vaccine_type: z.enum(['core', 'risk_based', 'elective']),
  manufacturer: z.string().optional(),
  batch_number: z.string().optional(),
  vaccination_date: z.string().min(1, 'Vaccination date is required')
    .refine((date) => {
      // Ensure it's a valid date string
      return !isNaN(Date.parse(date))
    }, 'Please enter a valid date'),
  next_due_date: z.string().optional()
    .refine((date) => {
      // Allow empty string or valid date
      return !date || date.trim() === '' || !isNaN(Date.parse(date))
    }, 'Please enter a valid date or leave empty'),
  route_of_administration: z.enum(['intramuscular', 'subcutaneous', 'intranasal', 'oral']),
  dosage: z.string().min(1, 'Dosage is required'),
  vaccination_site: z.string().optional(),
  selected_animals: z.array(z.string()).min(1, 'At least one animal must be selected'),
  veterinarian: z.string().optional(),
  cost_per_dose: z.number().min(0).optional(),
  total_cost: z.number().min(0).optional(),
  side_effects: z.string().optional(),
  notes: z.string().optional(),
  create_reminder: z.boolean(),
})

// Update the transform to handle dates properly
const vaccinationSchemaTransformed = vaccinationSchema.transform((data) => ({
  ...data,
  // Transform empty strings to undefined for optional dates
  next_due_date: data.next_due_date?.trim() || undefined,
  manufacturer: data.manufacturer?.trim() || undefined,
  batch_number: data.batch_number?.trim() || undefined,
  vaccination_site: data.vaccination_site?.trim() || undefined,
  veterinarian: data.veterinarian?.trim() || undefined,
  side_effects: data.side_effects?.trim() || undefined,
  notes: data.notes?.trim() || undefined,
}))

type VaccinationFormData = z.infer<typeof vaccinationSchema>


interface VaccinationModalProps {
  farmId: string
  animals: any[]
  isOpen: boolean
  onClose: () => void
  onVaccinationRecorded: (vaccination: any) => void
}

export function VaccinationModal({ 
  farmId, 
  animals, 
  isOpen, 
  onClose, 
  onVaccinationRecorded 
}: VaccinationModalProps) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [selectedAnimals, setSelectedAnimals] = useState<string[]>([])
  const [selectAll, setSelectAll] = useState(false)
  
const form = useForm<VaccinationFormData>({
  resolver: zodResolver(vaccinationSchemaTransformed),
  defaultValues: {
    vaccine_type: 'core',
    vaccination_date: new Date().toISOString().split('T')[0],
    route_of_administration: 'intramuscular',
    selected_animals: [],
    create_reminder: true,
  },
})
  
  const watchedVaccineType = form.watch('vaccine_type')
  const watchedCostPerDose = form.watch('cost_per_dose')
  
  // Calculate total cost when cost per dose or selected animals change
  React.useEffect(() => {
    if (watchedCostPerDose && selectedAnimals.length > 0) {
      const total = watchedCostPerDose * selectedAnimals.length
      form.setValue('total_cost', total)
    }
  }, [watchedCostPerDose, selectedAnimals.length])
  
  const handleSubmit = async (data: VaccinationFormData) => {
  setLoading(true)
  setError(null)
  
  try {
    // Clean up date fields - convert empty strings to null
    const cleanedData = {
      ...data,
      // Convert empty string dates to null
      vaccination_date: data.vaccination_date || null,
      next_due_date: data.next_due_date?.trim() || null, // Remove whitespace and convert empty to null
      selected_animals: selectedAnimals,
    }
    
    console.log('Sending vaccination data:', cleanedData) // Debug log
    
    const response = await fetch('/api/health/vaccinations', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        ...cleanedData,
        farm_id: farmId,
      }),
    })
    
    const result = await response.json()
    
    if (!response.ok) {
      throw new Error(result.error || 'Failed to record vaccination')
    }
    
    onVaccinationRecorded(result.vaccination)
    form.reset()
    setSelectedAnimals([])
    setSelectAll(false)
    onClose()
    
  } catch (err) {
    setError(err instanceof Error ? err.message : 'An unexpected error occurred')
  } finally {
    setLoading(false)
  }
}
  
  const toggleAnimalSelection = (animalId: string) => {
    setSelectedAnimals(prev => {
      const updated = prev.includes(animalId) 
        ? prev.filter(id => id !== animalId)
        : [...prev, animalId]
      form.setValue('selected_animals', updated)
      return updated
    })
  }
  
  const handleSelectAll = () => {
    if (selectAll) {
      setSelectedAnimals([])
      form.setValue('selected_animals', [])
    } else {
      const allAnimalIds = animals.map(animal => animal.id)
      setSelectedAnimals(allAnimalIds)
      form.setValue('selected_animals', allAnimalIds)
    }
    setSelectAll(!selectAll)
  }
  
  const getVaccineTypeColor = (type: string) => {
    switch (type) {
      case 'core': return 'bg-green-100 text-green-800'
      case 'risk_based': return 'bg-yellow-100 text-yellow-800'
      case 'elective': return 'bg-blue-100 text-blue-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }
  
  return (
    <Modal isOpen={isOpen} onClose={onClose} className="max-w-4xl max-h-[90vh] overflow-y-auto">
      <div className="p-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-xl font-semibold text-gray-900 flex items-center space-x-2">
            <Syringe className="w-6 h-6 text-green-600" />
            <span>Record Vaccination</span>
          </h3>
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="w-5 h-5" />
          </Button>
        </div>
        
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
            {error}
          </div>
        )}
        
        <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
          {/* Vaccine Information */}
          <div className="bg-green-50 p-4 rounded-lg border border-green-200">
            <h4 className="font-medium text-green-900 mb-4 flex items-center space-x-2">
              <Shield className="w-5 h-5" />
              <span>Vaccine Information</span>
            </h4>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="vaccine_name">Vaccine Name</Label>
                <Input
                  id="vaccine_name"
                  {...form.register('vaccine_name')}
                  error={form.formState.errors.vaccine_name?.message}
                  placeholder="e.g., Bovilis BVD, Fortress 7"
                />
              </div>
              
              <div>
                <Label htmlFor="vaccine_type">Vaccine Type</Label>
                <select
                  id="vaccine_type"
                  {...form.register('vaccine_type')}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-farm-green focus:border-transparent"
                >
                  <option value="core">Core - Essential vaccines</option>
                  <option value="risk_based">Risk-based - Conditional vaccines</option>
                  <option value="elective">Elective - Optional vaccines</option>
                </select>
                <Badge className={`mt-1 ${getVaccineTypeColor(watchedVaccineType)}`}>
                  {watchedVaccineType.replace('_', ' ').toUpperCase()}
                </Badge>
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
              <div>
                <Label htmlFor="manufacturer">Manufacturer (Optional)</Label>
                <Input
                  id="manufacturer"
                  {...form.register('manufacturer')}
                  placeholder="e.g., Zoetis, Merck Animal Health"
                />
              </div>
              
              <div>
                <Label htmlFor="batch_number">Batch/Lot Number (Optional)</Label>
                <Input
                  id="batch_number"
                  {...form.register('batch_number')}
                  placeholder="e.g., ABC123"
                />
              </div>
            </div>
          </div>
          
          {/* Administration Details */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label htmlFor="vaccination_date">Vaccination Date</Label>
              <Input
                id="vaccination_date"
                type="date"
                {...form.register('vaccination_date')}
                error={form.formState.errors.vaccination_date?.message}
                max={new Date().toISOString().split('T')[0]}
              />
            </div>
            
            <div>
              <Label htmlFor="next_due_date">Next Due Date (Optional)</Label>
              <Input
                id="next_due_date"
                type="date"
                {...form.register('next_due_date')}
                min={form.watch('vaccination_date')}
              />
            </div>
            
            <div>
              <Label htmlFor="route_of_administration">Route of Administration</Label>
              <select
                id="route_of_administration"
                {...form.register('route_of_administration')}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-farm-green focus:border-transparent"
              >
                <option value="intramuscular">Intramuscular (IM)</option>
                <option value="subcutaneous">Subcutaneous (SQ)</option>
                <option value="intranasal">Intranasal</option>
                <option value="oral">Oral</option>
              </select>
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="dosage">Dosage</Label>
              <Input
                id="dosage"
                {...form.register('dosage')}
                error={form.formState.errors.dosage?.message}
                placeholder="e.g., 2ml, 5ml per animal"
              />
            </div>
            
            <div>
              <Label htmlFor="vaccination_site">Vaccination Site (Optional)</Label>
              <Input
                id="vaccination_site"
                {...form.register('vaccination_site')}
                placeholder="e.g., Left neck, Right shoulder"
              />
            </div>
          </div>
          
          {/* Animal Selection */}
          <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
            <div className="flex items-center justify-between mb-4">
              <h4 className="font-medium text-blue-900 flex items-center space-x-2">
                <Syringe className="w-5 h-5" />
                <span>Select Animals to Vaccinate ({selectedAnimals.length} selected)</span>
              </h4>
              
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleSelectAll}
              >
                {selectAll ? 'Deselect All' : 'Select All'}
              </Button>
            </div>
            
            <div className="max-h-48 overflow-y-auto border border-blue-200 rounded-md p-3 bg-white">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                {animals.map(animal => (
                  <label
                    key={animal.id}
                    className="flex items-center space-x-2 p-2 hover:bg-blue-50 rounded cursor-pointer"
                  >
                    <input
                      type="checkbox"
                      checked={selectedAnimals.includes(animal.id)}
                      onChange={() => toggleAnimalSelection(animal.id)}
                      className="text-blue-600 focus:ring-blue-500"
                    />
                    <span className="text-sm">
                      {animal.name || `Animal ${animal.tag_number}`} (#{animal.tag_number})
                    </span>
                  </label>
                ))}
              </div>
            </div>
            
            {form.formState.errors.selected_animals && (
              <p className="text-sm text-red-600 mt-2">
                {form.formState.errors.selected_animals.message}
              </p>
            )}
          </div>
          
          {/* Cost Information */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label htmlFor="cost_per_dose">Cost per Dose</Label>
              <Input
                id="cost_per_dose"
                type="number"
                step="0.01"
                min="0"
                {...form.register('cost_per_dose', { valueAsNumber: true })}
                placeholder="0.00"
              />
            </div>
            
            <div>
              <Label htmlFor="total_cost">Total Cost</Label>
              <Input
                id="total_cost"
                type="number"
                step="0.01"
                min="0"
                {...form.register('total_cost', { valueAsNumber: true })}
                placeholder="0.00"
                readOnly
                className="bg-gray-50"
              />
              <p className="text-xs text-gray-500 mt-1">
                Calculated: {selectedAnimals.length} animals × ${watchedCostPerDose || 0}
              </p>
            </div>
            
            <div>
              <Label htmlFor="veterinarian">Veterinarian (Optional)</Label>
              <Input
                id="veterinarian"
                {...form.register('veterinarian')}
                placeholder="Dr. Smith"
              />
            </div>
          </div>
          
          {/* Additional Information */}
          <div>
            <Label htmlFor="side_effects">Observed Side Effects (Optional)</Label>
            <textarea
              id="side_effects"
              {...form.register('side_effects')}
              rows={2}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-farm-green focus:border-transparent"
              placeholder="Any observed side effects or reactions..."
            />
          </div>
          
          <div>
            <Label htmlFor="notes">Notes</Label>
            <textarea
              id="notes"
              {...form.register('notes')}
              rows={2}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-farm-green focus:border-transparent"
              placeholder="Additional notes about the vaccination..."
            />
          </div>
          
          {/* Create Reminder Option */}
          <div className="flex items-center space-x-2">
            <input
              type="checkbox"
              id="create_reminder"
              {...form.register('create_reminder')}
              className="text-green-600 focus:ring-green-500"
            />
            <Label htmlFor="create_reminder" className="cursor-pointer flex items-center space-x-1">
              <Clock className="w-4 h-4" />
              <span>Create reminder for next vaccination due date</span>
            </Label>
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
            <Button type="submit" disabled={loading} className="bg-green-600 hover:bg-green-700">
              {loading ? (
                <>
                  <LoadingSpinner size="sm" />
                  <span className="ml-2">Recording Vaccination...</span>
                </>
              ) : (
                <>
                  <Syringe className="w-4 h-4 mr-2" />
                  Record Vaccination
                </>
              )}
            </Button>
          </div>
        </form>
      </div>
    </Modal>
  )
}