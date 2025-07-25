// 4. Schedule Visit Modal - Complete
// src/components/health/ScheduleVisitModal.tsx

'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Label } from '@/components/ui/Label'
import { Modal } from '@/components/ui/Modal'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { Badge } from '@/components/ui/Badge'
import { Calendar, X, User, Clock, Phone, MapPin, Bell, DollarSign } from 'lucide-react'

const scheduleVisitSchema = z.object({
  visit_type: z.enum(['routine_checkup', 'vaccination', 'emergency', 'consultation', 'breeding', 'other']),
  visit_purpose: z.string().min(5, 'Visit purpose is required'),
  scheduled_date: z.string().min(1, 'Date is required'),
  scheduled_time: z.string().min(1, 'Time is required'),
  duration_hours: z.number().min(0.5).max(8),
  veterinarian_name: z.string().min(2, 'Veterinarian name is required'),
  veterinarian_clinic: z.string().optional(),
  veterinarian_phone: z.string().optional(),
  veterinarian_email: z.string().email().optional().or(z.literal('')),
  priority_level: z.enum(['low', 'medium', 'high', 'urgent']),
  animals_involved: z.array(z.string()).optional(),
  location_details: z.string().optional(),
  special_instructions: z.string().optional(),
  estimated_cost: z.number().min(0).optional(),
  preparation_notes: z.string().optional(),
  send_reminder: z.boolean(),
  reminder_days_before: z.number().min(1).max(30),
})

type ScheduleVisitFormData = z.infer<typeof scheduleVisitSchema>

interface ScheduleVisitModalProps {
  farmId: string
  animals: any[]  // ✅ Change this
  isOpen: boolean
  onClose: () => void
  onVisitScheduled: (visit: any) => void
}

export function ScheduleVisitModal({ 
  farmId, 
  animals,  // ✅ Change this
  isOpen, 
  onClose, 
  onVisitScheduled 
}: ScheduleVisitModalProps) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [selectedAnimals, setSelectedAnimals] = useState<string[]>([])
  const [showAllAnimals, setShowAllAnimals] = useState(false)
  
  const form = useForm<ScheduleVisitFormData>({
    resolver: zodResolver(scheduleVisitSchema),
    defaultValues: {
      visit_type: 'routine_checkup',
      visit_purpose: '',
      scheduled_date: '',
      scheduled_time: '',
      duration_hours: 2,
      veterinarian_name: '',
      veterinarian_clinic: '',
      veterinarian_phone: '',
      veterinarian_email: '',
      priority_level: 'medium',
      animals_involved: [],
      location_details: '',
      special_instructions: '',
      estimated_cost: undefined,
      preparation_notes: '',
      send_reminder: true,
      reminder_days_before: 1,
    },
  })
  
  const watchedVisitType = form.watch('visit_type')
  const watchedPriority = form.watch('priority_level')
  const watchedSendReminder = form.watch('send_reminder')
  
  const handleSubmit = async (data: ScheduleVisitFormData) => {
    setLoading(true)
    setError(null)
    
    try {
      // Combine date and time
      const scheduledDateTime = new Date(`${data.scheduled_date}T${data.scheduled_time}`)
      
      const response = await fetch('/api/health/visits', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...data,
          farm_id: farmId,
          scheduled_datetime: scheduledDateTime.toISOString(),
          animals_involved: selectedAnimals,
          status: 'scheduled',
        }),
      })
      
      const result = await response.json()
      
      if (!response.ok) {
        throw new Error(result.error || 'Failed to schedule visit')
      }
      
      onVisitScheduled(result.visit)
      form.reset()
      setSelectedAnimals([])
      onClose()
      
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unexpected error occurred')
    } finally {
      setLoading(false)
    }
  }
  
  const toggleAnimalSelection = (animalId: string) => {
    setSelectedAnimals(prev => 
      prev.includes(animalId) 
        ? prev.filter(id => id !== animalId)
        : [...prev, animalId]
    )
  }
  
  const selectAllAnimals = () => {
    setSelectedAnimals(animals.map(animal => animal.id))
  }
  
  const clearAnimalSelection = () => {
    setSelectedAnimals([])
  }
  
  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'low': return 'bg-green-100 text-green-800'
      case 'medium': return 'bg-yellow-100 text-yellow-800'
      case 'high': return 'bg-orange-100 text-orange-800'
      case 'urgent': return 'bg-red-100 text-red-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }
  
  const getVisitTypeIcon = (type: string) => {
    switch (type) {
      case 'routine_checkup': return '🩺'
      case 'vaccination': return '💉'
      case 'emergency': return '🚨'
      case 'consultation': return '💬'
      case 'breeding': return '🐄'
      case 'other': return '📋'
      default: return '📋'
    }
  }
  
  const displayAnimals = showAllAnimals ? animals : animals.slice(0, 20)
  
  return (
    <Modal isOpen={isOpen} onClose={onClose} className="max-w-4xl max-h-[90vh] overflow-y-auto">
      <div className="p-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-xl font-semibold text-gray-900 flex items-center space-x-2">
            <Calendar className="w-6 h-6 text-blue-600" />
            <span>Schedule Veterinary Visit</span>
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
          {/* Visit Details */}
          <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
            <h4 className="font-medium text-blue-900 mb-4 flex items-center space-x-2">
              <Calendar className="w-5 h-5" />
              <span>Visit Details</span>
            </h4>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="visit_type">Visit Type</Label>
                <select
                  id="visit_type"
                  {...form.register('visit_type')}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-farm-green focus:border-transparent"
                >
                  <option value="routine_checkup">{getVisitTypeIcon('routine_checkup')} Routine Checkup</option>
                  <option value="vaccination">{getVisitTypeIcon('vaccination')} Vaccination</option>
                  <option value="emergency">{getVisitTypeIcon('emergency')} Emergency</option>
                  <option value="consultation">{getVisitTypeIcon('consultation')} Consultation</option>
                  <option value="breeding">{getVisitTypeIcon('breeding')} Breeding Services</option>
                  <option value="other">{getVisitTypeIcon('other')} Other</option>
                </select>
              </div>
              
              <div>
                <Label htmlFor="priority_level">Priority Level</Label>
                <select
                  id="priority_level"
                  {...form.register('priority_level')}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-farm-green focus:border-transparent"
                >
                  <option value="low">🟢 Low Priority</option>
                  <option value="medium">🟡 Medium Priority</option>
                  <option value="high">🟠 High Priority</option>
                  <option value="urgent">🔴 Urgent</option>
                </select>
                <Badge className={`mt-1 ${getPriorityColor(watchedPriority)}`}>
                  {watchedPriority.toUpperCase()} PRIORITY
                </Badge>
              </div>
            </div>
            
            <div className="mt-4">
              <Label htmlFor="visit_purpose">Visit Purpose</Label>
              <textarea
                id="visit_purpose"
                {...form.register('visit_purpose')}
                rows={2}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-farm-green focus:border-transparent"
                placeholder="Describe the purpose and goals of this visit..."
              />
              {form.formState.errors.visit_purpose && (
                <p className="text-sm text-red-600 mt-1">
                  {form.formState.errors.visit_purpose.message}
                </p>
              )}
            </div>
          </div>
          
          {/* Scheduling */}
          <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
            <h4 className="font-medium text-gray-900 mb-4 flex items-center space-x-2">
              <Clock className="w-5 h-5" />
              <span>Schedule & Timing</span>
            </h4>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Label htmlFor="scheduled_date">Visit Date</Label>
                <Input
                  id="scheduled_date"
                  type="date"
                  {...form.register('scheduled_date')}
                  error={form.formState.errors.scheduled_date?.message}
                  min={new Date().toISOString().split('T')[0]}
                />
              </div>
              
              <div>
                <Label htmlFor="scheduled_time">Visit Time</Label>
                <Input
                  id="scheduled_time"
                  type="time"
                  {...form.register('scheduled_time')}
                  error={form.formState.errors.scheduled_time?.message}
                />
              </div>
              
              <div>
                <Label htmlFor="duration_hours">Duration (hours)</Label>
                <Input
                  id="duration_hours"
                  type="number"
                  step="0.5"
                  min="0.5"
                  max="8"
                  {...form.register('duration_hours', { valueAsNumber: true })}
                  error={form.formState.errors.duration_hours?.message}
                />
              </div>
            </div>
          </div>
          
          {/* Veterinarian Information */}
          <div className="bg-green-50 p-4 rounded-lg border border-green-200">
            <h4 className="font-medium text-green-900 mb-4 flex items-center space-x-2">
              <User className="w-5 h-5" />
              <span>Veterinarian Information</span>
            </h4>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="veterinarian_name">Veterinarian Name</Label>
                <Input
                  id="veterinarian_name"
                  {...form.register('veterinarian_name')}
                  error={form.formState.errors.veterinarian_name?.message}
                  placeholder="Dr. John Smith"
                />
              </div>
              
              <div>
                <Label htmlFor="veterinarian_clinic">Clinic/Practice</Label>
                <Input
                  id="veterinarian_clinic"
                  {...form.register('veterinarian_clinic')}
                  placeholder="ABC Veterinary Clinic"
                />
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
              <div>
                <Label htmlFor="veterinarian_phone" className="flex items-center space-x-1">
                  <Phone className="w-4 h-4" />
                  <span>Phone Number</span>
                </Label>
                <Input
                  id="veterinarian_phone"
                  {...form.register('veterinarian_phone')}
                  placeholder="+1 (555) 123-4567"
                />
              </div>
              
              <div>
                <Label htmlFor="veterinarian_email">Email</Label>
                <Input
                  id="veterinarian_email"
                  type="email"
                  {...form.register('veterinarian_email')}
                  error={form.formState.errors.veterinarian_email?.message}
                  placeholder="vet@clinic.com"
                />
              </div>
            </div>
          </div>
          
          {/* Animals Involved (Optional) */}
          <div>
            <Label>Animals Involved (Optional)</Label>
            <p className="text-sm text-gray-600 mb-3">
              Select specific animals if this visit is not for the entire herd ({selectedAnimals.length} selected)
            </p>
            
            {selectedAnimals.length > 0 && (
              <div className="mb-3 flex items-center space-x-2">
                <Badge variant="secondary">
                  {selectedAnimals.length} animal{selectedAnimals.length > 1 ? 's' : ''} selected
                </Badge>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={clearAnimalSelection}
                >
                  Clear Selection
                </Button>
              </div>
            )}
            
            <div className="max-h-48 overflow-y-auto border border-gray-200 rounded-md p-3">
              <div className="flex justify-between items-center mb-3">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={selectAllAnimals}
                >
                  Select All
                </Button>
                
                {animals.length > 20 && !showAllAnimals && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowAllAnimals(true)}
                  >
                    Show All {animals.length} Animals
                  </Button>
                )}
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                {displayAnimals.map(animal => (
                  <label
                    key={animal.id}
                    className="flex items-center space-x-2 p-2 hover:bg-gray-50 rounded cursor-pointer"
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
              
              {animals.length > 20 && showAllAnimals && (
                <div className="mt-3 text-center">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowAllAnimals(false)}
                  >
                    Show Less
                  </Button>
                </div>
              )}
            </div>
          </div>
          
          {/* Additional Details */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="location_details" className="flex items-center space-x-1">
                <MapPin className="w-4 h-4" />
                <span>Location Details</span>
              </Label>
              <Input
                id="location_details"
                {...form.register('location_details')}
                placeholder="e.g., Main barn, Paddock 3, Milking parlor"
              />
            </div>
            
            <div>
              <Label htmlFor="estimated_cost" className="flex items-center space-x-1">
                <DollarSign className="w-4 h-4" />
                <span>Estimated Cost</span>
              </Label>
              <Input
                id="estimated_cost"
                type="number"
                step="0.01"
                min="0"
                {...form.register('estimated_cost', { valueAsNumber: true })}
                placeholder="0.00"
              />
            </div>
          </div>
          
          <div>
            <Label htmlFor="special_instructions">Special Instructions</Label>
            <textarea
              id="special_instructions"
              {...form.register('special_instructions')}
              rows={2}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-farm-green focus:border-transparent"
              placeholder="Any special instructions for the veterinarian..."
            />
          </div>
          
          <div>
            <Label htmlFor="preparation_notes">Preparation Notes</Label>
            <textarea
              id="preparation_notes"
              {...form.register('preparation_notes')}
              rows={2}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-farm-green focus:border-transparent"
              placeholder="What needs to be prepared before the visit..."
            />
          </div>
          
          {/* Reminder Settings */}
          <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-200">
            <h4 className="font-medium text-yellow-900 mb-4 flex items-center space-x-2">
              <Bell className="w-5 h-5" />
              <span>Reminder Settings</span>
            </h4>
            
            <div className="space-y-4">
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="send_reminder"
                  {...form.register('send_reminder')}
                  className="text-yellow-600 focus:ring-yellow-500"
                />
                <Label htmlFor="send_reminder" className="cursor-pointer">
                  Send reminder notification before the visit
                </Label>
              </div>
              
              {watchedSendReminder && (
                <div>
                  <Label htmlFor="reminder_days_before">Reminder Days Before Visit</Label>
                  <Input
                    id="reminder_days_before"
                    type="number"
                    min="1"
                    max="30"
                    {...form.register('reminder_days_before', { valueAsNumber: true })}
                    className="w-24"
                  />
                  <p className="text-sm text-gray-500 mt-1">
                    Send reminder {form.watch('reminder_days_before')} day{form.watch('reminder_days_before') > 1 ? 's' : ''} before the visit
                  </p>
                </div>
              )}
            </div>
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
            <Button type="submit" disabled={loading}>
              {loading ? (
                <>
                  <LoadingSpinner size="sm" />
                  <span className="ml-2">Scheduling Visit...</span>
                </>
              ) : (
                <>
                  <Calendar className="w-4 h-4 mr-2" />
                  Schedule Visit
                </>
              )}
            </Button>
          </div>
        </form>
      </div>
    </Modal>
  )
}