// Updated Follow-up Modal to work with new structure
// src/components/health/FollowUpHealthRecordModal.tsx

'use client'

import { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { record, z } from 'zod'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Label } from '@/components/ui/Label'
import { Modal } from '@/components/ui/Modal'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { Badge } from '@/components/ui/Badge'
import { X, Calendar, DollarSign, Stethoscope, AlertCircle, Activity, CheckCircle, AlertTriangle } from 'lucide-react'

const followUpSchema = z.object({
  record_date: z.string().min(1, 'Follow-up date is required'),
  status: z.enum(['improving', 'stable', 'worsening', 'recovered', 'requires_attention']),
  description: z.string().min(10, 'Description must be at least 10 characters'),
  veterinarian: z.string().optional(),
  cost: z.number().min(0, 'Cost must be positive').optional(),
  notes: z.string().optional(),
  next_followup_date: z.string().optional(),
  medication_changes: z.string().optional(),
  treatment_effectiveness: z.enum(['very_effective', 'effective', 'somewhat_effective', 'not_effective']).optional(),
  resolved: z.boolean().optional(),
})

type FollowUpFormData = z.infer<typeof followUpSchema>

interface HealthRecord {
  id: string
  animal_id: string
  record_date: string
  record_type: 'vaccination' | 'treatment' | 'checkup' | 'injury' | 'illness' | 'reproductive' | 'deworming'
  description: string
  veterinarian?: string
  cost?: number
  notes?: string
  root_checkup_id?: string
  animals?: {
    id: string
    name?: string
    tag_number: string
    breed?: string
  }
}

interface FollowUpHealthRecordModalProps {
  farmId: string
  originalRecord: HealthRecord
  isOpen: boolean
  onClose: () => void
  onFollowUpAdded: (followUp: any) => void
}

export function FollowUpHealthRecordModal({ 
  farmId, 
  originalRecord,
  isOpen, 
  onClose, 
  onFollowUpAdded
}: FollowUpHealthRecordModalProps) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
    const [showRecordTypePrompt, setShowRecordTypePrompt] = useState(false)
  
  const form = useForm<FollowUpFormData>({
    resolver: zodResolver(followUpSchema),
    defaultValues: {
      record_date: new Date().toISOString().split('T')[0],
      status: 'stable',
      treatment_effectiveness: 'effective',
      resolved: false,
    },
  })
  
  const watchedStatus = form.watch('status')
  const watchedResolved = form.watch('resolved')

  
  // Show prompt when "requires_attention" is selected for checkup records
  useEffect(() => {
    if (watchedStatus === 'requires_attention' && originalRecord.record_type === 'checkup') {
      setShowRecordTypePrompt(true)
    } else {
      setShowRecordTypePrompt(false)
    }
  }, [watchedStatus, originalRecord.record_type])

  
  // In FollowUpHealthRecordModal.tsx - handleSubmit function
const handleSubmit = async (data: FollowUpFormData) => {
  setLoading(true)
  setError(null)
  
  try {
    const response = await fetch(`/api/health/records/${originalRecord.id}/follow-up`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        ...data,
        farm_id: farmId,
        cost: data.cost || 0,
      }),
    })
    
    const result = await response.json()
    
    if (!response.ok) {
      throw new Error(result.error || 'Failed to create follow-up record')
    }
    
    // Determine the root checkup ID
    const rootCheckupId = originalRecord.record_type === 'checkup' 
      ? originalRecord.id 
      : originalRecord.root_checkup_id || null
    
    // Pass enriched data with root checkup tracking
    const enrichedResult = {
      ...result.followUp,
      animalHealthStatusUpdated: result.animalHealthStatusUpdated,
      newHealthStatus: result.newHealthStatus,
      updatedAnimal: result.updatedAnimal,
      original_record_id: originalRecord.id,
      animal_id: originalRecord.animal_id,
      requires_new_record: watchedStatus === 'requires_attention' && originalRecord.record_type === 'checkup',
      root_checkup_id: rootCheckupId // ADD THIS
    }
    
    onFollowUpAdded(enrichedResult)
    
    form.reset()
    onClose()
    
  } catch (err) {
    if (err instanceof Error) {
      setError(err.message)
    } else {
      setError('An unexpected error occurred')
    }
  } finally {
    setLoading(false)
  }
}
  
  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'improving': return '📈'
      case 'stable': return '➡️'
      case 'worsening': return '📉'
      case 'recovered': return '✅'
      case 'requires_attention': return '⚠️'
      default: return '📋'
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'improving': return 'text-green-600'
      case 'stable': return 'text-blue-600'
      case 'worsening': return 'text-red-600'
      case 'recovered': return 'text-green-800'
      case 'requires_attention': return 'text-orange-600'
      default: return 'text-gray-600'
    }
  }
  
  return (
    <Modal isOpen={isOpen} onClose={onClose} className="max-w-4xl max-h-[90vh] overflow-y-auto">
      <div className="p-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-xl font-semibold text-gray-900 flex items-center space-x-2">
            <Activity className="w-6 h-6 text-farm-green" />
            <span>Add Follow-up Record</span>
          </h3>
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="w-5 h-5" />
          </Button>
        </div>

        {/* Original Record Summary */}
        <div className="bg-gray-50 p-4 rounded-lg mb-6">
          <h4 className="font-medium text-gray-900 mb-2">Original Record</h4>
          <div className="text-sm text-gray-600">
            <p><strong>Animal:</strong> {originalRecord.animals?.name || `Animal ${originalRecord.animals?.tag_number}`} (#{originalRecord.animals?.tag_number})</p>
            <p><strong>Date:</strong> {new Date(originalRecord.record_date).toLocaleDateString()}</p>
            <p><strong>Type:</strong> {originalRecord.record_type}</p>
            <p><strong>Description:</strong> {originalRecord.description}</p>
            {originalRecord.veterinarian && <p><strong>Veterinarian:</strong> {originalRecord.veterinarian}</p>}
          </div>
        </div>

        <div className="bg-blue-50 p-3 rounded-lg mb-4">
  <p className="text-sm text-blue-800">
    {originalRecord.record_type === 'vaccination' && 
      "Document any reactions, side effects, or follow-up vaccination needs."}
    {originalRecord.record_type === 'reproductive' && 
      "Track pregnancy progress, calving updates, or breeding complications."}
    {originalRecord.record_type === 'deworming' && 
      "Monitor effectiveness, any adverse reactions, or schedule next treatment."}
    {['illness', 'injury', 'treatment'].includes(originalRecord.record_type) && 
      "Track recovery progress, treatment effectiveness, and current health status."}
    {originalRecord.record_type === 'checkup' && 
      "Document changes since last check, new concerns, or follow-up requirements."}
  </p>
</div>
        
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm flex items-center space-x-2">
            <AlertCircle className="w-4 h-4 text-red-500" />
            <span>{error}</span>
          </div>
        )}

        {/* Show prompt when requires_attention is selected for checkup */}
        {showRecordTypePrompt && (
          <div className="mb-6 p-4 bg-orange-50 border-l-4 border-orange-500 rounded-lg">
            <div className="flex items-start space-x-3">
              <AlertTriangle className="w-5 h-5 text-orange-500 flex-shrink-0 mt-0.5" />
              <div>
                <h4 className="font-semibold text-orange-900 mb-1">Additional Health Record Required</h4>
                <p className="text-sm text-orange-800">
                  Since the animal requires attention, you'll be prompted to create a specific health record 
                  (Vaccination, Treatment, Illness, Reproductive, or Deworming) after saving this follow-up.
                </p>
              </div>
            </div>
          </div>
        )}
        
        <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
          {/* Follow-up Details */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="record_date" className="flex items-center space-x-2">
                <Calendar className="w-4 h-4" />
                <span>Follow-up Date</span>
              </Label>
              <Input
                id="record_date"
                type="date"
                {...form.register('record_date')}
                error={form.formState.errors.record_date?.message}
              />
            </div>
            
            <div>
              <Label htmlFor="status">Current Status</Label>
              <select
                id="status"
                {...form.register('status')}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-farm-green focus:border-transparent"
              >
                <option value="improving">{getStatusIcon('improving')} Improving</option>
                <option value="stable">{getStatusIcon('stable')} Stable</option>
                <option value="worsening">{getStatusIcon('worsening')} Worsening</option>
                <option value="recovered">{getStatusIcon('recovered')} Fully Recovered</option>
                <option value="requires_attention">{getStatusIcon('requires_attention')} Requires Attention</option>
              </select>
            </div>
          </div>

          {/* Recovery Status */}
          <div className="bg-blue-50 p-4 rounded-lg">
            <div className="flex items-center space-x-3">
              <input
                type="checkbox"
                id="resolved"
                {...form.register('resolved')}
                className="w-4 h-4 text-farm-green border-gray-300 rounded focus:ring-farm-green"
              />
              <Label htmlFor="resolved" className="flex items-center space-x-2">
                <CheckCircle className="w-4 h-4 text-green-600" />
                <span>Mark as resolved (animal is healthy)</span>
              </Label>
            </div>
            <p className="text-sm text-gray-600 mt-2 ml-7">
              Check this box if the animal has fully recovered and no further follow-ups are needed.
            </p>
          </div>

          {/* Treatment Effectiveness */}
          {originalRecord.record_type === 'treatment' && (
            <div>
              <Label htmlFor="treatment_effectiveness">Treatment Effectiveness</Label>
              <select
                id="treatment_effectiveness"
                {...form.register('treatment_effectiveness')}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-farm-green focus:border-transparent"
              >
                <option value="very_effective">🌟 Very Effective</option>
                <option value="effective">✅ Effective</option>
                <option value="somewhat_effective">⚡ Somewhat Effective</option>
                <option value="not_effective">❌ Not Effective</option>
              </select>
            </div>
          )}
          
          <div>
            <Label htmlFor="description">Follow-up Description</Label>
            <textarea
              id="description"
              {...form.register('description')}
              rows={4}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-farm-green focus:border-transparent"
              placeholder="Describe the current condition, any changes observed, improvements or concerns..."
            />
            {form.formState.errors.description && (
              <p className="text-sm text-red-600 mt-1">
                {form.formState.errors.description.message}
              </p>
            )}
          </div>

          {/* Medication Changes */}
          <div>
            <Label htmlFor="medication_changes">Medication/Treatment Changes (Optional)</Label>
            <textarea
              id="medication_changes"
              {...form.register('medication_changes')}
              rows={2}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-farm-green focus:border-transparent"
              placeholder="Any changes to medication dosage, new treatments, or modifications to care..."
            />
          </div>
          
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
                {...form.register('cost', { valueAsNumber: true })}
                placeholder="0.00"
              />
            </div>
          </div>

          {/* Next Follow-up Date */}
          {!watchedResolved && watchedStatus !== 'recovered' && (
            <div>
              <Label htmlFor="next_followup_date">Next Follow-up Date (Optional)</Label>
              <Input
                id="next_followup_date"
                type="date"
                {...form.register('next_followup_date')}
                min={new Date().toISOString().split('T')[0]}
              />
              <p className="text-sm text-gray-500 mt-1">
                When should the next follow-up check be scheduled?
              </p>
            </div>
          )}
          
          <div>
            <Label htmlFor="notes">Additional Notes</Label>
            <textarea
              id="notes"
              {...form.register('notes')}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-farm-green focus:border-transparent"
              placeholder="Any additional observations, recommendations, or important notes..."
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
            <Button type="submit" disabled={loading}>
              {loading ? (
                <>
                  <LoadingSpinner size="sm" />
                  <span className="ml-2">Adding Follow-up...</span>
                </>
              ) : (
                <>
                  <Activity className="w-4 h-4 mr-2" />
                  <span>Add Follow-up Record</span>
                </>
              )}
            </Button>
          </div>
        </form>
      </div>
    </Modal>
  )
}