// src/components/health/EditVetVisitModal.tsx

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
import { 
  X, 
  Calendar, 
  Clock, 
  Stethoscope, 
  DollarSign,
  MapPin,
  AlertTriangle,
  Users,
  Bell,
  CheckCircle,
  XCircle
} from 'lucide-react'

const editVisitSchema = z.object({
  visit_type: z.enum(['routine', 'emergency', 'follow_up', 'consultation']),
  visit_purpose: z.string().min(5, 'Visit purpose must be at least 5 characters'),
  scheduled_datetime: z.string().min(1, 'Scheduled date and time is required'),
  duration_hours: z.number().min(0.5).max(24),
  veterinarian_name: z.string().min(2, 'Veterinarian name is required'),
  veterinarian_clinic: z.string().optional(),
  veterinarian_phone: z.string().optional(),
  veterinarian_email: z.string().email().optional().or(z.literal('')),
  priority_level: z.enum(['low', 'medium', 'high', 'urgent']),
  location_details: z.string().optional(),
  special_instructions: z.string().optional(),
  estimated_cost: z.number().min(0).optional(),
  preparation_notes: z.string().optional(),
  send_reminder: z.boolean(),
  reminder_days_before: z.number().min(1).max(30).optional(),
  status: z.enum(['scheduled', 'confirmed', 'in_progress', 'completed', 'cancelled', 'rescheduled']),
  completion_notes: z.string().optional(),
  actual_cost: z.number().min(0).optional(),
  follow_up_required: z.boolean(),
  follow_up_date: z.string().optional(),
  notes: z.string().optional(),
})

type EditVisitFormData = z.infer<typeof editVisitSchema>

interface EditVetVisitModalProps {
  farmId: string
  visit: any
  animals: any[]
  isOpen: boolean
  onClose: () => void
  onVisitUpdated: (visit: any) => void
}

const visitTypes = [
  { value: 'routine', label: '🏥 Routine Check-up' },
  { value: 'emergency', label: '🚨 Emergency' },
  { value: 'follow_up', label: '🔄 Follow-up' },
  { value: 'consultation', label: '💬 Consultation' }
]

const priorityLevels = [
  { value: 'low', label: '🟢 Low Priority', color: 'bg-green-100 text-green-800' },
  { value: 'medium', label: '🟡 Medium Priority', color: 'bg-yellow-100 text-yellow-800' },
  { value: 'high', label: '🟠 High Priority', color: 'bg-orange-100 text-orange-800' },
  { value: 'urgent', label: '🔴 Urgent', color: 'bg-red-100 text-red-800' }
]

const visitStatuses = [
  { value: 'scheduled', label: '📅 Scheduled', color: 'bg-blue-100 text-blue-800' },
  { value: 'confirmed', label: '✅ Confirmed', color: 'bg-green-100 text-green-800' },
  { value: 'in_progress', label: '🔄 In Progress', color: 'bg-yellow-100 text-yellow-800' },
  { value: 'completed', label: '✅ Completed', color: 'bg-gray-100 text-gray-800' },
  { value: 'cancelled', label: '❌ Cancelled', color: 'bg-red-100 text-red-800' },
  { value: 'rescheduled', label: '📅 Rescheduled', color: 'bg-purple-100 text-purple-800' }
]

export function EditVetVisitModal({ 
  farmId, 
  visit, 
  animals = [], 
  isOpen, 
  onClose, 
  onVisitUpdated 
}: EditVetVisitModalProps) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [selectedAnimals, setSelectedAnimals] = useState<string[]>([])
  
  const form = useForm<EditVisitFormData>({
    resolver: zodResolver(editVisitSchema),
    defaultValues: {
      visit_type: 'routine',
      priority_level: 'medium',
      duration_hours: 1,
      send_reminder: true,
      reminder_days_before: 3,
      status: 'scheduled',
      follow_up_required: false,
    },
  })
  
  const watchedSendReminder = form.watch('send_reminder')
  const watchedStatus = form.watch('status')
  const watchedFollowUpRequired = form.watch('follow_up_required')
  
  // Load visit data when modal opens
  useEffect(() => {
    if (isOpen && visit) {
      // Format datetime for input
      const scheduledDate = new Date(visit.scheduled_datetime)
      const formattedDateTime = scheduledDate.toISOString().slice(0, 16)
      
      // Format follow-up date if exists
      const followUpDate = visit.follow_up_date 
        ? new Date(visit.follow_up_date).toISOString().slice(0, 10)
        : ''
      
      form.reset({
        visit_type: visit.visit_type || 'routine',
        visit_purpose: visit.visit_purpose || visit.purpose || '',
        scheduled_datetime: formattedDateTime,
        duration_hours: visit.duration_hours || visit.duration_minutes ? (visit.duration_minutes / 60) : 1,
        veterinarian_name: visit.veterinarian_name || '',
        veterinarian_clinic: visit.veterinarian_clinic || '',
        veterinarian_phone: visit.veterinarian_phone || '',
        veterinarian_email: visit.veterinarian_email || '',
        priority_level: visit.priority_level || visit.priority || 'medium',
        location_details: visit.location_details || visit.location || '',
        special_instructions: visit.special_instructions || '',
        estimated_cost: visit.estimated_cost || 0,
        preparation_notes: visit.preparation_notes || '',
        send_reminder: visit.send_reminder ?? true,
        reminder_days_before: visit.reminder_days_before || 3,
        status: visit.status || 'scheduled',
        completion_notes: visit.completion_notes || '',
        actual_cost: visit.actual_cost || 0,
        follow_up_required: visit.follow_up_required || false,
        follow_up_date: followUpDate,
        notes: visit.notes || '',
      })
      
      // Load associated animals
      if (visit.animals_involved) {
        setSelectedAnimals(visit.animals_involved)
      } else if (visit.visit_animals) {
        setSelectedAnimals(visit.visit_animals.map((va: any) => va.animal_id))
      }
    }
  }, [isOpen, visit, form])
  
  const handleSubmit = async (data: EditVisitFormData) => {
    setLoading(true)
    setError(null)
    
    try {
      const submitData = {
        ...data,
        animals_involved: selectedAnimals,
        // Convert hours to minutes for storage if needed
        duration_minutes: Math.round(data.duration_hours * 60),
      }
      
      const response = await fetch(`/api/health/visits/${visit.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(submitData),
      })
      
      const result = await response.json()
      
      if (!response.ok) {
        throw new Error(result.error || 'Failed to update visit')
      }
      
      onVisitUpdated(result.visit)
      onClose()
      
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unexpected error occurred')
    } finally {
      setLoading(false)
    }
  }
  
  const toggleAnimal = (animalId: string) => {
    setSelectedAnimals(prev => 
      prev.includes(animalId) 
        ? prev.filter(id => id !== animalId)
        : [...prev, animalId]
    )
  }
  
  const getStatusColor = (status: string) => {
    const statusObj = visitStatuses.find(s => s.value === status)
    return statusObj?.color || 'bg-gray-100 text-gray-800'
  }
  
  return (
    <Modal isOpen={isOpen} onClose={onClose} className="max-w-4xl max-h-[90vh] overflow-y-auto">
      <div className="p-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-xl font-semibold text-gray-900 flex items-center space-x-2">
            <Calendar className="w-6 h-6 text-blue-600" />
            <span>Edit Veterinary Visit</span>
          </h3>
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="w-5 h-5" />
          </Button>
        </div>
        
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm flex items-center space-x-2">
            <AlertTriangle className="w-4 h-4" />
            <span>{error}</span>
          </div>
        )}
        
        <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
          {/* Basic Visit Information */}
          <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
            <h4 className="font-medium text-blue-900 mb-4 flex items-center space-x-2">
              <Calendar className="w-5 h-5" />
              <span>Visit Information</span>
            </h4>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="visit_type">Visit Type *</Label>
                <select
                  id="visit_type"
                  {...form.register('visit_type')}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  {visitTypes.map(type => (
                    <option key={type.value} value={type.value}>
                      {type.label}
                    </option>
                  ))}
                </select>
              </div>
              
              <div>
                <Label htmlFor="status">Status *</Label>
                <select
                  id="status"
                  {...form.register('status')}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  {visitStatuses.map(status => (
                    <option key={status.value} value={status.value}>
                      {status.label}
                    </option>
                  ))}
                </select>
                <div className="mt-1">
                  <Badge className={getStatusColor(watchedStatus)}>
                    {visitStatuses.find(s => s.value === watchedStatus)?.label}
                  </Badge>
                </div>
              </div>
            </div>
            
            <div className="mt-4">
              <Label htmlFor="visit_purpose">Visit Purpose *</Label>
              <textarea
                id="visit_purpose"
                {...form.register('visit_purpose')}
                rows={2}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Describe the purpose of this visit..."
              />
              {form.formState.errors.visit_purpose && (
                <p className="text-sm text-red-600 mt-1">
                  {form.formState.errors.visit_purpose.message}
                </p>
              )}
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
              <div>
                <Label htmlFor="scheduled_datetime">Scheduled Date & Time *</Label>
                <Input
                  id="scheduled_datetime"
                  type="datetime-local"
                  {...form.register('scheduled_datetime')}
                  error={form.formState.errors.scheduled_datetime?.message}
                />
              </div>
              
              <div>
                <Label htmlFor="duration_hours">Duration (hours) *</Label>
                <Input
                  id="duration_hours"
                  type="number"
                  min="0.5"
                  max="24"
                  step="0.5"
                  {...form.register('duration_hours', { valueAsNumber: true })}
                  error={form.formState.errors.duration_hours?.message}
                />
              </div>
            </div>
            
            <div>
              <Label htmlFor="priority_level">Priority Level *</Label>
              <select
                id="priority_level"
                {...form.register('priority_level')}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                {priorityLevels.map(priority => (
                  <option key={priority.value} value={priority.value}>
                    {priority.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Veterinarian Information */}
          <div className="bg-green-50 p-4 rounded-lg border border-green-200">
            <h4 className="font-medium text-green-900 mb-4 flex items-center space-x-2">
              <Stethoscope className="w-5 h-5" />
              <span>Veterinarian Information</span>
            </h4>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="veterinarian_name">Veterinarian Name *</Label>
                <Input
                  id="veterinarian_name"
                  {...form.register('veterinarian_name')}
                  error={form.formState.errors.veterinarian_name?.message}
                  placeholder="Dr. Sarah Johnson"
                />
              </div>
              
              <div>
                <Label htmlFor="veterinarian_clinic">Clinic/Practice</Label>
                <Input
                  id="veterinarian_clinic"
                  {...form.register('veterinarian_clinic')}
                  placeholder="Valley Veterinary Clinic"
                />
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
              <div>
                <Label htmlFor="veterinarian_phone">Phone Number</Label>
                <Input
                  id="veterinarian_phone"
                  {...form.register('veterinarian_phone')}
                  placeholder="(555) 123-4567"
                />
              </div>
              
              <div>
                <Label htmlFor="veterinarian_email">Email Address</Label>
                <Input
                  id="veterinarian_email"
                  type="email"
                  {...form.register('veterinarian_email')}
                  error={form.formState.errors.veterinarian_email?.message}
                  placeholder="dr.johnson@valleyvet.com"
                />
              </div>
            </div>
          </div>

          {/* Animals Involved */}
          {animals.length > 0 && (
            <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-200">
              <h4 className="font-medium text-yellow-900 mb-4 flex items-center space-x-2">
                <Users className="w-5 h-5" />
                <span>Animals Involved</span>
              </h4>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 max-h-40 overflow-y-auto">
                {animals.map(animal => (
                  <label
                    key={animal.id}
                    className={`flex items-center space-x-2 p-3 rounded-lg border cursor-pointer transition-colors ${
                      selectedAnimals.includes(animal.id)
                        ? 'bg-yellow-100 border-yellow-400'
                        : 'bg-white border-gray-200 hover:bg-yellow-50'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={selectedAnimals.includes(animal.id)}
                      onChange={() => toggleAnimal(animal.id)}
                      className="text-yellow-600 focus:ring-yellow-500"
                    />
                    <div className="flex-1">
                      <div className="font-medium text-sm">
                        {animal.name || `Animal #${animal.tag_number}`}
                      </div>
                      <div className="text-xs text-gray-600">
                        #{animal.tag_number} • {animal.breed}
                      </div>
                    </div>
                  </label>
                ))}
              </div>
              
              {selectedAnimals.length > 0 && (
                <div className="mt-3 p-2 bg-yellow-100 rounded-md">
                  <p className="text-sm text-yellow-800">
                    {selectedAnimals.length} animal{selectedAnimals.length !== 1 ? 's' : ''} selected for this visit
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Location & Instructions */}
          <div className="bg-purple-50 p-4 rounded-lg border border-purple-200">
            <h4 className="font-medium text-purple-900 mb-4 flex items-center space-x-2">
              <MapPin className="w-5 h-5" />
              <span>Location & Instructions</span>
            </h4>
            
            <div className="space-y-4">
              <div>
                <Label htmlFor="location_details">Location Details</Label>
                <Input
                  id="location_details"
                  {...form.register('location_details')}
                  placeholder="Main barn, Field 3, etc."
                />
              </div>
              
              <div>
                <Label htmlFor="special_instructions">Special Instructions</Label>
                <textarea
                  id="special_instructions"
                  {...form.register('special_instructions')}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  placeholder="Any special instructions for the veterinarian..."
                />
              </div>
              
              <div>
                <Label htmlFor="preparation_notes">Preparation Notes</Label>
                <textarea
                  id="preparation_notes"
                  {...form.register('preparation_notes')}
                  rows={2}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  placeholder="What needs to be prepared before the visit..."
                />
              </div>
            </div>
          </div>

          {/* Cost Information */}
          <div className="bg-indigo-50 p-4 rounded-lg border border-indigo-200">
            <h4 className="font-medium text-indigo-900 mb-4 flex items-center space-x-2">
              <DollarSign className="w-5 h-5" />
              <span>Cost Information</span>
            </h4>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="estimated_cost">Estimated Cost ($)</Label>
                <Input
                  id="estimated_cost"
                  type="number"
                  min="0"
                  step="0.01"
                  {...form.register('estimated_cost', { valueAsNumber: true })}
                  placeholder="150.00"
                />
              </div>
              
              {watchedStatus === 'completed' && (
                <div>
                  <Label htmlFor="actual_cost">Actual Cost ($)</Label>
                  <Input
                    id="actual_cost"
                    type="number"
                    min="0"
                    step="0.01"
                    {...form.register('actual_cost', { valueAsNumber: true })}
                    placeholder="175.00"
                  />
                </div>
              )}
            </div>
          </div>

          {/* Reminders */}
          <div className="bg-orange-50 p-4 rounded-lg border border-orange-200">
            <h4 className="font-medium text-orange-900 mb-4 flex items-center space-x-2">
              <Bell className="w-5 h-5" />
              <span>Reminders</span>
            </h4>
            
            <div className="space-y-4">
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="send_reminder"
                  {...form.register('send_reminder')}
                  className="text-orange-600 focus:ring-orange-500"
                />
                <Label htmlFor="send_reminder" className="cursor-pointer">
                  Send reminder notification
                </Label>
              </div>
              
              {watchedSendReminder && (
                <div>
                  <Label htmlFor="reminder_days_before">Days before visit to remind</Label>
                  <Input
                    id="reminder_days_before"
                    type="number"
                    min="1"
                    max="30"
                    {...form.register('reminder_days_before', { valueAsNumber: true })}
                    placeholder="3"
                  />
                </div>
              )}
            </div>
          </div>

          {/* Completion & Follow-up */}
          {(watchedStatus === 'completed' || watchedStatus === 'in_progress') && (
            <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
              <h4 className="font-medium text-gray-900 mb-4 flex items-center space-x-2">
                <CheckCircle className="w-5 h-5" />
                <span>Completion & Follow-up</span>
              </h4>
              
              <div className="space-y-4">
                {watchedStatus === 'completed' && (
                  <div>
                    <Label htmlFor="completion_notes">Completion Notes</Label>
                    <textarea
                      id="completion_notes"
                      {...form.register('completion_notes')}
                      rows={3}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-gray-500 focus:border-transparent"
                      placeholder="Summary of what was accomplished during the visit..."
                    />
                  </div>
                )}
                
                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="follow_up_required"
                    {...form.register('follow_up_required')}
                    className="text-gray-600 focus:ring-gray-500"
                  />
                  <Label htmlFor="follow_up_required" className="cursor-pointer">
                    Follow-up visit required
                  </Label>
                </div>
                
                {watchedFollowUpRequired && (
                  <div>
                    <Label htmlFor="follow_up_date">Follow-up Date</Label>
                    <Input
                      id="follow_up_date"
                      type="date"
                      {...form.register('follow_up_date')}
                    />
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Additional Notes */}
          <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
            <h4 className="font-medium text-gray-900 mb-4">Additional Notes</h4>
            <textarea
              id="notes"
              {...form.register('notes')}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-gray-500 focus:border-transparent"
              placeholder="Any additional notes about this visit..."
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
            <Button type="submit" disabled={loading} className="bg-blue-600 hover:bg-blue-700">
              {loading ? (
                <>
                  <LoadingSpinner size="sm" />
                  <span className="ml-2">Updating Visit...</span>
                </>
              ) : (
                <>
                  <Calendar className="w-4 h-4 mr-2" />
                  Update Visit
                </>
              )}
            </Button>
          </div>
        </form>
      </div>
    </Modal>
  )
}