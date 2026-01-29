// src/components/animals/WeightUpdateModal.tsx
'use client'

import { useState } from 'react'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Label } from '@/components/ui/Label'
import { Badge } from '@/components/ui/Badge'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { Weight, Calendar, AlertTriangle, Info } from 'lucide-react'
import { toast } from 'react-hot-toast'

interface WeightUpdateModalProps {
  isOpen: boolean
  onClose: () => void
  animal: {
    id: string
    tag_number: string
    name?: string
    production_status: string
    birth_date?: string
  }
  reason: string
  onWeightUpdated: (weightRecord: any) => void
  onRefreshData?: () => void  // ✅ NEW: Callback to refresh parent data
}

export function WeightUpdateModal({
  isOpen,
  onClose,
  animal,
  reason,
  onWeightUpdated,
  onRefreshData  // ✅ NEW: Destructure callback
}: WeightUpdateModalProps) {
  const [weight, setWeight] = useState('')
  const [measurementDate, setMeasurementDate] = useState(
    new Date().toISOString().split('T')[0]
  )
  const [notes, setNotes] = useState('')
  const [loading, setLoading] = useState(false)

  const reasonMessages = {
    new_calf_over_month: 'This calf is over 30 days old and requires initial weight recording',
    purchased_over_month: 'This purchased animal requires current weight recording',
    routine_schedule: 'Routine weight measurement due based on schedule',
    special_event: 'Weight measurement required due to special circumstances'
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!weight || parseFloat(weight) <= 0) {
      toast.error('Please enter a valid weight')
      return
    }

    setLoading(true)
    console.log('📝 [WeightModal] Submitting weight:', weight, 'kg')
    try {
      const response = await fetch('/api/animals/weight-records', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          animal_id: animal.id,
          weight_kg: parseFloat(weight),
          measurement_date: measurementDate,
          measurement_type: reason.includes('calf') ? 'update_initial' :
            reason.includes('purchased') ? 'update_initial' : 'routine',
          notes,
          is_required: true
        })
      })

      if (!response.ok) {
        throw new Error('Failed to record weight')
      }

      const result = await response.json()

      console.log('✅ [WeightModal] Weight recorded successfully')
      console.log('📊 [WeightModal] Result:', result)
      toast.success('Weight recorded successfully!')
      onWeightUpdated(result.data)
      
      // ✅ NEW: Refresh parent component data to remove from 'Weight Updates Required' banner
      if (onRefreshData) {
        console.log('🔄 [WeightModal] Refreshing parent data...')
        onRefreshData()
      }
      
      onClose()
    } catch (error) {
      console.error('Error recording weight:', error)
      toast.error('Failed to record weight')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} className="max-w-lg">
      <div className="p-6">
        <div className="flex items-center space-x-3 mb-4">
          <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center">
            <Weight className="w-5 h-5 text-orange-600" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-900">
              Weight Recording Required
            </h3>
            <p className="text-sm text-gray-600">
              #{animal.tag_number} {animal.name && `(${animal.name})`}
            </p>
          </div>
        </div>

        {/* Reason Banner */}
        <div className="mb-6 p-3 bg-orange-50 border border-orange-200 rounded-lg">
          <div className="flex items-start space-x-2">
            <AlertTriangle className="w-4 h-4 text-orange-600 mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-sm font-medium text-orange-800">
                {reasonMessages[reason as keyof typeof reasonMessages]}
              </p>
            </div>
          </div>
        </div>



        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="weight">Current Weight (kg) *</Label>
            <Input
              id="weight"
              type="number"
              step="0.1"
              min="0"
              value={weight}
              onChange={(e) => setWeight(e.target.value)}
              placeholder="e.g., 45.5"
              required
              autoFocus
            />
            <p className="text-xs text-gray-500 mt-1">
              Enter the animal's current weight in kilograms
            </p>
          </div>

          <div>
            <Label htmlFor="measurementDate">Measurement Date *</Label>
            <Input
              id="measurementDate"
              type="date"
              value={measurementDate}
              onChange={(e) => setMeasurementDate(e.target.value)}
              max={new Date().toISOString().split('T')[0]}
              required
            />
          </div>

          <div>
            <Label htmlFor="notes">Notes (Optional)</Label>
            <textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-farm-green"
              placeholder="Any observations about the animal's condition..."
            />
          </div>

          {/* Weight Schedule Info */}
          <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="flex items-start space-x-2">
              <Info className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
              <div className="text-xs text-blue-700">
                <p className="font-medium mb-1">Weight Tracking Schedule:</p>
                <p>
                  Based on this animal's status ({animal.production_status}),
                  weight should be recorded regularly for optimal health monitoring.
                </p>
              </div>
            </div>
          </div>

          <div className="flex justify-end space-x-3 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={loading}
            >
              Skip for Now
            </Button>
            <Button
              type="submit"
              disabled={loading}
            >
              {loading ? <LoadingSpinner size="sm" /> : 'Record Weight'}
            </Button>
          </div>
        </form>
      </div>
    </Modal>
  )
}