// EditOutbreakModal for updating existing outbreak records
// src/components/health/EditOutbreakModal.tsx

'use client'

import { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Label } from '@/components/ui/Label'
import { Modal } from '@/components/ui/Modal'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { Badge } from '@/components/ui/Badge'
import { AlertTriangle, X, Shield, Users, AlertCircle } from 'lucide-react'

const outbreakSchema = z.object({
  outbreak_name: z.string().min(2, 'Outbreak name is required'),
  disease_type: z.string().min(2, 'Disease type is required'),
  severity_level: z.enum(['low', 'medium', 'high', 'critical']),
  first_detected_date: z.string().min(1, 'Detection date is required'),
  description: z.string().min(10, 'Description must be at least 10 characters'),
  symptoms: z.string().min(5, 'Symptoms description is required'),
  affected_animals: z.array(z.string()).min(1, 'At least one animal must be affected'),
  quarantine_required: z.boolean(),
  quarantine_area: z.string().optional(),
  treatment_protocol: z.string().optional(),
  veterinarian: z.string().optional(),
  estimated_duration: z.number().min(1).optional(),
  preventive_measures: z.string().optional(),
  notes: z.string().optional(),
  status: z.enum(['active', 'contained', 'resolved']),
  resolved_date: z.string().optional(),
})

type OutbreakFormData = z.infer<typeof outbreakSchema>

interface Outbreak {
  id: string
  outbreak_name: string
  disease_type: string
  severity_level: 'low' | 'medium' | 'high' | 'critical'
  first_detected_date: string
  description: string
  symptoms: string
  affected_animals: string[]
  quarantine_required: boolean
  quarantine_area?: string
  treatment_protocol?: string
  veterinarian?: string
  estimated_duration?: number
  preventive_measures?: string
  notes?: string
  status: 'active' | 'contained' | 'resolved'
  resolved_date?: string
}

interface EditOutbreakModalProps {
  farmId: string
  animals: any[]
  outbreak: Outbreak
  isOpen: boolean
  onClose: () => void
  onOutbreakUpdated: (outbreak: any) => void
}

export function EditOutbreakModal({ 
  farmId, 
  animals, 
  outbreak,
  isOpen, 
  onClose, 
  onOutbreakUpdated 
}: EditOutbreakModalProps) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [selectedAnimals, setSelectedAnimals] = useState<string[]>(outbreak.affected_animals || [])
  
  const form = useForm<OutbreakFormData>({
    resolver: zodResolver(outbreakSchema),
    defaultValues: {
      outbreak_name: outbreak.outbreak_name || '',
      disease_type: outbreak.disease_type || '',
      severity_level: outbreak.severity_level || 'medium',
      first_detected_date: outbreak.first_detected_date?.split('T')[0] || '',
      description: outbreak.description || '',
      symptoms: outbreak.symptoms || '',
      affected_animals: outbreak.affected_animals || [],
      quarantine_required: outbreak.quarantine_required || false,
      quarantine_area: outbreak.quarantine_area || '',
      treatment_protocol: outbreak.treatment_protocol || '',
      veterinarian: outbreak.veterinarian || '',
      estimated_duration: outbreak.estimated_duration || undefined,
      preventive_measures: outbreak.preventive_measures || '',
      notes: outbreak.notes || '',
      status: outbreak.status || 'active',
      resolved_date: outbreak.resolved_date?.split('T')[0] || '',
    },
  })

  // Update form values when outbreak changes
  useEffect(() => {
    if (outbreak) {
      form.reset({
        outbreak_name: outbreak.outbreak_name || '',
        disease_type: outbreak.disease_type || '',
        severity_level: outbreak.severity_level || 'medium',
        first_detected_date: outbreak.first_detected_date?.split('T')[0] || '',
        description: outbreak.description || '',
        symptoms: outbreak.symptoms || '',
        affected_animals: outbreak.affected_animals || [],
        quarantine_required: outbreak.quarantine_required || false,
        quarantine_area: outbreak.quarantine_area || '',
        treatment_protocol: outbreak.treatment_protocol || '',
        veterinarian: outbreak.veterinarian || '',
        estimated_duration: outbreak.estimated_duration || undefined,
        preventive_measures: outbreak.preventive_measures || '',
        notes: outbreak.notes || '',
        status: outbreak.status || 'active',
        resolved_date: outbreak.resolved_date?.split('T')[0] || '',
      })
      setSelectedAnimals(outbreak.affected_animals || [])
    }
  }, [outbreak, form])
  
  const watchedSeverity = form.watch('severity_level')
  const watchedQuarantine = form.watch('quarantine_required')
  const watchedStatus = form.watch('status')
   
  const handleSubmit = async (data: OutbreakFormData) => {
    setLoading(true)
    setError(null)
    
    try {
      const response = await fetch(`/api/health/outbreaks/${outbreak.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...data,
          farm_id: farmId,
          affected_animals: selectedAnimals,
        }),
      })
      
      const result = await response.json()
      
      if (!response.ok) {
        throw new Error(result.error || 'Failed to update outbreak record')
      }
      
      onOutbreakUpdated(result.outbreak)
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
      form.setValue('affected_animals', updated)
      return updated
    })
  }
  
  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'low': return 'bg-green-100 text-green-800'
      case 'medium': return 'bg-yellow-100 text-yellow-800'
      case 'high': return 'bg-orange-100 text-orange-800'
      case 'critical': return 'bg-red-100 text-red-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-red-100 text-red-800'
      case 'contained': return 'bg-yellow-100 text-yellow-800'
      case 'resolved': return 'bg-green-100 text-green-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }
  
  return (
    <Modal isOpen={isOpen} onClose={onClose} className="max-w-4xl max-h-[90vh] overflow-y-auto">
      <div className="p-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-xl font-semibold text-gray-900 flex items-center space-x-2">
            <AlertTriangle className="w-6 h-6 text-red-600" />
            <span>Edit Outbreak Record</span>
          </h3>
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="w-5 h-5" />
          </Button>
        </div>
        
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm flex items-center space-x-2">
            <AlertCircle className="w-4 h-4 text-red-500" />
            <span>{error}</span>
          </div>
        )}
        
        <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
          {/* Basic Outbreak Information */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="outbreak_name">Outbreak Name</Label>
              <Input
                id="outbreak_name"
                {...form.register('outbreak_name')}
                error={form.formState.errors.outbreak_name?.message}
                placeholder="e.g., Respiratory Infection Outbreak"
              />
            </div>
            
            <div>
              <Label htmlFor="disease_type">Disease/Condition</Label>
              <Input
                id="disease_type"
                {...form.register('disease_type')}
                error={form.formState.errors.disease_type?.message}
                placeholder="e.g., Bovine Respiratory Disease"
              />
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label htmlFor="severity_level">Severity Level</Label>
              <select
                id="severity_level"
                {...form.register('severity_level')}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-farm-green focus:border-transparent"
              >
                <option value="low">🟢 Low - Minor concern</option>
                <option value="medium">🟡 Medium - Moderate attention</option>
                <option value="high">🟠 High - Serious concern</option>
                <option value="critical">🔴 Critical - Emergency</option>
              </select>
              <Badge className={`mt-2 ${getSeverityColor(watchedSeverity)}`}>
                {watchedSeverity.toUpperCase()} SEVERITY
              </Badge>
            </div>
            
            <div>
              <Label htmlFor="status">Outbreak Status</Label>
              <select
                id="status"
                {...form.register('status')}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-farm-green focus:border-transparent"
              >
                <option value="active">🔴 Active</option>
                <option value="contained">🟡 Contained</option>
                <option value="resolved">🟢 Resolved</option>
              </select>
              <Badge className={`mt-2 ${getStatusColor(watchedStatus)}`}>
                {watchedStatus.toUpperCase()}
              </Badge>
            </div>
            
            <div>
              <Label htmlFor="first_detected_date">First Detected Date</Label>
              <Input
                id="first_detected_date"
                type="date"
                {...form.register('first_detected_date')}
                error={form.formState.errors.first_detected_date?.message}
                max={new Date().toISOString().split('T')[0]}
              />
            </div>
          </div>

          {/* Resolved Date - only show if status is resolved */}
          {watchedStatus === 'resolved' && (
            <div>
              <Label htmlFor="resolved_date">Resolved Date</Label>
              <Input
                id="resolved_date"
                type="date"
                {...form.register('resolved_date')}
                max={new Date().toISOString().split('T')[0]}
              />
            </div>
          )}
          
          <div>
            <Label htmlFor="description">Description</Label>
            <textarea
              id="description"
              {...form.register('description')}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-farm-green focus:border-transparent"
              placeholder="Describe the outbreak, how it was discovered, and current situation..."
            />
            {form.formState.errors.description && (
              <p className="text-sm text-red-600 mt-1">
                {form.formState.errors.description.message}
              </p>
            )}
          </div>
          
          <div>
            <Label htmlFor="symptoms">Observed Symptoms</Label>
            <textarea
              id="symptoms"
              {...form.register('symptoms')}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-farm-green focus:border-transparent"
              placeholder="List all observed symptoms, behavioral changes, and clinical signs..."
            />
            {form.formState.errors.symptoms && (
              <p className="text-sm text-red-600 mt-1">
                {form.formState.errors.symptoms.message}
              </p>
            )}
          </div>
          
          {/* Affected Animals Selection */}
          <div className="bg-red-50 p-4 rounded-lg border border-red-200">
            <h4 className="font-medium text-red-900 mb-4 flex items-center space-x-2">
              <Users className="w-5 h-5" />
              <span>Affected Animals ({selectedAnimals.length} selected)</span>
            </h4>
            
            <div className="max-h-48 overflow-y-auto border border-red-200 rounded-md p-3 bg-white">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                {animals.map(animal => (
                  <label
                    key={animal.id}
                    className="flex items-center space-x-2 p-2 hover:bg-red-50 rounded cursor-pointer"
                  >
                    <input
                      type="checkbox"
                      checked={selectedAnimals.includes(animal.id)}
                      onChange={() => toggleAnimalSelection(animal.id)}
                      className="text-red-600 focus:ring-red-500"
                    />
                    <span className="text-sm">
                      {animal.name || `Animal ${animal.tag_number}`} (#{animal.tag_number})
                    </span>
                  </label>
                ))}
              </div>
            </div>
            
            {form.formState.errors.affected_animals && (
              <p className="text-sm text-red-600 mt-2">
                {form.formState.errors.affected_animals.message}
              </p>
            )}
          </div>
          
          {/* Quarantine Information */}
          <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-200">
            <h4 className="font-medium text-yellow-900 mb-4 flex items-center space-x-2">
              <Shield className="w-5 h-5" />
              <span>Quarantine & Containment</span>
            </h4>
            
            <div className="space-y-4">
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="quarantine_required"
                  {...form.register('quarantine_required')}
                  className="text-yellow-600 focus:ring-yellow-500"
                />
                <Label htmlFor="quarantine_required" className="cursor-pointer">
                  Quarantine measures required
                </Label>
              </div>
              
              {watchedQuarantine && (
                <div>
                  <Label htmlFor="quarantine_area">Quarantine Area/Location</Label>
                  <Input
                    id="quarantine_area"
                    {...form.register('quarantine_area')}
                    placeholder="e.g., Isolation barn, Paddock 3"
                  />
                </div>
              )}
            </div>
          </div>
          
          {/* Treatment and Management */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="treatment_protocol">Treatment Protocol</Label>
              <textarea
                id="treatment_protocol"
                {...form.register('treatment_protocol')}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-farm-green focus:border-transparent"
                placeholder="Describe treatment plan, medications, and procedures..."
              />
            </div>
            
            <div>
              <Label htmlFor="preventive_measures">Preventive Measures</Label>
              <textarea
                id="preventive_measures"
                {...form.register('preventive_measures')}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-farm-green focus:border-transparent"
                placeholder="List preventive measures to prevent spread..."
              />
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="veterinarian">Attending Veterinarian</Label>
              <Input
                id="veterinarian"
                {...form.register('veterinarian')}
                placeholder="Dr. Smith, Emergency Vet Clinic"
              />
            </div>
            
            <div>
              <Label htmlFor="estimated_duration">Estimated Duration (days)</Label>
              <Input
                id="estimated_duration"
                type="number"
                min="1"
                {...form.register('estimated_duration', { valueAsNumber: true })}
                placeholder="7"
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
              placeholder="Any additional information, observations, or special instructions..."
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
            <Button type="submit" disabled={loading} className="bg-red-600 hover:bg-red-700">
              {loading ? (
                <>
                  <LoadingSpinner size="sm" />
                  <span className="ml-2">Updating Outbreak...</span>
                </>
              ) : (
                <>
                  <AlertTriangle className="w-4 h-4 mr-2" />
                  Update Outbreak
                </>
              )}
            </Button>
          </div>
        </form>
      </div>
    </Modal>
  )
}